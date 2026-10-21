<template>
  <div id="viewQuestionView" :class="{ 'with-competition': isFromContest }">
    <div class="question-view-layout">
      <!-- 从竞赛进入时，左侧保留竞赛导航栏（与竞赛详情页共用组件）
        激活项与来源 tab 一致：从题目列表进入时停留在「题目」 -->
      <CompetitionSideNav
        v-if="isFromContest"
        :competition-id="competitionId"
        :active-key="String(route.query.tab ?? 'preview')"
        :questions="questions"
        :has-joined="true"
        @nav-click="onContestNavClick"
        @catalog-toggle="onCatalogToggle"
      />
      <a-row :gutter="[8, 24]" ref="rowRef" class="question-row">
        <a-col class="left-col" :style="{ flex: `0 0 ${leftWidth}%` }">
          <div class="left-panel">
            <a-card class="left-tabs-card">
              <a-tabs v-model:active-key="activeTab" @change="onTabChange">
                <a-tab-pane key="question" title="题目">
                  <a-card
                    v-if="question"
                    :title="questionTitle"
                    :bordered="false"
                  >
                    <!-- 时间、内存限制显示在题目名称下方 -->
                    <a-descriptions
                      class="limit-info"
                      :column="{ xs: 1, md: 2, lg: 3 }"
                    >
                      <a-descriptions-item label="时间限制">
                        {{ question.judgeConfig?.timeLimit ?? 0 }} ms
                      </a-descriptions-item>
                      <a-descriptions-item label="内存限制">
                        {{ question.judgeConfig?.memoryLimit ?? 0 }} MB
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
                        <span>{{
                          formatMemory(record.judgeInfo?.memory)
                        }}</span>
                      </template>
                      <template #createTime="{ record }">
                        {{
                          moment(record.createTime).format(
                            "YYYY-MM-DD HH:mm:ss"
                          )
                        }}
                      </template>
                    </a-table>
                  </a-card>
                </a-tab-pane>
                <!-- 评论页签：仅从题库（非竞赛）进入时显示，竞赛中不开放讨论 -->
                <a-tab-pane v-if="!isFromContest" key="comment" title="评论">
                  <a-card :bordered="false">
                    <!-- 发评论入口：按钮右对齐 -->
                    <div class="comment-editor">
                      <a-button type="primary" @click="openCommentModal">
                        发评论
                      </a-button>
                    </div>
                    <!-- 评论列表 -->
                    <a-spin :loading="commentsLoading" class="comment-spin">
                      <a-empty
                        v-if="!comments.length && !commentsLoading"
                        description="暂无评论，快来抢沙发"
                      />
                      <div v-else class="comment-list">
                        <div
                          v-for="item in comments"
                          :key="item.id"
                          class="comment-item"
                        >
                          <a-avatar :size="32" class="comment-avatar">
                            <img
                              v-if="item.user?.userAvatar"
                              :src="item.user.userAvatar"
                            />
                          </a-avatar>
                          <div class="comment-main">
                            <div class="comment-title">
                              {{ item.title }}
                            </div>
                            <div class="comment-meta">
                              <span class="comment-user">
                                {{ item.user?.userName ?? "匿名用户" }}
                              </span>
                              <span class="comment-time">
                                {{
                                  moment(item.createTime).format(
                                    "YYYY-MM-DD HH:mm"
                                  )
                                }}
                              </span>
                            </div>
                            <MdViewer :value="item.content || ''" />
                          </div>
                        </div>
                        <a-pagination
                          v-if="commentTotal > commentPageSize"
                          class="comment-pagination"
                          :total="commentTotal"
                          :current="commentCurrent"
                          :page-size="commentPageSize"
                          show-total
                          @change="onCommentPageChange"
                        />
                      </div>
                    </a-spin>
                  </a-card>
                </a-tab-pane>
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
    </div>

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

    <!-- 发评论弹窗：标题 + Markdown 内容 -->
    <a-modal
      v-model:visible="commentModalVisible"
      title="发评论"
      :footer="false"
      :width="800"
    >
      <div class="comment-modal">
        <a-form :model="commentForm" layout="vertical">
          <a-form-item field="title" label="标题">
            <a-input
              v-model="commentForm.title"
              placeholder="请输入标题"
              :max-length="80"
              show-word-limit
            />
          </a-form-item>
          <!-- content-flex=false：内容区改块级布局，让 Markdown 编辑器占满整行 -->
          <a-form-item field="content" label="内容" :content-flex="false">
            <MdEditor
              :value="commentForm.content"
              :handle-change="onCommentContentChange"
            />
          </a-form-item>
        </a-form>
        <div class="comment-modal-footer">
          <a-button @click="commentModalVisible = false">取消</a-button>
          <a-button
            type="primary"
            :loading="commentSubmitting"
            @click="doAddComment"
          >
            发布
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
  withDefaults,
  defineProps,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import message from "@arco-design/web-vue/es/message";
