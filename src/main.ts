import { createApp } from "vue";
import App from "./App.vue";
import ArcoVue from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";
import router from "./router";
import store from "./store";
import "@/plugins/axios";
import "@/access";
import "bytemd/dist/index.css";
import "highlight.js/styles/github.css";
// markdown 内容样式（标题、表格、代码块等）：ByteMD 不内置，需自行引入
import "github-markdown-css/github-markdown.css";
// 项目对 markdown 内容的样式覆盖（须在 github-markdown-css 之后）
import "@/styles/markdown.css";

createApp(App).use(ArcoVue).use(store).use(router).mount("#app");
