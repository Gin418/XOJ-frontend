<template>
  <div
    id="viewQuestionView"
    class="question-view-layout"
    :class="{ 'with-competition': isFromContest }"
  >
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
    <div class="question-row">
      <div class="left-col">
        <div class="left-panel">
          <a-card class="left-tabs-card">
            <!-- 自写导航栏：每个导航项一个 div，点击切换页签 -->
            <div class="question-nav-wrap">
              <div class="question-nav">
                <div
                  class="nav-item"
                  :class="{ 'nav-item-active': activeTab === 'question' }"
                  @click="onTabChange('question')"
                >
                  题目
                </div>
                <div
                  class="nav-item"
                  :class="{ 'nav-item-active': activeTab === 'mySubmit' }"
                  @click="onTabChange('mySubmit')"
                >
                  我的提交
                  <span class="nav-item-count">({{ submitTotal }})</span>
                </div>
                <div
                  v-if="!isFromContest"
                  class="nav-item"
                  :class="{ 'nav-item-active': activeTab === 'comment' }"
                  @click="onTabChange('comment')"
                >
                  评论
                </div>
              </div>
            </div>
            <!-- 页签内容区：v-show 切换显隐，保留各页签 DOM -->
            <div class="tab-content">
              <!-- 题目内容直接平铺在页签内容区，不用 a-card 包裹（避免多余 arco-card-body div） -->
              <div
                v-if="question"
                v-show="activeTab === 'question'"
                class="question-content"
              >
                <!-- 题目名称：h1 显示，外层 div 包裹 -->
                <div class="question-title-wrap">
                  <h1 class="question-title">{{ questionTitle }}</h1>
                </div>
                <!-- 时间、内存限制、通过率：网格三等分，项之间竖线分隔 -->
                <div class="limit-info">
                  <div class="limit-item">
                    <span class="limit-label">时间限制</span>
                    <span class="limit-value">
                      {{ question.judgeConfig?.timeLimit ?? 0 }} ms
                    </span>
                  </div>
                  <div class="limit-item">
                    <span class="limit-label">内存限制</span>
                    <span class="limit-value">
                      {{ question.judgeConfig?.memoryLimit ?? 0 }} MB
                    </span>
                  </div>
                  <div class="limit-item">
                    <span class="limit-label">通过率</span>
                    <span class="limit-value">{{ acceptRate }}</span>
                  </div>
                </div>

                <!-- 标签显示在限制信息行下方，网格排列 -->
                <div
                  v-if="question.tags && question.tags.length"
                  class="question-tags"
                >
                  <a-tag
                    v-for="(tag, index) of question.tags"
                    :key="index"
                    color="green"
                    >{{ tag }}
                  </a-tag>
                </div>

                <!-- 标签下方内容统一包裹 -->
                <div class="question-body">
                  <h2>题目描述</h2>
                  <MdViewer :value="question.content || ''" />
                  <template v-if="inputFormat">
                    <h1>输入格式</h1>
                    <MdViewer :value="inputFormat" />
                  </template>
                  <template v-if="outputFormat">
                    <h2>输出格式</h2>
                    <MdViewer :value="outputFormat" />
                  </template>
                  <template
                    v-if="question.judgeCase && question.judgeCase.length"
                  >
                    <!-- template v-for 不渲染 DOM，样例组不产生包裹 div -->
                    <template
                      v-for="(out, index) of question.judgeCase"
                      :key="index"
                    >
                      <h3>样例# {{ index + 1 }}</h3>
                      <MdViewer
                        :value="toCodeBlock('in', out.input)"
                        :code-foldable="false"
                        :show-copy="true"
                      />

                      <MdViewer
                        :value="toCodeBlock('out', out.output)"
                        :code-foldable="false"
                        :show-copy="true"
                      />
                    </template>
                  </template>
                  <p v-else>暂无测试样例</p>
                  <template v-if="question.description">
                    <h2>题目说明</h2>
                    <MdViewer :value="question.description" />
                  </template>
                </div>
              </div>
              <a-card v-show="activeTab === 'mySubmit'">
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
                    <a-tag :color="getJudgeStatusColor(record.status)">
                      <span class="status-link" @click="openCodeModal(record)">
                        {{ getJudgeStatusText(record.status) }}
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
              <!-- 评论页签：仅从题库（非竞赛）进入时显示，竞赛中不开放讨论 -->
              <a-card
                v-if="!isFromContest"
                v-show="activeTab === 'comment'"
                :bordered="false"
              >
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
                        <div class="comment-meta">
                          <span
                            class="comment-user comment-user-root comment-user-link"
                            @click="goUserProfile(item.user?.id)"
                          >
                            {{ item.user?.userName ?? "匿名用户" }}
                          </span>
                        </div>
                        <div class="comment-title">
                          {{ item.title }}
                        </div>
                        <div
                          class="comment-body"
                          :class="{
                            'comment-body-collapsed': !expandedIds.has(item.id),
                          }"
                          :ref="
                                (el) =>
                                  setCommentBodyRef(
                                    item.id,
                                    el as HTMLElement | null
                                  )
                              "
                        >
                          <MdViewer
                            :value="item.content || ''"
                            :show-copy="false"
                          />
                        </div>
                        <div
                          v-if="commentOverflow[item.id]"
                          class="comment-expand"
                        >
                          <a-button
                            type="text"
                            size="small"
                            @click="toggleCommentExpand(item.id)"
                          >
                            {{ expandedIds.has(item.id) ? "收起" : "展开" }}
                          </a-button>
                        </div>
                        <!-- 评论底部：时间 + 点赞/收藏/回复 -->
                        <div class="comment-footer">
                          <div class="comment-time">
                            {{
                              moment(item.createTime).format("YYYY-MM-DD HH:mm")
                            }}
                          </div>
                          <div class="comment-actions">
                            <span
                              class="comment-action"
                              :class="{
                                'comment-action-active': item.hasThumb,
                              }"
                              @click="doThumb(item)"
                            >
                              <icon-thumb-up-fill v-if="item.hasThumb" />
                              <icon-thumb-up v-else />
                              <span>{{ item.thumbNum || 0 }}</span>
                            </span>
                            <span
                              class="comment-action"
                              :class="{
                                'comment-action-active': item.hasFavour,
                              }"
                              @click="doFavour(item)"
                            >
                              <icon-star-fill v-if="item.hasFavour" />
                              <icon-star v-else />
                              <span>{{ item.favourNum || 0 }}</span>
                            </span>
                            <span
                              class="comment-action"
                              @click="openInlineReply(item)"
                            >
                              <icon-message />
                              <span>回复</span>
                            </span>
                          </div>
                        </div>
                        <!-- 内联回复输入框：点击回复按钮展开，发布后自动收起 -->
                        <div
                          v-if="inlineReply?.itemId === item.id"
                          class="comment-inline-reply"
                        >
                          <a-textarea
                            v-model="inlineReplyContent"
                            :placeholder="`回复 @${inlineReply?.userName}`"
                            :auto-size="{ minRows: 2, maxRows: 6 }"
                            :max-length="2000"
                            show-word-limit
                            @input="onInlineReplyInput"
                            @keyup="onInlineReplyKeyup"
                          />
                          <div class="comment-inline-reply-footer">
                            <span class="comment-inline-reply-tip">
                              支持 Markdown 语法，输入 @ 可提及用户
                            </span>
                            <a-button size="small" @click="closeInlineReply">
                              取消
                            </a-button>
                            <a-button
                              size="small"
                              type="primary"
                              :loading="inlineReplySubmitting"
                              @click="submitInlineReply"
                            >
                              回复
                            </a-button>
                          </div>
                        </div>
                        <!-- 楼中楼回复区：默认展示主评论接口自带的 2 条回复，查看全部进入分页模式 -->
                        <div v-if="item.replyCount" class="comment-replies">
                          <div class="comment-reply-list">
                            <a-spin :loading="repliesLoading[item.id]">
                              <div
                                v-for="reply in displayReplies(item)"
                                :key="reply.id"
                                class="comment-reply"
                              >
                                <a-avatar :size="28" class="comment-avatar">
                                  <img
                                    v-if="reply.user?.userAvatar"
                                    :src="reply.user.userAvatar"
                                  />
                                </a-avatar>
                                <div class="comment-main">
                                  <div class="comment-meta">
                                    <span
                                      class="comment-user comment-user-link"
                                      @click="goUserProfile(reply.user?.id)"
                                    >
                                      {{ reply.user?.userName ?? "匿名用户" }}
                                    </span>
                                    <span
                                      v-if="reply.replyUser"
                                      class="comment-reply-target"
                                    >
                                      回复 @<span
                                        class="comment-reply-target-user comment-user-link"
                                        @click="
                                          goUserProfile(reply.replyUser?.id)
                                        "
                                        >{{ reply.replyUser.userName }}</span
                                      >
                                    </span>
                                  </div>
                                  <div
                                    class="comment-body"
                                    :class="{
                                      'comment-body-collapsed':
                                        !expandedIds.has(reply.id),
                                    }"
                                    :ref="
                                          (el) =>
                                            setCommentBodyRef(
                                              reply.id,
                                              el as HTMLElement | null
                                            )
                                        "
                                  >
                                    <MdViewer :value="reply.content || ''" />
                                  </div>
                                  <div
                                    v-if="commentOverflow[reply.id]"
                                    class="comment-expand"
                                  >
                                    <a-button
                                      type="text"
                                      size="small"
                                      @click="toggleCommentExpand(reply.id)"
                                    >
                                      {{
                                        expandedIds.has(reply.id)
                                          ? "收起"
                                          : "展开"
                                      }}
                                    </a-button>
                                  </div>
                                  <div class="comment-footer">
                                    <div class="comment-time">
                                      {{
                                        moment(reply.createTime).format(
                                          "YYYY-MM-DD HH:mm"
                                        )
                                      }}
                                    </div>
                                    <div class="comment-actions">
                                      <span
                                        class="comment-action"
                                        @click="openInlineReply(reply)"
                                      >
                                        <icon-message />
                                        <span>回复</span>
                                      </span>
                                    </div>
                                  </div>
                                  <!-- 内联回复输入框：点击回复按钮展开，发布后自动收起 -->
                                  <div
                                    v-if="inlineReply?.itemId === reply.id"
                                    class="comment-inline-reply"
                                  >
                                    <a-textarea
                                      v-model="inlineReplyContent"
                                      :placeholder="`回复 @${inlineReply?.userName}`"
                                      :auto-size="{
                                        minRows: 2,
                                        maxRows: 6,
                                      }"
                                      :max-length="2000"
                                      show-word-limit
                                      @input="onInlineReplyInput"
                                      @keyup="onInlineReplyKeyup"
                                    />
                                    <div class="comment-inline-reply-footer">
                                      <span class="comment-inline-reply-tip">
                                        支持 Markdown 语法，输入 @ 可提及用户
                                      </span>
                                      <a-button
                                        size="small"
                                        @click="closeInlineReply"
                                      >
                                        取消
                                      </a-button>
                                      <a-button
                                        size="small"
                                        type="primary"
                                        :loading="inlineReplySubmitting"
                                        @click="submitInlineReply"
                                      >
                                        回复
                                      </a-button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </a-spin>
                            <div class="comment-replies-actions">
                              <!-- 预览模式：回复超过 2 条时可查看全部 -->
                              <span
                                v-if="
                                  !repliesFullMode.has(item.id) &&
                                  (item.replyCount ?? 0) > 2
                                "
                                class="comment-replies-more"
                                @click="showAllReplies(item)"
                              >
                                查看全部 {{ item.replyCount }} 条回复
                              </span>
                              <!-- 全量模式：收起回默认 2 条预览 -->
                              <span
                                v-if="repliesFullMode.has(item.id)"
                                class="comment-replies-more"
                                @click="collapseReplies(item)"
                              >
                                收起
                              </span>
                            </div>
                            <!-- 全量分页模式：总数超过一页（10 条）才显示分页 -->
                            <a-pagination
                              v-if="
                                repliesFullMode.has(item.id) &&
                                (repliesTotal[item.id] ?? 0) > 10
                              "
                              size="small"
                              class="comment-reply-pagination"
                              :total="repliesTotal[item.id] ?? 0"
                              :current="repliesPage[item.id] ?? 1"
                              :page-size="10"
                              @change="
                                    (page: number) =>
                                      onRepliesPageChange(item, page)
                                  "
                            />
                          </div>
                        </div>
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
            </div>
          </a-card>
        </div>
      </div>
      <div class="right-col">
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
            <!-- 竞赛已结束且未开启赛后提交时置灰并提示 -->
            <a-tooltip :content="submitDisabledReason" :disabled="canSubmit">
              <a-button type="primary" :disabled="!canSubmit" @click="doSubmit">
                提交代码
              </a-button>
            </a-tooltip>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 查看提交代码弹窗：公共组件，展示提交详情、测试点与源代码 -->
    <JudgeResultModal ref="judgeResultModalRef" :language-list="languageList" />

    <!-- 发评论抽屉：从右侧墙壁拉出、高度拉满，宽度占屏幕 3/4，标题 + Markdown 内容 -->
    <a-drawer
      v-model:visible="commentModalVisible"
      title="发评论"
      :footer="false"
      :width="'75%'"
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
    </a-drawer>

    <!-- 内联回复输入 @ 触发的用户联想浮层（与编辑器输入 @ 行为一致） -->
    <MentionPop
      :visible="replyMentionVisible"
      :x="replyMentionPos.x"
      :y="replyMentionPos.y"
      :keyword="replyMentionKeyword"
      @select="onReplyMentionSelect"
      @close="replyMentionVisible = false"
      @reposition="replyMentionVisible = false"
    />

    <!-- AI 助手悬浮球：仅从题库（非竞赛）进入时显示 -->
    <AiAssistant v-if="!isFromContest" />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  withDefaults,
  defineProps,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import message from "@arco-design/web-vue/es/message";
