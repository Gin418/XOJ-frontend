<template>
  <div id="contestDetailView">
    <div class="detail-layout">
      <!-- 左侧竞赛导航栏（菜单 + 题目目录），与题目详情页共用同一组件 -->
      <CompetitionSideNav
        :competition-id="competitionId"
        :active-key="activeKey"
        :questions="questions"
        :has-joined="showFullNav"
        @nav-click="onNavClick"
        @catalog-toggle="onCatalogToggle"
      />

      <!-- 右侧内容区：一个导航对应一个页面 -->
      <div class="detail-main">
        <!-- 预览：左侧竞赛基本信息，右侧 Top10 榜单 -->
        <section v-if="activeKey === 'preview'" class="preview-section">
          <div class="preview-left">
            <a-card class="preview-info-card">
              <div class="contest-header">
                <div class="contest-title">
                  {{ contest?.competitionTitle }}
                </div>
                <div class="contest-header-actions">
                  <!-- 开启赛后提交：仅管理员可见，开启后竞赛结束仍可提交 -->
                  <a-button v-if="isAdmin" @click="doAllowSubmitAfterEnd">
                    开启赛后提交
                  </a-button>
                  <!-- 未参加且竞赛未结束时展示参加入口，参加后隐藏 -->
                  <a-button
                    v-if="!hasJoined && contest?.status !== 'END'"
                    type="primary"
                    :loading="joining"
                    @click="doJoin"
                  >
                    参加竞赛
                  </a-button>
                </div>
              </div>
              <div class="contest-time">
                竞赛时间：{{
                  moment(contest?.startTime).format("YYYY/MM/DD HH:mm")
                }}
                -
                {{ moment(contest?.endTime).format("YYYY/MM/DD HH:mm") }}
                （时长：{{ getDurationText() }}）
              </div>
            </a-card>

            <!-- 竞赛说明：限制最大宽度，不再占满左列 -->
            <a-card
              title="竞赛说明"
              class="preview-desc-card"
              style="margin-top: 16px"
            >
              <div class="contest-description">{{ contest?.description }}</div>
            </a-card>
          </div>

          <!-- Top10 榜单：排名 / 用户 / 解题数；右上角链接跳转完整排名页 -->
          <a-card class="preview-rank-card" :bordered="false">
            <template #title>Top10 榜单</template>
            <template #extra>
              <a-link @click="onNavClick('rank')">完整榜单</a-link>
            </template>
            <!-- 四列表头：排名 / 选手 / 题数 / 罚时 -->
            <div class="top10-header">
              <span class="col-rank">排名</span>
              <span class="col-user">选手</span>
              <span class="col-count">题数</span>
              <span class="col-penalty">罚时</span>
            </div>
            <!-- 固定 10 个名额：有数据的填充，不足的用空占位行补满 -->
            <div
              v-for="(item, index) in rankTop10"
              :key="item?.userVO?.id ?? `empty-${index}`"
              class="top10-item"
            >
              <span class="col-rank" :class="`top10-rank-${index + 1}`">
                {{ index + 1 }}
              </span>
              <span class="col-user">
                <a-avatar :size="24">
                  <img
                    v-if="item?.userVO?.userAvatar"
                    :src="item?.userVO?.userAvatar"
                  />
                </a-avatar>
                <span class="top10-name">
                  {{ item?.userVO?.userName ?? "-" }}
                </span>
              </span>
              <span class="col-count">
                {{ item ? item.acceptedCount ?? 0 : "-" }}
              </span>
              <span class="col-penalty">
                {{ item ? formatMinutes(item.penaltyTime) : "-" }}
              </span>
            </div>
          </a-card>
        </section>

        <!-- 题目：竞赛题目列表（无外方框，表格区域内部滚动） -->
        <section
          v-else-if="activeKey === 'questions'"
          class="questions-section"
        >
          <div class="questions-table-wrapper">
            <!-- 题目表格外层容器组件 -->
            <a-card class="questions-table-card" :bordered="false">
              <a-table
                :columns="columns"
                :data="questions"
                :pagination="false"
                :scroll="{ y: 'calc(100vh - 152px)' }"
                row-key="id"
                @row-click="onTableRowClick"
              >
                <template #status="{ record }">
                  <a-tag
                    :color="questionStatusMap[record.questionStatus]?.color"
                  >
                    {{
                      questionStatusMap[record.questionStatus]?.text ?? "未知"
                    }}
                  </a-tag>
                </template>
                <template #title="{ record }">
                  <b>{{ record.customId }}. {{ record.title }}</b>
                </template>
                <template #firstBlood="{ record }">
                  <span class="first-blood-name">
                    {{ record.firstAcceptedUserVO?.userName ?? "-" }}
                  </span>
                </template>
                <template #rate="{ record }">
                  {{ getAcceptRate(record) }}
                </template>
              </a-table>
            </a-card>
          </div>
          <a-empty v-if="!questions.length" description="暂无题目" />
        </section>

        <!-- 测评：竞赛提交记录（搜索栏 + 分页表格） -->
        <section v-else-if="activeKey === 'judge'" class="judge-section">
          <a-card class="judge-card" :bordered="false">
            <a-form :model="submitSearchParams" layout="vertical">
              <a-form-item field="questionId" label="题号">
                <a-select
                  v-model="submitSearchParams.questionId"
                  :style="{ width: '180px' }"
                  placeholder="选择题目"
                  allow-clear
                >
                  <a-option
                    v-for="q in simpleQuestions"
                    :key="q.questionId"
                    :value="q.questionId"
                  >
                    {{ q.label }}
                  </a-option>
                </a-select>
              </a-form-item>
              <a-form-item field="languageId" label="编程语言">
                <a-select
                  v-model="submitSearchParams.languageId"
                  :style="{ width: '150px' }"
                  placeholder="选择编程语言"
                  allow-clear
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
              <a-form-item field="status" label="测评结果">
                <a-select
                  v-model="submitSearchParams.status"
                  :style="{ width: '150px' }"
                  placeholder="选择测评结果"
                  allow-clear
                >
                  <a-option v-for="s in submitStatusList" :key="s" :value="s">
                    {{ submitStatusTextMap[s] }}
                  </a-option>
                </a-select>
              </a-form-item>
              <a-form-item field="userName" label="提交用户">
                <a-input
                  v-model="submitSearchParams.userName"
                  :style="{ width: '150px' }"
                  placeholder="请输入用户名"
                />
              </a-form-item>
              <a-form-item field="onlyMine" label="只看我的">
                <a-switch v-model="submitSearchParams.onlyMine" />
              </a-form-item>
              <a-form-item label=" " class="search-buttons">
                <a-space>
                  <a-button type="primary" @click="doSubmitSearch">
                    搜索
                  </a-button>
                  <a-button @click="doSubmitReset">重置</a-button>
                </a-space>
              </a-form-item>
            </a-form>
            <!-- 表格区域独立滚动：滚动条只在表格处，搜索栏与分页保持固定 -->
            <div class="judge-table-scroll">
              <a-table
                table-layout="fixed"
                :columns="submitColumns"
                :data="submitList"
                :pagination="false"
              >
                <template #customId="{ record }">
                  <span>
                    <b>{{ record.customId }}</b
                    >.{{ record.questionTitle }}
                  </span>
                </template>
                <template #language="{ record }">
                  <span>
                    {{ record.language?.text ?? record.language ?? "" }} /
                    {{ formatCodeSize(record.code) }}
                  </span>
                </template>
                <template #judgeInfo="{ record }">
                  <a-tag :color="getSubmitStatusColor(record.status)">
                    <span
                      class="judge-info-link"
                      @click="openCodeModal(record)"
                    >
                      {{ submitStatusTextMap[record.status] ?? record.status }}
                    </span>
                  </a-tag>
                </template>
                <template #time="{ record }">
                  <span>{{ record.judgeInfo?.time ?? 0 }} ms</span>
                </template>
                <template #memory="{ record }">
                  <span>{{ formatMemory(record.judgeInfo?.memory) }}</span>
                </template>
                <template #userName="{ record }">
                  <span>{{ record.userVO?.userName ?? "-" }}</span>
                </template>
                <template #createTime="{ record }">
                  <div class="create-time">
                    <div>
                      {{ moment(record.createTime).format("YYYY-MM-DD") }}
                    </div>
                    <div>
                      {{ moment(record.createTime).format("HH:mm:ss") }}
                    </div>
                  </div>
                </template>
              </a-table>
            </div>
            <!-- 分页固定在表格下方，不随表格滚动 -->
            <div class="judge-pagination">
              <a-pagination
                :total="submitTotal"
                :current="submitSearchParams.current"
                :page-size="submitSearchParams.pageSize"
                show-total
                show-page-size
                :page-size-options="[10, 20, 50, 100]"
                @change="onSubmitPageChange"
                @page-size-change="onSubmitPageSizeChange"
              />
            </div>
          </a-card>
        </section>

        <!-- 排名：用户通过数、罚时与每题通过情况；无数据时显示空表格卡片与「暂无排名」提示 -->
        <section v-else-if="activeKey === 'rank'" class="rank-section">
          <div class="rank-table-wrapper">
            <a-card class="rank-card" :bordered="false">
              <!-- 排名操作栏：榜单类型开关（正式/实时）+ 刷新/解榜操作 -->
              <div class="rank-action-bar">
                <div class="rank-official-switch">
                  <span class="rank-official-label">正式榜单</span>
                  <a-switch
                    v-model="officialRankSwitchValue"
                    :disabled="isContestActive"
                    @change="onOfficialRankChange"
                  />
                </div>
                <a-space>
                  <a-button @click="doRefresh">刷新</a-button>
                  <a-button v-if="isAdmin" type="primary" @click="doReveal">
                    解榜
                  </a-button>
                </a-space>
              </div>
              <a-table
                table-layout="fixed"
                :columns="rankColumns"
                :data="rankList"
                :pagination="{
                  showTotal: true,
                  pageSize: rankSearchParams.pageSize,
                  current: rankSearchParams.current,
                  total: rankTotal,
                }"
                @page-change="onRankPageChange"
                :scroll="{ x: rankScrollX, y: 'calc(100vh - 248px)' }"
                row-key="rank"
              >
                <!-- 无数据时的空状态：只显示一个「暂无排名」提示（覆盖表格自带的暂无数据） -->
                <template #empty>
                  <a-empty description="暂无排名" />
                </template>
                <!-- 题目列表头：题号在上，通过数/提交数在下 -->
                <template #rankQuestionTitle="{ column }">
                  <div class="rank-question-header">
                    <div class="rank-question-custom-id">
                      {{ column.title }}
                    </div>
                    <div class="rank-question-stats">
                      {{ (column as any).acceptedNum }}/{{
                        (column as any).submitNum
                      }}
                    </div>
                  </div>
                </template>
                <!-- 排名列 -->
                <template #rank="{ record }">
                  <a-tag
                    v-if="Number(record.rank) <= 3"
                    color="arcoblue"
                    size="small"
                  >
                    {{ record.rank }}
                  </a-tag>
                  <span v-else>{{ record.rank }}</span>
                </template>
                <!-- 用户列 -->
                <template #userName="{ record }">
                  <div class="rank-user">
                    <a-avatar :size="24">
                      <img
                        v-if="record.userVO?.userAvatar"
                        :src="record.userVO?.userAvatar"
                      />
                    </a-avatar>
                    <a-tooltip :content="record.userVO?.userName ?? '-'">
                      <span class="rank-user-name">
                        {{ record.userVO?.userName ?? "-" }}
                      </span>
                    </a-tooltip>
                  </div>
                </template>
                <!-- 解题数列 -->
                <template #acceptedCount="{ record }">
                  {{ record.acceptedCount ?? 0 }}
                </template>
                <!-- 罚时列 -->
                <template #penaltyTime="{ record }">
                  {{ formatMinutes(record.penaltyTime) }}
                </template>
                <!-- 题目列：有冻结提交整格蓝色显示成绩+括号冻结数；通过整格绿色显示用时，
                     未通过整格红色显示负提交次数，未提交显示居中小圆点 -->
                <template #question="{ record, column }">
                  <div
                    v-if="
                      hasFrozenSubmits(
                        record.questions?.[(column as any).questionKey]
                      )
                    "
                    class="rank-cell-frozen"
                  >
                    {{
                      getRankCellFrozenText(
                        record.questions?.[(column as any).questionKey]
                      )
                    }}
                  </div>
                  <div
                    v-else-if="
                      isRankCellEmpty(
                        record.questions?.[(column as any).questionKey]
                      )
                    "
                    class="rank-cell-empty"
                  >
                    <span class="rank-empty-dot"></span>
                  </div>
                  <div
                    v-else-if="
                      isRankCellFailed(
                        record.questions?.[(column as any).questionKey]
                      )
                    "
                    class="rank-cell-failed"
                  >
                    {{
                      getRankCellFailedText(
                        record.questions?.[(column as any).questionKey]
                      )
                    }}
                  </div>
                  <div
                    v-else
                    class="rank-cell-accepted"
                    :class="{
                      'rank-cell-first-blood':
                        record.questions?.[(column as any).questionKey]
                          ?.firstBlood,
                    }"
                  >
                    <span
                      v-if="
                        record.questions?.[(column as any).questionKey]
                          ?.firstBlood
                      "
                      class="first-blood-badge"
                    >
                      ⚔️
                    </span>
                    <span class="rank-accept-time">
                      {{
                        getRankCellAcceptText(
                          record.questions?.[(column as any).questionKey]
                        )
                      }}
                    </span>
                  </div>
                </template>
              </a-table>
            </a-card>
          </div>
        </section>
      </div>
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
          <a-tag :color="getSubmitStatusColor(currentStatus)">
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
              theme="vs-dark"
            />
            <div v-else class="code-empty-tip">
              <icon-lock class="code-empty-icon" />
              <span>暂无代码</span>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ContestControllerService,
  QuestionControllerService,
} from "../../../generated";
import type {
  Competition,
  CompetitionRankItemVO,
  CompetitionRankQuestionInfoVO,
  CompetitionRankQuestionVO,
  LanguageVO,
  QuestionSubmitVO,
  QuestionVO,
  SimpleQuestionVO,
} from "../../../generated";
import { getContestDetail } from "../../store/contestCache";
import message from "@arco-design/web-vue/es/message";
import { Modal } from "@arco-design/web-vue";
import { useStore } from "vuex";
import ACCESS_ENUM from "../../access/accessEnum";
import moment from "moment";
import CompetitionSideNav from "../../components/CompetitionSideNav.vue";
import CodeEditor from "@/components/CodeEditor.vue";
import { IconCopy, IconLock } from "@arco-design/web-vue/es/icon";

