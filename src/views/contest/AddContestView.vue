<template>
  <div id="addContestView">
    <!-- 纯白卡片：标题与表单一起包裹 -->
    <a-card>
      <h2 style="margin-bottom: 16px">
        {{ updatePage ? "更新竞赛" : "创建竞赛" }}
      </h2>
      <!-- label 右对齐：标签文字紧贴输入框，不靠卡片左墙 -->
      <a-form :model="form" label-align="right">
        <a-form-item field="title" label="竞赛标题">
          <a-input
            v-model="form.title"
            placeholder="请输入竞赛标题"
            style="width: 560px"
          />
        </a-form-item>
        <a-form-item field="description" label="竞赛描述">
          <a-textarea
            v-model="form.description"
            placeholder="请输入竞赛描述"
            :auto-size="{ minRows: 3, maxRows: 8 }"
            style="width: 560px"
          />
        </a-form-item>
        <a-form-item field="startTime" label="开始时间">
          <a-date-picker
            v-model="form.startTime"
            show-time
            format="YYYY-MM-DD HH:mm"
            style="width: 320px"
            placeholder="请选择开始时间"
          />
        </a-form-item>
        <a-form-item field="endTime" label="结束时间">
          <a-date-picker
            v-model="form.endTime"
            show-time
            format="YYYY-MM-DD HH:mm"
            style="width: 320px"
            placeholder="请选择结束时间"
          />
        </a-form-item>
        <a-form-item field="freezeTime" label="封榜时间">
          <a-date-picker
            v-model="form.freezeTime"
            show-time
            format="YYYY-MM-DD HH:mm"
            style="width: 320px"
            placeholder="请选择封榜时间"
          />
        </a-form-item>
        <a-form-item label="竞赛题目">
          <div style="width: 100%; max-width: 560px">
            <a-button style="margin-bottom: 12px" @click="openModal">
              添加题目
            </a-button>
            <a-table
              v-if="form.questions.length"
              :columns="selectedColumns"
              :data="form.questions"
              :pagination="false"
              row-key="id"
            >
              <template #customId="{ record }">
                <b>{{ record.customId }}</b
                ><template v-if="record.title">.{{ record.title }}</template>
              </template>
              <template #action="{ record }">
                <a-button
                  type="text"
                  status="danger"
                  @click="removeQuestion(record)"
                >
                  移除
                </a-button>
              </template>
            </a-table>
            <a-empty v-else description="尚未添加题目" />
          </div>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" style="min-width: 200px" @click="doSubmit">
            提交
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 添加题目弹窗：搜索并勾选要加入竞赛的题目 -->
    <a-modal
      v-model:visible="modalVisible"
      title="添加题目"
      :width="800"
      ok-text="确认添加"
      @ok="confirmSelect"
      @cancel="cancelSelect"
    >
      <a-form layout="inline" style="margin-bottom: 16px">
        <a-form-item>
          <a-input
            v-model="searchKeyword"
            placeholder="请输入题目名称"
            style="width: 240px"
            @press-enter="loadQuestionList"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="loadQuestionList">搜索</a-button>
        </a-form-item>
      </a-form>
      <a-table
        :columns="questionColumns"
        :data="questionList"
        :pagination="{
          showTotal: true,
          pageSize: 10,
          current: questionCurrent,
          total: questionTotal,
        }"
        row-key="id"
        :row-selection="{ type: 'checkbox' }"
        v-model:selectedKeys="selectedKeys"
        @page-change="onQuestionPageChange"
      >
        <template #customId="{ record }">
          <b>{{ record.customId }}</b
          >.{{ record.title }}
        </template>
        <template #tags="{ record }">
          <a-space wrap>
            <a-tag
              v-for="(tag, index) of record.tags"
              :key="index"
              color="green"
            >
              {{ tag }}
            </a-tag>
          </a-space>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import message from "@arco-design/web-vue/es/message";
import {
  ContestAddRequest,
  ContestControllerService,
  QuestionControllerService,
  QuestionVO,
} from "../../../generated";
import { useRoute } from "vue-router";
import moment from "moment";

const route = useRoute();
// 如果页面地址包含 update，视为更新页面
const updatePage = route.path.includes("update");

/**
 * 已选题目条目
 */
type SelectedQuestion = {
  id?: number | string;
  customId?: string;
  title?: string;
};

const form = ref({
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  freezeTime: "",
  questions: [] as SelectedQuestion[],
});

/**
 * 更新模式：根据竞赛 id 获取详情并回显
 */
const loadData = async () => {
  const id = route.query.id;
  if (!id) {
    return;
  }
  const res = await ContestControllerService.getCompetitionDetailUsingGet(
    String(id)
  );
  if (res.code === 0) {
    const data = res.data;
    form.value.title = data?.competitionTitle ?? "";
    form.value.description = data?.description ?? "";
    // 时间只精确到分钟：归一化为 YYYY-MM-DD HH:mm:00 后回显（与选择器 format 一致）
    form.value.startTime = normalizeTime(data?.startTime ?? "");
    form.value.endTime = normalizeTime(data?.endTime ?? "");
    form.value.freezeTime = normalizeTime(data?.freezeTime ?? "");
    // 回显竞赛题目：一次性获取竞赛关联的题目列表
    const questionsRes =
      await ContestControllerService.getSimpleQuestionsUsingGet(String(id));
    if (questionsRes.code === 0) {
      form.value.questions = (questionsRes.data ?? []).map((item) => ({
        // simpleQuestions 接口的题目 id 字段为 questionId，题号字段为 label
        id: item.questionId,
        customId: item.label,
      }));
    }
  } else {
    message.error("加载失败，" + res.message);
  }
};

