<template>
  <div class="home-container">
    <!-- 左右两栏：左侧轮播图 + 近期竞赛，右侧提交热力图 -->
    <div class="home-layout">
      <div class="home-left">
        <!-- 首页轮播图：OJ 宣传 banner，自动轮播，悬停暂停，淡入切换 -->
        <a-carousel
          class="home-carousel"
          animation-name="fade"
          :auto-play="{ interval: 4000, hoverToPause: true }"
          indicator-type="dot"
          show-arrow="hover"
        >
          <a-carousel-item v-for="banner in banners" :key="banner.title">
            <div class="banner" :style="{ background: banner.background }">
              <div class="banner-title">{{ banner.title }}</div>
              <div class="banner-desc">{{ banner.desc }}</div>
            </div>
          </a-carousel-item>
        </a-carousel>

        <!-- 近期竞赛：最新创建的 6 个竞赛，点击卡片跳转竞赛详情页 -->
        <a-card title="近期竞赛" class="recent-contest-card" :bordered="false">
          <a-empty v-if="!recentContests.length" description="暂无竞赛" />
          <a-row v-else :gutter="[16, 16]">
            <a-col v-for="item in recentContests" :key="item.id" :span="12">
              <div class="contest-item" @click="toContestDetail(item)">
                <div class="contest-item-header">
                  <span class="contest-item-title">
                    {{ item.competitionTitle }}
                  </span>
                  <a-tag
                    :color="statusTagColorMap[item.status ?? ''] ?? 'gray'"
                    size="small"
                  >
                    {{ statusTextMap[item.status ?? ""] ?? item.status }}
                  </a-tag>
                </div>
                <div class="contest-item-time">
                  {{ moment(item.startTime).format("YYYY/MM/DD HH:mm") }}
                  -
                  {{ moment(item.endTime).format("YYYY/MM/DD HH:mm") }}
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </div>

      <div class="home-right">
        <!-- 每日一题：当天固定题目，点击卡片跳转题目详情页 -->
        <a-card class="daily-card" :bordered="false">
          <template #title>
            <span class="daily-card-title">
              每日一题
              <a-tag color="arcoblue" size="small">
                {{ moment().format("M月D日") }}
              </a-tag>
            </span>
          </template>
          <a-empty v-if="!dailyQuestion" description="每日一题加载失败" />
          <div v-else class="daily-body" @click="toDailyQuestion">
            <span class="daily-id">{{ dailyQuestion.customId }}</span>
            <span class="daily-name">{{ dailyQuestion.title }}</span>
            <span v-if="dailyQuestion.tags?.length" class="daily-tags">
              <a-tag v-for="tag in dailyQuestion.tags" :key="tag" size="small">
                {{ tag }}
              </a-tag>
            </span>
            <span class="daily-go">去挑战 →</span>
          </div>

          <!-- 解题榜：固定 10 个位置，空缺显示虚位以待 -->
          <div class="daily-rank">
            <div class="daily-rank-title">解题榜</div>
            <div class="daily-rank-list">
              <div
                v-for="(item, index) in rankSlots"
                :key="item?.userId ?? `empty-${index}`"
                class="daily-rank-item"
                h
              >
                <template v-if="item">
                  <span
                    class="rank-no"
                    :class="{ 'rank-top': (item.rank ?? 0) <= 3 }"
                  >
                    {{ item.rank }}
                  </span>
                  <a-avatar :size="24" class="rank-avatar">
                    <img
                      v-if="item.userVO?.userAvatar"
                      :src="item.userVO?.userAvatar"
                    />
                  </a-avatar>
                  <span
                    class="rank-user"
                    @click="
                      router.push(
                        `/user/profile?userId=${item.userId ?? item.userVO?.id}`
                      )
                    "
                  >
                    {{ item.userVO?.userName }}
                  </span>
                  <span class="rank-time">
                    {{ moment(item.acceptedTime).format("HH:mm") }}
                  </span>
                </template>
                <template v-else>
                  <span class="rank-no">{{ index + 1 }}</span>
                  <span class="rank-empty">虚位以待</span>
                </template>
              </div>
            </div>
          </div>
        </a-card>

        <!-- 近期动态：我的提交统计 + 每日提交热力图（GitHub 风格，最近 100 天） -->
        <a-card title="近期动态" class="heatmap-card" :bordered="false">
          <div v-if="!isLogin" class="login-tip">
            <div class="login-tip-text">登录后查看你的近期动态</div>
            <a-button type="primary" @click="toLogin">去登录</a-button>
          </div>
          <template v-else>
            <div class="stats-grid">
              <div class="stats-box">
                <div class="stats-value">
                  {{ myStats?.todaySubmitCount ?? "0" }}
                </div>
                <div class="stats-label">今日提交</div>
              </div>
              <div class="stats-box">
                <div class="stats-value">
                  {{ myStats?.monthSubmitCount ?? "0" }}
                </div>
                <div class="stats-label">本月提交</div>
              </div>
              <div class="stats-box">
                <div class="stats-value">
                  {{ myStats?.monthAcceptedCount ?? "0" }}
                </div>
                <div class="stats-label">本月通过数</div>
              </div>
              <div class="stats-box">
                <div class="stats-value">
                  {{ myStats?.continuousSubmitDays ?? "0" }}
                </div>
                <div class="stats-label">连续天数</div>
              </div>
            </div>
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
                            :class="[
                              'heatmap-cell',
                              `heatmap-level-${day.level}`,
                            ]"
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
          </template>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import moment from "moment";
