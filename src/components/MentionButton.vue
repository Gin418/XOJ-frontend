<template>
  <!-- @ 提及按钮：由 md-editor-v3 的 defToolbars 机制渲染到工具栏 -->
  <button
    ref="buttonRef"
    type="button"
    class="md-editor-toolbar-item"
    title="提及用户"
    aria-label="提及用户"
    :disabled="disabled"
    @click="toggleMention"
  >
    <svg
      class="md-editor-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  </button>

  <!-- 用户联想浮层：按钮下方的小输入框，输入用户名后请求接口联想 -->
  <Teleport to="body">
    <div
      v-if="mentionVisible"
      ref="popRef"
      class="mention-pop"
      :style="popStyle"
    >
      <a-input
        ref="inputRef"
        v-model="searchName"
        placeholder="输入用户名搜索"
        allow-clear
        @input="onInput"
        @press-enter="onSearch"
        @keydown.esc="mentionVisible = false"
      />
      <div class="mention-list">
        <div v-if="loading" class="mention-tip">搜索中…</div>
        <div v-else-if="searchName.trim() && !users.length" class="mention-tip">
          暂无匹配用户
        </div>
        <template v-else>
          <div
            v-for="user in users"
            :key="user.id"
            class="mention-item"
            @click="selectUser(user)"
          >
            <a-avatar :size="28" class="mention-avatar">
              <img v-if="user.userAvatar" :src="user.userAvatar" />
            </a-avatar>
            <span class="mention-name">{{ user.userName }}</span>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import axios from "axios";
import { defineComponent, nextTick, onBeforeUnmount, ref, watch } from "vue";
import message from "@arco-design/web-vue/es/message";
import type { UserVO } from "../../generated";

/**
 * @ 提及按钮：渲染在 md-editor-v3 工具栏（defToolbars 自定义项）。
 * 点击后在按钮下方浮出输入框，输入用户名后请求 /api/user/get/userName/vo 联想用户列表，
 * 选中后通过 insert 把 @用户名 插入编辑器光标处。
 * insert 方法由 md-editor-v3 克隆该组件 VNode 时自动注入。
 */
export default defineComponent({
  name: "MentionButton",
  props: {
    /** md-editor-v3 注入：向编辑器插入内容 */
    insert: {
      type: Function,
      default: undefined,
    },
    /** md-editor-v3 注入的工具栏上下文属性，仅声明避免落入 attrs */
    theme: { type: String, default: undefined },
    language: { type: String, default: undefined },
    disabled: { type: Boolean, default: undefined },
    showToolbarName: { type: Boolean, default: undefined },
  },
  setup(props) {
    const mentionVisible = ref(false);
    const searchName = ref("");
    const users = ref<UserVO[]>([]);
    const loading = ref(false);
    const buttonRef = ref();
    const popRef = ref();
    const inputRef = ref();
    const popStyle = ref<Record<string, string>>({});
    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    /**
     * 按用户名模糊搜索用户（接口返回列表，不分页）
     */
    const searchUsers = async () => {
      const name = searchName.value.trim();
      if (!name) {
        users.value = [];
        return;
      }
      loading.value = true;
      try {
        const res = await axios.get("/api/user/get/userName/vo", {
          params: { userName: name },
        });
        const body = res.data as {
          code: number;
          data?: UserVO[];
          message?: string;
        };
        if (body.code === 0) {
          users.value = body.data ?? [];
        } else {
          message.error(body.message || "用户搜索失败");
        }
      } catch (e: any) {
        message.error("用户搜索失败");
      } finally {
        loading.value = false;
      }
    };

    /**
     * 输入防抖：停止输入 300ms 后自动搜索
     */
    const onInput = () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      searchTimer = setTimeout(searchUsers, 300);
    };

    /**
     * 回车：立即搜索
     */
    const onSearch = () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      searchUsers();
    };

    /**
     * 打开/关闭浮层：打开时定位在按钮正下方，清空输入并聚焦
     */
    const toggleMention = () => {
      if (mentionVisible.value) {
        mentionVisible.value = false;
        return;
      }
      const rect = buttonRef.value?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const popWidth = 280;
      // 贴按钮下方，右侧超出视口时改为右对齐
      let left = rect.left;
      if (left + popWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popWidth - 8);
      }
      popStyle.value = {
        left: left + "px",
        top: rect.bottom + 4 + "px",
        width: popWidth + "px",
      };
      searchName.value = "";
      users.value = [];
      mentionVisible.value = true;
      nextTick(() => {
        inputRef.value?.focus();
      });
    };

    /**
     * 选中用户：在光标处插入 [@用户名](mention:用户id) 语法（带尾随空格）
     * 渲染端识别该语法显示为可点击链接，点击直接按 id 跳转用户主页
     */
    const selectUser = (user: UserVO) => {
      mentionVisible.value = false;
      props.insert?.(() => ({
        targetValue: `[@${user.userName}](mention:${user.id}) `,
      }));
    };

    /**
     * 点击浮层与按钮之外、页面滚动、窗口缩放时关闭浮层
     */
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.value?.contains(target) || buttonRef.value?.contains(target)) {
        return;
      }
      mentionVisible.value = false;
    };
    const onDocScroll = () => {
      mentionVisible.value = false;
    };

    watch(mentionVisible, (visible) => {
      if (visible) {
        document.addEventListener("click", onDocClick, true);
        document.addEventListener("scroll", onDocScroll, true);
        window.addEventListener("resize", onDocScroll);
      } else {
        document.removeEventListener("click", onDocClick, true);
        document.removeEventListener("scroll", onDocScroll, true);
        window.removeEventListener("resize", onDocScroll);
        if (searchTimer) {
          clearTimeout(searchTimer);
          searchTimer = undefined;
        }
      }
    });

    onBeforeUnmount(() => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("scroll", onDocScroll, true);
      window.removeEventListener("resize", onDocScroll);
    });

    return {
      mentionVisible,
      searchName,
      users,
      loading,
      buttonRef,
      popRef,
      inputRef,
      popStyle,
      toggleMention,
      onInput,
      onSearch,
      selectUser,
    };
  },
});
</script>

<style scoped>
.mention-pop {
  position: fixed;
  z-index: 2001;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.mention-list {
  max-height: 240px;
  overflow-y: auto;
}

.mention-tip {
  padding: 12px 4px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.mention-item:hover {
  background-color: var(--color-fill-2);
}

.mention-avatar {
  flex-shrink: 0;
}

.mention-name {
  font-size: 14px;
  color: var(--color-text-1);
}
</style>
