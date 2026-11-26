<template>
  <!-- 上部分：组织信息卡 + 导航栏，设置上、左、右内边距 -->
  <div class="org-top">
    <div v-if="orgInfo" class="org-header-card">
      <a-card class="org-info-card" :bordered="false">
        <div class="org-info-header">
          <a-avatar
            :size="64"
            class="org-avatar"
            :image-url="orgInfo.avatar || undefined"
          >
            {{ (orgInfo.organizationName || "组").charAt(0) }}
          </a-avatar>
          <div class="org-info-title">
            <div class="org-name">
              {{ orgInfo.organizationName }}
              <a-tag v-if="joined" color="arcoblue" style="margin-left: 8px">
                已加入
              </a-tag>
              <a-tag
                v-else-if="applyStatus === 'pending'"
                color="orange"
                style="margin-left: 8px"
              >
                待审核
              </a-tag>
              <a-tag
                v-else-if="applyStatus === 'rejected'"
                color="red"
                style="margin-left: 8px"
              >
                已拒绝
              </a-tag>
            </div>
          </div>
          <a-space class="org-actions">
            <!-- 未加入：申请加入 / 待审核可撤销 / 已拒绝可重新申请 -->
            <a-button
              v-if="!joined && applyStatus !== 'pending'"
              type="primary"
              @click="doApply"
            >
              {{ applyStatus === "rejected" ? "重新申请" : "申请加入" }}
            </a-button>
            <a-button
              v-if="!joined && applyStatus === 'pending'"
              @click="doCancelApply"
            >
              撤销申请
            </a-button>
            <!-- 已加入且非所有者：退出组织 -->
            <a-button v-if="joined && !isOwner" status="danger" @click="doQuit">
              退出组织
            </a-button>
            <!-- 组织所有者/管理员：修改信息与删除组织 -->
            <a-button v-if="canManage" @click="openEditModal">
              修改信息
            </a-button>
            <a-button v-if="canManage" status="danger" @click="doDelete">
              删除组织
            </a-button>
          </a-space>
        </div>
      </a-card>

      <!-- 组织内导航栏：网格排列页签，主页/成员页内切换 -->
      <div class="org-nav-bar">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          type="button"
          class="org-nav-item"
          :class="{ 'org-nav-item-active': activeTab === tab.key }"
          @click="onNavClick(tab.key)"
        >
          {{ tab.text }}
        </button>
      </div>
    </div>
  </div>

  <!-- 下部分：导航栏下方区域，独立 div 包裹，四周内边距，内部左右布局 -->
  <div class="org-content">
    <!-- 主页内容：左侧组织介绍，右侧组织概况 + 申请管理（仅所有者/管理员可见） -->
    <a-row v-if="activeTab === 'home'" :gutter="20">
      <a-col :style="{ flex: '1 1 0%', minWidth: 0 }">
        <!-- 组织介绍 -->
        <a-card v-if="orgInfo" title="组织介绍" class="org-description-card">
          <div class="org-description-content">
            {{ orgInfo.description || "暂无简介" }}
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：组织概况 + 申请管理（仅当前组织的所有者/管理员可见） -->
      <a-col flex="320px">
        <!-- 组织概况：成员数、创建时间与组织所有人 -->
        <OrgOverviewCard
          v-if="orgInfo"
          :member-count="orgMemberCount"
          :create-time="orgInfo.createTime"
          :owner="orgInfo.userVO"
        />
        <a-card v-if="canAudit" title="申请管理" class="apply-card">
          <a-select
            v-model="applyStatusFilter"
            placeholder="全部状态"
            allow-clear
            style="width: 100%; margin-bottom: 12px"
            @change="onApplyFilterChange"
          >
            <a-option
              v-for="option in applyStatusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.text }}
            </a-option>
          </a-select>
          <div v-if="applies.length" class="apply-list">
            <div v-for="apply in applies" :key="apply.id" class="apply-item">
              <div class="apply-head">
                <a-avatar
                  :size="28"
                  class="apply-avatar"
                  :image-url="apply.userVO?.userAvatar || undefined"
                >
                  {{ (apply.userVO?.userName || "U").charAt(0) }}
                </a-avatar>
                <span class="apply-user">
                  {{ apply.userVO?.userName }}
                </span>
                <a-tag
                  :color="applyTagColor(apply.status)"
                  size="small"
                  style="margin-left: auto"
                >
                  {{ applyTagText(apply.status) }}
                </a-tag>
              </div>
              <div class="apply-time">
                {{ moment(apply.createTime).format("YYYY/MM/DD HH:mm") }}
              </div>
              <div v-if="apply.status === 'pending'" class="apply-actions">
                <a-button
                  size="small"
                  type="primary"
                  status="success"
                  @click="doAudit(apply, true)"
                >
                  同意
                </a-button>
                <a-button
                  size="small"
                  status="danger"
                  @click="doAudit(apply, false)"
                >
                  拒绝
                </a-button>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无申请" />
          <div class="pagination-wrapper">
            <a-pagination
              :total="applyTotal"
              :current="applyPage"
              :page-size="10"
              @change="onApplyPageChange"
            />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 成员列表：导航切到「成员」时显示在导航栏下方 -->
    <a-card
      v-else-if="activeTab === 'members'"
      title="成员"
      class="member-card"
    >
      <div v-if="members.length" class="member-list">
        <div v-for="member in members" :key="member.userId" class="member-item">
          <a-avatar
            :size="40"
            class="member-avatar"
            :image-url="member.userVO?.userAvatar || undefined"
          >
            {{ (member.userVO?.userName || "U").charAt(0) }}
          </a-avatar>
          <div class="member-info">
            <div class="member-name">
              <span
                class="member-name-link"
                @click="goUserProfile(member.userId)"
              >
                {{ member.userVO?.userName }}
              </span>
              <a-tag
                :color="roleTagColor(member.role)"
                size="small"
                style="margin-left: 8px"
              >
                {{ roleTagText(member.role) }}
              </a-tag>
            </div>
            <div class="member-time">
              加入于
              {{ moment(member.joinTime).format("YYYY/MM/DD HH:mm") }}
            </div>
          </div>
        </div>
      </div>
      <a-empty v-else />
      <!-- 成员分页：不足一页时同样展示分页条 -->
      <div class="pagination-wrapper">
        <a-pagination
          :total="memberTotal"
          :current="memberPage"
          :page-size="50"
          show-total
          @change="onMemberPageChange"
        >
          <template #total="{ total }">共 {{ total }} 位成员</template>
        </a-pagination>
      </div>
    </a-card>
  </div>

  <!-- 修改组织信息弹窗 -->
  <a-modal
    v-model:visible="editVisible"
    title="修改组织信息"
    :ok-loading="saving"
    @ok="doUpdate"
  >
    <a-form :model="editForm" layout="vertical">
      <a-form-item
        field="organizationName"
        label="组织名称"
        :rules="[{ required: true, message: '请输入组织名称' }]"
      >
        <a-input
          v-model="editForm.organizationName"
          placeholder="请输入组织名称"
          :max-length="50"
          show-word-limit
        />
      </a-form-item>
      <a-form-item field="description" label="组织简介">
        <a-textarea
          v-model="editForm.description"
          placeholder="介绍一下这个组织吧（可选）"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          :max-length="200"
          show-word-limit
        />
      </a-form-item>
      <a-form-item field="avatar" label="组织头像">
        <a-upload
          accept="image/*"
          :show-file-list="false"
          :custom-request="doUploadAvatar"
        >
          <template #upload-button>
            <div class="avatar-upload">
              <a-avatar
                :size="64"
                shape="square"
                :image-url="editForm.avatar || undefined"
              >
                {{ (editForm.organizationName || "组").charAt(0) }}
              </a-avatar>
              <div class="avatar-mask">
                <icon-upload />
              </div>
            </div>
          </template>
        </a-upload>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import {
  OrganizationControllerService,
  UserControllerService,
} from "../../../generated";
import type {
  OrganizationApplyVO,
  OrganizationMemberVO,
  OrganizationVO,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import { Modal } from "@arco-design/web-vue";
import { IconUpload } from "@arco-design/web-vue/es/icon";
import moment from "moment";
import OrgOverviewCard from "../../components/OrgOverviewCard.vue";

const route = useRoute();
const router = useRouter();
const store = useStore();

const orgId = Number(route.params.organizationId);

const loginUser = computed(() => store.state.user?.loginUser);

/* ---------------- 组织信息与我的状态 ---------------- */

const orgInfo = ref<OrganizationVO>();
const joined = ref(false);
const applyStatus = ref<string>();

/**
 * 成员列表分页总数：由成员列表接口的 total 提供
 */
const memberTotal = ref(0);

/**
 * 组织成员总数：来自组织详情接口的 memberCount，主页概况直接使用，无需请求成员列表
 */
const orgMemberCount = computed(() => Number(orgInfo.value?.memberCount) || 0);

/**
 * 是否组织所有者：创建人 id 与当前登录用户一致
 */
const isOwner = computed(
  () =>
    Boolean(orgInfo.value?.userId) &&
    Number(orgInfo.value?.userId) === Number(loginUser.value?.id)
);

/**
 * 当前用户在本组织中的角色：owner/admin/member，未加入时为 undefined
 */
const myRole = ref<string>();

/**
 * 是否可管理组织（修改 / 删除）：组织所有者或组织管理员
 */
const canManage = computed(
  () => isOwner.value || myRole.value === "owner" || myRole.value === "admin"
);

/**
 * 是否可管理申请：当前用户在本组织中为所有者或管理员
 */
const canAudit = computed(
  () => myRole.value === "owner" || myRole.value === "admin"
);

const loadOrgInfo = async () => {
  const res = await OrganizationControllerService.getOrganizationUsingGet(
    orgId
  );
  if (res.code === 0) {
    orgInfo.value = res.data;
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 加载我的加入状态与申请状态
 */
const loadMyStatus = async () => {
  const [joinRes, applyRes] = await Promise.all([
    OrganizationControllerService.getJoinStatusUsingGet(orgId),
    OrganizationControllerService.getApplyStatusUsingGet(orgId),
  ]);
  if (joinRes.code === 0) {
    joined.value = Boolean(joinRes.data);
  }
  if (applyRes.code === 0) {
    applyStatus.value = applyRes.data || undefined;
  }
};

/**
 * 加载我在组织中的角色：调用成员信息接口，未加入时 role 为空
 */
const loadMyRole = async () => {
  const res = await OrganizationControllerService.getMemberInfoUsingGet(orgId);
  if (res.code === 0) {
    myRole.value = res.data?.role;
  }
};

onMounted(async () => {
  loadOrgInfo();
  await loadMyStatus();
  await loadMyRole();
  // 按当前页签加载数据：刷新后停留在「成员」页签时加载成员列表，主页不请求
  // 申请列表仅当前组织的所有者/管理员请求，其余用户不请求
  if (activeTab.value === "members") {
    loadMembers();
  } else if (canAudit.value) {
    loadApplies();
  }
});

/* ---------------- 组织内导航 + 成员列表 ---------------- */

/**
 * 组织内导航页签：主页 / 成员（网格排列，新增页签只需追加配置）
 */
const navTabs = [
  { key: "home", text: "主页" },
  { key: "members", text: "成员" },
];

/**
 * 组织内导航当前页：home 主页 / members 成员；
 * 由路由参数 tab 决定，刷新或前进/后退后仍停留在原页签
 */
const activeTab = computed(() =>
  route.params.tab === "members" ? "members" : "home"
);

/**
 * 导航菜单点击：跳转到对应页签路径（数据加载由 tab 变化监听统一处理）；
 * 主页使用基础路径，仅「成员」页带 /members 子路径
 */
const onNavClick = (key: string) => {
  if (activeTab.value === key) {
    return;
  }
  router.push({
    name: "组织详情",
    params:
      key === "members"
        ? { organizationId: String(orgId), tab: "members" }
        : { organizationId: String(orgId) },
  });
};

const members = ref<OrganizationMemberVO[]>([]);
const memberPage = ref(1);

/**
 * 成员角色中文映射：owner 所有者、admin 管理员、member 普通成员
 */
const roleTagMap: Record<string, { text: string; color: string }> = {
  owner: { text: "所有者", color: "arcoblue" },
  admin: { text: "管理员", color: "purple" },
  member: { text: "成员", color: "gray" },
};

/**
 * 成员角色标签颜色（模板表达式兼容，未知角色回退默认色）
 */
const roleTagColor = (role?: string) => roleTagMap[role ?? ""]?.color;

/**
 * 成员角色标签文案（未知角色直接展示原始值）
 */
const roleTagText = (role?: string) => roleTagMap[role ?? ""]?.text ?? role;

/**
 * 加载成员列表（分页 50 条）；仅在「成员」页签展示时调用
 */
const loadMembers = async () => {
  const res = await OrganizationControllerService.listMembersUsingGet(
    orgId,
    memberPage.value,
    50
  );
  if (res.code === 0) {
    members.value = res.data?.records ?? [];
    memberTotal.value = Number(res.data?.total) || 0;
  } else {
    message.error("加载成员失败，" + res.message);
  }
};

const onMemberPageChange = (page: number) => {
  memberPage.value = page;
  loadMembers();
};

/**
 * 点击成员用户名跳转对方主页（雪花 id 以字符串传递避免精度丢失）
 */
const goUserProfile = (userId?: number) => {
  if (!userId) {
    return;
  }
  router.push({
    path: "/user/profile",
    query: { userId: String(userId) },
  });
};

/* ---------------- 加入 / 撤销 / 退出 ---------------- */

/**
 * 申请加入组织（已拒绝的申请后端会重置为待审核）
 */
const doApply = async () => {
  const res = await OrganizationControllerService.applyUsingPost({
    organizationId: orgId,
  });
  if (res.code === 0) {
    message.success("申请已提交，请等待审核");
    applyStatus.value = "pending";
  } else {
    message.error("申请失败，" + res.message);
  }
};

/**
 * 撤销加入申请
 */
const doCancelApply = async () => {
  const res = await OrganizationControllerService.cancelApplyUsingPost({
    organizationId: orgId,
  });
  if (res.code === 0) {
    message.success("已撤销申请");
    applyStatus.value = undefined;
  } else {
    message.error("撤销失败，" + res.message);
  }
};

/**
 * 退出组织：退出后刷新状态与成员列表
 */
const doQuit = () => {
  Modal.confirm({
    title: "确认退出组织？",
    content: "退出后将不再是该组织成员。",
    okText: "确认退出",
    cancelText: "取消",
    onOk: async () => {
      const res = await OrganizationControllerService.quitOrganizationUsingPost(
        {
          organizationId: orgId,
        }
      );
      if (res.code === 0) {
        message.success("已退出组织");
        joined.value = false;
        myRole.value = undefined;
        loadMyStatus();
        // 退出后成员数变化，刷新组织详情
        loadOrgInfo();
      } else {
        message.error("退出失败，" + res.message);
      }
    },
  });
};

/* ---------------- 申请管理（所有者/管理员） ---------------- */

const applies = ref<OrganizationApplyVO[]>([]);
const applyTotal = ref(0);
const applyPage = ref(1);
// 申请管理默认只查待审核；清空筛选（undefined）则查看全部
const applyStatusFilter = ref<string | undefined>("pending");

/**
 * 申请状态中文映射：pending 待审核、approved 已同意、rejected 已拒绝
 */
const applyStatusTagMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待审核", color: "orange" },
  approved: { text: "已同意", color: "green" },
  rejected: { text: "已拒绝", color: "red" },
};

/**
 * 申请状态标签颜色（模板表达式兼容，未知状态回退默认色）
 */
const applyTagColor = (status?: string) =>
  applyStatusTagMap[status ?? ""]?.color;

/**
 * 申请状态标签文案（未知状态直接展示原始值）
 */
const applyTagText = (status?: string) =>
  applyStatusTagMap[status ?? ""]?.text ?? status;

const applyStatusOptions = [
  { value: "pending", text: "待审核" },
  { value: "approved", text: "已同意" },
  { value: "rejected", text: "已拒绝" },
];

const loadApplies = async () => {
  const res = await OrganizationControllerService.listAppliesUsingGet(
    orgId,
    applyStatusFilter.value,
    applyPage.value,
    10
  );
  if (res.code === 0) {
    applies.value = res.data?.records ?? [];
    applyTotal.value = Number(res.data?.total) || 0;
  } else {
    message.error("加载申请失败，" + res.message);
  }
};

const onApplyFilterChange = () => {
  applyPage.value = 1;
  loadApplies();
};

const onApplyPageChange = (page: number) => {
  applyPage.value = page;
  loadApplies();
};

/**
 * 页签路径变化（点击导航或浏览器前进/后退）时加载对应页签数据：
 * 成员页加载成员列表；主页在可审核时刷新申请列表
 */
watch(
  () => route.params.tab,
  () => {
    if (activeTab.value === "members") {
      loadMembers();
    } else if (canAudit.value) {
      loadApplies();
    }
  }
);

/**
 * 审核申请：同意后申请人自动加入组织；审核后刷新申请列表与成员列表
 */
const doAudit = async (apply: OrganizationApplyVO, approve: boolean) => {
  const res = await OrganizationControllerService.auditApplyUsingPost({
    applyId: apply.id as number,
    approve,
  });
  if (res.code === 0) {
    message.success(approve ? "已同意" : "已拒绝");
    loadApplies();
    // 审核后成员数变化，刷新组织详情（主页概况展示 memberCount）
    loadOrgInfo();
  } else {
    message.error("操作失败，" + res.message);
  }
};

/* ---------------- 修改 / 删除 ---------------- */

const editVisible = ref(false);
const saving = ref(false);
const editForm = ref({
  organizationName: "",
  description: "",
  avatar: "",
});

/**
 * 打开修改弹窗并回填当前组织信息
 */
const openEditModal = () => {
  editForm.value = {
    organizationName: orgInfo.value?.organizationName ?? "",
    description: orgInfo.value?.description ?? "",
    avatar: orgInfo.value?.avatar ?? "",
  };
  editVisible.value = true;
};

/**
 * 修改组织信息
 */
const doUpdate = async () => {
  if (!editForm.value.organizationName.trim()) {
    message.warning("请输入组织名称");
    return;
  }
  saving.value = true;
  const res = await OrganizationControllerService.updateOrganizationUsingPost({
    organizationId: orgId,
    organizationName: editForm.value.organizationName.trim(),
    description: editForm.value.description || undefined,
    avatar: editForm.value.avatar || undefined,
  });
  saving.value = false;
  if (res.code === 0) {
    message.success("修改成功");
    editVisible.value = false;
    loadOrgInfo();
  } else {
    message.error("修改失败，" + res.message);
  }
};

/**
 * 删除组织：删除后回到组织列表页
 */
const doDelete = () => {
  Modal.confirm({
    title: "确认删除组织？",
    content: "删除后组织及其成员关系将一并清除，且不可恢复。",
    okText: "确认删除",
    cancelText: "取消",
    onOk: async () => {
      const res =
        await OrganizationControllerService.deleteOrganizationUsingGet(orgId);
      if (res.code === 0) {
        message.success("删除成功");
        router.push("/organization");
      } else {
        message.error("删除失败，" + res.message);
      }
    },
  });
};

/**
 * 上传组织头像：调用后端文件上传接口，返回头像链接
 */
const doUploadAvatar = async (option: any) => {
  // Arco 的 custom-request 回调中，原生文件在 option.fileItem.file
  const file = option.fileItem?.file as File;
  if (!file) {
    option.onError(new Error("未获取到文件"));
    return;
  }
  const res: any = await UserControllerService.uploadAvatarUsingPost(file);
  // 兼容 BaseResponse 包装和纯字符串两种返回
  const url = res?.data ?? res;
  if (url && typeof url === "string") {
    editForm.value.avatar = url;
    message.success("头像上传成功");
    option.onSuccess(res);
  } else {
    message.error("头像上传失败，" + (res?.message ?? ""));
    option.onError(new Error(res?.message));
  }
};
</script>

<style scoped>
/* 上部分：组织信息卡 + 导航栏，设置上、左、右内边距 */
.org-top {
  padding: 16px 16px 0;
}

/* 组织信息 + 导航栏组合卡：外层 div 统一白底、描边、圆角并裁切；
   上下内外边距为 0，左右保留内边距 */
.org-header-card {
  margin: 0;
  padding: 0 16px;
  background: #fff;
  border: 1px solid var(--color-border-2);
  border-radius: var(--border-radius-medium, 4px);
  overflow: hidden;
}

/* 内层信息卡：边框由外层统一提供 */
.org-info-card {
  border: none;
}

/* 组织内导航栏：网格排列页签，与头部信息用细分隔线分开 */
.org-nav-bar {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  justify-content: start;
  border-top: 1px solid var(--color-fill-2);
}

/* 页签：左右内边距与信息卡内容对齐，选中态主色文字 + 底部短下划线 */
.org-nav-item {
  position: relative;
  padding: 4px 16px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-2);
  cursor: pointer;
}

.org-nav-item:hover {
  color: rgb(var(--primary-6));
}

.org-nav-item-active {
  color: rgb(var(--primary-6));
  font-weight: 500;
}

/* 选中下划线：居中于页签文字，贴导航栏底边 */
.org-nav-item-active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 28px;
  height: 2px;
  margin-left: -14px;
  background: rgb(var(--primary-6));
}

