<template>
  <div id="viewQuestionView">
    <a-row :gutter="[8, 24]" ref="rowRef" class="question-row">
      <a-col class="left-col" :style="{ flex: `0 0 ${leftWidth}%` }">
        <div class="left-panel">
          <a-card class="left-tabs-card">
            <a-tabs default-active-key="question" @change="onTabChange">
              <a-tab-pane key="question" title="题目">
                <a-card
                  v-if="question"
                  :title="question.title"
                  :bordered="false"
                >
                  <!-- 时间、内存限制显示在题目名称下方 -->
                  <a-descriptions
                    class="limit-info"
                    :column="{ xs: 1, md: 2, lg: 3 }"
                  >
                    <a-descriptions-item label="时间限制">
                      {{ question.judgeConfig.timeLimit ?? 0 }} ms
                    </a-descriptions-item>
                    <a-descriptions-item label="内存限制">
                      {{ question.judgeConfig.memoryLimit ?? 0 }} MB
                    </a-descriptions-item>
                  </a-descriptions>

                  <h3>题目描述</h3>
                  <MdViewer :value="question.content || ''" />
                  <template
                    v-if="question.judgeCase && question.judgeCase.length"
                  >
                    <div
                      v-for="(out, index) of question.judgeCase"
                      :key="index"
                    >
                      <h3>测试样例 {{ index + 1 }}</h3>
                      <h5>输入数据</h5>
                      <MdViewer :value="out.input || ''" />
                      <h5>输出数据</h5>
                      <MdViewer :value="out.output || ''" />
                    </div>
                  </template>
                  <p v-else>暂无测试样例</p>
                  <template v-if="question.description">
                    <h3>题目说明</h3>
                    <MdViewer :value="question.description" />
                  </template>

                  <template #extra>
                    <a-space wrap>
                      <a-tag
                        v-for="(tag, index) of question.tags"
                        :key="index"
                        color="green"
                        >{{ tag }}
                      </a-tag>
                    </a-space>
                  </template>
                </a-card>
              </a-tab-pane>
              <a-tab-pane key="mySubmit" title="我的提交">
                <a-card>
                  <a-table
                    :columns="columns"
                    :data="submitList"
                    :pagination="{
                      showTotal: true,
                      pageSize: 10,
                      current: submitCurrent,
                      total: submitTotal,
                    }"
                    @page-change="onPageChange"
                  >
                    <template #status="{ record }">
                      <a-tag :color="getStatusColor(record.status)">
                        <span
                          class="status-link"
                          @click="openCodeModal(record)"
                        >
                          {{ statusTextMap[record.status] ?? record.status }}
                        </span>
                      </a-tag>
                    </template>
                    <template #language="{ record }">
                      {{ record.language?.text ?? "" }}
                    </template>
                    <template #time="{ record }">
                      <span>{{ record.judgeInfo?.time ?? 0 }} ms</span>
                    </template>
                    <template #memory="{ record }">
                      <span>{{ formatMemory(record.judgeInfo?.memory) }}</span>
                    </template>
                    <template #createTime="{ record }">
                      {{
                        moment(record.createTime).format("YYYY-MM-DD HH:mm:ss")
                      }}
                    </template>
                  </a-table>
                </a-card>
              </a-tab-pane>
              <a-tab-pane key="comment" title="评论" disabled>
                评论区</a-tab-pane
              >
            </a-tabs>
          </a-card>
        </div>
      </a-col>
      <a-col class="right-col" :style="{ flex: '1 1 0%' }">
        <a-card class="right-card">
          <a-form :model="form" layout="inline">
            <a-form-item field="languageId" label="" style="min-width: 160px">
              <a-select
                v-model="form.languageId"
                :style="{ width: '160px' }"
                placeholder="选择编程语言"
              >
                <a-option
                  v-for="lang in languageList"
                  :key="lang.value"
                  :value="lang.type"
                >
                  {{ lang.text }}
                </a-option>
              </a-select>
            </a-form-item>
            <!-- 编辑器工具按钮：位于编辑器上方靠右 -->
            <a-form-item label="" style="margin-left: auto">
              <a-space>
                <a-popconfirm content="确定要清空代码吗？" @ok="clearCode">
                  <span class="editor-tool-btn" title="清空代码">
                    <icon-eraser />
                  </span>
                </a-popconfirm>
                <a-popover
                  trigger="click"
                  position="bl"
                  content-class="editor-settings-popover"
                >
                  <span class="editor-tool-btn" title="编辑器设置">
                    <icon-settings />
                  </span>
                  <template #content>
                    <div class="editor-settings">
                      <div class="editor-settings-title">编辑器设置</div>
                      <div class="settings-row">
                        <span class="settings-label">主题</span>
                        <a-select
                          v-model="editorTheme"
                          :style="{ width: '200px' }"
                          size="large"
                        >
                          <a-option
                            v-for="theme in editorThemeOptions"
                            :key="theme"
                            :value="theme"
                          >
                            {{ theme }}
                          </a-option>
                        </a-select>
                      </div>
                      <div class="settings-row">
                        <span class="settings-label">字体大小</span>
                        <a-select
                          v-model="editorFontSize"
                          :style="{ width: '200px' }"
                          size="large"
                        >
                          <a-option
                            v-for="size in editorFontSizeOptions"
                            :key="size"
                            :value="size"
                          >
                            {{ size }}
                          </a-option>
                        </a-select>
                      </div>
                    </div>
                  </template>
                </a-popover>
              </a-space>
            </a-form-item>
          </a-form>
          <div class="editor-wrap">
            <CodeEditor
              ref="codeEditorRef"
              :value="form.code as string"
              :language="editorLanguage"
              :handle-change="changeCode"
              :theme="editorTheme"
              :font-size="editorFontSize"
            />
          </div>
          <div class="submit-area">
            <a-button type="primary" @click="doSubmit">提交代码</a-button>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 查看提交代码弹窗 -->
    <a-modal
      v-model:visible="codeModalVisible"
      :title="codeModalTitle"
      :footer="false"
      :width="720"
    >
      <div v-if="codeModalVisible" class="code-modal">
        <!-- 弹窗顶部：测评结果 + 提交时间 -->
        <div class="code-modal-header">
          <span>测评结果：</span>
          <a-tag :color="getStatusColor(currentStatus)">
            {{ currentStatusText }}
          </a-tag>
          <span class="header-gap">提交时间：</span>
          <span>{{ currentCreateTime }}</span>
        </div>
        <a-descriptions :column="2" class="code-modal-info">
          <a-descriptions-item label="题目">
            <b>{{ currentQuestionCustomId }}</b
            >.{{ currentQuestionTitle }}
          </a-descriptions-item>
          <a-descriptions-item label="提交用户">
            {{ currentUserName }}
          </a-descriptions-item>
          <a-descriptions-item label="语言">
            {{ currentLanguageText }}
          </a-descriptions-item>
          <a-descriptions-item label="代码大小">
            {{ currentCodeSize }}
          </a-descriptions-item>
          <a-descriptions-item label="运行时间">
            {{ currentTime }} ms
          </a-descriptions-item>
          <a-descriptions-item label="运行内存">
            {{ currentMemory }}
          </a-descriptions-item>
        </a-descriptions>
        <div class="code-panel">
          <div class="code-panel-header">
            <span class="code-panel-title">&lt;/&gt; 源代码</span>
            <a-button size="small" @click="copyCode">
              <template #icon>
                <icon-copy />
              </template>
              复制代码
            </a-button>
          </div>
          <div class="code-modal-editor">
            <CodeEditor
              :value="currentCode"
              :language="currentLanguage"
              :handle-change="() => {}"
              :read-only="true"
              theme="vs-dark"
            />
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, withDefaults, defineProps } from "vue";
import message from "@arco-design/web-vue/es/message";
import {
  IconCopy,
  IconEraser,
  IconSettings,
} from "@arco-design/web-vue/es/icon";
import CodeEditor from "@/components/CodeEditor.vue";
import MdViewer from "@/components/MdViewer.vue";
import { useStore } from "vuex";
import moment from "moment";
import {
  LanguageVO,
  QuestionControllerService,
  QuestionSubmitAddRequest,
  QuestionSubmitVO,
  QuestionVO,
} from "../../../generated";

