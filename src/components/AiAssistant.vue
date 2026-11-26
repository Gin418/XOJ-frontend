<template>
  <!-- AI 助手悬浮球：默认收起在墙里，悬停/点击展开，可上下拖动，闲置后自动收回 -->
  <div
    class="ai-assistant-wrap"
    :class="{ retracted: !expanded, dragging: isDragging }"
    :style="{ top: ballTop + 'px' }"
    @mouseenter="onBallEnter"
    @mouseleave="onBallLeave"
  >
    <div
      class="ai-assistant-ball"
      @pointerdown="onPointerDown"
      @click="togglePanel"
    >
      <icon-robot class="ball-icon" />
      <!-- 流式回复中：右上角状态点 -->
      <span v-if="streaming" class="ball-dot" />
    </div>
  </div>

  <!-- 聊天面板 -->
  <transition name="assistant-panel">
    <div v-if="panelOpen" class="ai-assistant-panel" :style="panelStyle">
      <div class="panel-header">
        <div
          ref="sessionsBarRef"
          class="panel-sessions"
          @wheel.prevent="onSessionsWheel"
        >
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-tab"
            :class="{ active: s.id === activeId }"
            :title="s.title"
            @click="switchSession(s)"
          >
            <span class="session-tab-title">{{ s.title }}</span>
            <icon-close
              class="session-tab-close"
              @click.stop="removeSession(s)"
            />
          </div>
        </div>
        <div class="panel-header-actions">
          <a-button size="mini" type="text" @click="newChat">新会话</a-button>
          <span class="panel-close" @click="panelOpen = false">
            <icon-close />
          </span>
        </div>
      </div>
      <div ref="bodyRef" class="panel-body">
        <a-empty
          v-if="!activeSession?.messages.length"
          class="panel-empty"
          :description="
            activeSession?.loaded
              ? '有问题随时问我，例如：A1001的思路是什么？'
              : '历史加载中…'
          "
        />
        <div
          v-for="(item, index) in activeSession?.messages"
          :key="index"
          class="chat-item"
          :class="`chat-${item.role}`"
        >
          <div class="chat-bubble">
            <!-- 同一问题此前的回复：默认折叠，点击展开查看 -->
            <div
              v-if="
                item.role === 'assistant' && (item.history?.length ?? 0) > 0
              "
              class="chat-history"
            >
              <div class="chat-history-toggle" @click="toggleHistory(item)">
                <span>思考（{{ item.history?.length }}）</span>
                <icon-down
                  class="chat-history-arrow"
                  :class="{ 'arrow-expanded': item.historyExpanded }"
                />
              </div>
              <template v-if="item.historyExpanded">
                <div
                  v-for="(h, i) in item.history"
                  :key="i"
                  class="chat-history-item"
                >
                  <div class="chat-history-index">第 {{ i + 1 }} 条</div>
                  <MdViewer :value="h" />
                </div>
              </template>
            </div>
            <!-- AI 回复完成后用 Markdown 渲染；流式接收中显示纯文本 -->
            <MdViewer
              v-if="
                item.role === 'assistant' && !item.streaming && item.content
              "
              :value="item.content"
            />
            <div v-else class="chat-plain">
              {{
                item.role === "assistant" && !item.content
                  ? "正在思考…"
                  : item.content
              }}
            </div>
          </div>
        </div>
      </div>
      <div class="panel-footer">
        <a-textarea
          v-model="inputText"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          @keydown="onInputKeydown"
        />
        <a-button
          type="primary"
          :loading="streaming"
          :disabled="streaming || isActiveFull"
          @click="send"
        >
          发送
        </a-button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import message from "@arco-design/web-vue/es/message";
import { IconClose, IconDown, IconRobot } from "@arco-design/web-vue/es/icon";
import MdViewer from "@/components/MdViewer.vue";
import { useStore } from "vuex";
import { API2_BASE } from "@/plugins/api2";

/**
 * 聊天消息：user 为提问，assistant 为 AI 回复
 */
