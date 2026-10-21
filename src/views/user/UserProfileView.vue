<template>
  <div id="userProfileView">
    <a-card v-if="profileUser" class="profile-card">
      <a-space :size="24" align="start">
        <a-avatar :size="80" :image-url="profileUser.userAvatar || undefined">
          {{ profileUser.userName?.slice(0, 1) }}
        </a-avatar>
        <div>
          <div class="user-name">{{ profileUser.userName }}</div>
          <div class="user-profile">
            {{ profileUser.userProfile || "这个人很懒，什么都没有写" }}
          </div>
          <div class="user-meta">
            注册时间：{{
              profileUser.createTime
                ? moment(profileUser.createTime).format("YYYY-MM-DD HH:mm:ss")
                : "-"
            }}
          </div>
        </div>
      </a-space>
      <a-divider :margin="16" />
      <div class="stats-row">
        <div class="stats-item">
          <div class="stats-value">{{ passedCount }}</div>
          <div class="stats-label">通过数</div>
        </div>
        <div class="stats-item">
          <div class="stats-value">{{ submitCount }}</div>
          <div class="stats-label">提交数</div>
        </div>
        <div class="stats-item">
          <div class="stats-value">{{ passRate }}%</div>
          <div class="stats-label">通过率</div>
        </div>
      </div>
    </a-card>
    <a-card title="提交热力图" class="heatmap-card">
      <!-- 等级图例：卡片标题栏右上角 -->
      <template #extra>
        <div class="heatmap-legend">
          <span class="heatmap-legend-label">少</span>
          <div
            v-for="level in 5"
            :key="level"
            :class="['heatmap-cell', `heatmap-level-${level - 1}`]"
          />
          <span class="heatmap-legend-label">多</span>
        </div>
      </template>
      <div class="heatmap-body">
        <div class="heatmap-main">
          <!-- 左侧星期标签：一 二 三 四 五 六 日，与网格 7 行对齐 -->
          <div class="heatmap-weekdays">
            <span v-for="weekday in weekdays" :key="weekday">
              {{ weekday }}
            </span>
          </div>
          <div class="heatmap-chart">
            <div class="heatmap-grid">
              <div
                v-for="(day, index) in heatmapDates"
                :key="day?.key ?? `pad-${index}`"
                class="heatmap-day"
              >
                <template v-if="day">
                  <a-tooltip
                    :content="`${day.key}：${day.count} 次提交`"
                    position="top"
                  >
                    <div
                      :class="['heatmap-cell', `heatmap-level-${day.level}`]"
                    />
                  </a-tooltip>
                </template>
                <div v-else class="heatmap-cell heatmap-pad" />
              </div>
            </div>
            <!-- 底部月份标签：在每月首列下方标注月份 -->
            <div class="heatmap-months">
              <span
                v-for="month in monthLabels"
                :key="month.col"
                :style="{ left: `${month.col * 15}px` }"
              >
                {{ month.label }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </a-card>
    <!-- 最近提交 / 近期竞赛：同一卡片，按钮切换 -->
    <a-card>
      <template #title>
        <a-radio-group v-model="activityTab" type="button">
          <a-radio value="submit">最近提交</a-radio>
          <a-radio value="contest">近期竞赛</a-radio>
        </a-radio-group>
      </template>
      <template #extra>
        <!-- 查看全部：仅最近提交页签显示 -->
        <a-link v-if="activityTab === 'submit'" @click="toSubmitPage">
          查看全部
        </a-link>
      </template>

      <!-- 最近提交 -->
      <a-table
        v-if="activityTab === 'submit'"
        table-layout="fixed"
        :columns="columns"
        :data="submitList"
        :pagination="false"
      >
        <template #customId="{ record }">
          <a-tooltip
            :content="`${record.questionVO?.customId}.${record.questionVO?.title}`"
          >
            <span
              class="question-title"
              @click="
                router.push(`/view/question/${record.questionVO?.customId}`)
              "
            >
              <b>{{ record.questionVO?.customId }}</b
              >.{{ record.questionVO?.title }}
            </span>
          </a-tooltip>
        </template>
        <template #language="{ record }">
          <span>
            {{ record.language?.text ?? "" }} /
            {{ formatCodeSize(record.code) }}
          </span>
        </template>
        <template #judgeInfo="{ record }">
          <a-tag :color="getStatusColor(record.status)">
            {{ statusTextMap[record.status] ?? record.status }}
          </a-tag>
        </template>
        <template #time="{ record }">
          <span>{{ record.judgeInfo?.time ?? 0 }} ms</span>
        </template>
        <template #memory="{ record }">
          <span>{{ formatMemory(record.judgeInfo?.memory) }}</span>
        </template>
        <template #createTime="{ record }">
          {{ moment(record.createTime).format("YYYY-MM-DD HH:mm:ss") }}
        </template>
      </a-table>

      <!-- 近期竞赛：仅本人可见（接口查询的是当前登录用户参加的竞赛） -->
      <template v-else>
        <a-empty v-if="!isSelf" description="近期竞赛仅本人主页可见" />
        <a-empty
          v-else-if="!recentContests.length"
          description="暂无参加的竞赛"
        />
        <div v-else class="contest-list">
          <div
            v-for="item in recentContests"
            :key="item.id"
            class="contest-item"
            @click="toContestDetail(item)"
          >
            <div class="contest-item-header">
              <span class="contest-item-title">
                {{ item.competitionTitle }}
              </span>
              <a-tag
                :color="contestStatusColorMap[item.status ?? ''] ?? 'gray'"
                size="small"
              >
                {{ contestStatusTextMap[item.status ?? ""] ?? item.status }}
              </a-tag>
            </div>
            <div class="contest-item-time">
              {{ moment(item.startTime).format("YYYY/MM/DD HH:mm") }}
              -
              {{ moment(item.endTime).format("YYYY/MM/DD HH:mm") }}
            </div>
          </div>
        </div>
      </template>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import moment from "moment";
import message from "@arco-design/web-vue/es/message";
import {
  ContestControllerService,
  QuestionControllerService,
  UserControllerService,
  UserVO,
} from "../../../generated";
import type { CompetitionVO, DailySubmitStatsVO } from "../../../generated";

const router = useRouter();
const route = useRoute();
const store = useStore();
const loginUser = computed(() => store.state.user?.loginUser);

/**
 * 个人资料信息
 */
const profileUser = ref<UserVO>();

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
 * 格式化代码大小：不足 1KB 时显示 B，否则显示 KB
 */
const formatCodeSize = (code: string | undefined) => {
  const bytes = code?.length ?? 0;
  if (bytes > 0 && bytes < 1024) {
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

const submitList = ref([]);

/**
 * 用户答题统计：通过数、总提交次数
 */
const passedCount = ref(0);
const submitCount = ref(0);

/**
 * 通过率（百分比，保留两位小数）
 */
const passRate = computed(() => {
  if (!submitCount.value) {
    return "0.00";
  }
  return ((passedCount.value / submitCount.value) * 100).toFixed(2);
});

const columns = [
  {
    title: "题目",
    slotName: "customId",
    width: 240,
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
    title: "提交时间",
    slotName: "createTime",
    width: 180,
  },
];

/**
 * 查询的目标用户 id：优先取地址栏参数，否则为当前登录用户
 * 注意：用户 id 为 19 位长整数，超出 JS 安全整数范围，必须保持字符串传递，避免精度丢失
 */
const targetUserId = computed(() => {
  const queryId = route.query.userId;
  if (queryId) {
    return String(queryId);
  }
  return loginUser.value?.id;
});

/**
 * 加载用户资料
 */
const loadUser = async () => {
  if (!targetUserId.value) {
    return;
  }
  const res = await UserControllerService.getUserVoByIdUsingGet(
    targetUserId.value as any
  );
  if (res.code === 0) {
    profileUser.value = res.data;
  } else {
    message.error("加载用户信息失败，" + res.message);
  }
};

/**
 * 加载该用户的最近提交（最近 10 条）
 */
const loadSubmitList = async () => {
  if (!targetUserId.value) {
    return;
  }
  const res = await QuestionControllerService.listQuestionSubmitByPageUsingPost(
    {
      userId: targetUserId.value as any,
      pageSize: 10,
      current: 1,
      sortField: "createTime",
      sortOrder: "descend",
    }
  );
  if (res.code === 0) {
    submitList.value = res.data.records;
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 加载用户答题统计（通过数）
 */
const loadStats = async () => {
  if (!targetUserId.value) {
    return;
  }
  const res = await QuestionControllerService.getQuestionStatsUsingGet(
    targetUserId.value as any
  );
  if (res.code === 0) {
    passedCount.value = res.data?.passed ?? 0;
  }
};

/**
 * 加载用户总提交次数（取 count 接口的 total 字段）
 */
const loadCount = async () => {
  if (!targetUserId.value) {
    return;
  }
  const res = await QuestionControllerService.getQuestionCountUsingGet(
    targetUserId.value as any
  );
  if (res.code === 0) {
    submitCount.value = res.data?.total ?? 0;
  }
};

/* ------------------------------ 提交热力图 ------------------------------ */

/**
 * 热力图统计天数：最近一年（后端接口上限 365 天）
 */
const HEATMAP_DAYS = 365;

/**
 * 热力图单日数据：日期 / 提交次数 / 颜色等级
 */
interface HeatmapDay {
  key: string;
  count: number;
  level: number;
}

/**
 * 热力图格子序列：周一对齐的空白占位格 + 最近 365 天的每日数据
 */
const heatmapDates = ref<(HeatmapDay | null)[]>([]);

/**
 * 左侧星期标签：周一至周日
 */
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

/**
 * 底部月份标签：每月第一次出现时记录（月份 + 所在列索引）
 * 列索引 = 格子序号 / 7（每列 7 格），标签绝对定位到对应列下方
 */
const monthLabels = computed(() => {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = "";
  heatmapDates.value.forEach((day, index) => {
    if (!day) {
      return;
    }
    const month = day.key.slice(5, 7);
    if (month !== lastMonth) {
      labels.push({ label: `${Number(month)}月`, col: Math.floor(index / 7) });
      lastMonth = month;
    }
  });
  return labels;
});

/**
 * 提交次数 → 颜色等级：0 无提交、1-2 浅、3-5 中、6-9 深、10+ 最深
 */
const getHeatLevel = (count: number) => {
  if (count <= 0) {
    return 0;
  }
  if (count <= 2) {
    return 1;
  }
  if (count <= 5) {
    return 2;
  }
  if (count <= 9) {
    return 3;
  }
  return 4;
};

/**
 * 应用每日数据：起始日非周一时补空白占位格，保证每列 7 格对齐
 */
const applyHeatmapDays = (days: HeatmapDay[]) => {
  const firstKey = days[0]?.key;
  const padCount = firstKey ? (moment(firstKey).isoWeekday() + 6) % 7 : 0;
  heatmapDates.value = [
    ...Array.from({ length: padCount }, () => null),
    ...days,
  ];
};

/**
 * 用后端每日统计构建热力图（不传 userId 统计当前用户，传 userId 统计指定用户）
 */
const buildHeatmap = (records: DailySubmitStatsVO[]) => {
  const days: HeatmapDay[] = records.map((record) => {
    const count = Number(record.submitCount ?? 0);
    return { key: record.date ?? "", count, level: getHeatLevel(count) };
  });
  applyHeatmapDays(days);
};

/**
 * 加载提交热力图：请求后端每日统计接口（最近一年）
 */
const loadHeatmap = async () => {
  if (!targetUserId.value) {
    applyHeatmapDays([]);
    return;
  }
  const res = await QuestionControllerService.getRecentDailySubmitStatsUsingGet(
    HEATMAP_DAYS,
    targetUserId.value as any
  );
  if (res.code === 0) {
    buildHeatmap(res.data ?? []);
  } else {
    applyHeatmapDays([]);
  }
};

/**
 * 动态卡片切换：submit 最近提交 / contest 近期竞赛
 */
const activityTab = ref<"submit" | "contest">("submit");

/**
 * 点击「查看全部」（最近提交）：跳转测评页面并勾选只看我的
 */
const toSubmitPage = () => {
  router.push({
    path: "/question_submit",
    query: { onlyMine: "1" },
  });
};

/**
 * 是否本人主页：近期竞赛接口只查询当前登录用户参加的竞赛
 */
const isSelf = computed(() => {
  return (
    Boolean(loginUser.value?.id) && targetUserId.value === loginUser.value?.id
  );
});

/* ------------------------------ 近期竞赛 ------------------------------ */

/**
 * 竞赛状态中文映射：NOT_START 待开始、RUNNING 进行中、END 已结束
 */
const contestStatusTextMap: Record<string, string> = {
  NOT_START: "待开始",
  RUNNING: "进行中",
  END: "已结束",
};

/**
 * 竞赛状态标签颜色：待开始橙、进行中绿、已结束灰
 */
const contestStatusColorMap: Record<string, string> = {
  NOT_START: "orange",
  RUNNING: "green",
  END: "gray",
};

/**
 * 近期竞赛：当前用户最近参加的 6 个竞赛（按参加时间倒序）
 */
const recentContests = ref<CompetitionVO[]>([]);

/**
 * 加载近期竞赛：请求 /api/competition/my/list（分页接口）
 */
const loadRecentContests = async () => {
  if (!isSelf.value) {
    return;
  }
  const res = await ContestControllerService.listMyCompetitionsUsingGet(1, 6);
  if (res.code === 0) {
    recentContests.value = res.data?.records ?? [];
  } else {
    message.error("加载近期竞赛失败，" + res.message);
  }
};

/**
 * 点击近期竞赛条目：跳转竞赛详情页
 */
const toContestDetail = (item: CompetitionVO) => {
  router.push({
    path: `/view/contest/${item.id}`,
  });
};

onMounted(() => {
  loadUser();
  loadSubmitList();
  loadStats();
  loadCount();
  loadHeatmap();
  loadRecentContests();
});
</script>

<style scoped>
#userProfileView {
  max-width: 1280px;
  margin: 0 auto;
}

.profile-card {
  margin-bottom: 16px;
}

.user-name {
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
  line-height: 32px;
}

.user-profile {
  margin-top: 8px;
  color: #4e5969;
  font-size: 14px;
}

.user-meta {
  margin-top: 8px;
  color: #86909c;
  font-size: 13px;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stats-value {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
  line-height: 28px;
}

.stats-label {
  margin-top: 4px;
  font-size: 13px;
  color: #86909c;
}

.question-title {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
}

/* 提交热力图卡片：与资料卡之间留出间距 */
.heatmap-card {
  margin-bottom: 16px;
}

/* 热力图主体：主图表（星期 + 网格 + 月份）与图例左右排布 */
.heatmap-body {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
}

/* 主图表：左侧星期标签 + 右侧图表区 */
.heatmap-main {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

/* 左侧星期标签：与网格 7 行一一对齐（12px 行高 + 3px 间距） */
.heatmap-weekdays {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.heatmap-weekdays span {
  height: 12px;
  line-height: 12px;
  font-size: 10px;
  color: #86909c;
}

/* 图表区：宽度收缩到网格实际宽度，月份行与网格列对齐 */
.heatmap-chart {
  display: inline-flex;
  flex-direction: column;
}

/* 热力图网格：按列流动排列（每列 7 格 = 一周），横向可滚动 */
.heatmap-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 12px);
  grid-auto-columns: 12px;
  gap: 3px;
  overflow-x: auto;
  padding-bottom: 4px;
}

/* 底部月份标签行：标签按列位置绝对定位（列宽 12px + 间距 3px = 15px） */
.heatmap-months {
  position: relative;
  height: 18px;
  margin-top: 2px;
  font-size: 10px;
  color: #86909c;
}

.heatmap-months span {
  position: absolute;
  top: 0;
  white-space: nowrap;
}

/* 单日格子：固定尺寸圆角 */
.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* 颜色等级：0 无提交浅灰、1-4 蓝色依次加深（与主题色 #165dff 一致） */
.heatmap-level-0 {
  background-color: var(--color-fill-2);
}

.heatmap-level-1 {
  background-color: #c9dbff;
}

.heatmap-level-2 {
  background-color: #8ab5ff;
}

.heatmap-level-3 {
  background-color: #4d8dff;
}

.heatmap-level-4 {
  background-color: #165dff;
}

/* 图例（卡片标题栏右上角）：少 → 多，与格子同尺寸 */
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 3px;
}

.heatmap-legend-label {
  margin: 0 4px;
  font-size: 12px;
  color: #86909c;
}

/* 近期竞赛列表 */
.contest-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 竞赛条目：可点击卡片样式 */
.contest-item {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--color-fill-1);
  cursor: pointer;
  transition: background-color 0.2s;
}

.contest-item:hover {
  background-color: var(--color-fill-2);
}

/* 竞赛条目头部：标题 + 状态标签 */
.contest-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contest-item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

/* 竞赛起止时间 */
.contest-item-time {
  margin-top: 4px;
  font-size: 12px;
  color: #86909c;
}
</style>