import CompetitionSideNav from "../../components/CompetitionSideNav.vue";
import {
  IconEraser,
  IconMessage,
  IconSettings,
  IconStar,
  IconStarFill,
  IconThumbUp,
  IconThumbUpFill,
} from "@arco-design/web-vue/es/icon";
import CodeEditor from "@/components/CodeEditor.vue";
import AiAssistant from "@/components/AiAssistant.vue";
import JudgeResultModal from "@/components/JudgeResultModal.vue";
import MdViewer from "@/components/MdViewer.vue";
import MdEditor from "@/components/MdEditor.vue";
import MentionPop from "@/components/MentionPop.vue";
import { useStore } from "vuex";
import moment from "moment";
import {
  ContestControllerService,
  Competition,
  LanguageVO,
  PostControllerService,
  PostFavourControllerService,
  PostThumbControllerService,
  PostVO,
  QuestionControllerService,
  QuestionSubmitAddRequest,
  QuestionSubmitVO,
  QuestionVO,
  UserVO,
} from "../../../generated";
import {
  getJudgeStatusColor,
  getJudgeStatusText,
} from "@/constants/judgeStatus";
import { onSubmitStatus } from "@/plugins/sse";
import { getContestDetail } from "../../store/contestCache";

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
 * 竞赛详情（从竞赛进入时加载，用于提交按钮置灰判断）
 */