interface ChatItem {
  role: "user" | "assistant";
  content: string;
  /** 是否正在流式接收中 */
  streaming?: boolean;
  /** 打字机缓冲：当前（最后一条）SSE 消息内容，流结束后逐段展示 */
  pending?: string;
  /** 同一问题此前收到的回复内容（除最后一条外，默认折叠展示） */
  history?: string[];
  /** 此前回复列表是否展开 */
  historyExpanded?: boolean;
}

/**
 * 会话窗口：一个窗口对应后端一个 chatId 会话
 */
interface ChatSession {
  /** 本地窗口 id（稳定，用作列表 key 与活动标记） */
  id: string;
  /** 后端会话 id：刷新后沿用，后端据此返回历史消息 */
  chatId: string;
  /** 窗口标题：取该会话第一条提问的截断 */
  title: string;
  /** 窗口内消息列表 */
  messages: ChatItem[];
  /** 历史消息是否已从后端加载（新窗口视为已加载） */
  loaded: boolean;
}

/** 持久化的会话窗口元信息 */
interface StoredSession {
  id: string;
  chatId: string;
  title: string;
}

// 最多同时保留的会话窗口数
const MAX_SESSIONS = 5;
// 每个窗口最多提问条数
const MAX_MESSAGES_PER_SESSION = 5;
// 会话窗口元信息的 localStorage 键：刷新不重置会话
const SESSIONS_KEY = "xoj_ai_assistant_sessions";

// 闲置多久自动收回墙里（毫秒）
const RETRACT_DELAY = 5000;
// 拖动判定阈值：位移超过该值视为拖动而非点击（px）
const DRAG_THRESHOLD = 4;
// 球上下边距（px）
const BALL_MARGIN = 12;
// 球直径（px），与样式保持一致
const BALL_SIZE = 56;

// 悬浮球纵向位置（距视口顶部 px），默认在屏幕右侧垂直居中
const ballTop = ref((window.innerHeight - BALL_SIZE) / 2);
// 是否展开在墙外（收起时藏进墙里一半）
const expanded = ref(false);
// 是否正在拖动
const isDragging = ref(false);
// 闲置自动收回计时器
let retractTimer: number | null = null;
// 拖动起始信息与位移标记
let dragStartY = 0;
let dragStartTop = 0;
let dragMoved = false;

// 聊天面板显隐
const panelOpen = ref(false);
// 会话窗口列表
const sessions = ref<ChatSession[]>([]);
// 当前活动窗口 id
const activeId = ref("");
// 输入框内容
const inputText = ref("");
// 是否正在等待 AI 回复（SSE 流式接收中）
const streaming = ref(false);
// 消息列表滚动容器
const bodyRef = ref<HTMLElement>();
// 会话 tabs 滚动容器
const sessionsBarRef = ref<HTMLElement>();
// 当前进行中的请求：页面卸载时中止
let controller: AbortController | null = null;
// 打字机输出计时器：把缓冲内容按节奏逐段展示
let typeTimer: number | null = null;
// 本次 SSE 流是否已结束（结束后打字机继续把缓冲打完再收尾）
let streamEnded = false;
// 当前正在接收回复的窗口 id：删除该窗口时中止请求
let streamingSessionId = "";

const store = useStore();

/**
 * 当前活动会话窗口
 */
const activeSession = computed(
  () => sessions.value.find((s) => s.id === activeId.value) ?? sessions.value[0]
);

/**
 * 当前窗口是否已达提问上限（用于禁用发送按钮）
 */
const isActiveFull = computed(() => {
  const session = activeSession.value;
  return (
    !!session &&
    session.messages.filter((m) => m.role === "user").length >=
      MAX_MESSAGES_PER_SESSION
  );
});

/**
 * 生成会话 id：优先浏览器原生 UUID，兜底时间戳 + 随机数
 */
const genChatId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * 滚动消息列表到底部
 */
const scrollToBottom = async () => {
  await nextTick();
  const el = bodyRef.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
};

/**
 * 活动会话 tab 滚入可见区（窗口多时横向滚动定位）
 */
const scrollActiveTabIntoView = async () => {
  await nextTick();
  sessionsBarRef.value
    ?.querySelector<HTMLElement>(".session-tab.active")
    ?.scrollIntoView({ inline: "nearest", block: "nearest" });
};

