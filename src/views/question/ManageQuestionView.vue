<template>
  <div id="manageQuestionView">
    <a-card>
      <a-table
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
          <span>
            <b>{{ record.customId }}</b
            >.{{ record.title }}
          </span>
        </template>
        <template #tags="{ record }">
          <a-space wrap>
            <a-tag
              v-for="(tag, index) of parseTags(record)"
              :key="index"
              color="green"
              >{{ tag }}
            </a-tag>
          </a-space>
        </template>
        <template #content="{ record }">
          <a-tooltip :content="record.content">
            <div class="text-clamp-2">{{ record.content }}</div>
          </a-tooltip>
        </template>
        <template #description="{ record }">
          <a-tooltip :content="record.description">
            <div class="text-clamp-2">{{ record.description }}</div>
          </a-tooltip>
        </template>
        <template #createTime="{ record }">
          <span>{{
            moment(record.createTime).format("YYYY/MM/DD HH:mm:ss")
          }}</span>
        </template>
        <template #judgeConfig="{ record }">
          <a-tooltip>
            <div class="text-clamp-2">
              <div
                v-for="(line, index) in formatJudgeConfig(record)"
                :key="index"
              >
                {{ line }}
              </div>
            </div>
            <template #content>
              <div
                v-for="(line, index) in formatJudgeConfig(record)"
                :key="index"
              >
                {{ line }}
              </div>
            </template>
          </a-tooltip>
        </template>
        <template #optional="{ record }">
          <a-space>
            <a-button type="primary" @click="doUpdate(record)"> 修改</a-button>
            <a-button status="danger" @click="doDelete(record)">删除</a-button>
          </a-space>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import {
  JudgeConfig,
  Page_Question_,
  Question,
  QuestionControllerService,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import * as querystring from "querystring";
import { useRouter } from "vue-router";
import moment from "moment";

const tableRef = ref();

const dataList = ref([]);
const total = ref(0);
const searchParams = ref({
  pageSize: 20,
  current: 1,
});

const loadData = async () => {
  const res = await QuestionControllerService.listQuestionByPageUsingPost(
    searchParams.value
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
 * （watchEffect 初始化时会立即执行一次，页面打开即加载，无需再在 onMounted 中调用）
 */
watchEffect(() => {
  loadData();
});

// {id: "1", title: "A+ D", content: "新的题目内容", tags: "["二叉树"]", description: "新的题目说明", submitNum: 0,…}

/**
 * 解析题目标签为数组：后端可能存 JSON 字符串，兼容数组与空值
 */
const parseTags = (record: Question): string[] => {
  const tags = record.tags;
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags;
  }
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [tags];
  } catch {
    return [tags];
  }
};

/**
 * 解析判题配置 JSON 字符串为对象
 */
const parseJudgeConfig = (record: Question): JudgeConfig => {
  const config = record.judgeConfig;
  if (!config) {
    return {};
  }
  if (typeof config === "string") {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config;
};

/**
 * 判题配置展示文案：每行一条配置，时限（ms）、空间（MB），空值兜底为 -
 */
const formatJudgeConfig = (record: Question): string[] => {
  const config = parseJudgeConfig(record);
  const time = config.timeLimit ?? "-";
  const memory = config.memoryLimit ?? "-";
  return [`时限：${time} ms`, `空间：${memory} MB`];
};

const columns = [
  {
    title: "题目",
    slotName: "customId",
    width: 240,
  },
  {
    title: "内容",
    slotName: "content",
    width: 200,
  },
  {
    title: "标签",
    slotName: "tags",
  },
  {
    title: "题目说明",
    slotName: "description",
    width: 200,
  },
  {
    title: "提交数",
    dataIndex: "submitNum",
  },
  {
    title: "通过数",
    dataIndex: "acceptedNum",
  },
  {
    title: "判题配置",
    slotName: "judgeConfig",
    width: 200,
  },
  {
    title: "创建时间",
    slotName: "createTime",
    width: 170,
  },
  {
    title: "操作",
    slotName: "optional",
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

const doDelete = async (question: Question) => {
  const res = await QuestionControllerService.deleteQuestionUsingPost({
    id: question.id,
  });
  if (res.code === 0) {
    message.success("删除成功");
    loadData();
  } else {
    message.error("删除失败");
  }
};

const router = useRouter();

const doUpdate = (question: Question) => {
  router.push({
    path: "/update/question",
    query: {
      id: question.id,
    },
  });
};
</script>

<style scoped>
#manageQuestionView {
}

/* 固定最多 2 行，超出部分省略，悬浮显示完整内容 */
.text-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.5;
}
</style>