onMounted(() => {
  if (updatePage) {
    loadData();
  }
});

/**
 * 已选题目列表：题号 + 操作（移除）
 */
const selectedColumns = [
  {
    title: "题号",
    slotName: "customId",
    width: 200,
  },
  {
    title: "操作",
    slotName: "action",
    width: 80,
  },
];

/**
 * 移除已选题目：按引用定位精确移除，避免 id 缺失/相同时误删其他题目
 */
const removeQuestion = (question: SelectedQuestion) => {
  const index = form.value.questions.findIndex((item) => item === question);
  if (index !== -1) {
    form.value.questions.splice(index, 1);
  }
};

/**
 * 弹窗：搜索并勾选题目
 */
const modalVisible = ref(false);
const searchKeyword = ref("");
const questionList = ref<QuestionVO[]>([]);
const questionTotal = ref(0);
const questionCurrent = ref(1);
// 勾选中的题目 id（通过 v-model:selectedKeys 与表格双向绑定）
const selectedKeys = ref<(number | string)[]>([]);

/**
 * 弹窗题目表格列
 */
const questionColumns = [
  {
    title: "题号",
    slotName: "customId",
    width: 200,
  },
  {
    title: "标签",
    slotName: "tags",
  },
];

/**
 * 加载弹窗题目列表
 */
const loadQuestionList = async () => {
  try {
    const res = await QuestionControllerService.listQuestionVoByPageUsingPost({
      keyword: searchKeyword.value,
      current: questionCurrent.value,
      pageSize: 10,
    });
    if (res.code === 0) {
      questionList.value = res.data.records;
      questionTotal.value = res.data.total;
    } else {
      message.error("加载失败，" + res.message);
    }
  } catch (e: any) {
    message.error("加载题目失败，请稍后重试");
  }
};

/**
 * 弹窗题目列表翻页
 */
const onQuestionPageChange = (page: number) => {
  questionCurrent.value = page;
  loadQuestionList();
};

/**
 * 打开添加题目弹窗：默认勾选已添加的题目
 */
const openModal = () => {
  questionCurrent.value = 1;
  searchKeyword.value = "";
  // 默认勾选已添加的题目
  selectedKeys.value = form.value.questions.map((item) => item.id as number);
  modalVisible.value = true;
  loadQuestionList();
};

/**
 * 确认添加：把勾选的题目并入竞赛（按 id 去重）
 */
const confirmSelect = () => {
  const selected = questionList.value.filter((item) =>
    selectedKeys.value.includes(item.id as number)
  );
  const existIds = new Set(form.value.questions.map((item) => item.id));
  selected.forEach((item) => {
    if (!existIds.has(item.id)) {
      form.value.questions.push({
        id: item.id,
        customId: item.customId,
        title: item.title,
      });
    }
  });
};

/**
 * 取消：清空勾选
 */
const cancelSelect = () => {
  selectedKeys.value = [];
};

/**
 * 时间只精确到分钟：秒数统一归零，返回 YYYY-MM-DD HH:mm:00
 */
const normalizeTime = (time: string) => {
  if (!time) {
    return "";
  }
  return moment(time).format("YYYY-MM-DD HH:mm:00");
};

/**
 * 创建 / 更新竞赛
 */
const doSubmit = async () => {
  if (!form.value.title.trim()) {
    message.warning("请输入竞赛标题");
    return;
  }
  // 结束时间必须晚于开始时间
  if (form.value.startTime && form.value.endTime) {
    const start = new Date(form.value.startTime).getTime();
    const end = new Date(form.value.endTime).getTime();
    if (end <= start) {
      message.warning("结束时间必须晚于开始时间");
      return;
    }
  }
  try {
    const payload: ContestAddRequest = {
      competitionTitle: form.value.title,
      description: form.value.description,
      startTime: normalizeTime(form.value.startTime),
      endTime: normalizeTime(form.value.endTime),
      freezeTime: normalizeTime(form.value.freezeTime),
    };
    // 更新模式带上竞赛 id（字符串传输避免雪花 Id 精度丢失）
    if (updatePage) {
      payload.id = String(route.query.id);
    }
    // 有选择题目时才传 questionIds，避免更新时误清空原竞赛题目
    if (form.value.questions.length) {
      payload.questionIds = form.value.questions.map((item) => String(item.id));
    }
    const res = updatePage
      ? await ContestControllerService.updateCompetitionUsingPost(payload)
      : await ContestControllerService.addCompetitionUsingPost(payload);
    if (res.code === 0) {
      message.success(updatePage ? "更新成功" : "创建成功");
      // 提交成功后清空表单（创建与更新均清空）
      form.value.title = "";
      form.value.description = "";
      form.value.startTime = "";
      form.value.endTime = "";
      form.value.freezeTime = "";
      form.value.questions = [];
    } else {
      message.error(
        (updatePage ? "更新失败" : "创建失败") + "，" + res.message
      );
    }
  } catch (e: any) {
    message.error(
      (updatePage ? "更新失败" : "创建失败") + "，请检查接口或稍后重试"
    );
  }
};
</script>

<style scoped>
/* 卡片占满内容区四周，不再限制最大宽度居中 */
#addContestView {
  width: 100%;
}
</style>