/**
 * 会话 tabs 区滚轮事件：纵向滚轮转为横向滚动（触控板横向手势不受影响）
 */
const onSessionsWheel = (e: WheelEvent) => {
  const el = sessionsBarRef.value;
  if (!el) {
    return;
  }
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    el.scrollLeft += e.deltaY;
  }
};

/**
 * 球纵向位置约束：顶部/底部各留 BALL_MARGIN
 */
const clampTop = (top: number) =>
  Math.max(
    BALL_MARGIN,
    Math.min(top, window.innerHeight - BALL_SIZE - BALL_MARGIN)
  );

/**
 * 点击悬浮球：切换聊天面板显隐（拖动结束后会补发 click，位移过大时忽略）
 */
const togglePanel = () => {
  if (dragMoved) {
    dragMoved = false;
    return;
  }
  panelOpen.value = !panelOpen.value;
  if (panelOpen.value) {
    expanded.value = true;
    cancelRetract();
    scrollToBottom();
  } else {
    scheduleRetract();
  }
};

/**
 * 取消闲置收回计时
 */
const cancelRetract = () => {
  if (retractTimer !== null) {
    clearTimeout(retractTimer);
    retractTimer = null;
  }
};

/**
 * 闲置一段时间后收回墙里（面板关闭时才生效）
 */
const scheduleRetract = () => {
  cancelRetract();
  retractTimer = window.setTimeout(() => {
    if (!panelOpen.value) {
      expanded.value = false;
    }
  }, RETRACT_DELAY);
};

/**
 * 悬停悬浮球：展开并取消收回计时
 */
const onBallEnter = () => {
  cancelRetract();
  expanded.value = true;
};

/**
 * 移出悬浮球：面板未打开时启动闲置收回计时
 */
const onBallLeave = () => {
  if (!panelOpen.value && !isDragging.value) {
    scheduleRetract();
  }
};

/**
 * 按下悬浮球：开始跟踪拖动（pointer 事件同时支持鼠标与触摸）
 */
const onPointerDown = (e: PointerEvent) => {
  e.preventDefault();
  dragStartY = e.clientY;
  dragStartTop = ballTop.value;
  dragMoved = false;
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
};

/**
 * 拖动中：位移超过阈值进入拖动状态，球沿右侧墙壁上下移动
 */
const onPointerMove = (e: PointerEvent) => {
  const dy = e.clientY - dragStartY;
  if (!isDragging.value && Math.abs(dy) < DRAG_THRESHOLD) {
    return;
  }
  if (!isDragging.value) {
    isDragging.value = true;
    dragMoved = true;
    expanded.value = true;
    cancelRetract();
    document.body.style.userSelect = "none";
  }
  ballTop.value = clampTop(dragStartTop + dy);
};

/**
 * 松开：结束拖动；拖拽后浏览器会补发 click，延后复位标记以免吞掉下一次真实点击
 */
const onPointerUp = () => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  if (isDragging.value) {
    isDragging.value = false;
    document.body.style.userSelect = "";
    scheduleRetract();
    window.setTimeout(() => {
      dragMoved = false;
    }, 0);
  }
};

/**
 * 窗口尺寸变化：球位置重新约束在可视范围内
 */
const onWindowResize = () => {
  ballTop.value = clampTop(ballTop.value);
};

/**
 * 面板纵向位置：以球心为基准垂直居中，上下各留 12px，防止面板越出视口
 */
const panelStyle = computed(() => {
  const panelH = Math.min(520, window.innerHeight - 160);
  const top = Math.max(
    BALL_MARGIN,
    Math.min(
      ballTop.value + BALL_SIZE / 2 - panelH / 2,
      window.innerHeight - panelH - BALL_MARGIN
    )
  );
  return { top: `${top}px` };
});

/**
 * 持久化会话窗口元信息（刷新后据此恢复，chatId 不重置）
 */
