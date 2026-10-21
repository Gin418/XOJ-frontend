<template>
  <div id="userLoginView">
    <h2 style="margin-bottom: 16px">用户登录</h2>
    <a-form
      style="max-width: 480px; margin: 0 auto"
      label-align="left"
      auto-label-width
      :model="form"
      @submit="handleSubmit"
    >
      <a-form-item field="userAccount" label="账号">
        <a-input v-model="form.userAccount" placeholder="请输入账号/邮箱" />
      </a-form-item>
      <a-form-item field="userPassword" tooltip="密码不少于 8 位" label="密码">
        <a-input-password
          v-model="form.userPassword"
          placeholder="请输入密码"
        />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" style="width: 120px">
            登录
          </a-button>
          <a-link @click="router.push('/user/register')"
            >没有账号？去注册</a-link
          >
          <a-link @click="router.push('/user/forget')">忘记密码？</a-link>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { UserControllerService, UserLoginRequest } from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";

/**
 * 表单信息
 */
const form = reactive({
  userAccount: "",
  userPassword: "",
} as UserLoginRequest);

const route = useRoute();
const router = useRouter();
const store = useStore();

/**
 * 提交表单
 * @param data
 */
const handleSubmit = async () => {
  const res = await UserControllerService.userLoginUsingPost(form);
  // 登录成功，跳转到主页
  if (res.code === 0) {
    // 保存登录 token 到 store，后续请求由拦截器统一携带到请求头
    if (res.data?.token) {
      store.commit("user/setToken", res.data.token);
    }
    // 直接用登录接口返回的用户信息更新 store，不再额外请求 getLoginUser
    store.commit("user/updateUser", res.data);
    message.success("登录成功");
    // 有 redirect 参数则跳回原页面
    const redirect = route.query.redirect as string;
    router.push({
      path: redirect || "/",
      replace: true,
    });
  } else {
    message.error("登陆失败，" + res.message);
  }
};
</script>