const contest = ref<Competition>();

/**
 * 加载竞赛详情：复用共享缓存（与竞赛详情页/顶部栏同一份），失败时保持可提交（后端最终校验）
 */
const loadContestDetail = async () => {
  if (!competitionId.value) {
    return;
  }
  const data = await getContestDetail(competitionId.value);
  if (data) {
    contest.value = data;
  }
};

/**
 * 提交按钮置灰原因：仅从竞赛进入且竞赛已结束（END）、未开启赛后提交
 * （allowSubmitAfterEnd 不为 1）时返回文案，其余情况为空
 * （allowSubmitAfterEnd 未在 generated 模型中定义，通过 as any 读取）
 */
const submitDisabledReason = computed(() => {
  if (!isFromContest.value) {
    return "";
  }
  if (
    contest.value?.status === "END" &&
    Number((contest.value as any)?.allowSubmitAfterEnd ?? 0) !== 1
  ) {
    return "竞赛已结束，未开启赛后提交";
  }
  return "";
});

/**
 * 是否可以提交代码：无置灰原因时即可提交（非竞赛来源、竞赛未结束或已开启赛后提交）
 */
const canSubmit = computed(() => !submitDisabledReason.value);

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

const question = ref<QuestionVO>();

/**
 * 输入格式说明（后端 DTO 已支持但前端生成模型未更新，用 as any 安全读取）
 */
const inputFormat = computed(() => (question.value as any)?.inputFormat ?? "");

/**
 * 输出格式说明（同上）
 */
const outputFormat = computed(
  () => (question.value as any)?.outputFormat ?? ""
);

/**
 * 将测试样例的输入/输出文本转成 Markdown 代码块，交给 MdViewer 渲染
 */
const toCodeBlock = (language: string, text: string | undefined) =>
  `\`\`\`${language}\n${text ?? ""}\n\`\`\``;

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
 * 通过率：acceptedNum / submitNum 百分比（保留一位小数），无提交时显示 0.0%
 */
