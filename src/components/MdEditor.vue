<template>
  <!-- mode=preview：仅预览，复用 MdViewer（支持 @ 提及链接跳转）；否则渲染编辑器 -->
  <MdViewer v-if="mode === 'preview'" :value="value" />
  <!-- 编辑器：包裹容器用于装饰分屏预览区的 @ 提及链接并处理点击跳转 -->
  <div v-else ref="editorWrapRef" class="md-editor-wrap" @click="onEditorClick">
    <MdEditorV3
      ref="mdEditorRef"
      :model-value="value"
      :preview="mode !== 'write' && mode !== 'tab'"
      :toolbars="toolbars"
      :def-toolbars="defToolbars"
      :on-upload-img="onUploadImg"
      :language="'zh-CN'"
      :on-change="handleEditorChange"
    />
  </div>
  <!-- 输入 @ 触发的用户联想浮层：定位在编辑器光标下方 -->
  <MentionPop
    :visible="mentionVisible"
    :x="mentionPos.x"
    :y="mentionPos.y"
    :keyword="mentionKeyword"
    @select="onMentionSelect"
    @close="mentionVisible = false"
    @reposition="onMentionReposition"
  />
</template>

<script setup lang="ts">
import { MdEditor as MdEditorV3 } from "md-editor-v3";
import type { ExposeParam } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import "md-editor-v3/lib/preview.css";
import {
  h,
  withDefaults,
  defineProps,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import MdViewer from "./MdViewer.vue";
import MentionButton from "./MentionButton.vue";
import MentionPop from "./MentionPop.vue";
import { decorateMentions, getMentionUserId } from "./mentionLinks";
import { FileControllerService } from "../../generated";
import type { UserVO } from "../../generated";
import message from "@arco-design/web-vue/es/message";

/**
 * 定义组件属性类型
 * mode：bytemd 时代的兼容参数——write/tab 仅编辑，preview 仅预览，其余（split/auto）编辑+预览分屏
 */
interface Props {
  value: string;
  mode?: string;
  handleChange: (v: string) => void;
}

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

const router = useRouter();
const editorWrapRef = ref<HTMLElement>();
const mdEditorRef = ref();
let previewObserver: MutationObserver | undefined;
let decorateTimer: ReturnType<typeof setTimeout> | undefined;

/* ------------------------- 输入 @ 触发用户联想 ------------------------- */

/** @ 联想浮层状态 */
const mentionVisible = ref(false);
/** 当前 @ 词内容（不含 @ 前缀） */
const mentionKeyword = ref("");
/** 编辑器内 @ 词的起止位置（用于选中后替换） */
const mentionRange = ref<{ from: number; to: number }>();
/** 浮层定位（光标屏幕坐标） */
const mentionPos = ref({ x: 0, y: 0 });

/** @ 词分隔符：空白与常见标点 */
const WORD_BREAK_RE = /[\s,，。;；:：!！?？()[\]【】]/;

/** md-editor-v3 内部暴露的 CodeMirror EditorView 实例类型 */
type EditorViewType = ReturnType<NonNullable<ExposeParam["getEditorView"]>>;

/**
 * 获取 CodeMirror EditorView 实例（md-editor-v3 expose 的 getEditorView）
 */
const getView = (): EditorViewType => mdEditorRef.value?.getEditorView?.();

/**
 * 检测光标处是否处于 @ 联想词内：是则显示/更新联想浮层，否则关闭
 */
const checkMention = () => {
  const view = getView();
  if (!view) {
    return;
  }
  const head = view.state.selection.main.head;
  const text = view.state.doc.toString();
  let start = head;
  while (start > 0 && !WORD_BREAK_RE.test(text[start - 1])) {
    start--;
  }
  const word = text.slice(start, head);
  if (word.startsWith("@") && word.length <= 31) {
    mentionRange.value = { from: start, to: head };
    mentionKeyword.value = word.slice(1);
    const coords = view.coordsAtPos(head);
    if (coords) {
      mentionPos.value = { x: coords.left, y: coords.bottom };
    }
    mentionVisible.value = true;
  } else {
    mentionVisible.value = false;
  }
};

/**
 * 编辑器内容变化：先检测 @ 联想，再转发给父组件
 */
const handleEditorChange = (v: string) => {
  checkMention();
  props.handleChange(v);
};

/**
 * 编辑器内部滚动（scroll 捕获）：重新计算光标坐标。
 * 光标仍在 @ 词内 → 浮层跟随新位置；已移出 → 自动关闭
 */
const onMentionReposition = () => {
  if (!mentionVisible.value) {
    return;
  }
  checkMention();
};

/**
 * 选中联想用户：把编辑器里的 @词 替换为 [@用户名](mention:用户id) 语法并关闭浮层
 */
const onMentionSelect = (user: UserVO) => {
  const view = getView();
  const range = mentionRange.value;
  if (!view || !range) {
    return;
  }
  const insertText = `[@${user.userName}](mention:${user.id}) `;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: insertText },
    selection: { anchor: range.from + insertText.length },
  });
  mentionVisible.value = false;
  view.focus();
};

