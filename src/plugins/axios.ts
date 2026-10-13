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
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error);
  }
);
