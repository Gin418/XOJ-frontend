// initial state
import { StoreOptions } from "vuex";
import ACCESS_ENUM from "@/access/accessEnum";
import { UserControllerService } from "../../generated";

export default {
  namespaced: true,
  state: () => ({
    loginUser: {
      userName: "未登录",
    },
    token: "",
  }),
  actions: {
    async getLoginUser({ commit, state }, payload) {
      // 从远程请求获取登录信息
      const res = await UserControllerService.getLoginUserUsingGet();
      if (res.code === 0) {
        commit("updateUser", res.data);
      } else {
        commit("updateUser", {
          ...state.loginUser,
          userRole: ACCESS_ENUM.NOT_LOGIN,
        });
      }
    },
    async logout({ commit }) {
      const res = await UserControllerService.userLogoutUsingPost();
      if (res.code === 0) {
        // 清除登录 token
        commit("setToken", "");
        commit("updateUser", {
          userName: "未登录",
        });
        return true;
      }
      return false;
    },
  },
  mutations: {
    updateUser(state, payload) {
      state.loginUser = payload;
    },
    setToken(state, payload) {
      state.token = payload;
    },
  },
} as StoreOptions<any>;
