<template>
  <!-- 组织概况：成员数、创建时间与组织所有人，从组织信息卡移出，展示在内容区右侧 -->
  <a-card title="组织概况" class="org-overview-card">
    <a-descriptions :column="1">
      <a-descriptions-item label="成员数">
        {{ memberCount }} 名成员
      </a-descriptions-item>
      <a-descriptions-item label="创建时间">
        {{ createTime ? moment(createTime).format("YYYY/MM/DD HH:mm") : "-" }}
      </a-descriptions-item>
      <a-descriptions-item label="组织所有人">
        <span v-if="owner" class="org-owner">
          <a-avatar
            :size="20"
            class="org-owner-avatar"
            :image-url="owner.userAvatar || undefined"
          >
            {{ (owner.userName || "U").charAt(0) }}
          </a-avatar>
          <span class="org-owner-name" @click="goUserProfile(owner.id)">
            {{ owner.userName }}
          </span>
        </span>
        <span v-else>-</span>
      </a-descriptions-item>
    </a-descriptions>
  </a-card>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { useRouter } from "vue-router";
import moment from "moment";

const router = useRouter();

defineProps<{
  /** 组织成员总数 */
  memberCount: number;
  /** 组织创建时间 */
  createTime?: string;
  /** 组织所有人（创建人）信息 */
  owner?: { id?: number; userName?: string; userAvatar?: string };
}>();

/**
 * 点击组织所有人名字跳转对方主页（雪花 id 以字符串传递避免精度丢失）
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
</script>

<style scoped>
.org-overview-card {
  margin-bottom: 16px;
}

/* 组织所有人：头像与用户名同排居中对齐 */
.org-owner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  vertical-align: middle;
}

.org-owner-avatar {
  flex-shrink: 0;
  background-color: #165dff;
}

/* 组织所有人名字：可点击跳转其个人主页 */
.org-owner-name {
  cursor: pointer;
}

.org-owner-name:hover {
  color: rgb(var(--primary-6));
}
</style>
