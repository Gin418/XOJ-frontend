<template>
  <div id="chatView">
    <a-card :bordered="false" class="chat-card">
      <div class="chat-layout">
        <!-- 左侧会话列表 -->
        <div class="chat-side">
          <div class="chat-side-header">私信</div>
          <!-- 会话搜索：前端本地过滤，不调接口 -->
          <div class="chat-side-search">
            <a-input v-model="convSearch" placeholder="搜索会话" allow-clear>
              <template #prefix><icon-search /></template>
            </a-input>
          </div>
          <a-spin :loading="convLoading" class="chat-side-body">
            <div
              v-for="conv in filteredConversations"
              :key="conv.friendId"
              class="conv-item"
              :class="{ active: currentConv?.friendId === conv.friendId }"
              @click="openConversation(conv)"
            >
              <a-avatar :size="40" :image-url="conv.friendAvatar || undefined">
                {{ conv.friendName.charAt(0) }}
              </a-avatar>
              <div class="conv-info">
                <div class="conv-top">
                  <span class="conv-name">{{ conv.friendName }}</span>
                  <span class="conv-time">{{
                    formatConvTime(conv.lastTime)
                  }}</span>
                </div>
                <div class="conv-bottom">
                  <span class="conv-preview">{{ conv.lastContent }}</span>
                  <a-badge
                    v-if="conv.unreadCount > 0"
                    :count="conv.unreadCount"
                    :max-count="99"
                  />
                </div>
              </div>
            </div>
            <a-empty
              v-if="!convLoading && conversations.length === 0"
              description="暂无私信"
            />
            <a-empty
              v-else-if="
                !convLoading &&
                conversations.length > 0 &&
                filteredConversations.length === 0
              "
              description="未找到相关会话"
            />
          </a-spin>
        </div>

        <!-- 右侧聊天窗口 -->
        <div class="chat-main">
          <template v-if="currentConv">
            <div class="chat-header">{{ currentConv.friendName }}</div>
            <div class="chat-messages-wrap">
              <div
                ref="messagesRef"
                class="chat-messages"
                @scroll="onMessagesScroll"
              >
                <a-spin
                  :loading="chatLoading"
                  style="min-height: 100%; min-width: 100%"
                >
                  <div v-if="loadingMore" class="load-more-tip">
                    加载更早的消息…
                  </div>
                  <template v-for="m in chatMessages" :key="String(m.id)">
                    <div
                      :id="`msg-${m.id}`"
                      class="msg-row"
                      :class="{
                        mine: isMine(m),
                        highlight: highlightedId === String(m.id),
                      }"
                    >
                      <!-- 自己的消息：气泡在前、头像在后，整行靠右（头像紧贴右缘） -->
                      <template v-if="isMine(m)">
                        <div class="msg-col">
                          <div class="bubble">{{ m.content }}</div>
                          <div class="msg-time">
                            {{ formatMsgTime(m.createTime) }}
                          </div>
                        </div>
                        <a-avatar :size="40" :image-url="myAvatar || undefined">
                          {{ myName.charAt(0) }}
                        </a-avatar>
                      </template>
                      <!-- 对方的消息：头像在前、气泡在后，紧靠左边 -->
                      <template v-else>
                        <a-avatar
                          :size="40"
                          :image-url="m.senderAvatar || undefined"
                        >
                          {{ (m.senderName || "U").charAt(0) }}
                        </a-avatar>
                        <div class="msg-col">
                          <div class="bubble">{{ m.content }}</div>
                          <div class="msg-time">
                            {{ formatMsgTime(m.createTime) }}
                          </div>
                        </div>
                      </template>
                    </div>
                  </template>
                  <a-empty
                    v-if="!chatLoading && chatMessages.length === 0"
                    description="暂无消息，打个招呼吧"
                  />
                </a-spin>
              </div>
              <!-- 第一条未读消息的跳转按钮：悬浮在消息区右上角，不随内容滚动 -->
              <div
                v-if="showJumpBtn"
                class="jump-unread-btn"
                @click="jumpToFirstUnread"
              >
                <icon-arrow-down />
                {{
                  unreadJumpCount > 0
                    ? `${unreadJumpCount} 条消息`
                    : "跳到第一条未读"
                }}
              </div>
            </div>
            <div class="chat-input-area">
              <div class="chat-input-panel">
                <a-textarea
                  v-model="inputContent"
                  placeholder="输入消息"
                  :auto-size="{ minRows: 2, maxRows: 4 }"
                  @keydown.enter="handleEnter"
                />
                <div class="chat-input-footer">
                  <span class="chat-input-tip"
                    >Enter 发送 · Shift + Enter 换行</span
                  >
                  <a-button
                    type="primary"
                    :disabled="!inputContent.trim()"
                    @click="sendMessage"
                  >
                    发送
                  </a-button>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="chat-placeholder">
            <a-empty description="选择一个会话开始聊天" />
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import axios from "axios";
import moment from "moment";