/**
 * 光标移出 @ 词范围（键盘方向键等）：关闭联想浮层
 */
const onDocSelectionChange = () => {
  if (!mentionVisible.value) {
    return;
  }
  const view = getView();
  const range = mentionRange.value;
  if (!view || !range) {
    return;
  }
  const head = view.state.selection.main.head;
  if (head < range.from || head > range.to) {
    mentionVisible.value = false;
  }
};

watch(mentionVisible, (visible) => {
  if (visible) {
    document.addEventListener("selectionchange", onDocSelectionChange);
  } else {
    document.removeEventListener("selectionchange", onDocSelectionChange);
    mentionRange.value = undefined;
  }
});

/**
 * 装饰编辑器分屏预览区：只处理预览 wrapper，避免改动 CodeMirror 输入区 DOM
 */
const decorateEditorPreview = () => {
  const preview = editorWrapRef.value?.querySelector(
    ".md-editor-preview-wrapper"
  ) as HTMLElement | undefined;
  decorateMentions(preview);
};

/**
 * 预览区 DOM 变化后防抖装饰（预览重渲染会覆盖旧链接）
 */
const scheduleDecoratePreview = () => {
  if (decorateTimer) {
    clearTimeout(decorateTimer);
  }
  decorateTimer = setTimeout(decorateEditorPreview, 120);
};

/**
 * 点击预览区 @ 链接：跳转用户主页（语法自带 id 直接跳，裸文本按用户名查询 id）
 */
const onEditorClick = async (e: MouseEvent) => {
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

onMounted(() => {
  const root = editorWrapRef.value;
  if (!root) {
    return;
  }
  decorateEditorPreview();
  // 监听编辑器内部 DOM 变化（输入、预览重渲染等），防抖后重新装饰预览区
  previewObserver = new MutationObserver(scheduleDecoratePreview);
  previewObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
});

onBeforeUnmount(() => {
  previewObserver?.disconnect();
  if (decorateTimer) {
    clearTimeout(decorateTimer);
  }
  document.removeEventListener("selectionchange", onDocSelectionChange);
});

/**
 * 工具栏按钮：常用编辑工具 + 撤销/重做 + 分屏/仅预览切换
 * 不包含全屏（fullscreen）与 GitHub（github）按钮
 */
const toolbars = [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "-",
  "title",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "link",
  "-",
  "image",
  "table",
  "mermaid",
  "katex",
  "-",
  "revoke",
  "next",
  "=",
  "prettier",
  "preview",
  "previewOnly",
  "github",
  "pageFullscreen",
  // 0 对应 defToolbars 自定义项（@ 提及按钮）
  0,
];

/**
 * 自定义工具栏项：@ 提及按钮（md-editor-v3 渲染时会自动注入 insert 方法）
 */
const defToolbars = [h(MentionButton)];

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
 * 编辑器图片上传钩子：先压缩再上传到后端，成功后把 url 列表回填给编辑器
 */
const onUploadImg = async (
  files: File[],
  callback: (urls: string[]) => void
) => {
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
  callback(results.map((item) => item.url));
};
</script>

<style>
/* 编辑器默认高度：页面（如发评论弹窗）可用更高特异性选择器覆盖 */
.md-editor {
  height: 400px;
}
</style>
