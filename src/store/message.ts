// 消息未读数状态：供顶部导航私信/通知图标徽标使用；
// 进入消息中心或收到 SSE 消息推送后由页面/插件刷新真实数据
import { StoreOptions } from "vuex";
import axios from "axios";

export default {
  namespaced: true,
  state: () => ({
    // 未读私信数（type = 1）
    unreadPrivate: 0,
    // 未读系统通知数（type = 0）
    unreadNotification: 0,
    // SSE 最新推送的消息体：聊天页监听它实时刷新会话列表与聊天记录
    latestMessage: null as Record<string, unknown> | null,
  }),
  actions: {
    async fetchUnread({ commit }) {
      // 后端返回 { systemUnreadCount, privateUnreadCount } 对象
      const res = await axios.get("/api/user/message/unread");
      const data = res.data?.code === 0 ? res.data.data : null;
      commit("setUnread", {
        privateCount: Number(data?.privateUnreadCount) || 0,
        notificationCount: Number(data?.systemUnreadCount) || 0,
      });
    },
  },
  mutations: {
    setUnread(state, { privateCount, notificationCount }) {
      state.unreadPrivate = privateCount;
      state.unreadNotification = notificationCount;
    },
    // SSE 实时推送到达时累加未读数（进入消息中心后重新拉取校准）
    increaseUnread(state, type: number) {
      if (type === 1) {
        state.unreadPrivate = (Number(state.unreadPrivate) || 0) + 1;
      } else {
        state.unreadNotification = (Number(state.unreadNotification) || 0) + 1;
      }
    },
    // 记录 SSE 最新消息：聊天页监听该状态实时刷新
    receiveMessage(state, payload) {
      state.latestMessage = payload;
    },
  },
} as StoreOptions<any>;
