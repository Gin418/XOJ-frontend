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
import { Editor, Viewer } from "@bytemd/vue-next";
import { ref, withDefaults, defineProps } from "vue";
import { FileControllerService } from "../../generated";
import message from "@arco-design/web-vue/es/message";

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
  // Add more plugins here
];

/**
 * 给组件指定初始值
 */
const props = withDefaults(defineProps<Props>(), {
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
.bytemd-toolbar-icon.bytemd-tippy.bytemd-tippy-right:last-child {
  display: none;
}
</style>