const route = useRoute();
const router = useRouter();
const store = useStore();

/**
 * 竞赛 id 路由参数快照：页面内不变，用非响应式快照避免 watchEffect 追踪 route 导致重复请求
 */
const competitionId = String(route.params.id);

/**
 * 当前激活的导航页：preview 预览 / questions 题目 / judge 测评 / rank 排名
 */
const activeKey = ref("preview");

/**
 * 当前用户能否访问该导航页：题目页需已参加或竞赛已结束；
 * 预览/测评/排名始终可访问
 */
const canVisit = (key: string) => {
  if (key === "questions") {
    return showFullNav.value;
  }
  return true;
};

/**
 * 左侧导航点击：切换内容页并重新请求对应数据
 */
const onNavClick = (key: string) => {
  // 题目页未参加且竞赛未结束时不可访问（导航栏也不显示题目菜单）
  if (!canVisit(key)) {
    return;
  }
  // 重复点击当前导航项：不重新发请求（数据已加载）
  if (key === activeKey.value) {
    return;
  }
  activeKey.value = key;
  // 同步当前导航页到 URL query：刷新页面后停留在当前导航页
  router.replace({ query: { ...route.query, tab: key } });
  // 每次切到「预览」都重新请求竞赛详情与 Top10 榜单数据
  if (key === "preview") {
    loadData(true);
    loadRankTop10();
  }
  // 每次切到「题目」都重新请求题目列表
  if (key === "questions") {
    loadQuestions();
  }
  // 每次切到「测评」都重新请求竞赛题目选项（供题号下拉选择）
  if (key === "judge") {
    loadSimpleQuestions();
    loadLanguageList();
  }
  // 每次切到「排名」都重新请求排名页题目统计（题号标签）与排名数据
  if (key === "rank") {
    loadRankQuestions();
    loadRank();
  }
};

