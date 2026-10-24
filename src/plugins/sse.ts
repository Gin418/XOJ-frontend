// 用户登录后建立 SSE 长连接，实时接收消息推送；
// 多窗口共享一条连接：同源窗口间通过 Web Locks 选举唯一连接窗口（leader），
// leader 收到事件后经 BroadcastChannel 广播给其他窗口，leader 窗口关闭后其余窗口自动接管；
// 连接失败后每隔 3 秒自动重试，退出登录时主动断开
import store from "@/store";
import Notification from "@arco-design/web-vue/es/notification";

/**
 * SSE 推送的消息体（对应后端 MessageVO）
 */
interface SseMessage {
  id?: number;
  /** 消息类型：0 系统通知、1 私信 */
  type?: number;
  /** 标题（系统通知使用） */
  title?: string;
  /** 内容 */
  content?: string;
  /** 发送用户 id */
  senderId?: number;
  /** 发送用户昵称（私信使用） */
  senderName?: string;
  /** 发送用户头像 */
  senderAvatar?: string;
  /** 接收用户 id */
  receiverId?: number;
  /** 是否已读：0 未读、1 已读 */
  isRead?: number;
  /** 创建时间 */
  createTime?: string;
}

// SSE 连接地址
const SSE_CONNECT_URL = "/api/user/sse/connect";

// 连接失败后的重试间隔（毫秒）
const RETRY_INTERVAL = 3000;

// 多窗口连接选举锁名：同一浏览器中仅持锁窗口负责建立 SSE 连接
const SSE_LOCK_NAME = "sse-connection";

// 同源窗口广播通道名：leader 窗口将收到的事件转发给其他窗口
const SSE_CHANNEL_NAME = "sse-share";

let abortController: AbortController | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

// 排队等锁的控制器：退出登录时终止排队
let acquireController: AbortController | null = null;

// 释放连接锁：leader 窗口持锁期间保持 pending，退出登录时 resolve 释放
let releaseLock: (() => void) | null = null;

// 主动断开标记：退出登录后不再自动重试
let closedByHand = false;

// 同源窗口广播通道：非 leader 窗口通过它接收事件（不支持时降级为仅本窗口处理）
const channel: BroadcastChannel | null =
  typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel(SSE_CHANNEL_NAME);

// 接收 leader 窗口广播的事件
channel?.addEventListener("message", (event: MessageEvent) => {
  const { eventName, data } = event.data;
  handleEvent(eventName, data);
});

// 已弹窗消息 id 去重集合：防止重连或广播边界下同一消息重复弹窗
const shownMessageIds = new Set<string>();
const MAX_SHOWN_IDS = 50;

/**
 * 收到服务端推送的消息：弹窗显示（0 系统通知、1 私信）
 */
const showMessagePopup = (data: string) => {
  let message: SseMessage;
  try {
    message = JSON.parse(data) as SseMessage;
  } catch {
    console.warn("SSE 消息解析失败：", data);
    return;
  }
  console.log("SSE 收到 message 消息：", message);
  // 按消息 id 去重（雪花 id 解析为 number 会丢精度，但同值比较不受影响）
  if (message.id != null) {
    const key = String(message.id);
    if (shownMessageIds.has(key)) {
      return;
    }
    shownMessageIds.add(key);
    if (shownMessageIds.size > MAX_SHOWN_IDS) {
      const firstId = shownMessageIds.values().next().value;
      if (firstId !== undefined) {
        shownMessageIds.delete(firstId);
      }
    }
  }
  if (message.type === 1) {
    // 私信
    Notification.info({
      title: `${message.senderName ?? "用户"} 的私信`,
      content: message.content ?? "",
      duration: 5000,
    });
  } else {
    // 系统通知
    Notification.success({
      title: message.title ?? "系统通知",
      content: message.content ?? "",
      duration: 5000,
    });
  }
  // 顶部导航未读徽标实时 +1（进入消息中心后由页面重新拉取校准）
  store.commit("message/increaseUnread", message.type === 1 ? 1 : 0);
  // 写入最新消息：聊天页监听后实时刷新会话列表与聊天记录
  store.commit("message/receiveMessage", message);
};

/**
 * 处理一条 SSE 事件：连接回执与消息推送统一在此分发
 */
const handleEvent = (eventName: string, data: string) => {
  if (eventName === "connected") {
    console.log("SSE 连接建立，userId =", data);
  } else if (eventName === "message") {
    // 服务端推送的消息（私信 / 系统通知）：弹窗提示
    showMessagePopup(data);
  }
};

/**
 * 分发一条事件：本窗口处理，并广播给同源其他窗口（BroadcastChannel 不会发回发送者）
 */
const dispatchEvent = (eventName: string, data: string) => {
  handleEvent(eventName, data);
  channel?.postMessage({ eventName, data });
};

