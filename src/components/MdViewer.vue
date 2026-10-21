<template>
  <Viewer :value="value" :plugins="plugins" />
</template>

<script setup lang="ts">
import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import { Viewer } from "@bytemd/vue-next";
import { withDefaults, defineProps } from "vue";
import copyCode from "../plugins/bytemdCopyCode";

/**
 * 定义组件属性类型
 */
interface Props {
  value: string;
}

const plugins = [
  gfm(),
  highlight(),
  copyCode(),
  // Add more plugins here
];

/**
 * 给组件指定初始值
 */
const props = withDefaults(defineProps<Props>(), {
  value: () => "",
});
</script>

<style scoped>
/* Viewer 模式下让 markdown 内容自适应高度，由页面统一滚动，避免内部滚动条 */
:deep(.bytemd) {
  height: auto;
}

:deep(.bytemd-body) {
  height: auto;
  overflow: visible;
}

:deep(.bytemd-preview) {
  height: auto;
  overflow: visible;
}
</style>
