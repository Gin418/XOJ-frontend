import { createApp } from "vue";
import App from "./App.vue";
import ArcoVue from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";
import router from "./router";
import store from "./store";
import { OpenAPI } from "../generated";
import "@/plugins/axios";
import "@/access";

// API 基础地址：构建时从环境文件注入（.env.development / .env.production）
// 留空时使用同源相对路径：开发环境由 devServer 代理转发 /api，生产由 Nginx/网关转发
OpenAPI.BASE = process.env.VUE_APP_API_BASE || "";

createApp(App).use(ArcoVue).use(store).use(router).mount("#app");
