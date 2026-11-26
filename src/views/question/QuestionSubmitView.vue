<template>
  <div class="page-container">
    <div id="questionSubmitView">
      <a-row :gutter="20">
        <a-col :style="{ flex: '1 1 0%', minWidth: 0 }">
          <a-card class="search-card">
            <a-form :model="searchParams" layout="vertical">
              <a-form-item field="customId" label="题号">
                <a-input
                  v-model="searchParams.customId"
                  :style="{ width: '150px' }"
                  placeholder="请输入"
                />
              </a-form-item>
              <a-form-item field="userName" label="用户昵称">
                <a-input
                  v-model="searchParams.userName"
                  :style="{ width: '150px' }"
                  placeholder="请输入"
                  allow-clear
                />
              </a-form-item>
              <a-form-item field="languageId" label="编程语言">
                <a-select
                  v-model="searchParams.languageId"
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
                  v-model="searchParams.status"
                  :style="{ width: '150px' }"
                  placeholder="选择测评结果"
                  allow-clear
                >
                  <!-- 已选值按测评结果显示对应颜色 -->
                  <template #label="{ data }">
                    <span :style="getJudgeStatusTextStyle(data?.value)">
                      {{ getJudgeStatusText(data?.value) }}
                    </span>
                  </template>
                  <a-option v-for="s in JUDGE_STATUS_LIST" :key="s" :value="s">
                    <span :style="getJudgeStatusTextStyle(s)">
                      {{ getJudgeStatusText(s) }}
                    </span>
                  </a-option>
                </a-select>
              </a-form-item>
              <a-form-item field="onlyMine" label="只看我的提交">
                <a-switch v-model="searchParams.onlyMine" />
              </a-form-item>
              <a-form-item label=" " class="search-buttons">
                <a-space>
                  <a-button type="primary" @click="doSubmit">搜索</a-button>
                  <a-button @click="doReset">重置</a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-card>
          <a-card>
            <a-table
              table-layout="fixed"
              :ref="tableRef"
              :columns="columns"
              :data="dataList"
              :pagination="{
                showTotal: true,
                showPageSize: true,
                pageSizeOptions: [10, 20, 50, 100],
                pageSize: searchParams.pageSize,
                current: searchParams.current,
                total,
              }"
              @page-change="onPageChange"
              @page-size-change="onPageSizeChange"
            >
              <template #customId="{ record }">
                <a-tooltip
                  :content="`${record.questionVO?.customId}.${record.questionVO?.title}`"
                >
                  <span
                    class="question-title"
                    @click="
                      router.push(
                        `/view/question/${record.questionVO?.customId}`
                      )
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
                <a-tag :color="getJudgeStatusColor(record.status)">
                  <span class="judge-info-link" @click="openCodeModal(record)">
                    {{ getJudgeStatusText(record.status) }}
                  </span>
                </a-tag>
              </template>
              <template #time="{ record }">
                <span>{{ record.judgeInfo?.time ?? 0 }} ms</span>
              </template>
              <template #memory="{ record }">
                <span>{{ formatMemory(record.judgeInfo?.memory) }}</span>
              </template>
              <template #createTime="{ record }">
                <div class="create-time">
                  <div>
                    {{ moment(record.createTime).format("YYYY-MM-DD") }}
                  </div>
                  <div>{{ moment(record.createTime).format("HH:mm:ss") }}</div>
                </div>
              </template>
              <template #userName="{ record }">
                <span
                  class="user-name-link"
                  @click="
                    router.push(
                      `/user/profile?userId=${
                        record.userId ?? record.userVO?.id
                      }`
                    )
                  "
                >
                  {{ record.userVO?.userName }}
                </span>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
      <!-- 查看提交代码弹窗：公共组件，无权限时展示解锁提示 -->
      <JudgeResultModal
        ref="judgeResultModalRef"
        empty-tip="AC 本题后可查看他人代码"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  LanguageVO,
  Question,
  QuestionControllerService,
  QuestionSubmitQueryRequest,
  QuestionSubmitVO,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import { useStore } from "vuex";
import ACCESS_ENUM from "@/access/accessEnum";
import moment from "moment";
import JudgeResultModal from "@/components/JudgeResultModal.vue";
import {
  getJudgeStatusColor,
  getJudgeStatusText,
  getJudgeStatusTextStyle,
  JUDGE_STATUS_LIST,
} from "@/constants/judgeStatus";
import { onSubmitStatus } from "@/plugins/sse";

const tableRef = ref();

/**
 * 编程语言列表（从后端接口获取，用于搜索栏下拉框）
 */
const languageList = ref<LanguageVO[]>([]);

/**
 * 加载编程语言列表
 */
