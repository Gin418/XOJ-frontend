<template>
  <div
    id="code-editor"
    ref="codeEditorRef"
    style="min-height: 300px; height: 100%"
  />
  <!--  <a-button @click="fillValue">填充值</a-button>-->
</template>

<script setup lang="ts">
import * as monaco from "monaco-editor";
import {
  onMounted,
  ref,
  toRaw,
  markRaw,
  withDefaults,
  defineProps,
  defineExpose,
  watch,
} from "vue";

/**
 * 定义组件属性类型
 */
interface Props {
  value: string;
  language?: string;
  handleChange: (v: string) => void;
  readOnly?: boolean;
  theme?: string;
  fontSize?: number;
}

/**
 * 给组件指定初始值
 */
const props = withDefaults(defineProps<Props>(), {
  value: () => "",
  language: () => "java",
  handleChange: (v: string) => {
    console.log(v);
  },
  readOnly: () => false,
  theme: () => "vs-dark",
  fontSize: () => 16,
});

const codeEditorRef = ref();
const codeEditor = ref();

/**
 * 暴露给父组件：直接设置编辑器内容（一次性同步，不参与响应式链路）
 */
defineExpose({
  setValue: (value: string) => {
    if (codeEditor.value) {
      codeEditor.value.setValue(value);
    }
  },
});

// const fillValue = () => {
//   if (!codeEditor.value) {
//     return;
//   }
//   // 改变值
//   toRaw(codeEditor.value).setValue("新的值");
// };

watch(
  () => props.language,
  () => {
    if (codeEditor.value) {
      monaco.editor.setModelLanguage(
        toRaw(codeEditor.value).getModel(),
        props.language
      );
    }
  }
);

watch(
  () => props.theme,
  () => {
    // 主题为全局设置，切换后对所有 Monaco 实例生效
    monaco.editor.setTheme(props.theme ?? "vs-dark");
  }
);

watch(
  () => props.fontSize,
  () => {
    if (codeEditor.value) {
      codeEditor.value.updateOptions({ fontSize: props.fontSize });
    }
  }
);

onMounted(() => {
  if (!codeEditorRef.value) {
    return;
  }
  // Hover on each property to see its docs!
  // markRaw：Monaco 实例禁止 Vue 深度代理，否则 setValue 等调用会被 Proxy 拦截
  // 导致性能骤降、页面卡顿
  codeEditor.value = markRaw(
    monaco.editor.create(codeEditorRef.value, {
      value: props.value,
      language: props.language,
      fontSize: props.fontSize,
      // 自动布局：由 Monaco 内置的 ResizeObserver 响应容器尺寸变化，
      // 不手动监听窗口 resize 与 layout（参考项目原版实现，窗口缩放不卡）
      automaticLayout: true,
      colorDecorators: true,
      minimap: {
        enabled: true,
      },
      readOnly: props.readOnly,
      theme: props.theme,
      // lineNumbers: "off",
      // roundedSelection: false,
      // scrollBeyondLastLine: false,
    })
  );

  // 编辑 监听内容变化
  codeEditor.value.onDidChangeModelContent(() => {
    props.handleChange(toRaw(codeEditor.value).getValue());
  });

  // 代码内容不足以撑满编辑器时，滚轮事件交给页面滚动，否则由编辑器内部滚动
  const editorDom = codeEditorRef.value as HTMLElement;
  editorDom.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (!codeEditor.value) {
        return;
      }
      const layout = codeEditor.value.getLayoutInfo();
      const model = codeEditor.value.getModel();
      const lineCount = model ? model.getLineCount() : 0;
      const visibleLines = Math.floor(layout.height / layout.lineHeight);
      if (lineCount <= visibleLines) {
        window.scrollBy(0, event.deltaY);
      }
    },
    { capture: true }
  );
});
</script>

<style scoped></style>