const contest = ref<Competition>();
const questions = ref<QuestionVO[]>([]);

/**
 * 题目目录展开/收起：展开时复用已加载的题目列表（无数据时才请求，不重复请求）
 */
const onCatalogToggle = (expanded: boolean) => {
  if (expanded && !questions.value.length) {
    loadQuestions();
  }
};

/**
 * 打开竞赛题目：先请求竞赛题目详情接口，成功后跳转题目详情页
 * 详情页通过 query 携带 competitionId，使用竞赛题目接口加载数据
 */
const openQuestion = async (question: QuestionVO) => {
  const res =
    await ContestControllerService.getCompetitionQuestionByCustomIdUsingGet(
      competitionId,
      question.customId ?? ""
    );
  if (res.code === 0) {
    router.push({
      path: `/view/question/${question.customId}`,
      // 携带当前导航页：从题目列表进入详情页后，侧导航仍停留在「题目」
      query: { competitionId, tab: activeKey.value },
    });
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 点击题目表格行：请求竞赛题目接口并跳转到题目详情页（做题）
 */
const onTableRowClick = (record: QuestionVO) => {
  openQuestion(record);
};

/**
 * 计算竞赛时长文本：X天X小时X分钟
 */
const getDurationText = () => {
  if (!contest.value?.startTime || !contest.value?.endTime) {
    return "未知";
  }
  const diff = moment(contest.value.endTime).diff(
    moment(contest.value.startTime)
  );
  if (diff <= 0) {
    return "0分钟";
  }
  const minutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const remainMinutes = minutes % 60;
  const parts: string[] = [];
  if (days) {
    parts.push(`${days}天`);
  }
  if (hours) {
    parts.push(`${hours}小时`);
  }
  if (remainMinutes || !parts.length) {
    parts.push(`${remainMinutes}分钟`);
  }
  return parts.join("");
};

/**
 * 题目状态映射：0 未提交、1 未通过、2 通过
 */
const questionStatusMap: Record<number, { text: string; color: string }> = {
  0: { text: "未提交", color: "gray" },
  1: { text: "未通过", color: "red" },
  2: { text: "通过", color: "green" },
};

/**
 * 通过率：通过数 / 提交数，同时展示具体通过数与提交数，如 50.0%（1/2）
 */
const getAcceptRate = (record: QuestionVO) => {
  const accepted = record.acceptedNum ?? 0;
  const submit = record.submitNum ?? 0;
  if (!submit) {
    return `0%（${accepted}/${submit}）`;
  }
  return `${((accepted / submit) * 100).toFixed(1)}%（${accepted}/${submit}）`;
};

/**
 * 题目列表列定义：状态 / 题目 / 一血 / 通过率
 */
const columns = [
  {
    title: "状态",
    slotName: "status",
    width: 90,
  },
  {
    title: "题目",
    slotName: "title",
  },
  {
    title: "一血",
    slotName: "firstBlood",
    width: 140,
  },
  {
    title: "通过率",
    slotName: "rate",
    width: 100,
  },
];

/* ------------------------------ 参加竞赛 ------------------------------ */

/**
 * 当前用户是否已参加竞赛：进入详情页时请求一次，参加成功后更新
 */
const hasJoined = ref(false);

/**
 * 参加状态是否已加载完成：加载完成前不根据 URL tab 恢复导航页（避免未参加时误切到其他页）
 */
const joinStatusLoaded = ref(false);

/**
 * 题目页是否可见：已参加即可见；竞赛已结束后题目公开定格，无论是否参加都可见
 * （测评/排名始终可见，不受参加状态限制）
 */
const showFullNav = computed(
  () => hasJoined.value || contest.value?.status === "END"
);

/**
 * 参加竞赛按钮 loading：防止重复提交
 */
const joining = ref(false);

/**
 * 查询当前用户是否已参加竞赛：请求 /api/competition/join/status/{competitionId}
 */
const loadJoinStatus = async () => {
  const res = await ContestControllerService.getJoinStatusUsingGet(
    competitionId
  );
  if (res.code === 0) {
    hasJoined.value = !!res.data;
  }
};

/**
 * 参加竞赛：请求 /api/competition/join，成功后刷新参加状态与 Top10 榜单
 */
const doJoin = async () => {
  // 点击守卫：请求进行中不重复发起
  if (joining.value) {
    return;
  }
  joining.value = true;
  try {
    const res = await ContestControllerService.joinCompetitionUsingPost({
      competitionId,
    });
    if (res.code === 0) {
      message.success("参加成功");
      hasJoined.value = true;
      // 参加后刷新 Top10 榜单，让新选手立即出现在榜单中
      loadRankTop10();
    } else {
      message.error("参加失败，" + res.message);
    }
  } finally {
    joining.value = false;
  }
};

/**
 * 加载竞赛详情
 * @param force 导航切换到预览时强制重新请求最新数据；初始加载走共享缓存避免与顶部栏重复请求
 */
const loadData = async (force = false) => {
  const data = await getContestDetail(competitionId, force);
  if (data) {
    contest.value = data;
  } else {
    message.error("加载失败");
  }
};

/**
 * 加载竞赛题目列表：每次点击「题目」导航都重新请求
 */
const loadQuestions = async () => {
  const questionsRes =
    await ContestControllerService.getCompetitionQuestionsUsingGet(
      competitionId
    );
  if (questionsRes.code === 0) {
    questions.value = questionsRes.data ?? [];
  }
};

/**
 * 竞赛题目选项：题号下拉框数据（label 题号 + questionId 题目 id）
 */
const simpleQuestions = ref<SimpleQuestionVO[]>([]);

/**
 * 加载竞赛题目选项：请求 /api/competition/simpleQuestions/{competitionId}
 */
const loadSimpleQuestions = async () => {
  const res = await ContestControllerService.getSimpleQuestionsUsingGet(
    competitionId
  );
  if (res.code === 0) {
    simpleQuestions.value = res.data ?? [];
  }
};

/* ------------------------------ 测评页：提交记录查询 ------------------------------ */

/**
 * 测评结果中文映射（与后端枚举字符串一致）
 */
const submitStatusTextMap: Record<string, string> = {
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
 * 测评结果枚举列表
 */
const submitStatusList = Object.keys(submitStatusTextMap);

/**
 * 编程语言列表（从后端接口获取，用于搜索栏下拉框）
 */
const languageList = ref<LanguageVO[]>([]);

/**
 * 加载编程语言列表：首次切到「测评」时请求一次，之后复用
 */
const loadLanguageList = async () => {
  if (languageList.value.length) {
    return;
  }
  const res = await QuestionControllerService.getLanguageListUsingGet();
  if (res.code === 0 && res.data?.length) {
    languageList.value = res.data;
  }
};

/**
 * 测评搜索条件：题号 / 编程语言 / 测评结果 / 提交用户 / 只看我的
 */
const submitSearchParams = ref<{
  questionId?: string;
  languageId?: number;
  status?: string;
  userName?: string;
  onlyMine: boolean;
  pageSize: number;
  current: number;
}>({
  questionId: undefined,
  languageId: undefined,
  status: undefined,
  userName: undefined,
  onlyMine: false,
  pageSize: 20,
  current: 1,
});

/**
 * 测评提交记录列表与总数
 */
const submitList = ref([]);
const submitTotal = ref(0);

/* ------------------------------ 测评页：查看提交代码弹窗 ------------------------------ */

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

/**
 * 点击测评结果：打开弹窗查看该次提交的代码
 */
const openCodeModal = (record: QuestionSubmitVO) => {
  codeModalTitle.value = `${record.customId ?? ""}.${
    record.questionTitle ?? ""
  } - 提交代码`;
  currentCode.value = record.code ?? "";
  currentLanguage.value = record.language?.value ?? "java";
  currentQuestionCustomId.value = record.customId ?? "";
  currentQuestionTitle.value = record.questionTitle ?? "";
  currentUserName.value = record.userVO?.userName ?? "";
  currentLanguageText.value = record.language?.text ?? "";
  currentTime.value = record.judgeInfo?.time ?? 0;
  currentMemory.value = formatMemory(record.judgeInfo?.memory);
  currentCodeSize.value = formatCodeSize(record.code);
  currentStatus.value = record.status ?? "";
  currentStatusText.value =
    submitStatusTextMap[record.status ?? ""] ?? record.status ?? "";
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

/**
 * 加载竞赛提交记录：请求 /api/competition/submit/page，按搜索条件分页查询
 */
const loadSubmitList = async () => {
  const res =
    await ContestControllerService.listCompetitionSubmitByPageUsingPost({
      competitionId,
      ...submitSearchParams.value,
      sortField: "createTime",
      sortOrder: "descend",
    });
  if (res.code === 0) {
    submitList.value = res.data.records;
    submitTotal.value = res.data.total;
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 监听搜索条件变化，切到「测评」页时自动重新加载提交记录
 */
watchEffect(() => {
  if (activeKey.value === "judge") {
    loadSubmitList();
  }
});

/**
 * 搜索：重置到第一页并重新加载
 */
const doSubmitSearch = () => {
  submitSearchParams.value = {
    ...submitSearchParams.value,
    current: 1,
  };
};

/**
 * 重置搜索条件，恢复默认值并重新加载
 */
const doSubmitReset = () => {
  submitSearchParams.value = {
    questionId: undefined,
    languageId: undefined,
    status: undefined,
    userName: undefined,
    onlyMine: false,
    pageSize: 20,
    current: 1,
  };
};

/**
 * 翻页：更新页码并重新加载
 */
const onSubmitPageChange = (page: number) => {
  submitSearchParams.value = {
    ...submitSearchParams.value,
    current: page,
  };
};

/**
 * 切换每页条数：重置到第一页
 */
const onSubmitPageSizeChange = (pageSize: number) => {
  submitSearchParams.value = {
    ...submitSearchParams.value,
    pageSize,
    current: 1,
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
 * 根据测评结果返回标签颜色：通过绿 / 判题中橙 / 其余红
 */
const getSubmitStatusColor = (status?: string) => {
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
 * 测评提交记录列定义
 */
const submitColumns = [
  {
    title: "题目",
    slotName: "customId",
    width: 220,
  },
  {
    title: "语言/代码大小",
    dataIndex: "language",
    slotName: "language",
    width: 160,
  },
  {
    title: "测评结果",
    dataIndex: "status",
    slotName: "judgeInfo",
    width: 110,
  },
  {
    title: "运行时间",
    dataIndex: "judgeInfo.time",
    slotName: "time",
    width: 100,
  },
  {
    title: "运行内存",
    dataIndex: "judgeInfo.memory",
    slotName: "memory",
    width: 100,
  },
  {
    title: "提交用户",
    dataIndex: "userName",
    slotName: "userName",
    width: 130,
  },
  {
    title: "提交时间",
    slotName: "createTime",
    width: 180,
  },
];

/* ------------------------------ 排名页：竞赛排名 ------------------------------ */

/**
 * 预览页 Top10 榜单数据：固定查询第一页前 10 名（与排名页分页数据分离）
 */
const rankTop10List = ref<CompetitionRankItemVO[]>([]);

/**
 * 竞赛排名列表：按通过数、罚时排序（后端已排好序，分页返回当前页数据）
 */
const rankList = ref<CompetitionRankItemVO[]>([]);

/**
 * 排名页分页参数：默认第一页每页固定 50 条
 */
const rankSearchParams = ref<{
  current: number;
  pageSize: number;
}>({
  current: 1,
  pageSize: 50,
});

/**
 * 排名总人数（分页 total）
 */
const rankTotal = ref(0);

/**
 * 是否查看正式榜单（用户偏好，默认关闭即实时榜单）：
 * 竞赛未结束时强制查看正式榜单（只统计比赛期间提交），开关禁用；
 * 竞赛结束后可切换：开启=正式榜单（realTime=false），关闭=实时榜单含赛后提交（realTime=true）
 */
const showOfficialRank = ref(false);

/**
 * 竞赛是否未结束：未结束（待开始/进行中）时只能查看正式榜单
 */
const isContestActive = computed(() => contest.value?.status !== "END");

/**
 * 开关显示值：竞赛未结束时强制开启（正式榜单）且不可切换；结束后跟随用户偏好
 */
const officialRankSwitchValue = computed({
  get: () => isContestActive.value || showOfficialRank.value,
  set: (value: boolean) => {
    showOfficialRank.value = value;
  },
});

/**
 * 排名页题目统计：题目 id → 题号、标题、提交数、通过数（列头题号标签来源）
 */
const rankQuestions = ref<CompetitionRankQuestionInfoVO[]>([]);

/**
 * 加载排名页题目统计：请求 /api/competition/rank/questions/{competitionId}
 * （后端对所有状态竞赛都正常返回，表头题号列依赖该数据，不能跳过）
 */
const loadRankQuestions = async () => {
  const res = await ContestControllerService.getRankQuestionsUsingGet(
    competitionId
  );
  if (res.code === 0) {
    rankQuestions.value = res.data ?? [];
  } else {
    message.error("加载失败，" + res.message);
    rankQuestions.value = [];
  }
};

/**
 * 预览页 Top10 榜单：固定 10 个名额，后端已按通过数、罚时排好序；
 * 不足 10 名时用空占位行补满，保证榜单高度稳定
 */
const rankTop10 = computed(() => {
  const list: (CompetitionRankItemVO | null)[] = [...rankTop10List.value];
  while (list.length < 10) {
    list.push(null);
  }
  return list.slice(0, 10);
});

/**
 * 加载预览页 Top10 榜单：请求 /api/competition/rank/{competitionId}（POST），只查第一页 10 条
 */
const loadRankTop10 = async () => {
  const res = await ContestControllerService.getCompetitionRankUsingPost(
    competitionId,
    {
      current: 1,
      pageSize: 10,
    }
  );
  if (res.code === 0) {
    rankTop10List.value = res.data?.records ?? [];
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 加载竞赛排名：请求 /api/competition/rank/{competitionId}（POST），按分页参数查询；
 * 竞赛未结束时强制正式榜单（realTime=false），结束后按开关偏好：
 * 正式榜单 realTime=false（只看比赛期间提交）、实时榜单 realTime=true（含赛后提交）
 */
const loadRank = async () => {
  const res = await ContestControllerService.getCompetitionRankUsingPost(
    competitionId,
    {
      current: rankSearchParams.value.current,
      pageSize: rankSearchParams.value.pageSize,
      realTime: isContestActive.value ? false : !showOfficialRank.value,
    }
  );
  if (res.code === 0) {
    rankList.value = res.data?.records ?? [];
    rankTotal.value = Number(res.data?.total ?? 0);
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 榜单类型开关切换：重置到第一页后按新榜单类型重新加载
 */
const onOfficialRankChange = () => {
  rankSearchParams.value = {
    ...rankSearchParams.value,
    current: 1,
  };
  loadRank();
};

/**
 * 排名翻页：更新页码并重新加载（每页固定 50 条，不支持切换条数）
 */
const onRankPageChange = (page: number) => {
  rankSearchParams.value = {
    ...rankSearchParams.value,
    current: page,
  };
  loadRank();
};

/**
 * 是否管理员：解榜按钮仅管理员可见
 */
const isAdmin = computed(
  () => store.state.user?.loginUser?.userRole === ACCESS_ENUM.ADMIN
);

/**
 * 刷新排名：重新加载排名列表与题目统计
 */
const doRefresh = () => {
  loadRank();
  loadRankQuestions();
};

/**
 * 解榜（仅管理员）：揭榜后封榜期间的提交并入排名统计，成功后刷新排名
 */
const doReveal = () => {
  Modal.confirm({
    title: "确认解榜？",
    content: "解榜后封榜期间的提交将并入排名统计，且不可撤销。",
    okText: "确认解榜",
    cancelText: "取消",
    onOk: async () => {
      const res =
        await ContestControllerService.updateCompetitionSwitchUsingPost({
          id: competitionId,
          isRevealed: 1,
        });
      if (res.code === 0) {
        message.success("解榜成功");
        doRefresh();
      } else {
        message.error("解榜失败，" + res.message);
      }
    },
  });
};

/**
 * 开启赛后提交（仅管理员）：竞赛结束后参赛选手仍可提交代码，成功后刷新竞赛详情
 */
const doAllowSubmitAfterEnd = () => {
  Modal.confirm({
    title: "确认开启赛后提交？",
    content: "开启后竞赛结束后参赛选手仍可提交代码。",
    okText: "确认开启",
    cancelText: "取消",
    onOk: async () => {
      const res =
        await ContestControllerService.updateCompetitionSwitchUsingPost({
          id: competitionId,
          allowSubmitAfterEnd: 1,
        });
      if (res.code === 0) {
        message.success("已开启赛后提交");
        loadData(true);
      } else {
        message.error("开启失败，" + res.message);
      }
    },
  });
};

/**
 * 排名表格列定义：排名 / 用户 / 解题数 / 罚时 + 每题一列（题号 A、B、C……）
 * 题目列顺序按排名页题目统计列表顺序（后端按 questionOrder 升序返回），
 * 不取排名数据 questions 的键顺序：JSON 对象的整数键会被 JS 按数值升序重排，破坏题号顺序
 */
const rankColumns = computed(() => {
  const baseColumns = [
    {
      title: "排名",
      slotName: "rank",
      width: 10,
      minWidth: 80,
      maxWidth: 80,
      fixed: "left",
      align: "center",
    },
    {
      title: "用户",
      slotName: "userName",
      width: 30,
      minWidth: 150,
      maxWidth: 150,
      fixed: "left",
      align: "center",
    },
    {
      title: "题数",
      slotName: "acceptedCount",
      width: 10,
      minWidth: 80,
      maxWidth: 80,
      align: "center",
    },
    {
      title: "罚时",
      slotName: "penaltyTime",
      width: 10,
      minWidth: 80,
      maxWidth: 80,
      align: "center",
    },
  ];
  // 题目列：按 rankQuestions 顺序（题号 A、B、C……），表头两行：题号 + 通过数/提交数
  // 单元格统一使用 #question 命名插槽（Arco 单元格按 column.slotName 匹配同名插槽渲染，
  // 不支持 #cell 通用插槽），用 questionKey 区分每题数据
  return [
    ...baseColumns,
    ...rankQuestions.value.map((question) => ({
      title: question.customId ?? String(question.questionId),
      titleSlotName: "rankQuestionTitle",
      slotName: "question",
      questionKey: String(question.questionId),
      acceptedNum: question.acceptedNum ?? 0,
      submitNum: question.submitNum ?? 0,
      width: 15,
      minWidth: 100,
    })),
  ];
});

/**
 * 排名表格横向滚动宽度：各列取 width、minWidth 与 maxWidth 区间内的宽度求和
 * （题目较多时出现横向滚动条）
 */
const rankScrollX = computed(() => {
  const width = rankColumns.value.reduce((sum, column) => {
    const col = column as any;
    return (
      sum +
      Math.min(
        Math.max(col.width ?? 100, col.minWidth ?? 0),
        col.maxWidth ?? Infinity
      )
    );
  }, 0);
  return Math.max(width, 520);
});

/**
 * 秒数转分钟数字（向下取整）：罚时与通过用时统一只显示分钟数；小于 0 显示 -
 */
const formatMinutes = (seconds?: number) => {
  const total = Number(seconds ?? 0);
  if (total < 0) {
    return "-";
  }
  return Math.floor(total / 60);
};

/**
 * 是否未提交：无数据或未通过且无提交次数视为未提交（显示居中小圆点）
 */
const isRankCellEmpty = (question?: CompetitionRankQuestionVO) => {
  if (!question) {
    return true;
  }
  if (question.accepted) {
    return false;
  }
  return !question.submitCount;
};

/**
 * 是否有冻结提交：封榜后提交且未揭榜（不计入排名），整格蓝色显示；
 * 封榜前已通过的不受冻结影响，仍显示绿色成绩
 */
const hasFrozenSubmits = (question?: CompetitionRankQuestionVO) =>
  !question?.accepted && !!question?.frozenSubmitCount;

/**
 * 冻结格文案：原有成绩文本后括号追加冻结提交数（如 -2(1)）；
 * 无原有成绩时只显示括号冻结数（如 (1)）
 */
const getRankCellFrozenText = (question?: CompetitionRankQuestionVO) => {
  const frozen = question?.frozenSubmitCount ?? 0;
  const failed = getRankCellFailedText(question);
  return failed ? `${failed}(${frozen})` : `(${frozen})`;
};

/**
 * 是否未通过且有提交：整格红色显示提交次数
 */
const isRankCellFailed = (question?: CompetitionRankQuestionVO) => {
  if (!question || question.accepted) {
    return false;
  }
  return !!question.submitCount;
};

/**
 * 未通过格提交次数：整格红色内居中显示的负数（如 -2）
 */
const getRankCellFailedText = (question?: CompetitionRankQuestionVO) => {
  if (!question?.submitCount) {
    return "";
  }
  return `-${question.submitCount}`;
};

/**
 * 通过格文案：罚时分钟数后带括号显示提交次数，如 20(2)；无提交次数只显示罚时
 */
const getRankCellAcceptText = (question?: CompetitionRankQuestionVO) => {
  const minutes = formatMinutes(question?.acceptTimeSeconds);
  const submit = question?.submitCount;
  return submit ? `${minutes}(${submit})` : `${minutes}`;
};

onMounted(async () => {
  // 每次进入详情页强制刷新，确保拿到最新数据（进行中的请求仍会被共享复用）；
  // 等详情返回后再决定是否发排名相关请求（已结束的竞赛直接跳过）
  await loadData(true);
  // 进入详情页即查询参加状态：决定导航栏是否只显示预览
  await loadJoinStatus();
  joinStatusLoaded.value = true;
  // 根据 URL query.tab 恢复导航页；无权访问的导航页（如未参加时的题目页）会被清掉 tab
  restoreTab();
  // 恢复后停留在预览页时加载 Top10 榜单（只查第一页 10 条）；
  // 直接落在排名/测评等页时跳过，切到预览页再按需加载
  if (activeKey.value === "preview") {
    loadRankTop10();
  }
});

/**
 * 根据 URL query.tab 恢复导航页；无权访问的导航页（如未参加时的题目页）清掉 tab 停留在当前页
 */
const restoreTab = () => {
  const key = String(route.query.tab ?? "");
  if (!key || key === activeKey.value) {
    return;
  }
  if (!["preview", "questions", "judge", "rank"].includes(key)) {
    return;
  }
  if (!canVisit(key)) {
    // 无权访问：清掉 URL 中的 tab，避免刷新后再次尝试恢复
    router.replace({ query: { ...route.query, tab: undefined } });
    return;
  }
  onNavClick(key);
};

// 导航页与 URL query.tab 同步：切换导航时写入 query（见 onNavClick），
// 刷新页面或浏览器前进/后退时从 query 恢复当前导航页
// 注意：参加状态确定后才恢复（避免未参加时误切到题目页）；
// 点击导航时 onNavClick 已加载数据并同步 query，此处跳过与当前导航相同的值，避免重复请求
watch(
  () => route.query.tab,
  () => {
    if (joinStatusLoaded.value) {
      restoreTab();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
#contestDetailView {
  /* 靠左对齐，抵消内容区 20px 左内边距让导航栏贴屏幕左墙；宽度拉满；
     高度填满顶部栏以下视口（BasicLayout 竞赛详情页 padding-top 为 76px），页面不出现滚动条 */
  width: 100%;
  height: calc(100vh - 76px);
  margin: 0;
  margin-left: -20px;
  overflow: hidden;
}

/* 左右布局：左侧导航 + 右侧内容 */
.detail-layout {
  display: flex;
  gap: 24px;
  height: 100%;
}

/* 内容区：顶部与底部各留 20px 间距（border-box 计入高度），其余占满，内部滚动 */
.detail-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
  padding-top: 20px;
  padding-bottom: 20px;
  overflow-y: auto;
}

/* 竞赛标题行：标题居左，操作按钮组居右 */
.contest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 标题行右侧操作按钮组：开启赛后提交 / 参加竞赛 */
.contest-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contest-title {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
}

/* 预览页：左侧信息区 + 右侧 Top10 榜单，整体在内容区水平居中 */
.preview-section {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: center;
}

/* 左列固定 600px 宽（与卡片最大宽度一致），整体居中后左右对称 */
.preview-left {
  flex: 0 0 600px;
  min-width: 0;
}

/* 竞赛信息卡与说明卡：限制最大宽度，不再占满左列 */
.preview-info-card,
.preview-desc-card {
  max-width: 600px;
}

.preview-rank-card {
  width: 300px;
  flex-shrink: 0;
}

/* 四列表头：排名 / 选手 / 题数 / 罚时 */
.top10-header {
  display: flex;
  align-items: center;
  padding: 8px 4px;
  font-size: 13px;
  color: #86909c;
  border-bottom: 1px solid var(--color-fill-2);
}

/* 榜单条目：与表头同列对齐 */
.top10-item {
  display: flex;
  align-items: center;
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-fill-2);
}

.top10-item:last-child {
  border-bottom: none;
}

.col-rank {
  width: 40px;
  flex-shrink: 0;
  text-align: center;
  font-weight: 600;
  color: #4e5969;
}

.col-user {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.col-count {
  width: 44px;
  flex-shrink: 0;
  text-align: center;
}

.col-penalty {
  width: 48px;
  flex-shrink: 0;
  text-align: center;
}

/* 前三名排名数字：金 / 银 / 铜 */
.top10-rank-1 {
  color: #f7ba1e;
}

.top10-rank-2 {
  color: #86909c;
}

.top10-rank-3 {
  color: #d25b00;
}

.top10-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 一血列用户名：红色突出显示，字号稍大 */
.first-blood-name {
  font-size: 16px;
  font-weight: 600;
  color: #f53f3f;
}

/* 题目表格行可点击：悬停显示手型光标 */
.questions-table-card :deep(.arco-table-tr) {
  cursor: pointer;
}

/* 题目页：占满内容区高度，表格在内部滚动 */
.questions-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.questions-table-wrapper {
  flex: 1;
  min-height: 0;
  /* 滚动交给表格内部（scroll.y），容器自身不滚动 */
  overflow: hidden;
}

/* 题目表格外层容器：白色圆角卡片，内容铺满 */
.questions-table-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 4px;
  background: #fff;
}

.questions-table-card :deep(.arco-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  /* 表格不紧靠卡片四侧，四周留出内边距 */
  padding: 16px 20px;
}
.contest-time {
  margin-top: 12px;
  color: #86909c;
  font-size: 13px;
}

/* 竞赛描述：保留换行，自动换行 */
.contest-description {
  margin-top: 12px;
  color: #4e5969;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 测评页：占满内容区高度，搜索栏固定在上，表格区域独立滚动 */
.judge-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 测评页：白色卡片，搜索栏在上、表格在下，卡片铺满内容区 */
.judge-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 4px;
}

.judge-card :deep(.arco-card-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* 卡片内部不整体滚动，滚动交给表格区域 */
  overflow: hidden;
  padding: 16px 20px;
}

/* 表格滚动区域：占满剩余高度，滚动条只出现在表格处 */
.judge-table-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* 预留滚动条槽位：数据不足一页（无滚动条）时也占住槽位，
     滚动条出现/消失时表格宽度不变、列不错位 */
  scrollbar-gutter: stable;
}

/* 滚动时表头吸附在滚动区域顶部 */
.judge-table-scroll :deep(.arco-table-th) {
  position: sticky;
  top: 0;
  z-index: 2;
}

/* 分页固定在表格下方，右下角对齐，不随表格滚动 */
.judge-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

/* 测评页搜索栏：label 在上方，控件横向紧凑排列，宽度不足时自动换行 */
.judge-card :deep(.arco-form) {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0 16px;
}

.judge-card :deep(.arco-form-item) {
  /* vertical 布局下 Arco 默认 form-item 宽度 100%，这里改回按内容宽度，否则控件全部靠左 */
  width: auto;
  flex: 0 0 auto;
  margin-right: 0;
  margin-bottom: 8px;
}

/* 搜索/重置按钮：与搜索条件同行，推到行尾右侧 */
.judge-card :deep(.search-buttons) {
  margin-left: auto;
}

/* 提交时间列：日期与时间两行显示 */
.create-time {
  line-height: 1.4;
}

/* 测评结果列：可点击查看提交代码 */
.judge-info-link {
  cursor: pointer;
  font-size: 15px;
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

/* 无代码时的提示：锁图标 + 文案，垂直居中 */
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

/* 弹窗顶部：测评结果 + 提交时间 */
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

/* 排名页：占满内容区高度，表格在内部滚动 */
.rank-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.rank-table-wrapper {
  flex: 1;
  min-height: 0;
  /* 滚动交给表格内部（scroll.y），容器自身不滚动 */
  overflow: hidden;
}

/* 排名表格外层容器：白色圆角卡片，内容铺满 */
.rank-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 4px;
  background: #fff;
}

.rank-card :deep(.arco-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px 20px;
}

/* 排名操作栏：左侧榜单类型开关，右侧刷新/解榜按钮 */
.rank-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

/* 查看正式榜单开关：文字与开关并排 */
.rank-official-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-official-label {
  font-size: 13px;
  color: #4e5969;
}

/* 排名表格：每个单元格显示边框，像网格一样分隔 */
.rank-card :deep(.arco-table-th),
.rank-card :deep(.arco-table-td) {
  border: 1px solid var(--color-border-2);
}

/* 排名表格表头：所有列表头居中（Arco 表头内容在 .arco-table-cell flex 容器内，需 justify-content 居中） */
.rank-card :deep(.arco-table-th),
.rank-card :deep(.arco-table-th .arco-table-cell) {
  text-align: center;
  justify-content: center;
}

/* 题数列内容居中：Arco 按 column.align 给 cell 加 align-center 类，需 justify-content 居中 */
.rank-card :deep(.arco-table-cell-align-center) {
  justify-content: center;
}

/* 排名用户列：头像 + 用户名横向排列 */
.rank-user {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

/* 用户列头像：禁止收缩，避免昵称过长挤压头像变形 */
.rank-user :deep(.arco-avatar) {
  flex-shrink: 0;
}

/* 用户列昵称：超长省略号截断（flex 子项需 min-width: 0 才可收缩），
   Tooltip 触发元素按内容宽度布局，头像与昵称整体居中，悬浮展示完整昵称 */
.rank-user :deep(.arco-trigger) {
  min-width: 0;
}

.rank-user-name {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 题目列表头：题号在上，通过数/提交数在下，两行居中 */
.rank-question-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.5;
}

.rank-question-custom-id {
  font-weight: 600;
}

.rank-question-stats {
  font-size: 12px;
  font-weight: 400;
  color: #86909c;
}

/* 通过：整格绿色背景（一血深绿），罚时/提交次数/小刀图标白色居中 */
.rank-cell-accepted {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  background-color: #00b42a;
  color: #fff;
  font-weight: 500;
}

/* 排名表格固定行高：通过/失败色块是 absolute 定位不撑高，
   给所有 td 固定高度保证行高稳定且每行等高 */
.rank-card :deep(.arco-table-td) {
  height: 56px;
}

.rank-cell-first-blood {
  background-color: #009a29;
}

/* 一血特殊标志：格子右上角的双刀图标 */
.first-blood-badge {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 12px;
  line-height: 1;
}

.rank-accept-time {
  font-size: 13px;
  line-height: 1;
}

/* 未提交：居中的灰色小圆点 */
.rank-cell-empty {
  display: flex;
  justify-content: center;
  align-items: center;
}

.rank-empty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #c9cdd4;
}

/* 未通过：整格红色背景，提交次数白色居中；
   给非固定列的 td 加 relative 定位（固定列 td 是 sticky 不能覆盖），
   失败块 absolute 相对 td 填满整格（td 高度即行高） */
.rank-card
  :deep(
    .arco-table-td:not(.arco-table-col-fixed-left):not(
        .arco-table-col-fixed-right
      )
  ) {
  position: relative;
}

/* 题目格内容溢出裁剪：窄列下标签/文字不会溢出到相邻格子，保持每格等宽等高 */
.rank-card
  :deep(
    .arco-table-td:not(.arco-table-col-fixed-left):not(
        .arco-table-col-fixed-right
      )
      .arco-table-cell
  ) {
  overflow: hidden;
}

.rank-cell-failed {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f53f3f;
  color: #fff;
  font-weight: 500;
}

/* 冻结提交（封榜后未揭榜）：整格蓝色背景，成绩后括号显示冻结提交数 */
.rank-cell-frozen {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #165dff;
  color: #fff;
  font-weight: 500;
}
</style>