/**
 * 私信条目（对应后端 MessageVO，type = 1）
 */
interface MessageItem {
  id: number;
  type: number;
  content?: string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: number;
  /** 是否已读：0 未读、1 已读 */
  isRead: number;
  createTime: string;
}

/**
 * 会话（对应后端 ConversationVO）
 */
interface Conversation {
  friendId: number;
  friendName: string;
  friendAvatar?: string;
  lastContent: string;
  lastTime: string;
  unreadCount: number;
}

const store = useStore();
const route = useRoute();

// 个人主页“私信”跳转：query 携带目标好友，进入页面后自动打开该会话
const pendingFriendId = route.query.friendId
  ? String(route.query.friendId)
  : "";
const pendingFriendName = route.query.friendName
  ? String(route.query.friendName)
  : "";
// query 参数只处理一次（后续 SSE 刷新会话列表时不重复打开）
let pendingHandled = false;

const myId = Number(store.state.user?.loginUser?.id) || 0;
const myName: string = store.state.user?.loginUser?.userName ?? "我";
const myAvatar: string = store.state.user?.loginUser?.userAvatar ?? "";

// 左侧会话列表
const conversations = ref<Conversation[]>([]);
const convLoading = ref(false);
// 会话搜索关键字：前端本地过滤，不调接口
const convSearch = ref("");
// 按关键字过滤会话（大小写不敏感的包含匹配）
const filteredConversations = computed(() => {
  const keyword = convSearch.value.trim().toLowerCase();
  if (!keyword) {
    return conversations.value;
  }
  return conversations.value.filter((c) =>
    c.friendName.toLowerCase().includes(keyword)
  );
});

// 右侧聊天窗口
const currentConv = ref<Conversation | null>(null);
const chatMessages = ref<MessageItem[]>([]);
const chatLoading = ref(false);
const inputContent = ref("");
const messagesRef = ref<HTMLElement | null>(null);

// 聊天记录分页：每次 20 条，往上滚到顶部时加载更早一页
const MSG_PAGE_SIZE = 20;
// 已加载到的页码（最新一页为 1）
const loadedPage = ref(0);
// 是否还有更早的消息可加载
const hasMoreMessages = ref(false);
// 正在加载更早消息（防止滚动事件重复触发请求）
const loadingMore = ref(false);

// 第一条未读消息 id（打开会话时返回，用于跳转定位）
const firstUnreadId = ref("");
// 打开会话前的未读条数（按钮文案展示）
const unreadJumpCount = ref(0);
// 是否显示"跳到第一条未读"按钮（未读消息在可视区外时显示）
const showJumpBtn = ref(false);
// 是否已点击过跳转：点击后平滑滚动会触发 scroll 事件，用标志阻止按钮被重新显示
const jumpDismissed = ref(false);
// 10 秒未点击自动消失的定时器
let jumpHideTimer: ReturnType<typeof setTimeout> | null = null;
// 当前高亮的消息 id（跳转后短暂高亮）
const highlightedId = ref("");

/**
 * 会话列表时间：今天显示时分、昨天显示"昨天"、更早显示月日
 */
const formatConvTime = (time: string) => {
  if (!time) {
    return "";
  }
  const m = moment(time);
  if (m.isSame(moment(), "day")) {
    return m.format("HH:mm");
  }
  if (m.isSame(moment().subtract(1, "day"), "day")) {
    return "昨天";
  }
  return m.format("MM-DD");
};

/**
 * 聊天消息时间：月日 + 时分
 */
const formatMsgTime = (time: string) =>
  time ? moment(time).format("MM-DD HH:mm") : "";

/**
 * 是否自己发送的消息
 */
const isMine = (m: MessageItem) => Number(m.senderId) === myId;

/**
 * 加载会话列表：后端按最后消息时间倒序返回，时间统一规范化为可比较的字符串
 */
