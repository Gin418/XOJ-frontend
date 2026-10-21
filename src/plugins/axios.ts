// Add a request interceptor
import axios from "axios";
import store from "@/store";

axios.defaults.withCredentials = true;

axios.interceptors.request.use(
  function (config) {
    // 携带登录 token 到请求头 uc-token，后端据此识别登录用户
    const token = store.state.user?.token;
    if (token) {
      config.headers["uc-token"] = token;
    }
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Add a response interceptor
axios.interceptors.response.use(
  function (response) {
    console.log("响应", response);
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response;
  },
  function (error) {
    // 请求被主动取消时保持抛出，不伪装成业务失败
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    // 接口请求失败时不再抛出未捕获异常（避免控制台整屏报红），
    // 而是统一转成业务失败响应，由各页面根据 res.code 判断并弹出提示
    const resData = error?.response?.data;
    const data =
      resData && typeof resData === "object" && "code" in resData
        ? resData
        : { code: -1, message: "网络异常" };
    return {
      data,
      status: 200,
      statusText: "OK",
      headers: {},
      config: error?.config ?? {},
    };
  }
);
