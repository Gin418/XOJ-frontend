<script setup lang="ts">
import { UserControllerService, UserRegisterRequest } from "../../../generated";
import { reactive } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import message from "@arco-design/web-vue/es/message";

/**
 * 表单信息
 */
const form = reactive({
  checkPassword: "",
  userAccount: "",
  userPassword: "",
} as UserRegisterRequest);

const router = useRouter();
const store = useStore();
/**
 * 提交表单
 * @param data
 */
const handleSubmit = async () => {
  const res = await UserControllerService.userRegisterUsingPost(form);
  // 注册成功，跳转到主页
  if (res.code === 0) {
    router.push({
      path: "/",
      replace: true,
    });
  } else {
    message.error("注册失败，" + res.message);
  }
};
</script>

<template>
  <div id="userRegisterView">
    <h2 style="margin-bottom: 16px">用户注册</h2>
    <a-form
      style="max-width: 480px; margin: 0 auto"
      label-align="left"
      auto-label-width
      :model="form"
      @submit="handleSubmit"
    >
      <a-form-item field="userAccount" label="账号">
        <a-input v-model="form.userAccount" placeholder="请输入账号" />
      </a-form-item>
      <a-form-item field="userPassword" tooltip="密码不少于 8 位" label="密码">
        <a-input-password
          v-model="form.userPassword"
          placeholder="请输入密码"
        />
      </a-form-item>
      <a-form-item field="userPassword" tooltip="密码不少于 8 位" label="确认">
        <a-input-password
          v-model="form.checkPassword"
          placeholder="请再次输入密码"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 120px">
          注册
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped></style>