const loadConversations = async () => {
  convLoading.value = true;
  const res = await axios.post("/api/user/message/conversation/list/page", {
    current: 1,
    pageSize: 100,
  });
  convLoading.value = false;
  if (res.data?.code === 0) {
    conversations.value = (
      (res.data.data?.records ?? []) as Conversation[]
    ).map((c) => ({
      ...c,
      friendId: Number(c.friendId),
      lastTime: c.lastTime
        ? moment(c.lastTime).format("YYYY-MM-DD HH:mm:ss")
        : "",
    }));
  }
  // 个人主页“私信”跳转：自动打开对应会话（无历史消息则新建空会话）
  if (pendingFriendId && !pendingHandled) {
    pendingHandled = true;
    const fid = Number(pendingFriendId);
    let conv = conversations.value.find((c) => c.friendId === fid);
    if (!conv) {
      conv = {
        friendId: fid,
        friendName: pendingFriendName || `用户${fid}`,
        friendAvatar: undefined,
        lastContent: "",
        lastTime: "",
        unreadCount: 0,
      };
      conversations.value.push(conv);
    }
    openConversation(conv);
  }
};

/**
 * 打开会话：调用 conversation/open 标记已读并返回会话配置（含好友信息与第一条未读 id），
 * 再分页拉取与该好友的对话（每次 20 条，接口倒序，反转为正序展示）
 */
const openConversation = async (conv: Conversation) => {
  currentConv.value = conv;
  chatMessages.value = [];
  loadedPage.value = 0;
  hasMoreMessages.value = false;
  loadingMore.value = false;
  firstUnreadId.value = "";
  // 打开前快照未读数（open 接口会把未读清零，按钮文案用快照值）
  unreadJumpCount.value = conv.unreadCount;
  showJumpBtn.value = false;
  // 新会话重置跳转标志与自动消失计时
  jumpDismissed.value = false;
  clearJumpBtnHide();
  chatLoading.value = true;
  const openRes = await axios.post("/api/user/message/conversation/open", {
    friendId: conv.friendId,
  });
  if (openRes.data?.code === 0) {
    const data = openRes.data.data;
    conv.friendName = data.friendName ?? conv.friendName;
    conv.friendAvatar = data.friendAvatar ?? conv.friendAvatar;
    conv.unreadCount = Number(data.unreadCount ?? 0);
    firstUnreadId.value =
      data.firstUnreadId != null ? String(data.firstUnreadId) : "";
  }
  const res = await axios.post("/api/user/message/list/page", {
    current: 1,
    pageSize: MSG_PAGE_SIZE,
    type: 1,
    friendId: conv.friendId,
  });
  chatLoading.value = false;
  if (res.data?.code === 0) {
    const records = (res.data.data?.records ?? []) as MessageItem[];
    chatMessages.value = records.slice().reverse();
    loadedPage.value = 1;
    const total = Number(res.data.data?.total ?? 0);
    hasMoreMessages.value = total > chatMessages.value.length;
  }
  // conversation/open 已标记已读，校准顶部徽标
  store.dispatch("message/fetchUnread");
  scrollToBottom();
};

/**
 * 加载更早一页聊天记录：插入到数组前部，并补偿 scrollTop 保持视口内容不跳动
 */
const loadEarlierMessages = async () => {
  if (loadingMore.value || !hasMoreMessages.value || !currentConv.value) {
    return;
  }
  loadingMore.value = true;
  const nextPage = loadedPage.value + 1;
  const res = await axios.post("/api/user/message/list/page", {
    current: nextPage,
    pageSize: MSG_PAGE_SIZE,
    type: 1,
    friendId: currentConv.value.friendId,
  });
  if (res.data?.code === 0) {
    const records = (res.data.data?.records ?? []) as MessageItem[];
    if (records.length > 0) {
      const container = messagesRef.value;
      const prevHeight = container?.scrollHeight ?? 0;
      const prevTop = container?.scrollTop ?? 0;
      // 更早的消息整体插到数组前部（接口倒序，反转为正序）
      chatMessages.value = records.slice().reverse().concat(chatMessages.value);
      loadedPage.value = nextPage;
      const total = Number(res.data.data?.total ?? 0);
      hasMoreMessages.value = total > chatMessages.value.length;
      // 新增内容高度全部补偿到 scrollTop：用户看到的视口内容保持原位
      await nextTick();
      if (container) {
        container.scrollTop = container.scrollHeight - prevHeight + prevTop;
      }
    } else {
      hasMoreMessages.value = false;
    }
  }
  loadingMore.value = false;
};

/**
 * 消息区滚动：检查未读跳转按钮；滚到顶部附近时加载更早一页
 */
const onMessagesScroll = () => {
  checkJumpBtn();
  const el = messagesRef.value;
  if (el && el.scrollTop <= 20) {
    loadEarlierMessages();
  }
};

