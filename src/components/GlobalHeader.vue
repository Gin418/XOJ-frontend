<template>
  <a-row id="globalHeader" align="center" :wrap="false">
    <a-col flex="auto">
      <!-- 竞赛详情页：菜单标签替换为返回箭头 + 竞赛名称 + 状态 -->
      <div v-if="isContestDetail" class="contest-header-info">
        <a-button type="text" class="back-btn" @click="goBack">
          <template #icon>
            <icon-left />
          </template>
        </a-button>
        <span class="contest-name">{{ contestTitle }}</span>
        <a-tag color="arcoblue" style="margin-left: 8px">
          {{ statusTextMap[contestStatus] ?? contestStatus }}
        </a-tag>
      </div>
      <a-menu
        v-else
        mode="horizontal"
        :selected-keys="selectedKeys"
        @menu-item-click="doMenuClick"
      >
        <a-menu-item
          key="0"
          :style="{ padding: 0, marginRight: '38px' }"
          disabled
        >
          <div class="title-bar">
            <img class="logo" src="../assets/oj-logo.svg" />
            <div class="title">X OJ</div>
          </div>
        </a-menu-item>
        <a-menu-item v-for="item in visibleRoutes" :key="item.path">
          {{ item.name }}
        </a-menu-item>
      </a-menu>
    </a-col>
    <a-col flex="130px">
      <div class="user-area">
        <template v-if="isLogin">
          <a-dropdown position="br" trigger="click" @select="handleSelect">
            <a-avatar
              :size="48"
              :image-url="loginUser.userAvatar || undefined"
              class="user-avatar"
            >
              {{ (loginUser.userName || "U").charAt(0) }}
            </a-avatar>
            <template #content>
              <a-doption value="profile">个人主页</a-doption>
              <a-doption value="settings">账号设置</a-doption>
              <a-doption value="logout">退出登录</a-doption>
            </template>
          </a-dropdown>
        </template>
        <template v-else>
          <a-button type="primary" @click="router.push('/user/login')">
            登录 / 注册
          </a-button>
        </template>
      </div>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { routes } from "../router/routes";
import { useRoute, useRouter } from "vue-router";
import { computed, ref, watchEffect } from "vue";
import { useStore } from "vuex";
import checkAccess from "@/access/checkAccess";
import ACCESS_ENUM from "@/access/accessEnum";
import message from "@arco-design/web-vue/es/message";
import { IconLeft } from "@arco-design/web-vue/es/icon";
import { getContestDetail } from "../store/contestCache";

const router = useRouter();
const store = useStore();
const route = useRoute();

/**
 * 是否竞赛详情页或从竞赛进入的题目详情页：是则顶部菜单替换为竞赛名称 + 状态
 */
const isContestDetail = computed(
  () =>
    route.path.startsWith("/view/contest") || Boolean(route.query.competitionId)
);

/**
 * 竞赛状态中文映射：NOT_START 待开始、RUNNING 进行中、END 已结束
 */
const statusTextMap: Record<string, string> = {
  NOT_START: "待开始",
  RUNNING: "进行中",
  END: "已结束",
};

const contestTitle = ref("");
const contestStatus = ref("");

/**
 * 返回竞赛列表页：竞赛详情页与竞赛题目详情页的返回箭头统一回到竞赛列表
 */
const goBack = () => {
  router.push("/manage/contest");
};

// 竞赛详情页：拉取竞赛名称与状态展示在顶部（共享缓存，与详情页不重复请求）
watchEffect(() => {
  if (isContestDetail.value) {
    // 竞赛详情页取路径参数，从竞赛进入的题目详情页取 query 参数
    const id = String(route.params.id || route.query.competitionId || "");
    if (id) {
      getContestDetail(id).then((data) => {
        if (data) {
          contestTitle.value = data.competitionTitle ?? "";
          contestStatus.value = data.status ?? "";
        }
      });
    }
  }
});

// 展示在菜单的路由数组
const visibleRoutes = computed(() => {
  return routes.filter((item, index) => {
    if (item.meta?.hideInMenu) {
      return false;
    }
    // 根据权限过滤菜单
    if (
      !checkAccess(store.state.user.loginUser, item?.meta?.access as string)
    ) {
      return false;
    }
    return true;
  });
});

// 默认主页
const selectedKeys = ref(["/"]);

// 路由跳转后，更新选中的菜单项
router.afterEach((to, from, failure) => {
  selectedKeys.value = [to.path];
});

/**
 * 当前登录用户信息
 */
const loginUser = computed(() => store.state.user?.loginUser);

/**
 * 是否已登录：以角色为准，不依赖用户名（注册用户可能未设置用户名）
 */
const isLogin = computed(() => {
  const role = loginUser.value?.userRole;
  return Boolean(role) && role !== ACCESS_ENUM.NOT_LOGIN;
});

/**
 * 下拉菜单选择事件：个人资料 / 账号设置 / 退出登录
 */
const handleSelect = (value: string) => {
  if (value === "profile") {
    router.push("/user/profile");
  }
  if (value === "settings") {
    router.push("/user/settings");
  }
  if (value === "logout") {
    handleLogout();
  }
};

/**
 * 退出登录
 */
const handleLogout = async () => {
  const ok = await store.dispatch("user/logout");
  if (ok) {
    message.success("已退出登录");
    router.push("/");
  } else {
    message.error("退出登录失败");
  }
};

const doMenuClick = (key: string) => {
  router.push({
    path: key,
  });
};
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
}

/* 竞赛详情页顶部：返回箭头 + 竞赛名称 + 状态，高度与首页菜单栏一致（menu 上下 padding 14px + logo 48px） */
.contest-header-info {
  display: flex;
  align-items: center;
  height: 76px;
  padding-left: 16px;
}

/* 返回箭头：固定小尺寸，不撑高顶部栏；与左侧内距 16px 合计占满下方导航栏列（60px） */
.back-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  margin-right: 12px;
  font-size: 18px;
  color: #4e5969;
}

.contest-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.title {
  color: #444;
  margin-left: 16px;
}

.logo {
  height: 48px;
}

.user-area {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-right: 16px;
}

/* 右上角用户头像：无头像时显示用户名首字母 */
.user-avatar {
  cursor: pointer;
  flex-shrink: 0;
  background-color: #165dff;
}
</style>
