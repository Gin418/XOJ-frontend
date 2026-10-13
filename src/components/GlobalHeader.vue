<template>
  <a-row id="globalHeader" align="center" :wrap="false">
    <a-col flex="auto">
      <a-menu
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
import { computed, onUpdated, ref } from "vue";
import { useStore } from "vuex";
import checkAccess from "@/access/checkAccess";
import ACCESS_ENUM from "@/access/accessEnum";
import message from "@arco-design/web-vue/es/message";

const router = useRouter();
const store = useStore();

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
 * 是否已登录
 */
const isLogin = computed(() => {
  const role = loginUser.value?.userRole;
  return (
    Boolean(loginUser.value?.userName) &&
    Boolean(role) &&
    role !== ACCESS_ENUM.NOT_LOGIN
  );
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