const saveState = () => {
  try {
    localStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify({
        activeId: activeId.value,
        sessions: sessions.value.map((s) => ({
          id: s.id,
          chatId: s.chatId,
          title: s.title,
        })),
      })
    );
  } catch {
    // localStorage 不可用时静默降级：仅当前页面内有效
  }
};

/**
 * 从 localStorage 恢复会话窗口（仅元信息，消息由 history 接口加载）
 */
const restoreState = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw) as {
      activeId?: string;
      sessions?: StoredSession[];
    };
    const list = parsed.sessions;
    if (!Array.isArray(list) || !list.length) {
      return false;
    }
    sessions.value = list.map((s) => ({
      id: s.id,
      chatId: s.chatId,
      title: s.title || "会话",
      messages: [],
      loaded: false,
    }));
    activeId.value =
      parsed.activeId && sessions.value.some((s) => s.id === parsed.activeId)
        ? parsed.activeId
        : sessions.value[0].id;
    return true;
  } catch {
    return false;
  }
};

/**
 * 新建会话窗口：最多 MAX_SESSIONS 个，超出提示
 */
const newChat = () => {
  if (sessions.value.length >= MAX_SESSIONS) {
    message.warning(
      `最多创建 ${MAX_SESSIONS} 个会话窗口，可在其他窗口继续提问`
    );
    return;
  }
  const session: ChatSession = {
    id: genChatId(),
    chatId: genChatId(),
    title: "新会话",
    messages: [],
    loaded: true, // 新窗口无历史可加载
  };
  sessions.value.push(session);
  activeId.value = session.id;
  saveState();
  scrollToBottom();
  scrollActiveTabIntoView();
};

/**
 * 删除会话窗口：正在接收回复的窗口先中止请求；
 * 删空后自动补一个空窗口，保证面板始终有会话可用
 */
const removeSession = (session: ChatSession) => {
  if (streaming.value && streamingSessionId === session.id) {
    controller?.abort();
    controller = null;
    stopTypewriter();
    streaming.value = false;
    streamingSessionId = "";
  }
  const index = sessions.value.findIndex((s) => s.id === session.id);
  if (index === -1) {
    return;
  }
  sessions.value.splice(index, 1);
  if (sessions.value.length === 0) {
    newChat();
    return;
  }
  if (activeId.value === session.id) {
    // 优先切到下一个窗口，没有则切到上一个
    activeId.value =
      sessions.value[Math.min(index, sessions.value.length - 1)].id;
    const next = sessions.value.find((s) => s.id === activeId.value);
    if (next) {
      loadHistory(next);
    }
  }
  saveState();
  scrollActiveTabIntoView();
};

/**
 * 切换活动窗口：首次进入时从后端加载历史消息
 */
const switchSession = (session: ChatSession) => {
  if (activeId.value === session.id) {
    return;
  }
  activeId.value = session.id;
  saveState();
  loadHistory(session);
  scrollToBottom();
  scrollActiveTabIntoView();
};

/**
 * 从后端加载会话历史消息（GET /ai/oj_assistant/history?chatId=xxx），
 * 返回 List<Map<String,String>>，每条含角色（role/type）与内容
 * （content/message/text/question）字段。
 * 后端存有同一问题的全部回复：连续的 assistant 消息合并为一条，
 * 最后一段正常展示、其余归档进折叠区；加载期间本地新发的消息排后
 */
