<template>
  <div id="questionsView">
    <a-card>
      <a-form :model="searchParams" layout="inline">
        <a-form-item field="keyword" style="min-width: 240px">
          <a-input v-model="searchParams.keyword" placeholder="请输入名称" />
        </a-form-item>
        <a-form-item field="tags" style="min-width: 240px">
          <a-input-tag v-model="searchParams.tags" placeholder="请输入标签" />
        </a-form-item>
        <a-form-item field="questionStatus">
          <a-select
            v-model="searchParams.questionStatus"
            placeholder="题目状态"
            :style="{ width: '150px' }"
            allow-clear
          >
            <a-option
              v-for="option in questionStatusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.text }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="doSubmit">提交</a-button>
            <a-button @click="doReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
      <a-divider size="0" />
      <a-table
        :ref="tableRef"
        :columns="columns"
        :data="dataList"
        :pagination="{
          showTotal: true,
          pageSize: 20,
          current: searchParams.current,
          total,
        }"
        @page-change="onPageChange"
      >
        <template #questionStatus="{ record }">
          <a-tooltip
            :content="questionStatusTextMap[record.questionStatus ?? 0]"
          >
            <icon-check-circle-fill
              v-if="record.questionStatus === 2"
              class="question-status-icon status-pass"
            />
            <icon-close-circle-fill
              v-else-if="record.questionStatus === 1"
              class="question-status-icon status-fail"
            />
          </a-tooltip>
        </template>
        <template #customId="{ record }">
          <a-tooltip :content="`${record.customId}.${record.title}`">
            <span class="question-title" @click="toQuestionPage(record)">
              <b>{{ record.customId }}</b
              >.{{ record.title }}
            </span>
          </a-tooltip>
        </template>
        <template #tags="{ record }">
          <a-space wrap>
            <a-tag
              v-for="(tag, index) of record.tags"
              :key="index"
              color="green"
              >{{ tag }}
            </a-tag>
          </a-space>
        </template>
        <template #acceptedRate="{ record }">
          {{ formatAcceptedRate(record) }}
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import {
  Page_Question_,
  Question,
  QuestionControllerService,
  QuestionQueryRequest,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import {
  IconCheckCircleFill,
  IconCloseCircleFill,
} from "@arco-design/web-vue/es/icon";
import * as querystring from "querystring";
import { useRouter } from "vue-router";

const tableRef = ref();

/**
 * 计算并格式化通过率：百分比保留两位小数，空值兜底为 0
 */
const formatAcceptedRate = (record: Question) => {
  const submitNum = record.submitNum ?? 0;
  const acceptedNum = record.acceptedNum ?? 0;
  const rate =
    submitNum > 0 ? ((acceptedNum / submitNum) * 100).toFixed(2) : "0.00";
  return `${rate}% (${acceptedNum}/${submitNum})`;
};

const dataList = ref([]);
const total = ref(0);
const searchParams = ref<QuestionQueryRequest>({
  keyword: "",
  tags: [],
  questionStatus: undefined,
  pageSize: 20,
  current: 1,
});

const loadData = async () => {
  // 展开搜索参数：watchEffect 同步追踪到每个字段，任意条件修改即自动查询（与提交页一致）
  const res = await QuestionControllerService.listQuestionVoByPageUsingPost({
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

// {id: "1", title: "A+ D", content: "新的题目内容", tags: "["二叉树"]", description: "新的题目说明", submitNum: 0,…}

/**
 * 题目作答状态中文映射：0 未提交、1 提交未通过、2 通过
 */
const questionStatusTextMap: Record<number, string> = {
  0: "未提交",
  1: "提交未通过",
  2: "已通过",
};

/**
 * 题目状态筛选选项
 */
const questionStatusOptions = [
  { value: 0, text: "未提交" },
  { value: 1, text: "提交未通过" },
  { value: 2, text: "已通过" },
];

const columns = [
  {
    title: "状态",
    slotName: "questionStatus",
    width: 70,
  },
  {
    title: "题目",
    slotName: "customId",
    width: 240,
  },
  {
    title: "标签",
    slotName: "tags",
  },
  {
    title: "通过率",
    slotName: "acceptedRate",
  },
];

const onPageChange = (page: number) => {
  searchParams.value = {
    ...searchParams.value,
    current: page,
  };
};

const router = useRouter();

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
    keyword: "",
    tags: [],
    questionStatus: undefined,
    pageSize: 20,
    current: 1,
  };
};
</script>

<style scoped>
#questionsView {
  max-width: 1280px;
  margin: 0 auto;
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

/* 题目作答状态图标：通过绿色打勾、未通过红色打叉 */
.question-status-icon {
  font-size: 16px;
  vertical-align: middle;
}

.status-pass {
  color: #00b42a;
}

.status-fail {
  color: #f53f3f;
}
</style>
