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
    proxy: {
      "/api": {
        target: "http://localhost:8101",
        changeOrigin: true,
      },
    },
  },
});