const loadHistory = async (session: ChatSession) => {
  if (session.loaded) {
    return;
  }
  session.loaded = true;
  if (!API2_BASE) {
    return;
  }
  const url = `${API2_BASE}/ai/oj_assistant/history?chatId=${encodeURIComponent(
    session.chatId
  )}`;
  const headers: Record<string, string> = {};
  const token = store.state.user?.token;
  if (token) {
    headers["uc-token"] = token;
  }
  try {
    const res = await fetch(url, { headers, credentials: "include" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const list = (await res.json()) as unknown;
    if (!Array.isArray(list)) {
      return;
    }
    const items: ChatItem[] = [];
    for (const entry of list) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const map = entry as Record<string, unknown>;
      const role = String(map.role ?? map.type ?? "").toLowerCase();
      const content = String(
        map.content ?? map.message ?? map.text ?? map.question ?? ""
      );
      if (!content) {
        continue;
      }
      items.push({
        role: role.startsWith("user") ? "user" : "assistant",
        content,
      });
    }
    // 同一问题的多段回复（连续 assistant 消息）合并为一条：
    // 最后一段正常展示，其余归档到折叠区
    const merged: ChatItem[] = [];
    for (const item of items) {
      const last = merged[merged.length - 1];
      if (item.role === "assistant" && last?.role === "assistant") {
        last.history = [...(last.history ?? []), last.content];
        last.content = item.content;
        continue;
      }
      merged.push(item);
    }
    // 历史消息在前，加载期间本地新发的消息排后
    session.messages = [...merged, ...session.messages];
    scrollToBottom();
  } catch {
    // 历史加载失败不阻塞使用：新消息仍可正常发送
  }
};

/**
 * 停止打字机输出
 */
const stopTypewriter = () => {
  if (typeTimer !== null) {
    clearInterval(typeTimer);
    typeTimer = null;
  }
};

/**
 * 启动打字机：流结束后把 pending（最后一条 SSE 消息）逐段挪进展示内容。
 * 缓冲越大步长越大（每 tick 2~8 字）；缓冲打完时回调 onDone 收尾
 */
const startTypewriter = (item: ChatItem, onDone: () => void) => {
  stopTypewriter();
  typeTimer = window.setInterval(() => {
    if (!streamEnded) {
      // 流未结束前不输出：此时 pending 可能还会被后续消息覆盖，等最终内容确定再打
      return;
    }
    const pending = item.pending ?? "";
    if (pending) {
      const step = Math.min(8, Math.max(2, Math.ceil(pending.length / 30)));
      item.content += pending.slice(0, step);
      item.pending = pending.slice(step);
      scrollToBottom();
    } else {
      stopTypewriter();
      onDone();
    }
  }, 25);
};

/**
 * 处理一帧 SSE 数据（帧间以空行分隔）：
 * 同一问题后端会推送多条消息，除最后一条外归档进折叠区展示；
 * 支持 data: 纯文本块与 JSON（content/text/data/message 字段取文本）；
 * 若服务端下发 chatId（event: chatId 或 data JSON 内 chatId 字段）则更新会话并持久化。
 * 内容写入 pending 缓冲，流结束后由打字机逐段展示
 */
const handleFrame = (frame: string, item: ChatItem, session: ChatSession) => {
  let eventName = "";
  let data = "";
  let hasLine = false;
  for (const rawLine of frame.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith(":")) {
      continue;
    }
    hasLine = true;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += (data ? "\n" : "") + line.slice(5).trim();
    }
  }
  if (!hasLine) {
    return;
  }
  if (!data) {
    if (eventName) {
      // 只有 event 无 data 的帧（如心跳）：忽略
      return;
    }
    // 非标准 SSE 帧（如后端直接返回整段 JSON/文本）：整帧作为内容处理
    data = frame.trim();
    if (!data) {
      return;
    }
  }
  if (eventName === "chatId") {
    session.chatId = data;
    saveState();
    return;
  }
  try {
    const obj = JSON.parse(data);
    if (obj && typeof obj === "object") {
      if (obj.chatId) {
        session.chatId = String(obj.chatId);
        saveState();
      }
      const text = obj.content ?? obj.text ?? obj.data ?? obj.message;
      if (typeof text === "string" && text) {
        archivePending(item);
        item.pending = text;
        return;
      }
      return;
    }
  } catch {
    // 非 JSON：按纯文本处理
  }
  archivePending(item);
  item.pending = data;
};

/**
 * 归档上一条消息：pending 已有内容时存入 history，
 * 同一问题的多条回复除最后一条外全部折叠展示
 */
const archivePending = (item: ChatItem) => {
  const prev = item.pending ?? "";
  if (prev) {
    item.history = [...(item.history ?? []), prev];
  }
};

/**
 * 切换此前回复列表的展开/折叠
 */
const toggleHistory = (item: ChatItem) => {
  item.historyExpanded = !item.historyExpanded;
};

