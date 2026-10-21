<template>
  <div class="competition-side-nav">
    <!-- 左侧导航栏：菜单与题目目录共用一个面板 -->
    <aside class="detail-nav">
      <div class="nav-panel">
        <a-menu :selected-keys="[activeKey]" @menu-item-click="onMenuClick">
          <a-menu-item key="preview">预览</a-menu-item>
          <!-- 题目页需参加竞赛（或竞赛已结束）后开放；测评/排名始终可访问 -->
          <a-menu-item v-if="hasJoined" key="questions">题目</a-menu-item>
          <a-menu-item key="judge">测评</a-menu-item>
          <a-menu-item key="rank">排名</a-menu-item>
        </a-menu>

        <!-- 底部题目按钮：仅在竞赛题目页显示，点击在右侧展开题目导航栏 -->
        <div
          v-if="activeKey === 'questions'"
          class="catalog-toggle"
          @click="toggleCatalog"
        >
          题目
        </div>
      </div>
    </aside>

    <!-- 右侧题目导航栏：点击底部「题目」展开，点击题目进入做题页 -->
    <aside v-if="catalogExpanded" class="question-panel">
      <!-- 面板标题 + 右上角收回箭头 -->
      <div class="question-panel-header">
        <span class="question-panel-heading">题目列表</span>
        <icon-left class="collapse-icon" @click="toggleCatalog" />
      </div>
      <div class="question-panel-list">
        <div
          v-for="question in questions"
          :key="question.id"
          class="question-panel-item"
          @click="openQuestion(question)"
        >
          <div class="question-panel-title">
            {{ question.customId }}. {{ question.title }}
          </div>
          <!-- 状态小圆点：未提交灰 / 未通过红 / 通过绿 -->
          <span
            class="question-status-dot"
            :style="{
              background:
                questionDotColorMap[question.questionStatus ?? 0] ?? '#86909c',
            }"
            :title="
              questionStatusMap[question.questionStatus ?? 0]?.text ?? '未知'
            "
          ></span>
        </div>
        <a-empty v-if="!questions.length" description="暂无题目" />
      </div>
      <!-- 底部做题进度：已通过 / 总数 + 进度条 -->
      <div class="question-progress">
        <div class="progress-bar">
          <div
            class="progress-inner"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
        <span class="progress-text">
          {{ acceptedCount }} / {{ questions.length }}
        </span>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, defineProps, defineEmits } from "vue";
import { useRouter } from "vue-router";
import { IconLeft } from "@arco-design/web-vue/es/icon";
import message from "@arco-design/web-vue/es/message";
import { ContestControllerService } from "../../generated";
import type { QuestionVO } from "../../generated";

interface Props {
  /** 竞赛 id */
  competitionId: string;
  /** 当前激活的导航页：preview / questions / judge / rank */
  activeKey: string;
  /** 竞赛题目列表 */
  questions: QuestionVO[];
  /** 题目菜单是否可见：已参加竞赛或竞赛已结束；测评/排名菜单始终可见 */
  hasJoined: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "nav-click", key: string): void;
  (e: "catalog-toggle", expanded: boolean): void;
}>();

const router = useRouter();

/**
 * 题目目录是否展开
 */
const catalogExpanded = ref(false);

// 切到非题目页时收起题目面板（底部题目按钮仅题目页显示）
watch(
  () => props.activeKey,
  (key) => {
    if (key !== "questions" && catalogExpanded.value) {
      catalogExpanded.value = false;
    }
  }
);

/**
 * 展开/收起题目目录，并通知父组件（展开时父组件加载题目列表）
 */
const toggleCatalog = () => {
  catalogExpanded.value = !catalogExpanded.value;
  emit("catalog-toggle", catalogExpanded.value);
};

/**
 * 菜单点击：交给父组件处理（竞赛详情页切换内容区，题目详情页跳回竞赛）
 */
const onMenuClick = (key: string) => {
  emit("nav-click", key);
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
 * 题目导航栏状态圆点颜色：未提交灰 / 未通过红 / 通过绿
 */
const questionDotColorMap: Record<number, string> = {
  0: "#86909c",
  1: "#f53f3f",
  2: "#00b42a",
};

/**
 * 做题进度：已通过题数
 */
const acceptedCount = computed(
  () => props.questions.filter((q) => q.questionStatus === 2).length
);

/**
 * 做题进度百分比：已通过 / 总数
 */
const progressPercent = computed(() => {
  if (!props.questions.length) {
    return 0;
  }
  return Math.round((acceptedCount.value / props.questions.length) * 100);
});

/**
 * 打开竞赛题目：先请求竞赛题目详情接口，成功后跳转题目详情页
 * 详情页通过 query 携带 competitionId，使用竞赛题目接口加载数据
 */
const openQuestion = async (question: QuestionVO) => {
  const res =
    await ContestControllerService.getCompetitionQuestionByCustomIdUsingGet(
      props.competitionId,
      question.customId ?? ""
    );
  if (res.code === 0) {
    router.push({
      path: `/view/question/${question.customId}`,
      // 携带当前导航页，做题页侧导航保持相同激活项（题目）
      query: { competitionId: props.competitionId, tab: props.activeKey },
    });
  } else {
    message.error("加载失败，" + res.message);
  }
};
</script>

<style scoped>
.competition-side-nav {
  display: flex;
  height: 100%;
}

/* 左侧导航栏：顶部贴紧顶部栏下沿，底部贴紧屏幕底部，不随页面滚动 */
.detail-nav {
  display: flex;
  flex-direction: column;
  width: 60px;
  flex-shrink: 0;
  height: 100%;
}

/* 导航面板：菜单与题目目录共用的白色容器，无圆角与顶部栏连成一体 */
.nav-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

/* 左侧导航菜单：占满面板宽度 */
.detail-nav :deep(.arco-menu) {
  width: 100%;
}

.detail-nav :deep(.arco-menu-item) {
  line-height: 40px;
  text-align: center;
  justify-content: center;
  padding: 0;
}

/* 底部题目按钮：贴底显示，点击在右侧展开题目导航栏 */
.catalog-toggle {
  margin-top: auto;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
  font-size: 14px;
  color: #4e5969;
  user-select: none;
}

.catalog-toggle:hover {
  color: rgb(var(--primary-6));
}

/* 右侧题目导航栏：白色面板，无圆角与左侧导航栏连成一体；紧贴左侧导航栏 */
.question-panel {
  display: flex;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
  /* 与左侧导航栏对齐：顶部、底部一致，贴紧屏幕底部；
     border-box 保证 padding 计入高度，避免与左侧导航栏不同高 */
  box-sizing: border-box;
  height: 100%;
  background: #fff;
  padding: 8px;
}

/* 题目列表区：占满中间空间，超高可滚动 */
.question-panel-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.question-panel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.question-panel-item:hover {
  background: var(--color-fill-2);
}

/* 题目状态小圆点 */
.question-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.question-panel-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #1d2129;
}

/* 题目列表面板标题栏：左侧标题 + 右上角收回箭头 */
.question-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 12px;
}

.question-panel-heading {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.collapse-icon {
  cursor: pointer;
  color: #4e5969;
}

.collapse-icon:hover {
  color: rgb(var(--primary-6));
}

/* 底部做题进度：进度条 + 已通过/总数 */
.question-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 0;
  border-top: 1px solid var(--color-fill-2);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-fill-2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: #00b42a;
  border-radius: 3px;
}
</style>