const loadLanguageList = async () => {
  const res = await QuestionControllerService.getLanguageListUsingGet();
  if (res.code === 0 && res.data?.length) {
    languageList.value = res.data;
    // 编程语言默认不选中（空），由用户自行选择
  }
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

const dataList = ref([]);
const total = ref(0);

// SSE 提交状态监听器的注销函数：页面卸载时移除监听
let offSubmitStatus: (() => void) | undefined;

/**
 * 从个人主页「查看全部」跳转时携带 onlyMine=1，进入页面即勾选只看我的
 */
const route = useRoute();
const searchParams = ref<QuestionSubmitQueryRequest>({
  customId: undefined,
  userName: undefined,
  languageId: undefined,
  status: undefined,
  onlyMine: route.query.onlyMine === "1",
  pageSize: 20,
  current: 1,
});

const loadData = async () => {
  const res = await QuestionControllerService.listQuestionSubmitByPageUsingPost(
    {
      ...searchParams.value,
      sortField: "createTime",
      sortOrder: "descend",
    }
  );
  if (res.code === 0) {
    dataList.value = res.data.records;
    total.value = res.data.total;
  } else {
    message.error("加载失败，" + res.message);
  }
};

/**
 * 监听 searchParams 变量，改变时触发页面的重新加载
 */
watchEffect(() => {
  loadData();
});

/**
 * 页面加载时，请求数据
 */
onMounted(() => {
  // 提交列表由 watchEffect 统一触发加载，此处不重复调用 loadData
  loadLanguageList();
  // 注册 SSE 提交状态监听：收到 submit-status 推送时更新列表中对应记录的状态
  offSubmitStatus = onSubmitStatus(({ submitId, status }) => {
    const row = dataList.value.find(
      (item) => String(item.id) === String(submitId)
    );
    if (row) {
      row.status = status;
    } else {
      // 列表中没有该记录（提交后列表未刷新）：重新加载列表让新记录出现
      loadData();
    }
  });
});

/**
 * 页面卸载时，移除 SSE 提交状态监听
 */
onUnmounted(() => {
  offSubmitStatus?.();
});

/**
 * 是否已登录：未登录时查看提交代码需先登录
 */
const store = useStore();
const loginUser = computed(() => store.state.user?.loginUser);
const isLogin = computed(() => {
  const role = loginUser.value?.userRole;
  return (
    Boolean(loginUser.value?.userName) &&
    Boolean(role) &&
    role !== ACCESS_ENUM.NOT_LOGIN
  );
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
    title: "提交用户",
    dataIndex: "userId",
    slotName: "userName",
    width: 130,
  },
  {
    title: "提交时间",
    slotName: "createTime",
    width: 180,
  },
];

const onPageChange = (page: number) => {
  searchParams.value = {
    ...searchParams.value,
    current: page,
  };
};

/**
 * 切换每页条数：重置到第一页
 */
const onPageSizeChange = (pageSize: number) => {
  searchParams.value = {
    ...searchParams.value,
    pageSize,
    current: 1,
  };
};

const router = useRouter();

/**
 * 查看提交代码弹窗：请求详情接口后交由公共组件展示
 */
const judgeResultModalRef = ref();

const openCodeModal = async (record: QuestionSubmitVO) => {
  // 未登录时查看提交代码需先登录
  if (!isLogin.value) {
    toLogin();
    return;
  }
  if (!record.id) {
    return;
  }
  // 点击测评结果时请求提交详情接口，由后端校验代码查看权限
  const res = await QuestionControllerService.getQuestionSubmitDetailUsingGet(
    record.id
  );
  let detail = res.data;
  // 是否展示测试点详情：无权限回退时仅展示公开信息，不展示测试点
  let showCaseResults = true;
  if (res.code !== 0 || !detail) {
    // 无权限查看代码时，沿用列表中的公开信息打开弹窗，代码区展示解锁提示
    if (res.code === 40101) {
      detail = { ...record, code: "" };
      showCaseResults = false;
    } else {
      message.error(res.message || "获取提交详情失败");
      return;
    }
  }
  judgeResultModalRef.value?.open(detail, showCaseResults);
};

/**
 * 跳转到做题页面
 * @param question
 */
const toQuestionPage = (question: Question) => {
  router.push({
    path: `/view/question/${question.customId}`,
  });
};

/**
 * 确认搜索，重新加载数据
 */
const doSubmit = () => {
  // 这里需要重置搜索页号
  searchParams.value = {
    ...searchParams.value,
    current: 1,
  };
};

/**
 * 重置搜索条件，恢复默认值并重新加载
 */
const doReset = () => {
  searchParams.value = {
    customId: undefined,
    userName: undefined,
    languageId: undefined,
    status: undefined,
    onlyMine: false,
    pageSize: 20,
    current: 1,
  };
};

/**
 * 跳转登录页，登录成功后回跳当前页
 */
const toLogin = () => {
  router.push({
    path: "/user/login",
    query: { redirect: "/question_submit" },
  });
};
</script>

<style scoped>
#questionSubmitView {
  width: 100%;
  margin: 0 auto;
  /* 整个页面灰色背景，内部卡片为纯白 */
  background: var(--color-fill-2);
}

.search-card {
  margin-bottom: 16px;
}

/* 搜索栏：label 在上方，控件横向紧凑排列，宽度不足时自动换行 */
#questionSubmitView .arco-form {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0 16px;
}

#questionSubmitView .arco-form-item {
  /* vertical 布局下 Arco 默认 form-item 宽度 100%，这里改回按内容宽度，否则控件全部靠左 */
  width: auto;
  flex: 0 0 auto;
  margin-right: 0;
  margin-bottom: 8px;
}

/* 搜索/重置按钮：与搜索条件同行，推到行尾右侧 */
#questionSubmitView .search-buttons {
  margin-left: auto;
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

.user-name-link {
  color: var(--color-text-1);
  cursor: pointer;
}

.user-name-link:hover {
  color: rgb(var(--primary-6));
}

/* 测评结果列：可点击查看提交代码（与题目详情页判题状态列样式一致） */
.judge-info-link {
  cursor: pointer;
  font-size: 15px;
}
</style>