/**
 * 解析一条 SSE 帧：提取 event 字段与 data 字段（多行 data 以换行拼接）
 */
const handleFrame = (frame: string) => {
  if (!frame) {
    return;
  }
  let eventName = "message";
  const dataLines: string[] = [];
  frame.split("\n").forEach((line) => {
    // 冒号开头的注释行（后端心跳保活）忽略
    if (line.startsWith(":")) {
      return;
    }
    const colonIndex = line.indexOf(":");
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? "" : line.slice(colonIndex + 1);
    // 冒号后紧跟的空格不属于数据
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }
    if (field === "data") {
      dataLines.push(value);
    } else if (field === "event") {
      eventName = value;
    }
  });
  if (dataLines.length === 0) {
    return;
  }
  dispatchEvent(eventName, dataLines.join("\n"));
};

/**
 * 解析流式数据块：按空行切分完整帧并分发，返回未完成的残帧
 */
const parseSseBuffer = (buffer: string): string => {
  let index: number;
  while ((index = buffer.indexOf("\n\n")) !== -1) {
    const frame = buffer.slice(0, index);
    buffer = buffer.slice(index + 2);
    handleFrame(frame);
  }
  return buffer;
};

/**
 * 连接失败或被动断开后调度重试
 */
const scheduleRetry = () => {
  if (closedByHand) {
    return;
  }
  clearRetryTimer();
  retryTimer = setTimeout(connect, RETRY_INTERVAL);
};

/**
 * 建立 SSE 连接：token 通过请求头 uc-token 携带（与 axios 拦截器一致）
 */
const connect = async () => {
  const token = store.state.user?.token;
  if (!token) {
    console.warn("SSE 未连接：store 中没有登录 token");
    return;
  }
  // 重连前先中断旧连接，避免同一用户建立多条连接
  abort();
  clearRetryTimer();
  const controller = new AbortController();
  abortController = controller;
  console.log("SSE 发起连接...");
  try {
    const response = await fetch(`${SSE_CONNECT_URL}?_t=${Date.now()}`, {
      headers: {
        "uc-token": token,
        Accept: "text/event-stream",
      },
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`SSE 连接失败，状态码 ${response.status}`);
    }
    console.log("SSE 连接已建立，状态码", response.status);
    // 流式读取并解析 SSE 数据
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      buffer = parseSseBuffer(buffer);
    }
    // 流正常结束（服务端主动断开）：视为连接中断，重试重连
    throw new Error("SSE 连接断开");
  } catch (error) {
    // 主动断开（退出登录或重连前中断旧连接）不重试
    if (closedByHand || (error as Error)?.name === "AbortError") {
      return;
    }
    console.warn("SSE 连接中断：", (error as Error)?.message, "，3 秒后重试");
    scheduleRetry();
  }
};

/**
 * 选举连接窗口：拿到锁的窗口成为 leader 并建立连接；
 * 其他窗口排队等锁，leader 页面关闭或退出登录释放锁后自动接管
 */
const acquireLeadership = () => {
  // 取消上一次排队
  if (acquireController) {
    acquireController.abort();
    acquireController = null;
  }
  releaseLock = null;
  // 不支持 Web Locks 时降级：每个窗口各自建立连接
  if (!("locks" in navigator)) {
    console.warn("SSE 浏览器不支持 Web Locks，降级为每窗口独立连接");
    connect();
    return;
  }
  acquireController = new AbortController();
  navigator.locks
    .request(SSE_LOCK_NAME, { signal: acquireController.signal }, () => {
      // 成为 leader：建立连接，持锁直至退出登录主动释放
      console.log("SSE 本窗口获得连接锁，成为 leader");
      connect();
      return new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
    })
    .catch(() => {
      // 排队被取消（退出登录）或获取锁失败时静默处理
    });
};

/**
 * 中断当前 SSE 连接
 */
const abort = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
};

/**
 * 清除重试定时器
 */
const clearRetryTimer = () => {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

/**
 * 主动断开 SSE 连接：中断连接并释放锁/取消排队
 */
const close = () => {
  closedByHand = true;
  clearRetryTimer();
  abort();
  // 取消排队等锁
  if (acquireController) {
    acquireController.abort();
    acquireController = null;
  }
  // leader 释放连接锁，其他窗口接管连接
  if (releaseLock) {
    releaseLock();
    releaseLock = null;
  }
};

/**
 * 启动：登录态有效时参与连接窗口选举
 */
const start = () => {
  if (!store.state.user?.token) {
    return;
  }
  closedByHand = false;
  acquireLeadership();
};

// 监听登录 token 变化：登录成功自动建连，退出登录自动断开
store.watch(
  (state) => state.user?.token,
  (token) => {
    if (token) {
      start();
    } else {
      close();
    }
  }
);

/**
 * 应用启动时初始化：页面刷新后 token 从 localStorage 恢复，重建 SSE 连接
 */
export const initSse = () => {
  start();
};
