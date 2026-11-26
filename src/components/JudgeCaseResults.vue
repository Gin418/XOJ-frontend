<template>
  <div class="judge-case-panel">
    <div class="judge-case-header">
      <span class="judge-case-title">测试点结果</span>
      <span v-if="hasTestCaseData" class="judge-case-summary">
        通过数 {{ passedCount }} / {{ totalCount }}
      </span>
    </div>
    <div v-if="hasTestCaseData" class="judge-case-list">
      <a-tooltip v-for="item in caseItems" :key="item.orderNo" position="top">
        <template #content>
          <!-- 未运行的测试点只提示原因，不展示名称/耗时等详情 -->
          <div v-if="isNotRun(item.result?.status)" class="judge-case-tip">
            未运行（前序测试点未通过，测评提前结束）
          </div>
          <div v-else class="judge-case-tip">
            <div class="judge-case-tip-title">
              测试点
              <template v-if="item.result?.testCaseName">
                #{{ item.result.testCaseName }}
              </template>
            </div>
            <div>
              运行结果：{{ getJudgeCaseStatusText(item.result?.status) }}
            </div>
            <div v-if="item.result">耗时：{{ item.result.time ?? 0 }} ms</div>
            <div v-if="item.result">
              运行内存：{{ formatMemory(item.result.memory) }}
            </div>
          </div>
        </template>
        <div
          class="judge-case-square"
          :class="getCaseSquareClass(item.result?.status)"
        >
          <icon-check v-if="isPassed(item.result?.status)" />
          <icon-close v-else-if="isFailed(item.result?.status)" />
          <span v-else class="judge-case-dash">—</span>
        </div>
      </a-tooltip>
    </div>
    <!-- totalTestCaseCount 为 null 或 0 时显示占位提示 -->
    <div v-else class="judge-case-empty">暂无测试点数据</div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, withDefaults } from "vue";
import { IconCheck, IconClose } from "@arco-design/web-vue/es/icon";
import type { JudgeCaseResult } from "../../generated";
import { getJudgeCaseStatusText } from "@/constants/judgeStatus";

interface Props {
  /**
   * 逐测试点执行结果（后端只返回已执行到的用例）
   */
  caseResults?: JudgeCaseResult[];
  /**
   * 测试点总数：judgeInfo.totalTestCaseCount
   */
  totalTestCaseCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  caseResults: () => [],
  totalTestCaseCount: 0,
});

/**
 * 测试点总数：优先取 judgeInfo.totalTestCaseCount，缺失时按已返回用例数兜底
 */
const totalCount = computed(() =>
  Math.max(props.totalTestCaseCount, props.caseResults.length)
);

/**
 * 是否有测试点数据：totalTestCaseCount 为 null 或 0 时视为无数据
 */
const hasTestCaseData = computed(() => (props.totalTestCaseCount ?? 0) > 0);

/**
 * 通过的测试点数：状态为 ACCEPTED 的用例数
 */
const passedCount = computed(
  () => props.caseResults.filter((item) => item.status === "ACCEPTED").length
);

/**
 * 按 orderNo 补全未执行的测试点，保证每个测试点都有一个小方块
 */
const caseItems = computed(() => {
  const resultMap = new Map<number, JudgeCaseResult>();
  props.caseResults.forEach((item, index) => {
    resultMap.set(item.orderNo ?? index + 1, item);
  });
  return Array.from({ length: totalCount.value }, (_, index) => ({
    orderNo: index + 1,
    result: resultMap.get(index + 1),
  }));
});

/**
 * 是否通过：ACCEPTED 显示对勾
 */
const isPassed = (status?: string) => status === "ACCEPTED";

/**
 * 是否未运行：无结果或状态为 NOT_RUN
 */
const isNotRun = (status?: string) => !status || status === "NOT_RUN";

/**
 * 是否未通过：已执行且非 ACCEPTED / NOT_RUN 显示叉
 */
const isFailed = (status?: string) =>
  Boolean(status) && !isPassed(status) && !isNotRun(status);

/**
 * 小方块样式：通过绿 / 未通过红 / 未运行灰横线
 */
const getCaseSquareClass = (status?: string) => {
  if (isPassed(status)) {
    return "judge-case-square--passed";
  }
  if (isFailed(status)) {
    return "judge-case-square--failed";
  }
  return "judge-case-square--not-run";
};

/**
 * 格式化运行内存：>=1MB 显示 MB，不足 1KB 显示 B，否则显示 KB
 */
const formatMemory = (memoryKB?: number) => {
  const size = Number(memoryKB ?? 0);
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} MB`;
  }
  if (size > 0 && size < 1) {
    return `${Math.round(size * 1024)} B`;
  }
  return `${size} KB`;
};
</script>

<style scoped>
/* 测试点面板：用容器包住所有小方块，位于源代码上方 */
.judge-case-panel {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
}

.judge-case-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.judge-case-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

.judge-case-summary {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 无测试点数据时的占位提示：面板内垂直居中 */
.judge-case-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  font-size: 12px;
  color: var(--color-text-4);
}

/* 测试点小方块列表：固定每行 24 个，每个测试点一个方块 */
.judge-case-list {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 4px;
}

.judge-case-square {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: default;
}

/* 通过：绿色对勾 */
.judge-case-square--passed {
  color: rgb(var(--green-6));
  background: rgb(var(--green-1));
  border-color: rgb(var(--green-3));
}

/* 未通过：红色叉 */
.judge-case-square--failed {
  color: rgb(var(--red-6));
  background: rgb(var(--red-1));
  border-color: rgb(var(--red-3));
}

/* 未运行：灰色横线 */
.judge-case-square--not-run {
  color: var(--color-text-4);
  background: var(--color-fill-2);
  border-color: var(--color-border-2);
}

.judge-case-dash {
  font-size: 12px;
  line-height: 1;
}

/* 悬停测试点时展示的详情 */
.judge-case-tip {
  font-size: 12px;
  line-height: 1.6;
}

.judge-case-tip-title {
  font-weight: 500;
}
</style>
