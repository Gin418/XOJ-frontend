<script setup lang="ts">
import { UserControllerService, UserRegisterRequest } from "../../../generated";
import { reactive, ref, watch } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import message from "@arco-design/web-vue/es/message";

/**
 * 邮箱格式校验（与后端 hutool Validator.isEmail 保持一致）
 */
const isEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * 表单信息
 */
const form = reactive({
  checkPassword: "",
  userAccount: "",
  userPassword: "",
  email: "",
  captcha: "",
} as UserRegisterRequest);

const router = useRouter();
const store = useStore();

/**
 * 表单实例：密码变化时手动触发确认密码框重新校验
 */
const formRef = ref();

/**
 * 账号校验规则：输入时实时校验（至少 4 位，与后端校验一致）
 */
const accountRules = [
  {
    validator: (value: string, callback: (error?: string) => void) => {
      if (!value) {
        callback("请输入账号");
      } else if (value.length < 4) {
        callback("账号不能少于 4 位");
      } else {
        callback();
      }
    },
  },
];

/**
 * 邮箱校验规则：输入时实时校验格式
 */
const emailRules = [
  {
    validator: (value: string, callback: (error?: string) => void) => {
      if (!value) {
        callback("请输入邮箱");
      } else if (!isEmail(value)) {
        callback("邮箱格式错误");
      } else {
        callback();
      }
    },
  },
];

/**
 * 密码校验规则：输入时实时校验（至少 8 位）
 */
const passwordRules = [
  {
    validator: (value: string, callback: (error?: string) => void) => {
      if (!value) {
        callback("请输入密码");
      } else if (value.length < 8) {
        callback("密码不能少于 8 位");
      } else {
        callback();
      }
    },
  },
];

/**
 * 确认密码校验规则：输入时实时与密码比较
 */
const checkPasswordRules = [
  {
    validator: (value: string, callback: (error?: string) => void) => {
      if (!value) {
        callback("请再次输入密码");
      } else if (value !== form.userPassword) {
        callback("两次输入的密码不一致");
      } else {
        callback();
      }
    },
  },
];

// 密码修改后，确认密码框已有内容时立即重新比较
watch(
  () => form.userPassword,
  () => {
    if (form.checkPassword) {
      formRef.value?.validateField("checkPassword");
    }
  }
);

/**
 * 发送验证码倒计时秒数：0 表示可以发送
 */
const countdown = ref(0);

/**
 * 发送邮箱验证码：校验邮箱格式后请求 /api/user/captcha/send/email，成功后进入 60 秒倒计时
 */
const sendCaptcha = async () => {
  if (!form.email) {
    message.error("请先输入邮箱");
    return;
  }
  if (!isEmail(form.email)) {
    message.error("邮箱格式错误");
    return;
  }
  // 倒计时进行中不允许重复发送
  if (countdown.value > 0) {
    return;
  }
  const res = await UserControllerService.sendEmailCaptchaUsingPost({
    email: form.email,
  });
  if (res.code === 0) {
    message.success("验证码已发送，请查收邮件");
    countdown.value = 60;
    // 每秒递减，倒计时结束后可重新发送
    const timer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } else {
    message.error("发送失败，" + res.message);
  }
};

/**
 * 提交表单
 * @param data
 */
const handleSubmit = async () => {
  // 各字段在表单内已有实时校验，提交前再兜底一次，防止绕过
  if (!form.userAccount || form.userAccount.length < 4) {
    message.error("账号不能少于 4 位");
    return;
  }
  if (!form.userPassword || form.userPassword.length < 8) {
    message.error("密码不能少于 8 位");
    return;
  }
  if (form.userPassword !== form.checkPassword) {
    message.error("两次输入的密码不一致");
    return;
  }
  if (!form.email) {
    message.error("请输入邮箱");
    return;
  }
  if (!isEmail(form.email)) {
    message.error("邮箱格式错误");
    return;
  }
  if (!form.captcha) {
    message.error("请输入邮箱验证码");
    return;
  }
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
      ref="formRef"
      style="max-width: 480px; margin: 0 auto"
      label-align="left"
      auto-label-width
      :model="form"
      @submit="handleSubmit"
    >
      <a-form-item
        field="userAccount"
        label="账号"
        :rules="accountRules"
        validate-trigger="input"
      >
        <a-input v-model="form.userAccount" placeholder="请输入账号" />
      </a-form-item>
      <a-form-item
        field="userPassword"
        label="密码"
        :rules="passwordRules"
        validate-trigger="input"
      >
        <a-input-password
          v-model="form.userPassword"
          placeholder="请输入密码（至少 8 位）"
        />
      </a-form-item>
      <a-form-item
        field="checkPassword"
        label="确认密码"
        :rules="checkPasswordRules"
        validate-trigger="input"
      >
        <a-input-password
          v-model="form.checkPassword"
          placeholder="请再次输入密码"
        />
      </a-form-item>
      <a-form-item
        field="email"
        label="邮箱"
        :rules="emailRules"
        validate-trigger="input"
      >
        <a-input v-model="form.email" placeholder="请输入邮箱" />
      </a-form-item>
      <a-form-item field="captcha" label="验证码">
        <a-space>
          <a-input
            v-model="form.captcha"
            placeholder="请输入邮箱验证码"
            :style="{ width: '220px' }"
          />
          <a-button
            type="primary"
            :disabled="countdown > 0"
            @click="sendCaptcha"
          >
            {{ countdown > 0 ? `${countdown}s 后重新发送` : "发送验证码" }}
          </a-button>
        </a-space>
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" style="width: 120px">
            注册
          </a-button>
          <a-link @click="router.push('/user/login')">已有账号？去登录</a-link>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped></style>