const acceptRate = computed(() => {
  const accepted = question.value?.acceptedNum ?? 0;
  const submit = question.value?.submitNum ?? 0;
  if (!submit) {
    return "0.0%";
  }
  return `${((accepted / submit) * 100).toFixed(1)}%`;
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

// SSE 提交状态监听器的注销函数：页面卸载时移除监听
let offSubmitStatus: (() => void) | undefined;

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
 * 切换页签事件：更新激活页签并同步 pane 参数到 URL（保持刷新后当前页签），
 * 每次切换到“我的提交”/“评论”时都重新请求对应列表
 */
const onTabChange = (key: string | number) => {
  const pane = String(key);
  activeTab.value = pane;
  router.replace({ query: { ...route.query, pane } });
  if (pane === "mySubmit") {
    loadSubmitList();
  }
  if (pane === "comment") {
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
 * 点击用户名跳转对方主页（雪花 id 以字符串传递避免精度丢失）
 */
const goUserProfile = (userId?: number) => {
  if (!userId) {
    return;
  }
  router.push({
    path: "/user/profile",
    query: { userId: String(userId) },
  });
};

/**
 * 评论区（评论以帖子形式存储：questionId 关联题目）
 */
const comments = ref<PostVO[]>([]);
const commentTotal = ref(0);
const commentCurrent = ref(1);
const commentPageSize = 10;
const commentSubmitting = ref(false);
const commentsLoading = ref(false);

/**
 * 评论正文折叠：内容超高时默认收起，可展开/收起
 */
// 已展开的评论 id 集合（替换整个 Set 以触发响应式更新）
const expandedIds = ref(new Set<number>());
// 各评论是否超高（决定是否显示展开/收起按钮）
const commentOverflow = ref<Record<number, boolean>>({});
// 评论正文 DOM 引用（用于测量内容高度）
const commentBodyRefs = new Map<number, HTMLElement>();
// 正文内容变化观察器：mermaid 异步渲染、代码块折叠展开等都会改变高度，变化后重新测量
let commentBodyObserver: MutationObserver | null = null;
// 观察器触发的重测按帧节流，避免高频变化时重复测量
let commentMeasureFrame = 0;

/**
 * 收集评论正文 DOM，并观察其内部内容变化（高度变化后重新测量）
 */
const setCommentBodyRef = (id: number | undefined, el: HTMLElement | null) => {
  if (!id) {
    return;
  }
  if (el) {
    commentBodyRefs.set(id, el);
    commentBodyObserver?.observe(el, {
      subtree: true,
      childList: true,
      // 代码块（details）展开/收起时 open 属性变化，同样需要重测
      attributes: true,
      attributeFilter: ["open"],
    });
  } else {
    commentBodyRefs.delete(id);
  }
};

/**
 * 立即测量每条评论正文是否超过折叠高度（折叠态下 scrollHeight 仍为全高）
 */
const measureNow = () => {
  commentBodyRefs.forEach((el, id) => {
    // 已展开的评论保持按钮显示（展开态下 clientHeight 等于内容高，会误判为不高）
    if (expandedIds.value.has(id)) {
      return;
    }
    commentOverflow.value[id] = el.scrollHeight > el.clientHeight + 4;
  });
};

/**
 * 测量评论正文超高状态：nextTick 测一次，再延时补测，
 * 覆盖 mermaid 等异步渲染晚于 DOM 更新的情况
 */
const measureCommentOverflow = () => {
  nextTick(measureNow);
  setTimeout(measureNow, 300);
  setTimeout(measureNow, 1000);
};

/**
 * 切换评论正文展开/收起
 */
const toggleCommentExpand = (id: number | undefined) => {
  if (!id) {
    return;
  }
  const next = new Set(expandedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedIds.value = next;
};

/**
 * 窗口尺寸变化时重新测量（文本折行数会随宽度变化）
 */
const onWindowResize = () => {
  measureCommentOverflow();
};

/**
 * 楼中楼回复：一级评论下的回复列表（两层楼结构，回复不可再被回复）
 * 默认展示前 2 条预览，点击"查看全部"进入分页模式（每页最多 10 条）
 */
// 各一级评论的回复列表（parentId -> 当前页回复列表）
const repliesMap = ref<Record<number, PostVO[]>>({});
// 各一级评论的回复总数（接口返回）
const repliesTotal = ref<Record<number, number>>({});
// 各一级评论的回复当前页码
const repliesPage = ref<Record<number, number>>({});
// 进入全量分页模式的一级评论 id 集合（未进入时默认展示主评论自带 2 条预览）
const repliesFullMode = ref(new Set<number>());
// 回复加载中标记（parentId -> loading）
const repliesLoading = ref<Record<number, boolean>>({});
// 内联回复输入框状态：itemId 为点击回复的条目 id（决定输入框渲染在哪条下方），
// rootId 为所属一级评论 id（回复 parentId 一律指向一级评论，两层楼结构），
// replyUserId 为被回复用户 id，userName 为被回复用户名
const inlineReply = ref<{
  itemId: number;
  rootId: number;
  replyUserId?: number;
  userName: string;
} | null>(null);
// 内联回复输入框内容
const inlineReplyContent = ref("");
// 内联回复提交中标记
const inlineReplySubmitting = ref(false);

/**
 * 点赞/取消点赞：后端返回 1 表示新增、-1 表示取消，本地同步更新
 */
const doThumb = async (item: PostVO) => {
  if (!loginUser.value?.id) {
    toLogin();
    return;
  }
  if (!item.id) {
    return;
  }
  try {
    const res = await PostThumbControllerService.doThumbUsingPost({
      discussionId: item.id,
    });
    if (res.code === 0) {
      item.hasThumb = !item.hasThumb;
      item.thumbNum = Math.max(
        (item.thumbNum ?? 0) + (res.data > 0 ? 1 : -1),
        0
      );
    } else {
      message.error("操作失败，" + res.message);
    }
  } catch {
    message.error("操作失败，请重试");
  }
};

/**
 * 收藏/取消收藏：后端返回 1 表示新增、-1 表示取消，本地同步更新
 */
const doFavour = async (item: PostVO) => {
  if (!loginUser.value?.id) {
    toLogin();
    return;
  }
  if (!item.id) {
    return;
  }
  try {
    const res = await PostFavourControllerService.doPostFavourUsingPost({
      discussionId: item.id,
    });
    if (res.code === 0) {
      item.hasFavour = !item.hasFavour;
      item.favourNum = Math.max(
        (item.favourNum ?? 0) + (res.data > 0 ? 1 : -1),
        0
      );
    } else {
      message.error("操作失败，" + res.message);
    }
  } catch {
    message.error("操作失败，请重试");
  }
};

/**
 * 点击回复按钮：在该条目下方展开内联输入框（不弹编辑器，不预填 @），
 * 回复 parentId 一律指向一级评论（两层楼结构）
 */
const openInlineReply = (item: PostVO) => {
  if (!loginUser.value?.id) {
    toLogin();
    return;
  }
  const rootId = item.parentId ?? item.id;
  if (!rootId || !item.id) {
    return;
  }
  const userName = item.user?.userName ?? "匿名用户";
  inlineReply.value = {
    itemId: item.id,
    rootId,
    replyUserId: item.user?.id,
    userName,
  };
  inlineReplyContent.value = "";
  nextTick(() => {
    document
      .querySelector<HTMLTextAreaElement>(".comment-inline-reply textarea")
      ?.focus();
  });
};

/**
 * 收起内联回复输入框
 */
const closeInlineReply = () => {
  inlineReply.value = null;
  inlineReplyContent.value = "";
  replyMentionVisible.value = false;
};

/* --------------------- 内联回复输入 @ 触发用户联想 --------------------- */

/** @ 联想浮层状态（与编辑器输入 @ 行为一致） */
const replyMentionVisible = ref(false);
/** 当前 @ 词内容（不含 @ 前缀） */
const replyMentionKeyword = ref("");
/** 输入框内 @ 词的起止位置（用于选中后替换） */
const replyMentionRange = ref<{ from: number; to: number }>();
/** 浮层定位（输入框左下角屏幕坐标） */
const replyMentionPos = ref({ x: 0, y: 0 });

/** @ 词分隔符：空白与常见标点（与 MdEditor 保持一致） */
const MENTION_WORD_BREAK_RE = /[\s,，。;；:：!！?？()[\]【】]/;

/**
 * 获取当前内联回复输入框元素
 */
const getInlineReplyTextarea = () =>
  document.querySelector<HTMLTextAreaElement>(".comment-inline-reply textarea");

/**
 * 输入事件：检测光标处是否处于 @ 联想词内，是则显示/更新联想浮层，否则关闭
 */
const onInlineReplyInput = () => {
  const el = getInlineReplyTextarea();
  if (!el) {
    return;
  }
  const text = el.value;
  const head = el.selectionStart ?? text.length;
  let start = head;
  while (start > 0 && !MENTION_WORD_BREAK_RE.test(text[start - 1])) {
    start--;
  }
  const word = text.slice(start, head);
  if (word.startsWith("@") && word.length <= 31) {
    replyMentionRange.value = { from: start, to: head };
    replyMentionKeyword.value = word.slice(1);
    const rect = el.getBoundingClientRect();
    replyMentionPos.value = { x: rect.left, y: rect.bottom };
    replyMentionVisible.value = true;
  } else {
    replyMentionVisible.value = false;
  }
};

/**
 * 键盘事件：光标移出 @ 词范围（方向键等）时关闭联想浮层
 */
const onInlineReplyKeyup = () => {
  if (!replyMentionVisible.value) {
    return;
  }
  const el = getInlineReplyTextarea();
  const range = replyMentionRange.value;
  if (!el || !range) {
    return;
  }
  const head = el.selectionStart ?? 0;
  if (head < range.from || head > range.to) {
    replyMentionVisible.value = false;
  }
};

/**
 * 选中联想用户：把输入框里的 @词 替换为 [@用户名](mention:用户id) 语法并关闭浮层
 * （与编辑器一致，渲染端识别为可点击链接）
 */
const onReplyMentionSelect = (user: UserVO) => {
  const el = getInlineReplyTextarea();
  const range = replyMentionRange.value;
  if (!el || !range) {
    return;
  }
  const insertText = `[@${user.userName}](mention:${user.id}) `;
  const text = el.value;
  inlineReplyContent.value =
    text.slice(0, range.from) + insertText + text.slice(range.to);
  replyMentionVisible.value = false;
  nextTick(() => {
    const el2 = getInlineReplyTextarea();
    if (el2) {
      const pos = range.from + insertText.length;
      el2.focus();
      el2.setSelectionRange(pos, pos);
    }
  });
};

/**
 * 加载某条一级评论第 page 页回复（每页最多 10 条，按时间正序）
 */
const loadRepliesPage = async (parentId: number, page: number) => {
  repliesLoading.value[parentId] = true;
  try {
    const res = await PostControllerService.listPostVoByPageUsingPost({
      parentId,
      current: page,
      pageSize: 10,
      sortField: "createTime",
      sortOrder: "ascend",
    });
    if (res.code === 0) {
      repliesMap.value[parentId] = res.data?.records ?? [];
      repliesTotal.value[parentId] = res.data?.total ?? 0;
      repliesPage.value[parentId] = page;
      measureCommentOverflow();
    } else {
      message.error("加载回复失败，" + res.message);
    }
  } finally {
    repliesLoading.value[parentId] = false;
  }
};

/**
 * 查看全部回复：进入分页模式，展示第 1 页（最多 10 条）
 */
const showAllReplies = async (item: PostVO) => {
  const id = item.id;
  if (!id) {
    return;
  }
  const next = new Set(repliesFullMode.value);
  next.add(id);
  repliesFullMode.value = next;
  await loadRepliesPage(id, 1);
};

/**
 * 收起全量模式：回到默认 2 条预览
 */
const collapseReplies = (item: PostVO) => {
  const id = item.id;
  if (!id) {
    return;
  }
  const next = new Set(repliesFullMode.value);
  next.delete(id);
  repliesFullMode.value = next;
};

/**
 * 楼中楼回复翻页：加载对应页
 */
const onRepliesPageChange = async (item: PostVO, page: number) => {
  const id = item.id;
  if (!id) {
    return;
  }
  await loadRepliesPage(id, page);
};

/**
 * 当前展示的回复列表：全量模式展示整页；预览模式直接用主评论接口自带的
 * replies 字段（后端返回最早 2 条回复），无需额外请求
 */
const displayReplies = (item: PostVO) => {
  if (repliesFullMode.value.has(item.id ?? 0)) {
    return repliesMap.value[item.id ?? 0] ?? [];
  }
  return item.replies ?? [];
};

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
 * 加载评论列表：请求帖子分页接口，按 questionId 过滤当前题目（最新在前）；
 * 每次进入评论页签都重新请求最新数据，并重置楼中楼回复缓存
 */
const loadComments = async () => {
  if (!question.value?.id) {
    return;
  }
  // 请求进行中不重复发起
  if (commentsLoading.value) {
    return;
  }
  commentsLoading.value = true;
  try {
    const res = await PostControllerService.listPostVoByPageUsingPost({
      questionId: question.value?.id,
      current: commentCurrent.value,
      pageSize: commentPageSize,
      sortField: "createTime",
      sortOrder: "descend",
    });
    if (res.code === 0) {
      comments.value = res.data?.records ?? [];
      commentTotal.value = res.data?.total ?? 0;
      // 重新进入评论页签：楼中楼回复回到未加载状态
      repliesMap.value = {};
      repliesTotal.value = {};
      repliesPage.value = {};
      repliesFullMode.value = new Set<number>();
      measureCommentOverflow();
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
      questionId: question.value?.id,
      current: commentCurrent.value,
      pageSize: commentPageSize,
      sortField: "createTime",
      sortOrder: "descend",
    });
    if (res.code === 0) {
      comments.value = res.data?.records ?? [];
      commentTotal.value = res.data?.total ?? 0;
      measureCommentOverflow();
    } else {
      message.error("加载评论失败，" + res.message);
    }
  } finally {
    commentsLoading.value = false;
  }
};

/**
 * 发表一级评论：以帖子形式保存，title 用弹窗标题，content 为 Markdown，
 * questionId 关联题目；发布成功后刷新第一页并回到第一页
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
      questionId: question.value?.id,
    });
    if (res.code === 0) {
      message.success("发布成功");
      commentModalVisible.value = false;
      // 刷新第一页，重新加载并回到第一页
      commentCurrent.value = 1;
      const listRes = await PostControllerService.listPostVoByPageUsingPost({
        questionId: question.value?.id,
        current: 1,
        pageSize: commentPageSize,
        sortField: "createTime",
        sortOrder: "descend",
      });
      if (listRes.code === 0) {
        comments.value = listRes.data?.records ?? [];
        commentTotal.value = listRes.data?.total ?? 0;
        measureCommentOverflow();
      }
    } else {
      message.error("发布失败，" + res.message);
    }
  } finally {
    commentSubmitting.value = false;
  }
};

/**
 * 提交内联回复：parentId 指向一级评论，replyUserId 为被回复用户 id；
 * 成功后收起输入框，刷新该楼回复列表并自动展开
 */
const submitInlineReply = async () => {
  const target = inlineReply.value;
  if (!target || !loginUser.value?.id) {
    return;
  }
  const content = inlineReplyContent.value.trim();
  // 去掉 mention 语法后校验正文非空
  const body = content.replace(/\[@[^\]]*\]\(mention:\d+\)/g, "").trim();
  if (!body) {
    message.warning("回复内容不能为空");
    return;
  }
  inlineReplySubmitting.value = true;
  try {
    const res = await PostControllerService.addPostUsingPost({
      title: "",
      content,
      questionId: question.value?.id,
      parentId: target.rootId,
      replyUserId: target.replyUserId,
    });
    if (res.code === 0) {
      message.success("回复成功");
      const rootId = target.rootId;
      inlineReply.value = null;
      inlineReplyContent.value = "";
      // 进入全量分页模式，重新加载第 1 页让新回复立即可见
      const next = new Set(repliesFullMode.value);
      next.add(rootId);
      repliesFullMode.value = next;
      await loadRepliesPage(rootId, 1);
      // 本地同步一级评论的回复数与预览字段（收起后再展开可看到新回复）
      const root = comments.value.find((c) => c.id === rootId);
      if (root) {
        root.replyCount = (root.replyCount ?? 0) + 1;
        root.replies = (repliesMap.value[rootId] ?? []).slice(0, 2);
      }
    } else {
      message.error("回复失败，" + res.message);
    }
  } finally {
    inlineReplySubmitting.value = false;
  }
};

/**
 * 查看提交代码弹窗：请求详情接口后交由公共组件展示
 */
const judgeResultModalRef = ref();

const openCodeModal = async (record: QuestionSubmitVO) => {
  if (!record.id) {
    return;
  }
  // 竞赛题目提交与题库提交一致：点击测评结果时请求提交详情接口，获取代码与测试点结果
  let detail: QuestionSubmitVO;
  let showCaseResults = true;
  if (isFromContest.value) {
    const res =
      await ContestControllerService.getCompetitionSubmitDetailUsingGet(
        record.id
      );
    if (res.code === 0 && res.data) {
      detail = res.data;
    } else if (res.code === 40101) {
      // 非管理员查看他人提交：无代码权限，回退为列表数据
      detail = record;
      showCaseResults = false;
    } else {
      message.error(res.message || "获取提交详情失败");
      return;
    }
  } else {
    const res = await QuestionControllerService.getQuestionSubmitDetailUsingGet(
      record.id
    );
    if (res.code === 0 && res.data) {
      detail = res.data;
    } else if (res.code === 40101) {
      detail = { ...record, code: "" };
      showCaseResults = false;
    } else {
      message.error(res.message || "获取提交详情失败");
      return;
    }
  }
  judgeResultModalRef.value?.open(detail, showCaseResults);
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
 * 提交代码：竞赛来源走竞赛提交接口（/api/competition/submit/do），
 * 题库来源走普通题目提交接口（/api/question/question_submit/do）
 */
const doSubmit = async () => {
  if (!question.value?.id) {
    return;
  }
  if (!form.value.code || !form.value.code.trim()) {
    message.warning("代码不能为空");
    return;
  }

  const res = competitionId.value
    ? await ContestControllerService.doCompetitionSubmitUsingPost({
        ...form.value,
        questionId: question.value.id,
        competitionId: competitionId.value,
      })
    : await QuestionControllerService.doQuestionSubmitUsingPost({
        ...form.value,
        questionId: question.value.id,
      });
  if (res.code === 0) {
    message.success("提交成功");
    // 提交成功后回到第 1 页并重新请求「我的提交」列表，让新提交记录立即出现
    submitCurrent.value = 1;
    loadSubmitList();
  } else {
    message.error("提交失败," + res.message);
  }
};

/**
 * 页面加载时，请求数据；
 * 刷新后若停留在“我的提交”/“评论”页签（URL pane 参数），
 * 题目加载完成后重新请求对应列表
 */
onMounted(() => {
  loadData().then(() => {
    // 始终加载「我的提交」列表：导航栏需要显示提交数
    loadSubmitList();
    if (activeTab.value === "comment") {
      loadComments();
    }
  });
  loadLanguageList();
  // 从竞赛进入时加载竞赛详情，用于提交按钮置灰判断
  loadContestDetail();
  window.addEventListener("resize", onWindowResize);
  // 注册 SSE 提交状态监听：收到 submit-status 推送时更新「我的提交」列表中对应记录的状态
  offSubmitStatus = onSubmitStatus(({ submitId, status }) => {
    const row = submitList.value.find(
      (item) => String(item.id) === String(submitId)
    );
    if (row) {
      row.status = status;
    } else {
      // 列表中没有该记录（提交后列表未刷新）：重新加载列表让新记录出现
      loadSubmitList();
    }
  });
  // 评论正文内容变化（mermaid 异步渲染、代码块展开收起）后按帧节流重测
  commentBodyObserver = new MutationObserver(() => {
    cancelAnimationFrame(commentMeasureFrame);
    commentMeasureFrame = requestAnimationFrame(measureNow);
  });
});

onUnmounted(() => {
  offSubmitStatus?.();
  window.removeEventListener("resize", onWindowResize);
  cancelAnimationFrame(commentMeasureFrame);
  commentBodyObserver?.disconnect();
  commentBodyObserver = null;
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
    // 重置评论列表（不同题目评论不同），楼中楼回复缓存一并清空
    comments.value = [];
    commentTotal.value = 0;
    commentCurrent.value = 1;
    repliesMap.value = {};
    repliesTotal.value = {};
    repliesPage.value = {};
    repliesFullMode.value = new Set<number>();
    // 收起内联回复输入框
    inlineReply.value = null;
    inlineReplyContent.value = "";
  }
);
</script>

<style>
#viewQuestionView {
  width: 100%;
  /* 页面固定不滚动：视口高度减去顶部菜单栏（详情页底部间距已为 0） */
  height: calc(100vh - 76px);
}

/* 从题库进入：顶部与左右各留 12px（底部为 0），由页面自行包裹内边距 */
#viewQuestionView:not(.with-competition) {
  box-sizing: border-box;
  padding: 12px 12px 0;
}

/* 从竞赛进入：左侧导航栏贴墙贴顶，页面不自带额外内边距 */
#viewQuestionView.with-competition {
  box-sizing: border-box;
}

/* 页面整体布局：竞赛导航栏 + 右侧内容区（包裹左右两栏） */
.question-view-layout {
  display: flex;
  height: 100%;
}

/* 右侧内容区：包裹左右两栏，网格两列等宽，列间距 8px */
.question-row {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  /* 行高恒等于容器高度且允许收缩：内容超高时由各列内部滚动，
     否则隐式 auto 行会被内容撑高，左侧滚动条消失 */
  grid-template-rows: minmax(0, 1fr);
  column-gap: 8px;
}

/* 左右两栏各占一列；窄窗口可收缩 */
.question-row .left-col,
.question-row .right-col {
  min-width: 0;
  height: 100%;
}

/* 竞赛来源：内容区四周留 8px（border-box 计入高度） */
#viewQuestionView.with-competition .question-row {
  box-sizing: border-box;
  padding: 8px;
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

/* 导航栏外层包裹：左右内边距与内容区对齐 */
#viewQuestionView .left-panel .question-nav-wrap {
  flex: none;
  padding: 0 16px;
  height: 50px;
}