/**
 * 发送消息：通过 Api2（第二个后端地址）请求 AI 助手 SSE 接口，流式接收回复。
 * 用 fetch 流式读取而非 EventSource：可携带 uc-token 请求头，
 * 且断线不会自动重连（重连会带上原 message 重复提问）
 */
const send = async () => {
  const text = inputText.value.trim();
  if (!text || streaming.value) {
    return;
  }
  const session = activeSession.value;
  if (!session) {
    return;
  }
  if (
    session.messages.filter((m) => m.role === "user").length >=
    MAX_MESSAGES_PER_SESSION
  ) {
    message.warning(
      `本会话最多提问 ${MAX_MESSAGES_PER_SESSION} 条，请新建会话继续`
    );
    return;
  }
  if (!API2_BASE) {
    message.warning(
      "未配置第二个后端地址（VUE_APP_API_BASE2），请填写后重启服务"
    );
    return;
  }
  if (!session.chatId) {
    session.chatId = genChatId();
    saveState();
  }
  session.messages.push({ role: "user", content: text });
  // 首条提问作为窗口标题
  if (session.title === "新会话") {
    session.title = text.length > 10 ? `${text.slice(0, 10)}…` : text;
    saveState();
  }
  inputText.value = "";
  const item: ChatItem = {
    role: "assistant",
    content: "",
    streaming: true,
  };
  session.messages.push(item);
  streaming.value = true;
  streamingSessionId = session.id;
  // 复位流结束标记：流结束后打字机把最后一条消息逐段输出
  streamEnded = false;
  startTypewriter(item, () => {
    if (!item.content) {
      item.content = "[无回复内容]";
    }
    item.streaming = false;
    streaming.value = false;
    streamingSessionId = "";
    controller = null;
    scrollToBottom();
  });
  scrollToBottom();

  controller = new AbortController();
  const url = `${API2_BASE}/ai/oj_assistant/chat?message=${encodeURIComponent(
    text
  )}&chatId=${encodeURIComponent(session.chatId)}`;
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  // 与 axios 拦截器一致：携带登录 token 到请求头 uc-token，后端据此识别用户
  const token = store.state.user?.token;
  if (token) {
    headers["uc-token"] = token;
  }
  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      credentials: "include",
    });
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      // SSE 帧以空行分隔，逐帧解析追加
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        handleFrame(frame, item, session);
        scrollToBottom();
        boundary = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim()) {
      handleFrame(buffer, item, session);
      scrollToBottom();
    }
  } catch (error) {
    if ((error as Error | undefined)?.name !== "AbortError") {
      message.error("AI 助手请求失败，请稍后重试");
      // 失败提示追加到缓冲，由打字机输出，保证气泡有内容可展示
      item.pending =
        (item.pending ?? "") +
        (item.content || item.pending
          ? "\n\n[回复中断]"
          : "[回复失败，请稍后重试]");
    }
  } finally {
    // 流结束：缓冲不直接吐出，由打字机继续逐段输出，
    // 打完后定时器回调完成收尾（避免一次性整段显示）
    streamEnded = true;
  }
};

/**
 * 输入框键盘事件：Enter 发送，Shift+Enter 换行（isComposing 防止中文输入法选词回车误发）
 */
const onInputKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send();
  }
};

onMounted(() => {
  window.addEventListener("resize", onWindowResize);
  // 刷新不重置会话：从 localStorage 恢复窗口；
  // 历史按需加载：只请求当前活动窗口，其他窗口点开时再请求
  if (!restoreState()) {
    newChat();
  } else {
    const active = activeSession.value;
    if (active) {
      loadHistory(active);
    }
  }
  scrollActiveTabIntoView();
});

onUnmounted(() => {
  controller?.abort();
  controller = null;
  stopTypewriter();
  cancelRetract();
  retractTimer = null;
  window.removeEventListener("resize", onWindowResize);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  document.body.style.userSelect = "";
});
</script>

<style scoped>
/* 悬浮球外层包裹：贴右侧墙壁，通过位移控制展开/收起 */
.ai-assistant-wrap {
  position: fixed;
  right: 0;
  z-index: 1000;
  transition: transform 0.3s ease;
}