/**
 * 输入框按键：Enter 发送、Shift + Enter 换行
 */
const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    // Shift + Enter：保留默认换行行为
    return;
  }
  e.preventDefault();
  sendMessage();
};

/**
 * 发送消息
 */
const sendMessage = async () => {
  const content = inputContent.value.trim();
  if (!content || !currentConv.value) {
    return;
  }
  const conv = currentConv.value;
  inputContent.value = "";
  const res = await axios.post("/api/user/message/send", {
    receiverId: conv.friendId,
    content,
  });
  if (res.data?.code !== 0) {
    return;
  }
  // 追加到聊天记录并更新会话预览
  const sent = res.data.data as MessageItem | undefined;
  if (sent) {
    chatMessages.value.push(sent);
  }
  conv.lastContent = content;
  conv.lastTime = moment().format("YYYY-MM-DD HH:mm:ss");
  // 当前会话置顶并刷新会话列表
  sortConversations();
  loadConversations();
  scrollToBottom();
};

/**
 * 会话按最近消息时间倒序排列
 */
const sortConversations = () => {
  conversations.value.sort((a, b) => (a.lastTime < b.lastTime ? 1 : -1));
};

/**
 * 启动"10 秒未点击自动消失"计时
 */
const scheduleJumpBtnHide = () => {
  if (jumpHideTimer) {
    return;
  }
  jumpHideTimer = setTimeout(() => {
    jumpHideTimer = null;
    jumpDismissed.value = true;
    showJumpBtn.value = false;
  }, 10000);
};

/**
 * 清除自动消失计时
 */
const clearJumpBtnHide = () => {
  if (jumpHideTimer) {
    clearTimeout(jumpHideTimer);
    jumpHideTimer = null;
  }
};

/**
 * 检查"跳到第一条未读"按钮：存在第一条未读消息即显示（点击后消失）
 */
const checkJumpBtn = () => {
  // 已点击跳转：滚动事件不再把按钮拉回来
  if (jumpDismissed.value) {
    showJumpBtn.value = false;
    clearJumpBtnHide();
    return;
  }
  if (!firstUnreadId.value) {
    showJumpBtn.value = false;
    clearJumpBtnHide();
    return;
  }
  // 未读消息可能尚未加载进列表，也显示按钮（点击后自动向前翻页定位）
  showJumpBtn.value = true;
  scheduleJumpBtnHide();
};

/**
 * 跳转到第一条未读消息并短暂高亮：
 * 目标消息可能尚未加载（分页只取了最新 20 条），先向前翻页直到找到再定位
 */
const jumpToFirstUnread = async () => {
  // 标记已跳转：随后触发的 scroll 事件不再重新显示按钮
  jumpDismissed.value = true;
  showJumpBtn.value = false;
  // 点击即消失，无需再自动消失
  clearJumpBtnHide();
  // 第一条未读消息不在已加载数据中：持续加载更早一页直到找到
  while (
    !chatMessages.value.some((m) => String(m.id) === firstUnreadId.value) &&
    hasMoreMessages.value
  ) {
    await loadEarlierMessages();
  }
  await nextTick();
  const container = messagesRef.value;
  const target = document.getElementById(`msg-${firstUnreadId.value}`);
  if (!container || !target) {
    return;
  }
  container.scrollTo({
    top: target.offsetTop - container.offsetTop - 16,
    behavior: "smooth",
  });
  highlightedId.value = firstUnreadId.value;
  // 2 秒后取消高亮
  setTimeout(() => {
    if (highlightedId.value === firstUnreadId.value) {
      highlightedId.value = "";
    }
  }, 2000);
};

/**
 * 滚动聊天记录到底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    const el = messagesRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    checkJumpBtn();
  });
};

/**
 * 监听 SSE 实时推送：刷新会话列表；若属于当前会话则追加到聊天记录
 */
const stopWatchLatest = watch(
  () => store.state.message?.latestMessage,
  (msg) => {
    if (!msg || msg.type !== 1) {
      return;
    }
    loadConversations();
    const friendId =
      Number(msg.senderId) === myId
        ? Number(msg.receiverId)
        : Number(msg.senderId);
    if (currentConv.value && friendId === currentConv.value.friendId) {
      if (!chatMessages.value.some((m) => String(m.id) === String(msg.id))) {
        chatMessages.value.push(msg as unknown as MessageItem);
        scrollToBottom();
        // 当前会话实时到达的消息立即标记已读
        axios.post("/api/user/message/read/all", {
          type: 1,
          friendId,
        });
        store.dispatch("message/fetchUnread");
      }
    }
  }
);