/* 自写导航栏：固定高度，导航项等距分布，底部细分隔线 */
#viewQuestionView .left-panel .question-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 40px;
  border-bottom: 1px solid var(--color-neutral-3);
}

/* 导航项计数（我的提交数）：小号灰色，与文字保持间距 */
#viewQuestionView .left-panel .question-nav .nav-item-count {
  margin-left: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}

/* 导航项：与 Arco line 型页签一致（字号/激活主色） */
#viewQuestionView .left-panel .question-nav .nav-item {
  position: relative;
  font-size: 14px;
  line-height: 40px;
  color: var(--color-text-2);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

/* 激活导航项：主色加粗 + 底部 2px 主色下划线（盖住分隔线，与 Arco ink 一致） */
#viewQuestionView .left-panel .question-nav .nav-item-active,
#viewQuestionView .left-panel .question-nav .nav-item-active:hover {
  color: rgb(var(--primary-6));
  font-weight: 500;
}

#viewQuestionView .left-panel .question-nav .nav-item-active::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background-color: rgb(var(--primary-6));
}

/* 页签内容区自适应剩余高度并独立滚动，内容与卡片边框保持间距 */
#viewQuestionView .left-panel .tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  /* 稳定滚动栏槽位：切换页签或内容高度变化时滚动条出现/消失，
     题目内容与代码块宽度保持固定不跳动 */
  scrollbar-gutter: stable;
}