interface Props {
  customId: string;
}

const props = withDefaults(defineProps<Props>(), {
  customId: () => "",
});

/**
 * 测评结果字符串中文映射（与后端枚举字符串一致）
 */
const statusTextMap: Record<string, string> = {
  Compiling: "编译中",
  Waiting_Judge: "等待判题",
  Judging: "判题中",
  Accepted: "答案正确",
  Wrong_Answer: "答案错误",
  Compile_Error: "编译错误",
  Memory_Limit_Exceeded: "内存溢出",
  Time_Limit_Exceeded: "运行超时",
  Signalled: "运行错误",
  Presentation_Error: "格式错误",
  Nonzero_Exit_Status: "非零返回",
  Output_Limit_Exceeded: "输出溢出",
  Internal_Error: "系统错误",
  File_Error: "文件错误",
  Unknown: "未知结果",
};

/**
 * 根据测评结果返回标签颜色
 */
const getStatusColor = (status?: string) => {
  if (status === "Accepted") {
    return "green";
  }
  if (
    status === "Compiling" ||
    status === "Waiting_Judge" ||
    status === "Judging"
  ) {
    return "orange";
  }
  return "red";
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
 * 格式化代码大小：字节数，大于 1KB 显示 KB
 */
const formatCodeSize = (code?: string) => {
  if (!code) {
    return "0 B";
  }
  const size = new Blob([code]).size;
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${size} B`;
};

/**
 * 左右分栏布局（左栏固定 50%，右栏填充剩余空间）
 */
const rowRef = ref<HTMLElement>();
const leftWidth = ref(50);

const question = ref<QuestionVO>();

/**
 * 编程语言列表（从后端接口获取）
 */
const languageList = ref<LanguageVO[]>([]);

/**
 * 加载编程语言列表
 */
const loadLanguageList = async () => {
  const res = await QuestionControllerService.getLanguageListUsingGet();
  if (res.code === 0 && res.data?.length) {
    languageList.value = res.data;
    // 默认选中 C++
    if (!form.value.languageId) {
      const cpp = languageList.value.find((lang) => lang.value === "cpp");
      form.value.languageId = cpp?.type ?? languageList.value[0].type;
    }
  }
};

const store = useStore();
const loginUser = computed(() => store.state.user?.loginUser);

/**
 * 我的提交列表
 */
const submitList = ref([]);
const submitTotal = ref(0);
const submitCurrent = ref(1);

const columns = [
  {
    title: "判题状态",
    dataIndex: "status",
    slotName: "status",
  },
  {
    title: "语言",
    dataIndex: "language",
    slotName: "language",
  },
  {
    title: "运行时间",
    dataIndex: "judgeInfo.time",
    slotName: "time",
  },
  {
    title: "运行内存",
    dataIndex: "judgeInfo.memory",
    slotName: "memory",
  },
  {
    title: "提交时间",
    dataIndex: "createTime",
    slotName: "createTime",
  },
];

/**
 * 加载当前用户对该题目的提交记录（每页固定 10 条）
 */
const loadSubmitList = async () => {
  if (!loginUser.value?.id) {
    message.warning("请先登录");
    return;
  }
  const res = await QuestionControllerService.listQuestionSubmitByPageUsingPost(
    {
      customId: props.customId,
      userId: loginUser.value.id as any,
      pageSize: 10,
      current: submitCurrent.value,
      sortField: "createTime",
      sortOrder: "descend",
    }
  );
  if (res.code === 0) {
    submitList.value = res.data.records;
    submitTotal.value = res.data.total;
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 翻页：更新页码并重新加载
 */
const onPageChange = (page: number) => {
  submitCurrent.value = page;
  loadSubmitList();
};

/**
 * 切换标签页事件：首次切换到“我的提交”时加载数据
 */
const onTabChange = (key: string | number) => {
  if (key === "mySubmit") {
    loadSubmitList();
  }
};

/**
 * 查看提交代码弹窗
 */
const codeModalVisible = ref(false);
const codeModalTitle = ref("");
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
const currentCreateTime = ref("");

const openCodeModal = (record: QuestionSubmitVO) => {
  codeModalTitle.value = `${record.questionVO?.customId ?? ""}.${
    record.questionVO?.title ?? ""
  } - 提交代码`;
  currentCode.value = record.code ?? "";
  currentLanguage.value = record.language?.value ?? "java";
  currentQuestionCustomId.value = record.questionVO?.customId ?? "";
  currentQuestionTitle.value = record.questionVO?.title ?? "";
  currentUserName.value = record.userVO?.userName ?? "";
  currentLanguageText.value = record.language?.text ?? "";
  currentTime.value = record.judgeInfo?.time ?? 0;
  currentMemory.value = formatMemory(record.judgeInfo?.memory);
  currentCodeSize.value = formatCodeSize(record.code);
  currentStatus.value = record.status ?? "";
  currentStatusText.value =
    statusTextMap[record.status ?? ""] ?? record.status ?? "";
  currentCreateTime.value = moment(record.createTime).format(
    "YYYY-MM-DD HH:mm:ss"
  );
  codeModalVisible.value = true;
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

const loadData = async () => {
  const res = await QuestionControllerService.getQuestionVoByCustomIdUsingGet(
    props.customId as any
  );
  if (res.code === 0) {
    question.value = res.data;
    // 兼容 judgeCase 为 JSON 字符串的情况（后端可能存为字符串）
    if (typeof question.value.judgeCase === "string") {
      try {
        question.value.judgeCase = JSON.parse(question.value.judgeCase);
      } catch (e) {
        question.value.judgeCase = [];
      }
    }
    console.log(question.value);
  } else {
    message.error("加载失败，" + res.message);
  }
};

const form = ref<QuestionSubmitAddRequest>({
  languageId: undefined,
  code: "",
});

/**
 * 编辑器主题（默认深色，与项目原版一致）
 */
const editorTheme = ref("vs-dark");

/**
 * 编辑器主题选项（Monaco 内置主题，直接显示英文原名）
 */
const editorThemeOptions = ["vs", "vs-dark", "hc-black", "hc-light"];

/**
 * 编辑器字体大小（默认 16）
 */
const editorFontSize = ref(16);

/**
 * CodeEditor 组件实例：用于直接调用编辑器方法（如清空）
 */
const codeEditorRef = ref();

/**
 * 清空编辑器代码：直接调用编辑器实例的 setValue，不参与响应式链路
 */
const clearCode = () => {
  codeEditorRef.value?.setValue("");
  form.value.code = "";
};

/**
 * 字体大小选项
 */
const editorFontSizeOptions = [12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 32];

/**
 * 编辑器语法高亮语言：根据语言 id 找到对应的语言值（小写 id）
 */
const editorLanguage = computed(() => {
  const item = languageList.value.find(
    (lang) => lang.type === form.value.languageId
  );
  return item?.value ?? "java";
});

/**
 * 提交代码
 */
const doSubmit = async () => {
  if (!question.value?.id) {
    return;
  }
  if (!form.value.code || !form.value.code.trim()) {
    message.warning("代码不能为空");
    return;
  }

  const res = await QuestionControllerService.doQuestionSubmitUsingPost({
    ...form.value,
    questionId: question.value.id,
  });
  if (res.code === 0) {
    message.success("提交成功");
  } else {
    message.error("提交失败," + res.message);
  }
};

/**
 * 页面加载时，请求数据
 */
onMounted(() => {
  loadData();
  loadLanguageList();
});

const changeCode = (value: string) => {
  form.value.code = value;
};
</script>

<style>
#viewQuestionView {
  width: 100%;
  /* 页面固定不滚动：视口高度减去顶部菜单栏间距（详情页底部间距已为 0） */
  height: calc(100vh - 96px);
}

.question-row {
  position: relative;
  height: 100%;
}

/* 左右两列各占满可用高度 */
.left-col,
.right-col {
  height: 100%;
}

/* 左栏 */
.left-col {
  position: relative;
  min-width: 0;
}

/* 左侧题目区：标签栏固定，内容区独立滚动 */
.left-panel {
  height: 100%;
  overflow: hidden;
}

/* 左侧白色卡片：标签栏与内容区整体包裹，占满左栏高度 */
#viewQuestionView .left-panel .left-tabs-card {
  height: 100%;
}

#viewQuestionView .left-panel .left-tabs-card .arco-card-body {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* tabs 占满左栏，标签头固定 */
#viewQuestionView .left-panel .arco-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* tabs 内容区自适应剩余高度并独立滚动，内容与卡片边框保持间距 */
#viewQuestionView .left-panel .arco-tabs-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

/* 题目内容区：h3 小标题下方显示分隔线 */
#viewQuestionView .left-panel .arco-tabs-content h3 {
  border-bottom: 1px solid #e5e6eb;
  padding-bottom: 8px;
}

/* 题目名称（卡片头部）下方不显示边框线 */
#viewQuestionView .left-panel .arco-tabs-content .arco-card-header {
  border-bottom: none;
}

/* 时间限制、内存限制行下方显示分隔线 */
#viewQuestionView .left-panel .arco-tabs-content .limit-info {
  border-bottom: 1px solid #e5e6eb;
  padding-bottom: 8px;
}

/* 限制信息紧凑靠左排列 */
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-body,
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-table {
  width: auto;
}

/* 限制信息字体缩小 */
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-item-label,
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-item-value {
  font-size: 12px;
}

/* 标签与数值间距缩小 */
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-item-label {
  padding-right: 4px;
}

/* 每个限制之间以竖线分隔，线位于两项中间 */
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-item-value:not(:last-child) {
  border-right: 1px solid #e5e6eb;
  padding-right: 8px;
}
#viewQuestionView
  .left-panel
  .arco-tabs-content
  .limit-info
  .arco-descriptions-item-label:not(:first-child) {
  padding-left: 8px;
}

/* 右侧：纵向排列，编辑器填满剩余空间；min-width 0 允许收缩，避免窄窗口时右栏被挤到下一行 */
.right-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

/* 右侧白色卡片：包裹语言选择、编辑器、提交按钮，占满右栏左右不留空 */
.right-col .right-card {
  height: 100%;
}

.right-col .right-card .arco-card-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.editor-wrap {
  /* 编辑器高度上限 400px：过高窗口下不再填满卡片，空间不足时收缩 */
  flex: 0 1 560px;
  min-height: 280px;
}

/* 编辑器上方工具按钮：白色小图标按钮，hover 主题色 */
.editor-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);
  cursor: pointer;
}

.editor-tool-btn:hover {
  color: rgb(var(--primary-6));
  border-color: rgb(var(--primary-6));
}

/* 设置悬浮窗：标题 + 两行“标签 + 下拉框” */
.editor-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-settings .editor-settings-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-1);
}

.editor-settings .settings-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-settings .settings-label {
  width: 68px;
  font-size: 15px;
  color: var(--color-text-2);
}

/* 悬浮窗内容区加大内边距 */
.editor-settings-popover {
  padding: 16px 20px;
}

/* 提交按钮紧贴编辑器底部靠右，按钮宽度自适应 */
.submit-area {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

/* 我的提交：判题状态可点击查看代码 */
.status-link {
  cursor: pointer;
}

/* 查看提交代码弹窗：顶部状态行 */
.code-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--color-text-2);
}

.code-modal-header .header-gap {
  margin-left: 16px;
}

/* 弹窗内字段信息与编辑器间距 */
.code-modal-info {
  margin-bottom: 12px;
}

/* 代码面板：头部栏 + 编辑器 */
.code-panel {
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  overflow: hidden;
}

.code-panel-header {
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

/* 弹窗内只读代码编辑器：固定高度 */
.code-modal-editor {
  height: 400px;
}

#viewQuestionView .arco-space-horizontal .arco-space-item {
  margin-bottom: 0 !important;
}

/* 窗口变窄时（≤768px）堆叠两栏：题目在上、编辑器在下，恢复整页滚动 */
@media (max-width: 768px) {
  #viewQuestionView {
    height: auto;
  }
  .left-col {
    flex: 0 0 100% !important;
  }
  .left-panel {
    height: auto;
    overflow: visible;
  }
  .right-col {
    height: auto;
    flex: 0 0 100% !important;
  }
  .editor-wrap {
    min-height: 400px;
  }
}
</style>