import CompetitionSideNav from "../../components/CompetitionSideNav.vue";
import {
  IconCopy,
  IconEraser,
  IconSettings,
} from "@arco-design/web-vue/es/icon";
import CodeEditor from "@/components/CodeEditor.vue";
import MdViewer from "@/components/MdViewer.vue";
import MdEditor from "@/components/MdEditor.vue";
import { useStore } from "vuex";
import moment from "moment";
import {
  ContestControllerService,
  LanguageVO,
  PostControllerService,
  PostVO,
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

const route = useRoute();
const router = useRouter();

/**
 * 是否从竞赛进入（query 带 competitionId）
 */
const isFromContest = computed(() => Boolean(route.query.competitionId));

/**
 * 竞赛 id（从竞赛进入时有值）
 */
const competitionId = computed(() => String(route.query.competitionId ?? ""));

/**
 * 竞赛题目列表（左侧导航栏展开题目目录用）
 */
const questions = ref<QuestionVO[]>([]);

/**
 * 题目目录展开/收起：展开时懒加载竞赛题目列表
 */
const onCatalogToggle = (expanded: boolean) => {
  if (expanded) {
    loadQuestions();
  }
};

/**
 * 竞赛导航菜单点击：跳回竞赛详情页对应导航页
 */
const onContestNavClick = (key: string) => {
  router.push({
    path: `/view/contest/${competitionId.value}`,
    query: key === "preview" ? {} : { tab: key },
  });
};

/**
 * 加载竞赛题目列表
 */
const loadQuestions = async () => {
  if (!competitionId.value) {
    return;
  }
  const res = await ContestControllerService.getCompetitionQuestionsUsingGet(
    competitionId.value
  );
  if (res.code === 0) {
    questions.value = res.data ?? [];
  }
};

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
 * 竞赛内题号（外层 customId）：从竞赛题目接口进入时才有值
 */
const competitionCustomId = ref("");

/**
 * 题目卡片标题：显示「题号. 标题」；竞赛来源用竞赛内题号，普通来源用题目 customId
 */
const questionTitle = computed(() => {
  const title = question.value?.title ?? "";
  const customId = competitionCustomId.value || question.value?.customId;
  if (customId) {
    return `${customId}. ${title}`;
  }
  return title;
});

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
 * 竞赛来源时使用竞赛提交分页接口（competitionId + questionId + onlyMine）
 */
const loadSubmitList = async () => {
  if (!loginUser.value?.id) {
    message.warning("请先登录");
    return;
  }
  const competitionId = route.query.competitionId as string | undefined;
  let res;
  if (competitionId) {
    // 竞赛题目：传题目 id（questionVO.id），仅查自己的提交
    res = await ContestControllerService.listCompetitionSubmitByPageUsingPost({
      competitionId,
      questionId: String(question.value?.id ?? ""),
      onlyMine: true,
      current: submitCurrent.value,
      pageSize: 10,
      sortField: "createTime",
      sortOrder: "descend",
    });
  } else {
    res = await QuestionControllerService.listQuestionSubmitByPageUsingPost({
      customId: props.customId,
      userId: loginUser.value.id as any,
      pageSize: 10,
      current: submitCurrent.value,
      sortField: "createTime",
      sortOrder: "descend",
    });
  }
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
 * 当前激活的标签页：优先读 URL query 的 pane 参数（刷新后保持当前页签），默认题目页；
 * 竞赛来源不提供评论页签，pane=comment 时回退到题目页
 */
const activeTab = ref("question");

const initActiveTab = () => {
  const pane = String(route.query.pane ?? "");
  const validPanes = isFromContest.value
    ? ["question", "mySubmit"]
    : ["question", "mySubmit", "comment"];
  activeTab.value = validPanes.includes(pane) ? pane : "question";
};
initActiveTab();

/**
 * 切换标签页事件：同步 pane 参数到 URL（保持刷新后当前页签），
 * 首次切换到“我的提交”时加载提交数据；首次切换到“评论”时加载评论
 */
const onTabChange = (key: string | number) => {
  router.replace({ query: { ...route.query, pane: String(key) } });
  if (key === "mySubmit") {
    loadSubmitList();
  }
  if (key === "comment") {
    loadComments();
  }
};

/**
 * 未登录跳转登录页，登录后回跳当前题目
 */
const toLogin = () => {
  router.push({
    path: "/user/login",
    query: { redirect: `/view/question/${props.customId}` },
  });
};

/**
 * 评论区（评论以帖子形式存储：tags 关联题目 customId）
 */
const comments = ref<PostVO[]>([]);
const commentTotal = ref(0);
const commentCurrent = ref(1);
const commentPageSize = 10;
const commentSubmitting = ref(false);
const commentsLoading = ref(false);
// 评论是否已加载过（首次切到评论页签时加载，避免重复请求）
const commentsLoaded = ref(false);

/**
 * 发评论弹窗：标题 + Markdown 内容
 */
const commentModalVisible = ref(false);
const commentForm = ref<{ title: string; content: string }>({
  title: "",
  content: "",
});

/**
 * Markdown 内容变更回调
 */
const onCommentContentChange = (value: string) => {
  commentForm.value.content = value;
};

/**
 * 打开发评论弹窗：未登录跳转登录页；已登录重置表单后打开
 */
const openCommentModal = () => {
  if (!loginUser.value?.id) {
    toLogin();
    return;
  }
  commentForm.value = { title: "", content: "" };
  commentModalVisible.value = true;
};

/**
 * 加载评论列表：请求帖子分页接口，按 tags 过滤当前题目（最新在前）
 */
const loadComments = async () => {
  if (!props.customId) {
    return;
  }
  if (commentsLoaded.value) {
    return;
  }
  commentsLoaded.value = true;
  commentsLoading.value = true;
  try {
    const res = await PostControllerService.listPostVoByPageUsingPost({
      tags: [props.customId],
      current: commentCurrent.value,
      pageSize: commentPageSize,
      sortField: "createTime",
      sortOrder: "descend",
    });
    if (res.code === 0) {
      comments.value = res.data?.records ?? [];
      commentTotal.value = res.data?.total ?? 0;
    } else {
      message.error("加载评论失败，" + res.message);
    }
  } finally {
    commentsLoading.value = false;
  }
};

/**
 * 评论翻页：更新页码并重新加载
 */
const onCommentPageChange = async (page: number) => {
  commentCurrent.value = page;
  commentsLoading.value = true;
  try {
    const res = await PostControllerService.listPostVoByPageUsingPost({
      tags: [props.customId],
      current: commentCurrent.value,
      pageSize: commentPageSize,
      sortField: "createTime",
      sortOrder: "descend",
    });
    if (res.code === 0) {
      comments.value = res.data?.records ?? [];
      commentTotal.value = res.data?.total ?? 0;
    } else {
      message.error("加载评论失败，" + res.message);
    }
  } finally {
    commentsLoading.value = false;
  }
};

/**
 * 发表评论：以帖子形式保存，title 用弹窗标题，content 为 Markdown，tags 关联题目
 */
const doAddComment = async () => {
  if (!loginUser.value?.id) {
    toLogin();
    return;
  }
  const title = commentForm.value.title.trim();
  const content = commentForm.value.content.trim();
  if (!title) {
    message.warning("标题不能为空");
    return;
  }
  if (!content) {
    message.warning("内容不能为空");
    return;
  }
  commentSubmitting.value = true;
  try {
    const res = await PostControllerService.addPostUsingPost({
      title,
      content,
      tags: [props.customId],
    });
    if (res.code === 0) {
      message.success("发布成功");
      commentModalVisible.value = false;
      // 刷新第一页：重新加载并回到第一页
      commentCurrent.value = 1;
      const listRes = await PostControllerService.listPostVoByPageUsingPost({
        tags: [props.customId],
        current: 1,
        pageSize: commentPageSize,
        sortField: "createTime",
        sortOrder: "descend",
      });
      if (listRes.code === 0) {
        comments.value = listRes.data?.records ?? [];
        commentTotal.value = listRes.data?.total ?? 0;
      }
    } else {
      message.error("发布失败，" + res.message);
    }
  } finally {
    commentSubmitting.value = false;
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
  // 从竞赛题目列表进入（query 带 competitionId）时，使用竞赛题目接口加载
  const competitionId = route.query.competitionId as string | undefined;
  let res;
  if (competitionId) {
    res =
      await ContestControllerService.getCompetitionQuestionByCustomIdUsingGet(
        competitionId,
        props.customId as any
      );
  } else {
    res = await QuestionControllerService.getQuestionVoByCustomIdUsingGet(
      props.customId as any
    );
  }
  if (res.code === 0) {
    // 竞赛题目接口返回 { questionOrder, customId, questionVO, ... } 嵌套结构，取内层 questionVO
    question.value = competitionId ? res.data.questionVO : res.data;
    // 接口返回的题目数据为空时直接结束，避免后续访问报错
    if (!question.value) {
      message.error("加载失败，题目数据为空");
      return;
    }
    // 保存竞赛内题号（外层 customId），用于标题显示
    competitionCustomId.value = competitionId ? res.data.customId ?? "" : "";
    // 兼容 judgeCase 为 JSON 字符串的情况（后端可能存为字符串）
    if (typeof question.value.judgeCase === "string") {
      try {
        question.value.judgeCase = JSON.parse(question.value.judgeCase);
      } catch (e) {
        question.value.judgeCase = [];
      }
    }
    // 兼容 judgeConfig 为 JSON 字符串的情况（竞赛题目接口可能存为字符串）
    if (typeof question.value.judgeConfig === "string") {
      try {
        question.value.judgeConfig = JSON.parse(question.value.judgeConfig);
      } catch (e) {
        question.value.judgeConfig = {} as any;
      }
    }
    // judgeConfig 为空时兜底为空对象，避免模板访问 timeLimit 报错
    if (!question.value.judgeConfig) {
      question.value.judgeConfig = {} as any;
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
    // 竞赛来源时附加 competitionId，后端据此关联竞赛提交记录
    ...(competitionId.value ? { competitionId: competitionId.value } : {}),
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

/**
 * 在同一页面切换题目（如竞赛导航栏点击其他题）：customId 变化时重新加载题目
 */
watch(
  () => props.customId,
  () => {
    loadData();
    // 重置我的提交列表与代码
    submitList.value = [];
    submitTotal.value = 0;
    submitCurrent.value = 1;
    form.value.code = "";
    // 重置评论列表（不同题目评论不同），允许重新加载
    comments.value = [];
    commentTotal.value = 0;
    commentCurrent.value = 1;
    commentsLoaded.value = false;
  }
);
</script>

<style>
#viewQuestionView {
  width: 100%;
  /* 页面固定不滚动：视口高度减去顶部菜单栏间距（详情页底部间距已为 0） */
  height: calc(100vh - 96px);
}

/* 从竞赛进入：顶部贴紧顶部栏（BasicLayout padding-top 为 76），左侧留竞赛导航栏 */
#viewQuestionView.with-competition {
  height: calc(100vh - 76px);
  /* 抵消内容区 20px 左内边距，与竞赛详情页一致贴屏幕左墙 */
  margin-left: -20px;
}

/* 页面整体布局：竞赛导航栏 + 原左右分栏 */
.question-view-layout {
  display: flex;
  gap: 24px;
  height: 100%;
}

/* 竞赛做题页：右侧分栏区顶部留 20px 间距（border-box 计入高度），左侧导航贴顶 */
#viewQuestionView.with-competition .question-row {
  box-sizing: border-box;
  padding-top: 20px;
}

/* 非竞赛来源：不显示侧栏，布局容器退化为普通块 */
#viewQuestionView:not(.with-competition) .question-view-layout {
  display: block;
}

/* 分栏区占满侧栏以外剩余空间，窄窗口可收缩 */
.question-view-layout .question-row {
  flex: 1;
  min-width: 0;
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
  /* 稳定滚动栏槽位：切换页签或内容高度变化时滚动条出现/消失，
     题目内容与代码块宽度保持固定不跳动 */
  scrollbar-gutter: stable;
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

/* 评论区：发评论按钮右对齐 */
.comment-editor {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

/* 评论列表：逐条展示 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 单条评论：头像 + 内容区 */
.comment-item {
  display: flex;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-1);
}

/* 评论头像：固定尺寸，防挤压 */
.comment-avatar {
  flex: 0 0 auto;
}

/* 评论内容区：占满剩余宽度 */
.comment-main {
  flex: 1;
  min-width: 0;
}

/* 评论标题：加粗，独占一行 */
.comment-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
  word-break: break-word;
  margin-bottom: 4px;
}

/* 评论元信息行：用户名 + 时间，位于标题下方 */
.comment-meta {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}

/* 评论用户名：加粗 */
.comment-user {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

/* 评论时间：灰色小字 */
.comment-time {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 评论正文：Markdown 渲染，长内容不撑破布局 */
.comment-content {
  font-size: 14px;
  color: var(--color-text-2);
  word-break: break-word;
  white-space: pre-wrap;
}

/* 发评论弹窗：底部按钮右对齐 */
.comment-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

/* 弹窗内 Markdown 编辑器：固定高度（弹窗空间有限，取 ByteMD 默认 300px） */
.comment-modal .bytemd {
  height: 300px;
}

/* 评论分页：右对齐 */
.comment-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

/* 评论加载中：占位高度，避免空态闪烁 */
.comment-spin {
  display: block;
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
