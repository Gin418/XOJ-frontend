<template>
  <div id="userSettingsView">
    <a-card title="个人资料">
      <a-form :model="editForm" label-align="right" style="max-width: 400px">
        <a-form-item field="userAvatar" label="头像">
          <a-upload
            accept="image/*"
            :show-file-list="false"
            :custom-request="doUploadAvatar"
          >
            <template #upload-button>
              <div class="avatar-upload">
                <a-avatar
                  :size="64"
                  :image-url="editForm.userAvatar || undefined"
                >
                  {{ (editForm.userName || "U").slice(0, 1) }}
                </a-avatar>
                <div class="avatar-mask">
                  <icon-upload />
                </div>
              </div>
            </template>
          </a-upload>
        </a-form-item>
        <a-form-item field="userName" label="昵称">
          <a-input v-model="editForm.userName" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item field="userProfile" label="简介">
          <a-textarea
            v-model="editForm.userProfile"
            placeholder="介绍一下自己吧"
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="saving" @click="saveProfile">
            保存
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import message from "@arco-design/web-vue/es/message";
import { IconUpload } from "@arco-design/web-vue/es/icon";
import { UserControllerService, UserUpdateMyRequest } from "../../../generated";
const store = useStore();
const loginUser = computed(() => store.state.user?.loginUser);

const editForm = ref<UserUpdateMyRequest>({
  userName: "",
  userAvatar: "",
  userProfile: "",
});
const saving = ref(false);

/**
 * 加载当前用户资料并回填表单
 */
const loadUser = async () => {
  if (!loginUser.value?.id) {
    return;
  }
  const res = await UserControllerService.getUserVoByIdUsingGet(
    loginUser.value.id as any
  );
  if (res.code === 0) {
    editForm.value = {
      userName: res.data?.userName ?? "",
      userAvatar: res.data?.userAvatar ?? "",
      userProfile: res.data?.userProfile ?? "",
    };
  }
};

/**
 * 保存账号设置
 */
const saveProfile = async () => {
  saving.value = true;
  const res = await UserControllerService.updateMyUserUsingPost(editForm.value);
  saving.value = false;
  if (res.code === 0) {
    message.success("保存成功");
    // 同步更新导航栏的用户信息
    if (loginUser.value?.id) {
      store.commit("user/updateUser", {
        ...loginUser.value,
        userName: editForm.value.userName,
        userAvatar: editForm.value.userAvatar,
        userProfile: editForm.value.userProfile,
      });
    }
  } else {
    message.error("保存失败，" + res.message);
  }
};

/**
 * 上传头像：调用后端接口，返回头像链接
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
    editForm.value.userAvatar = url;
    message.success("头像上传成功");
    option.onSuccess(res);
  } else {
    message.error("头像上传失败，" + (res?.message ?? ""));
    option.onError(new Error(res?.message));
  }
};

onMounted(() => {
  loadUser();
});
</script>

<style scoped>
#userSettingsView {
  max-width: 720px;
  margin: 0 auto;
}

.avatar-upload {
  position: relative;
  border-radius: 50%;
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