/* 键盘聚焦时保留可见轮廓 */
.org-nav-item:focus-visible {
  outline: 2px solid rgb(var(--primary-6));
  outline-offset: -2px;
}

/* 下部分：导航栏下方区域，四周内边距，内部左右布局 */
.org-content {
  padding: 16px;
}

/* 内容区内部卡片的下边距由容器内边距统一控制，避免底部留白翻倍 */
.org-content .org-description-card,
.org-content .apply-card,
.org-content .member-card {
  margin-bottom: 0;
}

/* 组织信息头部：头像 + 名称/元信息在左，操作按钮在右 */
.org-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.org-avatar {
  flex-shrink: 0;
  background-color: #165dff;
}

.org-info-title {
  flex: 1;
  min-width: 0;
}

.org-name {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.org-actions {
  flex-shrink: 0;
}

/* 组织介绍卡片 */
.org-description-card {
  margin-bottom: 16px;
}

/* 组织介绍内容：保留换行，自动换行 */
.org-description-content {
  color: #4e5969;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 成员列表卡片 */
.member-card {
  margin-bottom: 16px;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-fill-2);
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  flex-shrink: 0;
  margin-right: 12px;
  background-color: #165dff;
}

.member-info {
  min-width: 0;
}

.member-name {
  font-size: 15px;
  font-weight: 500;
  color: #1d2129;
}

/* 成员用户名：可点击跳转其个人主页 */
.member-name-link {
  cursor: pointer;
}

.member-name-link:hover {
  color: rgb(var(--primary-6));
}

.member-time {
  margin-top: 4px;
  color: #86909c;
  font-size: 12px;
}

/* 申请管理 */
.apply-card {
  margin-bottom: 16px;
}

.apply-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--color-fill-2);
}

.apply-item:last-child {
  border-bottom: none;
}

.apply-head {
  display: flex;
  align-items: center;
}

.apply-avatar {
  flex-shrink: 0;
  margin-right: 8px;
  background-color: #165dff;
}

.apply-user {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: #1d2129;
}

.apply-time {
  margin-top: 4px;
  color: #86909c;
  font-size: 12px;
}

.apply-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

/* 分页右下角 */
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 修改弹窗：头像上传区域 */
.avatar-upload {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  line-height: 0;
}

.avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 20px;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-upload:hover .avatar-mask {
  opacity: 1;
}
</style>
