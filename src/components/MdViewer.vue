<template>
  <div ref="containerRef" class="md-viewer" @click="onContainerClick">
    <MdPreview
      :model-value="value"
      :preview-theme="'github'"
      :code-theme="'github'"
      :language="'zh-CN'"
    />
  </div>
</template>

<script setup lang="ts">
import {
  nextTick,
  onMounted,
  ref,
  watch,
  withDefaults,
  defineProps,
} from "vue";
import { useRouter } from "vue-router";
import message from "@arco-design/web-vue/es/message";
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/preview.css";
import { decorateMentions, getMentionUserId } from "./mentionLinks";

/**
 * 定义组件属性类型
 */
interface Props {
  value: string;
}

/**
 * 给组件指定初始值
 */
const props = withDefaults(defineProps<Props>(), {
  value: () => "",
});

const router = useRouter();
const containerRef = ref<HTMLElement>();

/**
 * 预览内容更新后重新装饰 @ 提及链接（MdPreview 重渲染会覆盖旧链接）
 */
const scheduleDecorate = () => {
  nextTick(() => {
    setTimeout(() => decorateMentions(containerRef.value), 0);
  });
};

/**
 * 点击 @用户名：跳转用户主页（语法自带 id 直接跳，裸文本按用户名查询 id）
 */
const onContainerClick = async (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const link = target.closest?.(".mention-link") as HTMLAnchorElement | null;
  if (!link) {
    return;
  }
  e.preventDefault();
  const userId = await getMentionUserId(link);
  if (!userId) {
    message.info("未找到该用户");
    return;
  }
  await router.push({
    path: "/user/profile",
    query: { userId },
  });
};

watch(
  () => props.value,
  () => {
    scheduleDecorate();
  }
);

onMounted(() => {
  scheduleDecorate();
});
</script>

<style scoped>
/* 预览内容自适应高度，由页面统一滚动，避免内部滚动条 */
:deep(.md-editor) {
  height: auto;
  border: 0;
}

/* md-editor-v3 代码块头部（语言标签/复制按钮）默认 sticky + z-index 10000，
   高于 Arco 弹窗（1001），打开弹窗时会盖在弹窗上面；
   降到 1 保持头部在滚动时仍盖住代码内容，且低于弹窗层级。
   注意：库样式选择器为 .md-editor-preview .md-editor-code .md-editor-code-head（特异性 0,3,0），
   覆盖选择器必须带同样层级的祖先类，否则特异性不足无法生效 */
:deep(.md-editor-preview .md-editor-code .md-editor-code-head) {
  z-index: 1;
}

/* @ 提及链接 */
:deep(.mention-link) {
  color: rgb(var(--primary-6));
  cursor: pointer;
  text-decoration: none;
}

:deep(.mention-link:hover) {
  text-decoration: underline;
}
</style>
