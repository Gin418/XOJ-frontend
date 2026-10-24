<template>
  <div id="messageView">
    <a-card :bordered="false" title="系统通知">
      <template #extra>
        <a-button size="small" @click="markAllRead">全部已读</a-button>
      </template>
      <a-spin :loading="loading" style="min-height: 240px">
        <a-list :bordered="false" :data="messageList">
          <template #item="{ item }">
            <div
              class="msg-item"
              :class="{ unread: item.isRead === 0 }"
              @click="markRead(item)"
            >
              <div class="msg-body">
                <div class="msg-title-row">
                  <span class="msg-title">{{ item.title }}</span>
                  <span class="msg-time">
                    {{ moment(item.createTime).format("YYYY-MM-DD HH:mm:ss") }}
                  </span>
                </div>
                <div class="msg-content">{{ item.content }}</div>
              </div>
              <span v-if="item.isRead === 0" class="unread-dot"></span>
            </div>
          </template>
          <template #empty>暂无通知</template>
        </a-list>
      </a-spin>
      <div v-if="total > pageSize" class="msg-pagination">
        <a-pagination
          :current="current"
          :page-size="pageSize"
          :total="total"
          show-total
          @change="handlePageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useStore } from "vuex";
import axios from "axios";
import message from "@arco-design/web-vue/es/message";
import moment from "moment";

/**
 * 系统通知条目（对应后端 MessageVO，type = 0）
 */
interface MessageItem {
  id: number;
  type: number;
  title?: string;
  content?: string;
  senderName?: string;
  /** 是否已读：0 未读、1 已读 */
  isRead: number;
  createTime: string;
}

const store = useStore();

const messageList = ref<MessageItem[]>([]);
const loading = ref(false);
const current = ref(1);
const pageSize = 10;
const total = ref(0);

/**
 * 分页加载系统通知列表
 */
const loadMessages = async () => {
  loading.value = true;
  const res = await axios.post("/api/user/message/list/page", {
    current: current.value,
    pageSize,
    type: 0,
  });
  loading.value = false;
  if (res.data?.code === 0) {
    const page = res.data.data ?? {};
    messageList.value = page.records ?? [];
    total.value = Number(page.total ?? 0);
  }
};

/**
 * 分页变化
 */
const handlePageChange = (page: number) => {
  current.value = page;
  loadMessages();
};

/**
 * 点击未读通知：标记已读并校准顶部徽标
 */
const markRead = async (item: MessageItem) => {
  if (item.isRead === 1) {
    return;
  }
  const res = await axios.post("/api/user/message/read", { id: item.id });
  if (res.data?.code === 0) {
    item.isRead = 1;
    store.dispatch("message/fetchUnread");
  }
};

/**
 * 全部已读
 */
const markAllRead = async () => {
  const res = await axios.post("/api/user/message/read/all", { type: 0 });
  if (res.data?.code === 0) {
    message.success("已全部标记为已读");
    loadMessages();
    store.dispatch("message/fetchUnread");
  } else {
    message.error(res.data?.message ?? "操作失败");
  }
};

onMounted(() => {
  loadMessages();
  // 进入页面后校准未读徽标
  store.dispatch("message/fetchUnread");
});
</script>

<style scoped>
#messageView {
  max-width: 860px;
  margin: 0 auto;
}

.msg-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.msg-item:hover {
  background-color: var(--color-fill-1);
}

/* 未读通知：浅色高亮 + 右侧红点 */
.msg-item.unread {
  background-color: var(--color-primary-light-1);
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.msg-title {
  font-weight: 600;
  color: #1d2129;
}

.msg-time {
  flex-shrink: 0;
  font-size: 12px;
  color: #86909c;
}

.msg-content {
  margin-top: 4px;
  color: #4e5969;
  word-break: break-word;
}

.unread-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 16px;
  border-radius: 50%;
  background-color: #f53f3f;
}

.msg-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
