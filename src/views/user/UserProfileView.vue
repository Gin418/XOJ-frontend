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
    <a-card>
      <h3 style="margin-top: 0">最近提交</h3>
      <a-table
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
  QuestionControllerService,
  UserControllerService,
  UserVO,
} from "../../../generated";

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

onMounted(() => {
  loadUser();
  loadSubmitList();
  loadStats();
  loadCount();
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
</style>
