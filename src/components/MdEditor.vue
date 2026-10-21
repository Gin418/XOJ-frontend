<template>
  <Editor
    :value="value"
    :mode="mode"
    :plugins="plugins"
    :upload-images="uploadImages"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import gfm from "@bytemd/plugin-gfm";
import highlight from "@bytemd/plugin-highlight";
import { Editor } from "@bytemd/vue-next";
import { withDefaults, defineProps } from "vue";
import { FileControllerService } from "../../generated";
import message from "@arco-design/web-vue/es/message";
import copyCode from "../plugins/bytemdCopyCode";
import undoRedo from "../plugins/bytemdUndoRedo";

/**
 * 定义组件属性类型
 */
interface Props {
  value: string;
  mode?: string;
  handleChange: (v: string) => void;
}

const plugins = [
  gfm(),
  highlight(),
  copyCode(),
  undoRedo(),
  // Add more plugins here
];

/**
 * 给组件指定初始值
 */
withDefaults(defineProps<Props>(), {
  value: () => "",
  mode: () => "split",
  handleChange: (v: string) => {
    console.log(v);
  },
});

/**
 * 压缩图片：最长边限制为 maxSide，质量压缩为 quality
 * 压缩后体积反而更大时保留原图
 */
const compressImage = (
  file: File,
  maxSide = 1920,
  quality = 0.8
): Promise<File> => {
  // svg / gif 无法用 canvas 有效压缩，直接使用原图
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return Promise.resolve(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const max = Math.max(width, height);
        if (max > maxSide) {
          const ratio = maxSide / max;
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("当前浏览器不支持 canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // 非 jpeg 图片统一转为 png，保证压缩后格式与内容一致
        const isJpeg = file.type === "image/jpeg";
        const type = isJpeg ? "image/jpeg" : "image/png";
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("图片压缩失败"));
              return;
            }
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }
            resolve(
              new File(
                [blob],
                file.name.replace(/\.[^.]+$/, isJpeg ? ".jpg" : ".png"),
                { type }
              )
            );
          },
          type,
          quality
        );
      };
      img.onerror = () => reject(new Error("图片加载失败"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
};

/**
 * 编辑器图片上传钩子：先压缩再上传到后端
 */
const uploadImages = async (files: File[]) => {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const compressed = await compressImage(file);
        const res = await FileControllerService.uploadFileUsingPost(compressed);
        if (res.code === 0 && res.data) {
          return { url: res.data };
        }
        throw new Error(res.message || "上传失败");
      } catch (e: any) {
        message.error(`图片「${file.name}」上传失败：${e.message}`);
        throw e;
      }
    })
  );
  return results;
};
</script>

<style>
/* 隐藏工具栏右侧的 GitHub 链接按钮与全屏按钮（右组最后两枚图标）：
   全屏按钮在弹窗/表单编辑器里用处不大，且按钮没有固定 title 属性，
   按位置隐藏最稳定 */
.bytemd-toolbar-icon.bytemd-tippy.bytemd-tippy-right:nth-last-child(-n + 2) {
  display: none;
}

/* 取消 bytemd 默认 800px 限宽居中，并把两侧 4% 内边距收窄为固定 24px：
   编辑区、预览区占满整个宽度，仅保留小内边距，避免宽屏（尤其仅编辑/
   仅预览单栏模式）下两侧出现大片留白。
   选择器比 bytemd 默认规则多一级 .bytemd 前缀提高特异性：本组件样式注入
   早于 bytemd 样式，同特异性下会被后者覆盖 */
.bytemd .bytemd-editor .CodeMirror .CodeMirror-lines,
.bytemd .bytemd-preview .markdown-body {
  max-width: none;
  padding: 16px 24px;
}

/* CodeMirror 行级 4% 内边距改为无（外层固定 24px 内边距兜底） */
.bytemd .bytemd-editor .CodeMirror pre.CodeMirror-line,
.bytemd .bytemd-editor .CodeMirror pre.CodeMirror-line-like {
  padding-left: 0;
  padding-right: 0;
}

/* 稳定侧边滚动栏槽位：内容高度变化（如代码块收起/展开）导致
   滚动条出现/消失时，编辑区与预览区宽度保持不变，代码块宽度不跳动。
   只作用于实际滚动容器 preview，滚动条紧贴预览区右边缘 */
.bytemd-preview {
  scrollbar-gutter: stable;
}
</style>