import type {
  CompetitionVO,
  DailyQuestionRankItemVO,
  DailySubmitStatsVO,
  MySubmitStatsVO,
  QuestionVO,
} from "../../generated";
import {
  ContestControllerService,
  QuestionControllerService,
} from "../../generated";
import message from "@arco-design/web-vue/es/message";
import ACCESS_ENUM from "../access/accessEnum";

const router = useRouter();
const store = useStore();

/**
 * 是否已登录：未登录不请求提交记录，热力图区域显示空状态提示
 */
const isLogin = computed(() => {
  const role = store.state.user?.loginUser?.userRole;
  return Boolean(role) && role !== ACCESS_ENUM.NOT_LOGIN;
});

/**
 * 轮播图数据：标题 / 描述 / 渐变背景
 */
const banners = [
  {
    title: "欢迎来到 X OJ",
    desc: "在线编程评测与竞赛平台",
    background: "linear-gradient(135deg, #165dff 0%, #722ed1 100%)",
  },
  {
    title: "海量题库",
    desc: "多语言支持，即时在线测评",
    background: "linear-gradient(135deg, #00b42a 0%, #14c9c9 100%)",
  },
  {
    title: "实时竞赛",
    desc: "排名榜单、封榜与赛后提交机制",
    background: "linear-gradient(135deg, #f7ba1e 0%, #f53f3f 100%)",
  },
];

/**
 * 竞赛状态中文映射：NOT_START 待开始、RUNNING 进行中、END 已结束
 */
const statusTextMap: Record<string, string> = {
  NOT_START: "待开始",
  RUNNING: "进行中",
  END: "已结束",
};

/**
 * 竞赛状态标签颜色：待开始橙、进行中绿、已结束灰
 */
const statusTagColorMap: Record<string, string> = {
  NOT_START: "orange",
  RUNNING: "green",
  END: "gray",
};

/**
 * 近期竞赛列表：最新创建的 6 个竞赛（按创建时间倒序）
 */
const recentContests = ref<CompetitionVO[]>([]);

/**
 * 加载近期竞赛：请求 /api/competition/page，按创建时间倒序取前 6 条
 */
const loadRecentContests = async () => {
  const res = await ContestControllerService.listCompetitionByPageUsingPost({
    current: 1,
    pageSize: 6,
    sortField: "createTime",
    sortOrder: "descend",
  });
  if (res.code === 0) {
    recentContests.value = res.data?.records ?? [];
  } else {
    message.error("加载失败，" + res.message);
  }
};

/* ------------------------------ 每日一题 ------------------------------ */

/**
 * 每日一题：当天日期为随机种子，同一天内固定，次日自动更换
 */
const dailyQuestion = ref<QuestionVO>();

/**
 * 加载每日一题：请求 /api/question/daily（公开接口，无需登录）
 */