/* 题目内容区：小标题下方显示分隔线（h1/h2/h3 统一处理），加粗与内容区加粗文字一致 */
#viewQuestionView .left-panel .tab-content h1,
#viewQuestionView .left-panel .tab-content h2,
#viewQuestionView .left-panel .tab-content h3 {
  border-bottom: 1px solid #e5e6eb;
  padding-bottom: 8px;
  font-weight: bolder;
  color: #000000;
}

/* 题目名称外层包裹：与下方限制信息保持间距 */
#viewQuestionView .left-panel .tab-content .question-title-wrap {
  margin-bottom: 12px;
  display: flex;
}

/* 题目名称：h1 显示，覆盖区块标题的横线/字重样式 */
#viewQuestionView .left-panel .tab-content .question-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  border-bottom: none;
  padding-bottom: 0;
}

/* 题目标签：CSS Grid 网格排列，放不下自动换行，下方横线与题目描述分隔 */
#viewQuestionView .left-panel .tab-content .question-tags {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, auto));
  gap: 8px;
  border-bottom: 1px solid #e5e6eb;
  padding-bottom: 16px;
}

/* 限制信息：CSS Grid 网格排列，列宽按内容自适应紧凑靠左，项之间竖线分隔 */
#viewQuestionView .left-panel .tab-content .limit-info {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  column-gap: 16px;
}

