const { defineConfig } = require("@vue/cli-service");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack(config) {
    config.plugin("monaco").use(
      new MonacoWebpackPlugin({
        // 按需打包语言高亮包：与后端 /api/question/language/select 返回的 value 一一对应，
        // 否则编辑器无语法高亮
        languages: ["java", "cpp", "c", "python"],
      })
    );
  },
  devServer: {
    // SSE 长连接响应不能被压缩：gzip 缓冲会导致事件帧不实时推送，
    // 且 dev 环境本地传输无需压缩，直接关闭
    compress: false,
    proxy: {
      "/api": {
        target: "http://localhost:8101",
        changeOrigin: true,
      },
    },
  },
});