const loadDailyQuestion = async () => {
  const res = await QuestionControllerService.getDailyQuestionUsingGet();
  if (res.code === 0) {
    dailyQuestion.value = res.data;
  }
};

/**
 * 每日一题解题榜：当天最早通过的前 10 名
 */
const dailyRank = ref<DailyQuestionRankItemVO[]>([]);

/**
 * 解题榜展示槽位：固定 10 个位置，不足部分用 null 补齐（显示虚位以待）
 */
const rankSlots = computed(() => {
  const slots: (DailyQuestionRankItemVO | null)[] = [];
  for (let i = 0; i < 10; i++) {
    slots.push(dailyRank.value[i] ?? null);
  }
  return slots;
});

/**
 * 加载每日一题解题榜：请求 /api/question/daily/rank（公开接口，无需登录）
 */
const loadDailyRank = async () => {
  const res = await QuestionControllerService.getDailyQuestionRankUsingGet(10);
  if (res.code === 0) {
    dailyRank.value = res.data ?? [];
  }
};

/**
 * 点击每日一题卡片：跳转题目详情页
 */
const toDailyQuestion = () => {
  if (dailyQuestion.value?.customId) {
    router.push(`/view/question/${dailyQuestion.value.customId}`);
  }
};

/* ------------------------------ 近期动态 ------------------------------ */

/**
 * 我的提交统计：今日提交、本月提交、本月通过数、连续天数
 */
const myStats = ref<MySubmitStatsVO>();

/**
 * 加载我的提交统计：请求 /api/question/question_submit/my/stats
 */
const loadMyStats = async () => {
  if (!isLogin.value) {
    return;
  }
  const res = await QuestionControllerService.getMySubmitStatsUsingGet();
  if (res.code === 0) {
    myStats.value = res.data;
  }
};

/**
 * 跳转登录页，登录成功后回跳首页
 */
const toLogin = () => {
  router.push({
    path: "/user/login",
    query: { redirect: "/" },
  });
};

onMounted(() => {
  loadDailyQuestion();
  loadDailyRank();
  loadRecentContests();
  loadMyStats();
  loadHeatmap();
});

/**
 * 点击近期竞赛卡片：跳转竞赛详情页（未登录会被路由守卫拦截）
 */
const toContestDetail = (item: CompetitionVO) => {
  router.push({
    path: `/view/contest/${item.id}`,
  });
};

/* ------------------------------ 提交热力图 ------------------------------ */

/**
 * 热力图统计天数：最近 100 天
 */
const HEATMAP_DAYS = 100;

/**
 * 热力图单日数据：日期 / 提交次数 / 颜色等级
 */
interface HeatmapDay {
  key: string;
  count: number;
  level: number;
}

/**
 * 热力图格子序列：周一对齐的空白占位格 + 最近 100 天的每日数据
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
 * 构建热力图：后端已按日期升序补齐全天数据，
 * 起始日期不是周一时在前面补空白占位格，保证每列 7 格（一周）对齐
 */
const buildHeatmap = (records: DailySubmitStatsVO[]) => {
  const days: HeatmapDay[] = records.map((record) => {
    const count = Number(record.submitCount ?? 0);
    return {
      key: record.date ?? "",
      count,
      level: getHeatLevel(count),
    };
  });
  // 起始日期的周几（1=周一 … 7=周日），非周一时在首列前补空位
  const firstKey = days[0]?.key;
  const padCount = firstKey ? (moment(firstKey).isoWeekday() + 6) % 7 : 0;
  heatmapDates.value = [
    ...Array.from({ length: padCount }, () => null),
    ...days,
  ];
};

/**
 * 加载提交热力图：请求 /api/question/question_submit/my/recent/stats（最近 100 天）；
 * 未登录不请求，接口失败时静默显示空热力图
 */
const loadHeatmap = async () => {
  if (!isLogin.value) {
    buildHeatmap([]);
    return;
  }
  const res = await QuestionControllerService.getRecentDailySubmitStatsUsingGet(
    HEATMAP_DAYS
  );
  if (res.code === 0) {
    buildHeatmap(res.data ?? []);
  } else {
    buildHeatmap([]);
  }
};
</script>

