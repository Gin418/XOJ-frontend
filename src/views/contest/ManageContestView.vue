<template>
  <div id="manageContestView">
    <a-row :gutter="20">
      <a-col :style="{ flex: '1 1 0%', minWidth: 0 }">
        <!-- 搜索栏：滚动时固定在顶部菜单栏下方 -->
        <a-card class="search-bar-card">
          <a-form :model="searchParams" layout="inline">
            <a-form-item field="competitionTitle" style="min-width: 240px">
              <a-input
                v-model="searchParams.competitionTitle"
                placeholder="请输入竞赛名称"
              />
            </a-form-item>
            <a-form-item field="status">
              <a-select
                v-model="searchParams.status"
                placeholder="状态"
                :style="{ width: '150px' }"
                allow-clear
              >
                <a-option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.text }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- 竞赛卡片列表：标题 → 描述 → 时间，点击卡片进入详情页 -->
        <a-card
          v-for="competition in dataList"
          :key="competition.id"
          class="contest-card"
          hoverable
          @click="toContestDetail(competition)"
        >
          <div class="contest-header">
            <div class="contest-title">
              {{ competition.competitionTitle }}
              <a-tag color="arcoblue" style="margin-left: 8px">
                {{ statusTextMap[competition.status] ?? competition.status }}
              </a-tag>
            </div>
            <a-space v-if="isAdmin">
              <a-button type="primary" @click.stop="doUpdate(competition)">
                修改
              </a-button>
              <a-button status="danger" @click.stop="doDelete(competition)">
                删除
              </a-button>
            </a-space>
          </div>
          <div class="contest-description">{{ competition.description }}</div>
          <div class="contest-time">
            竞赛时间：{{
              moment(competition.startTime).format("YYYY/MM/DD HH:mm")
            }}
            -
            {{ moment(competition.endTime).format("YYYY/MM/DD HH:mm") }}
            （时长：{{ getDurationText(competition) }}）
          </div>
        </a-card>
        <a-empty v-if="!dataList.length" />

        <!-- 分页：固定每页 20 条，右下角，不包裹卡片 -->
        <div class="pagination-wrapper">
          <a-pagination
            :total="total"
            :current="searchParams.current"
            :page-size="20"
            show-total
            @change="onPageChange"
          />
        </div>
      </a-col>
      <!-- 右侧：本周赛事统计（三行文本，文字靠左、数字靠右） -->
      <a-col flex="320px" :style="{ paddingRight: 0 }">
        <a-card title="本周赛事">
          <div class="week-stats-list">
            <div class="week-stats-row">
              <span>进行中</span>
              <span>{{ weekStats?.ongoingCount ?? 0 }}</span>
            </div>
            <div class="week-stats-row">
              <span>待开始</span>
              <span>{{ weekStats?.pendingCount ?? 0 }}</span>
            </div>
            <div class="week-stats-row">
              <span>本周合计</span>
              <span>{{ weekStats?.allCount ?? 0 }}</span>
            </div>
          </div>
        </a-card>
        <!-- 我参加的竞赛：点击进入详情 -->
        <a-card title="我参加的" class="my-competition-card">
          <div v-if="myCompetitions.length" class="my-competition-list">
            <div
              v-for="item in myCompetitions"
              :key="item.id"
              class="my-competition-item"
              @click="toContestDetail(item)"
            >
              <span class="my-competition-title">
                {{ item.competitionTitle }}
              </span>
              <a-tag color="arcoblue" size="small" style="margin-left: 8px">
                {{ statusTextMap[item.status] ?? item.status }}
              </a-tag>
            </div>
          </div>
          <a-empty v-else />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from "vue";
import type {
  Competition,
  CompetitionVO,
  CompetitionWeekStatsVO,
} from "../../../generated";
import { ContestControllerService } from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import moment from "moment";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import ACCESS_ENUM from "../../access/accessEnum";

const store = useStore();

/**
 * 是否管理员：仅管理员显示修改、删除按钮
 */
const isAdmin = computed(
  () => store.state.user?.loginUser?.userRole === ACCESS_ENUM.ADMIN
);

/**
 * 本周赛事统计：总数 / 未开始 / 进行中（请求 /api/competition/week/stats）
 */
const weekStats = ref<CompetitionWeekStatsVO>();

/**
 * 加载本周赛事统计
 */
