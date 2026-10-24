<template>
  <div id="app">
    <!-- 登录、注册、忘记密码页不需要顶部菜单栏 -->
    <template v-if="isUserPage(route.path)">
      <router-view />
    </template>
    <template v-else>
      <BasicLayout />
    </template>
  </div>
</template>

<style>
#app {
}

/* 全局预留滚动条槽位：滚动条出现/消失时页面内容宽度保持不变，
   避免页面宽度变窄、布局左右跳动（与 MdEditor 预览区处理方式一致） */
html {
  scrollbar-gutter: stable;
}

/* 登录/注册等 UserLayout 页面内容较短、题目/竞赛详情页锁定页面滚动，
   这些页面不预留滚动条槽位（由脚本按路由切换 no-gutter class） */
html.no-gutter {
  scrollbar-gutter: auto;
}

/* 槽位底色与页面主背景一致：Arco 变量定义在 body 上，body 背景会传播到
   根画布，短页面无滚动条时右侧预留槽位不出现白色空隙 */
body {
  background: var(--color-fill-2);
}
</style>
<script setup lang="ts">
import BasicLayout from "@/layouts/BasicLayout.vue";
import { onMounted, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { initSse } from "@/plugins/sse";

const route = useRoute();

/**
 * 登录/注册/忘记密码等 UserLayout 页面内容较短，不预留滚动条槽位，
 * 页面宽度随滚动条出现/消失自然变化；其余页面保持槽位预留避免宽度跳动
 */
const isUserPage = (path: string) =>
  ["/user/login", "/user/register", "/user/forget"].includes(path);

/**
 * 题目详情页、竞赛详情页：内容在页面内部自行滚动，视口不会出现
 * 滚动条，无需预留槽位（与 BasicLayout 中对详情页隐藏底部栏、
 * 锁定滚动的判断一致）
 */
const isDetailPage = (path: string) =>
  path.startsWith("/view/question") || path.startsWith("/view/contest");

watchEffect(() => {
  document.documentElement.classList.toggle(
    "no-gutter",
    isUserPage(route.path) || isDetailPage(route.path)
  );
});

/**
 * 全局初始化函数，有全局单次调用的代码，都可以写到这里
 */
const doInit = () => {
  console.log("hello 欢迎来到我的项目");
  // 页面刷新后 token 从 localStorage 恢复，已登录则重建 SSE 长连接
  initSse();
};

onMounted(() => {
  doInit();
});
</script>