<style scoped>
/* 首页容器：与页面留白 32px 规范一致，左右 24px、上下留白 */
.home-container {
  padding: 16px 24px 32px;
}

/* 左右两栏：左栏自适应占满剩余宽度，右栏固定 320px */
.home-layout {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.home-left {
  flex: 1;
  min-width: 0;
}

.home-right {
  flex: 0 0 320px;
}

/* 轮播图：固定高度、圆角，内容溢出裁剪 */
.home-carousel {
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
}

/* 单张 banner：渐变背景 + 居中白字 */
.banner {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
}

.banner-title {
  font-size: 32px;
  font-weight: 600;
}

.banner-desc {
  font-size: 16px;
  opacity: 0.9;
}

/* 近期竞赛卡片：白色圆角，与轮播图之间留出间距 */
.recent-contest-card {
  margin-top: 16px;
  background: #fff;
  border-radius: 4px;
}

/* 每日一题卡片：白色圆角，右栏首位 */
.daily-card {
  background: #fff;
  border-radius: 4px;
}

/* 每日一题标题：与日期标签垂直对齐 */
.daily-card-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 每日一题主体：可点击，窄栏内标签可换行 */
.daily-body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-fill-2);
  border-radius: 4px;
  background: var(--color-fill-1);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.daily-body:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 题号：加粗主题色 */
.daily-id {
  font-size: 15px;
  font-weight: 600;
  color: #165dff;
}

/* 题目名：自适应宽度，超出省略 */
.daily-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #1d2129;
}

/* 题目标签 */
.daily-tags {
  display: inline-flex;
  gap: 4px;
}

/* 去挑战引导：灰色小字 */
.daily-go {
  font-size: 13px;
  color: #86909c;
  white-space: nowrap;
}

/* 解题榜：标题 + 条目列表 */
.daily-rank {
  margin-top: 16px;
}

.daily-rank-title {
  font-size: 13px;
  font-weight: 600;
  color: #4e5969;
  margin-bottom: 8px;
}

.daily-rank-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 榜单条目：排名 + 用户名 + 通过时间 */
.daily-rank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.daily-rank-item:hover {
  background: var(--color-fill-1);
}

/* 排名序号：前三名主题色加粗 */
.rank-no {
  width: 20px;
  flex: 0 0 20px;
  text-align: center;
  font-weight: 500;
  color: #86909c;
}

.rank-no.rank-top {
  color: #165dff;
  font-weight: 700;
}

/* 用户头像：固定尺寸，防挤压变形 */
.rank-avatar {
  flex: 0 0 auto;
}

/* 用户名：可点击跳转个人主页 */
.rank-user {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1d2129;
  cursor: pointer;
}

.rank-user:hover {
  color: #165dff;
}

/* 空位提示：灰色斜体 */
.rank-empty {
  flex: 1;
  color: #c9cdd4;
  font-size: 12px;
}

/* 通过时间：灰色小字 */
.rank-time {
  color: #86909c;
  white-space: nowrap;
}

/* 单个竞赛条目：浅灰底 + 圆角 + 悬停阴影，可点击 */
.contest-item {
  padding: 12px 16px;
  border: 1px solid var(--color-fill-2);
  border-radius: 4px;
  background: var(--color-fill-1);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.contest-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 条目头：标题省略号 + 状态标签靠右 */
.contest-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.contest-item-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

/* 竞赛时间：灰色小字 */
.contest-item-time {
  margin-top: 8px;
  color: #86909c;
  font-size: 13px;
}

/* 近期动态卡片：白色圆角，与每日一题之间留出间距 */
.heatmap-card {
  margin-top: 16px;
  background: #fff;
  border-radius: 4px;
}

/* 我的提交统计：2x2 纯白小方块 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.stats-box {
  background: #fff;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  padding: 20px 8px;
  text-align: center;
}

.stats-box .stats-value {
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--primary-6));
}

.stats-box .stats-label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-2);
}

/* 未登录提示：居中显示登录引导 */
.login-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 8px;
}

.login-tip-text {
  font-size: 13px;
  color: var(--color-text-2);
}

/* 热力图主体：窄栏内纵向排布，主图表与图例自动换行 */
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
</style>