const loadWeekStats = async () => {
  const res = await ContestControllerService.getWeekStatsUsingGet();
  if (res.code === 0) {
    weekStats.value = res.data;
  }
};

/**
 * 我参加的竞赛列表（按参加时间倒序，需登录；未登录或失败时保持为空）
 */
const myCompetitions = ref<CompetitionVO[]>([]);

/**
 * 加载我参加的竞赛
 */
const loadMyCompetitions = async () => {
  const res = await ContestControllerService.listMyCompetitionsUsingGet(1, 20);
  if (res.code === 0) {
    myCompetitions.value = res.data?.records ?? [];
  }
};

onMounted(() => {
  loadWeekStats();
  loadMyCompetitions();
});

const dataList = ref([]);
const total = ref(0);
const searchParams = ref({
  competitionTitle: "",
  status: "",
  // 按创建时间倒序排列（最新创建的竞赛在前）
  sortField: "createTime",
  sortOrder: "descend",
  pageSize: 20,
  current: 1,
});

/**
 * 竞赛状态中文映射：NOT_START 待开始、RUNNING 进行中、END 已结束
 */
const statusTextMap: Record<string, string> = {
  NOT_START: "待开始",
  RUNNING: "进行中",
  END: "已结束",
};

/**
 * 状态筛选选项
 */
const statusOptions = [
  { value: "NOT_START", text: "待开始" },
  { value: "RUNNING", text: "进行中" },
  { value: "END", text: "已结束" },
];

const loadData = async () => {
  // 展开搜索参数：watchEffect 同步追踪到每个字段，任意条件修改即自动查询
  const res = await ContestControllerService.listCompetitionByPageUsingPost({
    ...searchParams.value,
  });
  if (res.code === 0) {
    dataList.value = res.data.records;
    total.value = res.data.total;
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 监听 searchParams 变量，改变时触发页面的重新加载
 * （watchEffect 初始化时会立即执行一次，页面打开即加载，无需再在 onMounted 中调用）
 */
watchEffect(() => {
  loadData();
});

const onPageChange = (page: number) => {
  searchParams.value = {
    ...searchParams.value,
    current: page,
  };
};

const doDelete = async (competition: Competition) => {
  const res = await ContestControllerService.deleteCompetitionUsingPost({
    id: competition.id,
  });
  if (res.code === 0) {
    message.success("删除成功");
    loadData();
  } else {
    message.error("删除失败");
  }
};

const router = useRouter();

/**
 * 点击竞赛（列表卡片或“我参加的”条目）：跳转到竞赛详情页
 * 兼容 Competition（id 为 number）与 CompetitionVO（id 为字符串）
 */
const toContestDetail = (competition: { id?: string | number }) => {
  router.push({
    path: `/view/contest/${competition.id}`,
  });
};

/**
 * 计算竞赛时长文本：X天X小时X分钟
 */
const getDurationText = (competition: Competition) => {
  if (!competition.startTime || !competition.endTime) {
    return "未知";
  }
  const diff = moment(competition.endTime).diff(moment(competition.startTime));
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
 * 修改竞赛：直接跳转到创建竞赛页（更新模式），详情由更新页加载时获取，避免重复请求
 */
const doUpdate = (competition: Competition) => {
  router.push({
    path: "/update/contest",
    query: {
      id: competition.id,
    },
  });
};
</script>

<style scoped>
#manageContestView {
}

.contest-card {
  margin-bottom: 8px;
  cursor: pointer;
}

/* 本周赛事统计：三行文本，文字靠左、数字靠右 */
.week-stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

/* 我参加的竞赛：标题省略号截断，状态标签靠右 */
.my-competition-card {
  margin-top: 20px;
}

.my-competition-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  cursor: pointer;
}

.my-competition-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 搜索栏：滚动时固定在顶部菜单栏下方（header 固定高度 64px + 间距），上下内边距收窄降低高度 */
.search-bar-card {
  position: sticky;
  top: 72px;
  z-index: 10;
  margin-bottom: 16px;
}

.search-bar-card :deep(.arco-card-body) {
  padding-top: 10px;
  padding-bottom: 10px;
}

/* 分页右下角 */
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 卡片头部：标题 + 状态标签在左，操作按钮在右 */
.contest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.contest-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

/* 竞赛描述：保留换行，自动换行 */
.contest-description {
  margin-top: 12px;
  color: #4e5969;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.contest-time {
  margin-top: 12px;
  color: #86909c;
  font-size: 13px;
}
</style>