onMounted(() => {
  loadConversations();
  // 进入页面后校准未读徽标
  store.dispatch("message/fetchUnread");
});

onUnmounted(() => {
  stopWatchLatest();
  clearJumpBtnHide();
});
</script>

<style scoped>
#chatView {
  /* 内容区高度：视口 - 顶部固定栏(96px 含间距) - 内容区底部 padding */
  height: calc(100vh - 96px - 20px);
  /* 聊天窗口整体限宽居中：宽屏下右侧窗口不至于拉得太宽 */
  max-width: 1080px;
  margin: 0 auto;
}

.chat-card {
  height: 100%;
}

/* 圆角方框包住会话列表与聊天窗口 */
.chat-card :deep(.arco-card) {
  height: 100%;
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  /* 裁剪内部浅灰背景，贴合圆角 */
  overflow: hidden;
}

.chat-card :deep(.arco-card-body) {
  height: 100%;
  padding: 0;
}

.chat-layout {
  display: flex;
  height: 100%;
}

/* 左侧会话列表 */
.chat-side {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border-2);
}

.chat-side-header {
  height: 56px;
  line-height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border-2);
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

/* 会话搜索框：位于标题下方，与列表分隔 */
.chat-side-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-2);
}

.chat-side-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.conv-item {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conv-item:hover {
  background-color: var(--color-fill-2);
}

/* 选中会话：与微信网页版一致的灰色高亮 */
.conv-item.active {
  background-color: #e5e6eb;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.conv-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  flex-shrink: 0;
  font-size: 12px;
  color: #86909c;
}

.conv-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.conv-preview {
  font-size: 12px;
  color: #86909c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧聊天窗口 */
.chat-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.chat-header {
  height: 56px;
  line-height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-2);
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

/* 消息区外层包裹：悬浮按钮的定位基准（自身不滚动，按钮始终可见） */
.chat-messages-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  /* 微信网页版聊天区浅灰背景 */
  background-color: #f5f5f5;
  /* 预留滚动条槽位：无论是否出现滚动条，消息右缘位置固定不跳动 */
  scrollbar-gutter: stable;
}

/* 顶部"加载更早消息"提示 */
.load-more-tip {
  padding: 4px 0 12px;
  text-align: center;
  font-size: 12px;
  color: #86909c;
}

.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  /* 头像统一顶部对齐：气泡高度变化时头像位置稳定 */
  align-items: flex-start;
  border-radius: 4px;
}

/* 跳转未读后的短暂高亮 */
.msg-row.highlight {
  animation: unread-flash 2s ease;
}

@keyframes unread-flash {
  0% {
    background-color: rgba(255, 222, 138, 0.6);
  }
  100% {
    background-color: transparent;
  }
}

/* 跳到第一条未读按钮：悬浮在消息区右上角 */
.jump-unread-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 16px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  color: #165dff;
  cursor: pointer;
  user-select: none;
}

.jump-unread-btn:hover {
  background-color: var(--color-fill-2);
}

/* 自己发送的消息：整行靠右（头像在最右贴边，气泡在头像左侧） */
.msg-row.mine {
  justify-content: flex-end;
}

.msg-col {
  display: flex;
  flex-direction: column;
  max-width: 60%;
}

.msg-row.mine .msg-col {
  align-items: flex-end;
}

.bubble {
  padding: 10px 14px;
  border-radius: 4px;
  background-color: #fff;
  font-size: 14px;
  color: #1d2129;
  word-break: break-word;
  white-space: pre-wrap;
}

/* 自己消息：微信绿色气泡 */
.msg-row.mine .bubble {
  background-color: #95ec69;
}

.msg-time {
  margin-top: 4px;
  font-size: 11px;
  color: #86909c;
}

.chat-input-area {
  border-top: 1px solid var(--color-border-2);
  padding: 12px 16px;
}

/* 输入面板：输入框与最后一行（提示 + 发送按钮）同一背景同一边框 */
.chat-input-panel {
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background-color: #fff;
  padding: 8px 12px;
  transition: border-color 0.2s;
}

.chat-input-panel:focus-within {
  border-color: #165dff;
}

/* 输入框去掉自身边框与背景，完全融入面板 */
.chat-input-panel :deep(.arco-textarea-wrapper) {
  border: none;
  background-color: transparent;
  padding: 0;
}

/* 输入框最后一行：提示紧挨发送按钮左侧，整体靠右 */
.chat-input-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.chat-input-tip {
  font-size: 12px;
  color: #86909c;
}

.chat-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  background-color: #f5f5f5;
}
</style>
