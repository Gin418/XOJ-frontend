<template>
  <div class="page-container">
    <div id="organizationView">
      <a-row :gutter="20">
        <a-col :style="{ flex: '1 1 0%', minWidth: 0 }">
          <!-- 搜索栏：滚动时固定在顶部菜单栏下方 -->
          <a-card class="search-bar-card">
            <a-form :model="searchParams" layout="inline">
              <a-form-item field="organizationName" style="min-width: 240px">
                <a-input
                  v-model="searchParams.organizationName"
                  placeholder="请输入组织名称"
                  allow-clear
                  @press-enter="doSearch"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="doSearch">搜索</a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 组织卡片网格：每行两个，点击进入详情页 -->
          <div v-if="dataList.length" class="org-grid">
            <a-card
              v-for="item in dataList"
              :key="item.organizationId"
              class="org-card"
              hoverable
              @click="toOrgDetail(item)"
            >
              <a-avatar
                :size="56"
                class="org-avatar"
                :image-url="item.avatar || undefined"
              >
                {{ (item.organizationName || "组").charAt(0) }}
              </a-avatar>
              <div class="org-info">
                <div class="org-title">
                  <span class="org-name">{{ item.organizationName }}</span>
                  <a-tag
                    v-if="item.joined"
                    color="arcoblue"
                    style="margin-left: 8px"
                  >
                    已加入
                  </a-tag>
                </div>
                <div class="org-meta">
                  <span class="org-meta-item">
                    <icon-user />
                    {{ item.memberCount ?? 0 }}成员
                  </span>
                  <span class="org-meta-item">
                    <icon-clock-circle />
                    {{ moment(item.createTime).format("YYYY/MM/DD HH:mm") }}
                  </span>
                </div>
              </div>
              <icon-arrow-right class="org-arrow" />
            </a-card>
          </div>
          <a-empty v-if="!dataList.length" />
        </a-col>

        <!-- 右侧：创建组织入口 + 我的组织（从全量列表中筛选已加入） -->
        <a-col flex="320px" :style="{ paddingRight: 0 }">
          <a-card>
            <a-button type="primary" long @click="openCreateModal">
              创建组织
            </a-button>
          </a-card>
          <a-card title="我的组织" class="my-org-card">
            <div v-if="myOrganizations.length" class="my-org-list">
              <div
                v-for="org in myOrganizations"
                :key="org.organizationId"
                class="my-org-item"
                @click="toOrgDetail(org)"
              >
                <a-avatar
                  :size="40"
                  class="my-org-avatar"
                  :image-url="org.avatar || undefined"
                >
                  {{ (org.organizationName || "组").charAt(0) }}
                </a-avatar>
                <div class="my-org-info">
                  <span class="my-org-title">{{ org.organizationName }}</span>
                </div>
                <icon-arrow-right class="my-org-arrow" />
              </div>
            </div>
            <a-empty v-else description="暂未加入任何组织" />
          </a-card>
        </a-col>
      </a-row>

      <!-- 创建组织弹窗：名称 + 简介 + 头像上传 -->
      <a-modal
        v-model:visible="createVisible"
        title="创建组织"
        :ok-loading="creating"
        @ok="doCreate"
        @cancel="resetCreateForm"
      >
        <a-form :model="createForm" layout="vertical">
          <a-form-item
            field="organizationName"
            label="组织名称"
            :rules="[{ required: true, message: '请输入组织名称' }]"
          >
            <a-input
              v-model="createForm.organizationName"
              placeholder="请输入组织名称"
              :max-length="50"
              show-word-limit
            />
          </a-form-item>
          <a-form-item field="description" label="组织简介">
            <a-textarea
              v-model="createForm.description"
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
                    :image-url="createForm.avatar || undefined"
                  >
                    {{ (createForm.organizationName || "组").charAt(0) }}
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import type { OrganizationVO } from "../../../generated";
import {
  OrganizationControllerService,
  UserControllerService,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import moment from "moment";
import { useRouter } from "vue-router";
import {
  IconArrowRight,
  IconClockCircle,
  IconUpload,
  IconUser,
} from "@arco-design/web-vue/es/icon";

const router = useRouter();

const dataList = ref<OrganizationVO[]>([]);
const searchParams = ref({
  organizationName: "",
});

const loadData = async () => {
  // 展开搜索参数：watchEffect 同步追踪到每个字段，任意条件修改即自动查询
  const res = await OrganizationControllerService.listOrganizationUsingPost({
    ...searchParams.value,
  });
  if (res.code === 0) {
    dataList.value = res.data ?? [];
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 监听 searchParams 变量，改变时触发页面的重新加载
 */
watchEffect(() => {
  loadData();
});

/**
 * 搜索：重置搜索条件（替换对象引用触发 watchEffect 重新加载）
 */
const doSearch = () => {
  searchParams.value = {
    ...searchParams.value,
  };
};

/**
 * 我的组织：从全量列表中筛选 joined 为 true 的组织（list 接口已按当前用户填充）
 */
const myOrganizations = computed(() =>
  dataList.value.filter((org) => Boolean(org.joined))
);

/**
 * 点击组织卡片：跳转到组织详情页（加入/撤销申请在详情页操作）
 */
const toOrgDetail = (org: { organizationId?: string | number }) => {
  router.push({
    path: `/view/organization/${org.organizationId}`,
  });
};

/* ---------------- 创建组织 ---------------- */

const createVisible = ref(false);
const creating = ref(false);
const createForm = ref({
  organizationName: "",
  description: "",
  avatar: "",
});

const openCreateModal = () => {
  createVisible.value = true;
};

const resetCreateForm = () => {
  createForm.value = {
    organizationName: "",
    description: "",
    avatar: "",
  };
};

/**
 * 创建组织：创建者自动成为组织所有者
 */
const doCreate = async () => {
  if (!createForm.value.organizationName.trim()) {
    message.warning("请输入组织名称");
    return;
  }
  creating.value = true;
  const res = await OrganizationControllerService.addOrganizationUsingPost({
    organizationName: createForm.value.organizationName.trim(),
    description: createForm.value.description || undefined,
    avatar: createForm.value.avatar || undefined,
  });
  creating.value = false;
  if (res.code === 0) {
    message.success("创建成功");
    createVisible.value = false;
    resetCreateForm();
    loadData();
  } else {
    message.error("创建失败，" + res.message);
  }
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
    createForm.value.avatar = url;
    message.success("头像上传成功");
    option.onSuccess(res);
  } else {
    message.error("头像上传失败，" + (res?.message ?? ""));
    option.onError(new Error(res?.message));
  }
};
</script>

<style scoped>
#organizationView {
}

/* 组织卡片网格：宽屏每行两个；内容区放不下两张卡片时自动退化为单列，
   避免卡片被压窄后元信息逐字换行、网格溢出盖住右侧栏 */
.org-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 12px;
}

