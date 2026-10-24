<template>
  <!-- 输入 @ 触发的联想浮层：定位在编辑器光标下方，无输入框，纯结果列表 -->
  <Teleport to="body">
    <div
      v-if="visible"
      ref="popRef"
      class="mention-pop-input"
      :style="popStyle"
    >
      <div ref="listRef" class="mention-list">
        <div v-if="loading" class="mention-tip">搜索中…</div>
        <template v-else>
          <div
            v-for="(user, index) in users"
            :key="user.id"
            class="mention-item"
            :class="{ active: index === activeIndex }"
            @mouseenter="activeIndex = index"
            @click="$emit('select', user)"
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

<script setup lang="ts">
import axios from "axios";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  withDefaults,
  defineProps,
  defineEmits,
} from "vue";
import type { UserVO } from "../../generated";

/**
 * 定义组件属性类型
 */
interface Props {
  /** 是否显示浮层 */
  visible: boolean;
  /** 浮层定位：光标屏幕坐标 */
  x: number;
  y: number;
  /** 当前 @ 词（不含 @ 前缀），变化时自动搜索 */
  keyword: string;
}

/**
 * 给组件指定初始值
 */
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  x: 0,
  y: 0,
  keyword: "",
});

const emit = defineEmits<{
  (e: "select", user: UserVO): void;
  (e: "close"): void;
  /** 编辑器内部滚动：由父组件重新计算光标坐标，决定跟随定位或关闭 */
  (e: "reposition"): void;
}>();

const users = ref<UserVO[]>([]);
const loading = ref(false);
const popRef = ref<HTMLElement>();
const listRef = ref<HTMLElement>();
/** 当前高亮项下标：默认选中第一个，↑↓ 切换 */
const activeIndex = ref(0);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * 高亮项滚动到可见范围内（列表 max-height 内滚动）
 */
const scrollActiveIntoView = () => {
  nextTick(() => {
    listRef.value
      ?.querySelector(".mention-item.active")
      ?.scrollIntoView({ block: "nearest" });
  });
};

/**
 * 浮层定位：贴在光标正下方，右侧超出视口时改为右对齐
 */
const popStyle = computed(() => {
  const popWidth = 280;
  let left = props.x;
  if (left + popWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - popWidth - 8);
  }
  return {
    left: left + "px",
    top: props.y + 4 + "px",
    width: popWidth + "px",
  };
});

/**
 * 按用户名模糊搜索用户（接口返回列表，不分页）
 */
const searchUsers = async () => {
  const name = props.keyword.trim();
  if (!name) {
    users.value = [];
    activeIndex.value = 0;
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
    users.value = body.code === 0 ? body.data ?? [] : [];
  } catch {
    users.value = [];
  } finally {
    // 每次搜索结果更新后默认选中第一个
    activeIndex.value = 0;
    loading.value = false;
  }
};

/**
 * keyword 变化（用户在编辑器继续输入）：防抖 300ms 后搜索
 */
watch(
  () => props.keyword,
  (val) => {
    if (!props.visible) {
      return;
    }
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    if (!val.trim()) {
      users.value = [];
      activeIndex.value = 0;
      return;
    }
    searchTimer = setTimeout(searchUsers, 300);
  }
);

/**
 * 浮层开关：打开时重置列表，若已有 keyword 立即搜索
 */
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      users.value = [];
      activeIndex.value = 0;
      if (props.keyword.trim()) {
        searchUsers();
      }
    } else {
      if (searchTimer) {
        clearTimeout(searchTimer);
        searchTimer = undefined;
      }
      users.value = [];
      activeIndex.value = 0;
      loading.value = false;
    }
  }
);

/**
 * 点击浮层之外、页面滚动、按 Esc：关闭浮层
 */
const onDocClick = (e: MouseEvent) => {
  if (popRef.value?.contains(e.target as Node)) {
    return;
  }
  emit("close");
};
const onDocScroll = () => {
  // 不直接关闭：编辑器内部滚动时让父组件重新计算光标坐标
  emit("reposition");
};
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  // 中文输入法组合输入期间不拦截
  if (e.isComposing) {
    return;
  }
  // 列表有结果时拦截方向键与回车：↑↓ 切换高亮，Enter 选中当前高亮项
  if (!users.value.length) {
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    e.stopPropagation();
    activeIndex.value = (activeIndex.value + 1) % users.value.length;
    scrollActiveIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    e.stopPropagation();
    activeIndex.value =
      (activeIndex.value - 1 + users.value.length) % users.value.length;
    scrollActiveIntoView();
  } else if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    const user = users.value[activeIndex.value];
    if (user) {
      emit("select", user);
    }
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener("click", onDocClick, true);
      document.addEventListener("scroll", onDocScroll, true);
      document.addEventListener("keydown", onKeydown, true);
    } else {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("scroll", onDocScroll, true);
      document.removeEventListener("keydown", onKeydown, true);
    }
  }
);

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  document.removeEventListener("click", onDocClick, true);
  document.removeEventListener("scroll", onDocScroll, true);
  document.removeEventListener("keydown", onKeydown, true);
});
</script>

<style scoped>
.mention-pop-input {
  position: fixed;
  z-index: 2001;
  display: flex;
  flex-direction: column;
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

.mention-item.active {
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