/* 收起状态：向右藏进墙里一半（球 56px，藏 28px），只露出半个球 */
.ai-assistant-wrap.retracted {
  transform: translateX(56px);
}

/* 拖动中：关闭过渡保证跟手 */
.ai-assistant-wrap.dragging {
  transition: none;
}

/* 悬浮球：圆形渐变按钮 */
.ai-assistant-ball {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-right: 28px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgb(var(--primary-6)),
    rgb(var(--primary-4))
  );
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  touch-action: none;
}

.ai-assistant-wrap:not(.dragging) .ai-assistant-ball:hover {
  transform: scale(1.06);
}

.ai-assistant-ball .ball-icon {
  font-size: 28px;
  color: #fff;
}

/* 流式回复中：右上角状态点 */
.ai-assistant-ball .ball-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--danger-6));
  border: 2px solid #fff;
}

/* 聊天面板：悬浮球左侧（right 为球右缘 28px + 球宽 56px + 间距 8px），
   纵向位置由脚本按球位置动态计算 */
.ai-assistant-panel {
  position: fixed;
  right: 92px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: 420px;
  max-width: calc(100vw - 56px);
  height: 520px;
  max-height: calc(100vh - 160px);
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

/* 面板头部：会话窗口 tabs + 新会话/关闭 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  height: 48px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--color-neutral-3);
}

/* 会话窗口 tabs：横向滚动，细滚动条 */
.panel-sessions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-neutral-3) transparent;
}

.panel-sessions::-webkit-scrollbar {
  height: 4px;
}

.panel-sessions::-webkit-scrollbar-track {
  background: transparent;
}

.panel-sessions::-webkit-scrollbar-thumb {
  background: var(--color-neutral-3);
  border-radius: 2px;
}

.session-tab {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
  max-width: 130px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-2);
  background: var(--color-fill-2);
  cursor: pointer;
}

.session-tab-title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.session-tab-close {
  flex: none;
  font-size: 12px;
  opacity: 0.55;
}

.session-tab-close:hover {
  opacity: 1;
}

.session-tab:hover {
  color: var(--color-text-1);
}

.session-tab.active {
  background: rgb(var(--primary-6));
  color: #fff;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  margin-left: 8px;
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-3);
}

.panel-close:hover {
  background: var(--color-fill-2);
  color: var(--color-text-1);
}

/* 消息列表：面板内独立滚动 */
.panel-body {
  flex: 1;
  min-height: 0;
  padding: 12px 16px;
  overflow-y: auto;
}

.panel-empty {
  margin-top: 40px;
}

.chat-item {
  display: flex;
  margin-bottom: 12px;
}

.chat-user {
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 86%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

/* 提问气泡：主色白字靠右 */
.chat-user .chat-bubble {
  background: rgb(var(--primary-6));
  color: #fff;
}

/* AI 回复气泡：浅灰底靠左 */
.chat-assistant .chat-bubble {
  background: var(--color-fill-2);
  color: var(--color-text-1);
}

/* AI 回复气泡内的 Markdown 预览：背景透明融入气泡 */
.chat-assistant .chat-bubble :deep(.md-editor) {
  --md-bk-color: transparent;
  background: transparent;
}

/* 流式接收中的纯文本 */
.chat-plain {
  white-space: pre-wrap;
}

/* 同一问题此前的回复：默认折叠 */
.chat-history {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-neutral-3);
}

.chat-history-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-3);
  cursor: pointer;
  user-select: none;
}

.chat-history-toggle:hover {
  color: rgb(var(--primary-6));
}

.chat-history-arrow {
  transition: transform 0.2s;
}

.chat-history-arrow.arrow-expanded {
  transform: rotate(180deg);
}

.chat-history-item {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--color-fill-1);
}

.chat-history-index {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}

/* 面板底部：输入框 + 发送按钮 */
.panel-footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex: none;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--color-neutral-3);
}

.panel-footer :deep(.arco-textarea) {
  flex: 1;
}

/* 面板开合动画 */
.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