@media (min-width: 1200px) {
  .org-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.org-card {
  min-width: 0;
  cursor: pointer;
}

/* 卡片右侧箭头：仅 hover 时显示 */
.org-arrow {
  flex-shrink: 0;
  color: #86909c;
  opacity: 0;
  transition: opacity 0.2s;
}

.org-card:hover .org-arrow {
  opacity: 1;
}

/* 卡片内容区：flex 横排，四周留出间距，固定内容高度 106px */
.org-card :deep(.arco-card-body) {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 106px;
  padding: 20px;
}

/* 左侧圆形头像：与右侧内容垂直居中，同「我的组织」条目布局 */
.org-avatar {
  flex-shrink: 0;
  background-color: #fff;
  color: #1d2129;
}

/* 右侧信息区：名称在上、元数据在下，同一块区域内垂直排列；
   极窄卡片下裁切溢出内容，避免超过卡片边界 */
.org-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 名称行 */
.org-title {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* 已加入标签不被名称挤压 */
.org-title :deep(.arco-tag) {
  flex-shrink: 0;
}

.org-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 组织元信息：成员数 + 创建时间，位于名称下方，图标 + 间距分隔；
   宽度不足时整项换行，避免文字被压成逐字堆叠 */
.org-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 4px;
  column-gap: 16px;
  color: #86909c;
  font-size: 13px;
}

.org-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* 搜索栏：滚动时固定在顶部菜单栏下方（header 固定高度 64px + 间距），上下内边距收窄降低高度 */
.search-bar-card {
  position: sticky;
  top: 72px;
  z-index: 10;
  margin-bottom: 16px;
}

.search-bar-card :deep(.arco-card-body) {
  padding-top: 10px;
  padding-bottom: 10px;
}

/* 分页右下角 */
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 我的组织：头像 + 信息区（名称/成员数/创建时间）+ 右侧箭头，点击进入详情 */
.my-org-card {
  margin-top: 20px;
}

.my-org-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer;
}

.my-org-avatar {
  flex-shrink: 0;
  background-color: #fff;
  color: #1d2129;
}

.my-org-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.my-org-title {
  min-width: 0;
  font-weight: 600;
  color: #1d2129;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 侧栏箭头：始终显示 */
.my-org-arrow {
  flex-shrink: 0;
  color: #86909c;
}

/* 创建组织弹窗：头像上传区域 */
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