#viewQuestionView .left-panel .tab-content .limit-item + .limit-item {
  position: relative;
}

/* 竖线定位在 column-gap 中间（左右各 8px） */
#viewQuestionView .left-panel .tab-content .limit-item + .limit-item::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 0;
  bottom: 0;
  border-left: 1px solid #e5e6eb;
}

#viewQuestionView .left-panel .tab-content .limit-label {
  margin-right: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}

#viewQuestionView .left-panel .tab-content .limit-value {
  font-size: 12px;
}

/* 右侧：纵向排列，编辑器填满剩余空间；网格列项允许收缩 */
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
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-1);
  word-break: break-word;
  margin-bottom: 4px;
}

/* 评论元信息行：用户名，位于标题上方 */
.comment-meta {
  display: flex;
  align-items: baseline;
  margin-bottom: 4px;
}

/* 评论用户名：加粗 */
.comment-user {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

/* 主评论用户名：比回复条目更大更醒目 */
.comment-user-root {
  font-size: 16px;
}

/* 可点击用户名（跳转主页）：悬停变主色 */
.comment-user-link {
  cursor: pointer;
  transition: color 0.2s;
}

.comment-user-link:hover {
  color: rgb(var(--primary-6));
}

/* 评论时间：灰色小字，位于评论最下方 */
.comment-time {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 评论底部行：时间在左，点赞/收藏/回复按钮在右 */
.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

/* 主评论底部行：操作按钮靠左排列，与时间保持间隔 */
.comment-item .comment-footer {
  justify-content: flex-start;
  gap: 24px;
}

/* 操作按钮组 */
.comment-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 单个操作按钮：图标 + 文字，悬停变主色，已激活高亮主色 */
.comment-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-3);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.comment-action:hover {
  color: rgb(var(--primary-6));
}

.comment-action-active {
  color: rgb(var(--primary-6));
}

/* 内联回复输入框：出现在被回复条目下方，底部按钮右对齐 */
.comment-inline-reply {
  margin-top: 8px;
}

.comment-inline-reply .arco-textarea {
  width: 100%;
}

.comment-inline-reply-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

/* 输入框下方提示：灰色小字靠左，按钮区保持右对齐 */
.comment-inline-reply-tip {
  margin-right: auto;
  font-size: 12px;
  color: var(--color-text-3);
}

/* 楼中楼回复区 */
.comment-replies {
  margin-top: 8px;
}

/* 展开态底部操作行：查看全部 / 收起并排 */
.comment-replies-actions {
  display: flex;
  gap: 16px;
  margin-top: 10px;
}

/* 查看全部/收起入口：主色小字 */
.comment-replies-more {
  font-size: 13px;
  color: rgb(var(--primary-6));
  cursor: pointer;
  user-select: none;
}

.comment-replies-more:hover {
  text-decoration: underline;
}

/* 楼中楼分页：靠左紧凑显示 */
.comment-reply-pagination {
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
}

/* 回复列表：浅灰底 + 左侧竖线缩进，与一级评论区分 */
.comment-reply-list {
  margin-top: 8px;
  padding: 8px 12px;
  border-left: 3px solid var(--color-border-2);
  background-color: var(--color-fill-1);
  border-radius: 0 4px 4px 0;
}

/* 回复列表 spin 包裹层占满宽度：回复条固定撑满整行 */
.comment-reply-list .arco-spin {
  display: block;
  width: 100%;
}

/* 回复条目：头像 + 内容区水平排列（meta 行与头像同行），比一级评论更紧凑 */
.comment-reply {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.comment-reply + .comment-reply {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-1);
}

/* 被回复人：灰色小字紧跟回复人之后 */
.comment-reply-target {
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

/* 评论正文容器：折叠态限制最大高度并隐藏溢出内容 */
.comment-body {
  font-size: 14px;
  color: var(--color-text-2);
  word-break: break-word;
  position: relative;
}

.comment-body-collapsed {
  max-height: 200px;
  overflow: hidden;
}

/* 折叠态底部渐隐遮罩，提示内容未显示完整 */
.comment-body-collapsed::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 1)
  );
  pointer-events: none;
}

