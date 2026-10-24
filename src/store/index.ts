import { createStore } from "vuex";
import createPersistedState from "vuex-persistedstate";
import user from "./user";
import message from "./message";

export default createStore({
  mutations: {},
  actions: {},
  modules: {
    user,
    message,
  },
  plugins: [
    createPersistedState({
      // 只持久化 user 模块（登录 token 与用户信息），刷新后自动从 localStorage 恢复
      paths: ["user"],
    }),
  ],
});
