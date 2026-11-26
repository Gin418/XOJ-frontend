<template>
  <a-modal
    v-model:visible="visible"
    :footer="false"
    :width="'min(720px, calc(100vw - 40px))'"
    :hide-title="true"
    :body-class="'judge-code-modal-body'"
  >
    <!-- 弹窗内容：内边距与内部滚动由 arco-modal-body 提供 -->
    <template v-if="visible">
      <!-- 关闭按钮：hide-title 无原生 X，绝对定位在内容右上角 -->
      <a-button
        type="text"
        shape="circle"
        class="code-modal-close"
        @click="visible = false"
      >
        <template #icon>
          <icon-close />
        </template>
      </a-button>
      <!-- 弹窗标题：div 自身无内边距 -->
      <div class="code-modal-title">测评结果</div>
      <!-- 弹窗顶部：真实测评结果 + #id + 创建时间 -->
      <div class="code-modal-header">
        <a-tag :color="getJudgeStatusColor(currentStatus)">
          {{ currentStatusText }}
        </a-tag>
        <span>#{{ currentSubmitId }}</span>
        <span class="header-gap">{{ currentCreateTime }}</span>
      </div>
      <div class="code-modal-info">
        <div class="info-item">
          <span class="info-label">题目</span>
          <span class="info-value"
            ><b>{{ currentQuestionCustomId }}</b
            >.{{ currentQuestionTitle }}</span
          >
        </div>
        <div class="info-item">
          <span class="info-label">提交用户</span>
          <span class="info-value">{{ currentUserName }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">语言</span>
          <span class="info-value">{{ currentLanguageText }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">代码大小</span>
          <span class="info-value">{{ currentCodeSize }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">运行时间</span>
          <span class="info-value">{{ currentTime }} ms</span>
        </div>
        <div class="info-item">
          <span class="info-label">运行内存</span>
          <span class="info-value">{{ currentMemory }}</span>
        </div>
      </div>
      <!-- 测试点结果：逐个展示测试点执行情况（位于源代码上方） -->
      <JudgeCaseResults
        v-if="currentShowCaseResults"
        :case-results="currentCaseResults"
        :total-test-case-count="currentTotalTestCaseCount"
      />
      <div class="code-panel">
        <div class="code-panel-header">
          <span class="code-panel-title">&lt;/&gt; 源代码</span>
          <a-button v-if="currentCode" size="small" @click="copyCode">
            <template #icon>
              <icon-copy />
            </template>
            复制代码
          </a-button>
        </div>
        <div class="code-modal-editor">
          <CodeEditor
            v-if="currentCode"
            :value="currentCode"
            :language="currentLanguage"
            :handle-change="() => {}"
            :read-only="true"
            :minimap="false"
            theme="vs-dark"
          />
          <div v-else class="code-empty-tip">
            <icon-lock class="code-empty-icon" />
            <span>{{ emptyTip }}</span>
          </div>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import {
  onUnmounted,
  ref,
  watch,
  withDefaults,
  defineProps,
  defineExpose,
} from "vue";
import moment from "moment";
import message from "@arco-design/web-vue/es/message";
import { IconClose, IconCopy, IconLock } from "@arco-design/web-vue/es/icon";
import CodeEditor from "@/components/CodeEditor.vue";
import JudgeCaseResults from "@/components/JudgeCaseResults.vue";
import {
  getJudgeStatusColor,
  getJudgeStatusText,
} from "@/constants/judgeStatus";
import type {
  JudgeCaseResult,
  LanguageVO,
  QuestionSubmitVO,
} from "../../generated";

interface Props {
  /** 编程语言列表：用于把竞赛接口返回的语言名（如 C++）解析为编辑器语言值 */
  languageList?: LanguageVO[];
  /** 无代码权限时的提示文案 */
  emptyTip?: string;
}

const props = withDefaults(defineProps<Props>(), {
  languageList: () => [],
  emptyTip: "暂无代码",
});

const visible = ref(false);

// 弹窗打开时锁定页面滚动（滚动条只出现在弹窗内部右侧，不再出现在页面右侧靠墙）
watch(visible, (val) => {
  document.body.style.overflow = val ? "hidden" : "";
});

// 离开页面时恢复页面滚动，避免 body 锁定残留
onUnmounted(() => {
  document.body.style.overflow = "";
});

const currentCode = ref("");
const currentLanguage = ref("java");
const currentQuestionCustomId = ref("");
const currentQuestionTitle = ref("");
const currentUserName = ref("");
const currentLanguageText = ref("");
const currentTime = ref(0);
const currentMemory = ref("");
const currentCodeSize = ref("");
const currentStatus = ref("");
const currentStatusText = ref("");
const currentSubmitId = ref("");
const currentCreateTime = ref("");
const currentCaseResults = ref<JudgeCaseResult[]>([]);
const currentTotalTestCaseCount = ref(0);
// 是否展示测试点面板：无权限回退时隐藏，避免误导为“无数据”
const currentShowCaseResults = ref(true);

/**
 * 解析提交语言：竞赛接口返回语言名（如 C++），题库详情返回 LanguageVO
 */
const resolveSubmitLanguage = (language?: LanguageVO | string) => {
  const raw = typeof language === "string" ? language : language?.value;
  // 语言名（C++/Java）与语言值（cpp/java）都按选项匹配，兼容两种接口
  const item = props.languageList.find(
    (lang) => lang.value === raw || lang.text === raw
  );
  return {
    value: item?.value ?? raw ?? "java",
    text:
      item?.text ??
      (typeof language === "string" ? language : language?.text ?? ""),
  };
};

/**
 * 格式化代码大小：不足 1KB 时显示 B，否则显示 KB，0 时显示 0 B
 */
const formatCodeSize = (code: string | undefined) => {
  const bytes = code?.length ?? 0;
  if (bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
};

/**
 * 格式化运行内存：大于 1MB 显示 MB，不足 1KB 显示 B，否则显示 KB
 */
const formatMemory = (memoryKB: number | undefined) => {
  const size = memoryKB ?? 0;
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} MB`;
  }
  if (size > 0 && size < 1) {
    return `${Math.round(size * 1024)} B`;
  }
  return `${size} KB`;
};

/**
 * 打开弹窗：父页面请求提交详情接口后调用，传入详情数据与是否展示测试点
 */
const open = (detail: QuestionSubmitVO, showCaseResults = true) => {
  const language = resolveSubmitLanguage(detail.language);
  currentCode.value = detail.code ?? "";
  currentLanguage.value = language.value;
  // 竞赛详情返回题号/题名，题库详情返回 questionVO
  currentQuestionCustomId.value =
    detail.customId ?? detail.questionVO?.customId ?? "";
  currentQuestionTitle.value =
    detail.questionTitle ?? detail.questionVO?.title ?? "";
  currentUserName.value = detail.userVO?.userName ?? "";
  currentLanguageText.value = language.text;
  currentTime.value = detail.judgeInfo?.time ?? 0;
  currentMemory.value = formatMemory(detail.judgeInfo?.memory);
  currentCodeSize.value = formatCodeSize(detail.code);
  currentStatus.value = detail.status ?? "";
  currentStatusText.value = getJudgeStatusText(detail.status);
  currentSubmitId.value = detail.id ? String(detail.id) : "";
  currentCreateTime.value = moment(detail.createTime).format(
    "YYYY-MM-DD HH:mm:ss"
  );
  currentShowCaseResults.value = showCaseResults;
  // 测试点详情：judgeInfo.totalTestCaseCount 为总数，caseResults 为已执行到的用例
  currentCaseResults.value = showCaseResults ? detail.caseResults ?? [] : [];
  currentTotalTestCaseCount.value = showCaseResults
    ? detail.judgeInfo?.totalTestCaseCount ?? 0
    : 0;
  visible.value = true;
};

/**
 * 复制当前查看的提交代码
 */
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(currentCode.value);
    message.success("代码已复制到剪贴板");
  } catch {
    message.error("复制失败，请手动复制");
  }
};

defineExpose({ open });
</script>

<style scoped>
/* 弹窗关闭按钮：hide-title 无原生 X，绝对定位在内容右上角 */
.code-modal-close {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 1;
  color: var(--color-text-3);
}

.code-modal-close:hover {
  color: var(--color-text-1);
}

/* 代码面板：头部栏 + 编辑器；保持自然高度不收缩，弹窗内容超高时由 body 滚动 */
.code-panel {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  overflow: hidden;
}

.code-panel-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-fill-1);
  border-bottom: 1px solid var(--color-border-2);
}

.code-panel-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

/* 弹窗内只读代码编辑器：固定高度，弹窗内容超高时由 body 内部滚动条滚动 */
.code-modal-editor {
  height: 400px;
  width: 100%;
}

/* CodeEditor 根节点自带内联 min-height: 300px，会阻断 flex 收缩，这里覆盖为 0 */
.code-modal-editor :deep(#code-editor) {
  min-height: 0 !important;
}

/* 弹窗内编辑器：隐藏右侧 minimap 与概览标尺卡槽 */
.code-modal-editor :deep(.minimap),
.code-modal-editor :deep(.decorationsOverviewRuler) {
  display: none !important;
}

/* 无代码权限时的提示：锁图标 + 文案，垂直居中 */
.code-empty-tip {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-3);
}

.code-empty-icon {
  font-size: 28px;
  color: var(--color-text-3);
}

/* 弹窗顶部：测评结果 + #id + 创建时间 */
.code-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--color-text-2);
}

/* 创建时间靠右对齐：占据剩余空间把创建时间推到行尾 */
.code-modal-header .header-gap {
  margin-left: auto;
}

/* 弹窗内字段信息：两列网格布局，每项为「标签 + 值」 */
.code-modal-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 24px;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: var(--color-fill-1);
  border-radius: 4px;
}

.info-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.info-label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-3);
}

/* 值超长时省略号截断，避免撑破网格列 */
.info-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 弹窗内容区：纵向 flex 布局，上下 20px、左右 24px 内边距；
   max-height 限制弹窗高度，超高时收缩代码面板而非隐藏内容；
   （modal 默认 teleport 到 body，scoped 的 :deep 无法命中，改用 body-class + :global）
   box-sizing 必须设为 border-box：Arco 无全局 border-box，content-box 下 padding 会使
   内容实际宽度超过弹窗宽度，右侧内容被挤出视野；
   选择器用双 class 提升权重，否则与 .arco-modal-body 同权重时会被后注入的 Arco 样式覆盖 */
:global(.arco-modal-body.judge-code-modal-body) {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

/* 除代码面板外（标题/状态行/信息/测试点）保持自然高度，仅代码面板收缩 */
:global(.judge-code-modal-body > :not(.code-panel)) {
  flex-shrink: 0;
}

/* 弹窗标题：div 自身无内边距，与下方内容保持间距 */
.code-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
}

/* 弹窗内滚动条：细窄、无轨道底色，避免右侧出现明显长方形色块。
   注意：伪元素必须放进 :global() 内。若写成 :global(.x)::-webkit-scrollbar，
   Vue scoped 编译会丢掉伪元素，规则退化为给 .x 本体设 width，导致弹窗内容被压成窄条 */
:global(.arco-modal-body.judge-code-modal-body::-webkit-scrollbar) {
  width: 6px;
}

:global(.arco-modal-body.judge-code-modal-body::-webkit-scrollbar-track) {
  background: transparent;
}

:global(.arco-modal-body.judge-code-modal-body::-webkit-scrollbar-thumb) {
  background: var(--color-fill-3);
  border-radius: 3px;
}
</style>
