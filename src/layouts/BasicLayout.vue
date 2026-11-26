<template>
  <div id="basicLayout">
    <a-layout style="min-height: 100vh">
      <a-layout-header class="header">
        <GlobalHeader />
      </a-layout-header>
      <a-layout-content
        class="content"
        :class="{
          'content-question-detail': isQuestionDetail,
          'content-contest-detail': isContestDetail || isContestQuestion,
        }"
      >
        <router-view />
      </a-layout-content>
      <a-layout-footer
        v-if="
          !isQuestionDetail && !isContestDetail && !isContestQuestion && !isChat
        "
        class="footer"
      >
        程序员 X
      </a-layout-footer>
    </a-layout>
  </div>
</template>

<style scoped>
#basicLayout {
}

#basicLayout .header {
  /* sticky 顶栏：保留文档流占位（内容区无需 margin 补偿），滚动越过顶部后吸附视口顶部 */
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  box-shadow: #eee 1px 1px 5px;
}

#basicLayout .content {
  /* 所有页面内容区统一灰色背景；顶部栏与底部栏之间的内容区域不设内边距 */
  background: var(--color-fill-2);
  margin-bottom: 0;
  padding: 0;
}

/* 题目详情页：底部不留间距，内容直接贴底 */
#basicLayout .content-question-detail {
  padding-bottom: 0;
  overflow: hidden;
}

/* 竞赛详情页：顶部贴紧顶部栏（左侧导航贴顶，右侧内容区自行留 20px 间距），底部不留间距，页面不出现滚动条 */
#basicLayout .content-contest-detail {
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}

#basicLayout .footer {
  background: #fff;
  padding: 16px;
  text-align: center;
  /* 向右铺 20px 白色阴影盖住滚动条预留槽位：阴影不参与布局，
     不会撑宽文档产生横向滚动条（伪元素会） */
  box-shadow: 20px 0 0 0 #fff;
}
</style>

<style>
/* 常规页面内容包裹层：内容区不再统一设置内边距，由各页面自行包裹留白（统一 24px，与首页一致） */
.page-container {
  padding: 24px;
}

/* 灰色页面背景下，所有表单控件保持纯白背景 */
.arco-input,
.arco-textarea,
.arco-select-view,
.arco-picker,
.arco-input-number,
.arco-input-tag {
  background-color: #fff;
}

/* 题目详情页：锁定页面滚动，避免窗口缩放时滚动条出现/消失引发全页重排抖动导致卡死 */
body.lock-scroll {
  overflow: hidden;
}

/* 窄屏堆叠模式恢复页面滚动（内容超高需要滚动查看） */
@media (max-width: 768px) {
  body.lock-scroll {
    overflow: auto;
  }
}
</style>
<script>
import GlobalHeader from "@/components/GlobalHeader";
import { computed, watchEffect } from "vue";
import { useRoute } from "vue-router";

export default {
  components: { GlobalHeader },
  setup() {
    const route = useRoute();
    // 题目详情页隐藏底部栏
    const isQuestionDetail = computed(() =>
      route.path.startsWith("/view/question")
    );
    // 竞赛详情页隐藏底部栏
    const isContestDetail = computed(() =>
      route.path.startsWith("/view/contest")
    );
    // 从竞赛进入的题目详情页：保留竞赛顶部栏与左侧导航，隐藏底部栏
    const isContestQuestion = computed(() =>
      Boolean(
        route.path.startsWith("/view/question") && route.query.competitionId
      )
    );
    // 私信页：隐藏底部栏（聊天窗口高度已按满屏计算）
    const isChat = computed(() => route.path === "/chat");
    // 详情页锁定页面滚动（窄屏堆叠时由 CSS 媒体查询恢复）
    watchEffect(() => {
      document.body.classList.toggle("lock-scroll", isQuestionDetail.value);
    });
    return {
      isQuestionDetail,
      isContestDetail,
      isContestQuestion,
      isChat,
    };
  },
};
</script>