/* 展开/收起按钮：靠左紧凑显示 */
.comment-expand {
  margin-top: 2px;
}

/* 发评论抽屉：内容纵向铺满，表单区占满剩余空间 */
.comment-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.comment-modal .arco-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 内容 form-item 及其内部容器纵向撑开，让编辑器占满剩余高度 */
.comment-modal .arco-form-item:last-child,
.comment-modal .arco-form-item:last-child .arco-form-item-wrapper-col,
.comment-modal .arco-form-item:last-child .arco-form-item-content-wrapper,
.comment-modal .arco-form-item:last-child .arco-form-item-content,
.comment-modal .arco-form-item:last-child .md-editor-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Arco 默认 content-wrapper 交叉轴居中会收缩子元素宽度，改为拉伸让编辑器与标题输入框同宽 */
.comment-modal .arco-form-item:last-child .arco-form-item-wrapper-col,
.comment-modal .arco-form-item:last-child .arco-form-item-content-wrapper,
.comment-modal .arco-form-item:last-child .arco-form-item-content {
  align-items: stretch;
}

.comment-modal .arco-form-item:last-child .md-editor-wrap {
  width: 100%;
}

/* 标题输入框撑满内容区（字数统计悬浮在框内右侧），与编辑器左右边缘对齐 */
.comment-modal .arco-form-item:first-child .arco-form-item-content-flex {
  position: relative;
}

.comment-modal .arco-form-item:first-child .arco-input {
  width: 100%;
  padding-right: 60px;
}

.comment-modal .arco-form-item:first-child .arco-input-word-limit {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

/* 抽屉高度拉满：编辑器自适应占满剩余高度（覆盖组件默认 400px 与原弹窗 300px） */
.comment-modal .md-editor {
  flex: 1;
  height: auto;
  min-height: 0;
}

/* 发评论抽屉：底部按钮右对齐 */
.comment-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
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

/* 窗口变窄时（≤768px）：网格变为单列堆叠，题目在上、编辑器在下，恢复整页滚动 */
@media (max-width: 768px) {
  #viewQuestionView {
    height: auto;
  }
  .question-view-layout {
    flex-direction: column;
  }
  .question-row {
    flex: none;
    width: 100%;
    grid-template-columns: 1fr;
    /* 单列堆叠时行高随内容，不限制为容器高度 */
    grid-template-rows: auto;
    row-gap: 24px;
  }
  .question-row .left-col,
  .question-row .right-col {
    height: auto;
  }
  #viewQuestionView.with-competition .question-row {
    /* 单列堆叠时与导航栏之间留 24px */
    margin-top: 24px;
  }
  .left-panel {
    height: auto;
    overflow: visible;
  }
  .right-col {
    height: auto;
  }
  .editor-wrap {
    min-height: 400px;
  }
}
</style>
