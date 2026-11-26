<template>
  <div class="page-container">
    <div id="addQuestionView">
      <a-card>
        <h2>{{ updatePage ? "更新题目" : "创建题目" }}</h2>
        <!-- label 右对齐：标签文字紧贴输入框，不靠卡片左墙 -->
        <a-form :model="form" label-align="right">
          <a-form-item field="customId" label="题号">
            <a-input
              v-model="form.customId"
              placeholder="请输入题号"
              style="width: 560px"
            />
          </a-form-item>
          <a-form-item field="title" label="标题">
            <a-input
              v-model="form.title"
              placeholder="请输入标题"
              style="width: 560px"
            />
          </a-form-item>
          <a-form-item field="tags" label="标签">
            <a-input-tag
              v-model="form.tags"
              placeholder="请选择标签"
              allow-clear
              style="width: 560px"
            />
          </a-form-item>
          <!-- content-flex=false：内容区改块级布局，让 Markdown 编辑器占满整行靠墙 -->
          <a-form-item field="content" label="题目内容" :content-flex="false">
            <MdEditor :value="form.content" :handle-change="onContentChange" />
          </a-form-item>
          <a-form-item
            field="inputFormat"
            label="输入格式"
            :content-flex="false"
          >
            <MdEditor
              :value="form.inputFormat"
              :handle-change="onInputFormatChange"
            />
          </a-form-item>
          <a-form-item
            field="outputFormat"
            label="输出格式"
            :content-flex="false"
          >
            <MdEditor
              :value="form.outputFormat"
              :handle-change="onOutputFormatChange"
            />
          </a-form-item>
          <a-form-item
            field="description"
            label="题目说明"
            :content-flex="false"
          >
            <MdEditor
              :value="form.description"
              :handle-change="onDescriptionChange"
            />
          </a-form-item>
          <a-form-item
            label="判题配置"
            :content-flex="false"
            :merge-props="false"
          >
            <a-space direction="vertical" style="min-width: 480px">
              <a-form-item field="judgeConfig.timeLimit" label="时间限制">
                <a-input-number
                  v-model="form.judgeConfig.timeLimit"
                  placeholder="请输入时间限制"
                  mode="button"
                  min="0"
                  size="large"
                />
              </a-form-item>
              <a-form-item field="judgeConfig.memoryLimit" label="内存限制">
                <a-input-number
                  v-model="form.judgeConfig.memoryLimit"
                  placeholder="请输入内存限制"
                  mode="button"
                  min="0"
                  size="large"
                />
              </a-form-item>
              <a-form-item field="judgeConfig.judgeMode" label="判题模式">
                <a-select
                  v-model="form.judgeConfig.judgeMode"
                  placeholder="请选择判题模式"
                  style="width: 320px"
                >
                  <a-option
                    v-for="option in JUDGE_MODE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-option>
                </a-select>
              </a-form-item>
              <a-form-item
                v-if="form.judgeConfig.judgeMode === 'float_precision'"
                field="judgeConfig.epsilon"
                label="浮点误差容限"
                extra="仅浮点精度模式生效，默认 1e-6"
              >
                <a-input-number
                  v-model="form.judgeConfig.epsilon"
                  placeholder="默认 1e-6"
                  mode="button"
                  :min="0"
                  :step="0.000001"
                  size="large"
                />
              </a-form-item>
            </a-space>
          </a-form-item>
          <a-form-item
            label="测试用例配置"
            :content-flex="false"
            :merge-props="false"
          >
            <a-form-item
              v-for="(judgeCaseItem, index) of form.judgeCase"
              :key="index"
              no-style
            >
              <a-space direction="vertical" style="min-width: 640px">
                <a-form-item
                  :field="`form.judgeCase[${index}].input`"
                  :label="`输入用例-${index}`"
                  :key="index"
                >
                  <a-textarea
                    v-model="judgeCaseItem.input"
                    placeholder="请输入测试输入用例"
                    :auto-size="{ minRows: 2, maxRows: 8 }"
                  />
                </a-form-item>
                <a-form-item
                  :field="`form.judgeCase[${index}].output`"
                  :label="`输出用例-${index}`"
                  :key="index"
                >
                  <a-textarea
                    v-model="judgeCaseItem.output"
                    placeholder="请输入测试输出用例"
                    :auto-size="{ minRows: 2, maxRows: 8 }"
                  />
                </a-form-item>
                <a-button status="danger" @click="handleDelete(index)">
                  删除
                </a-button>
              </a-space>
            </a-form-item>
            <div style="margin-top: 32px">
              <a-button @click="handleAdd" type="outline" status="success"
                >新增测试用例
              </a-button>
            </div>
            <div style="margin-top: 16px">
              <a-upload
                accept=".zip"
                :show-file-list="false"
                :custom-request="doUploadJudgeCaseFile"
                @dragenter="onUploadDragEnter"
                @dragleave="onUploadDragLeave"
                @drop="onUploadDrop"
              >
                <template #upload-button>
                  <div
                    class="upload-dragger"
                    :class="{ 'upload-drag-active': uploadDragging }"
                  >
                    <icon-upload class="upload-dragger-icon" />
                    <div class="upload-dragger-text">
                      {{
                        uploadDragging
                          ? "松开即可上传"
                          : "点击或拖拽测试点压缩包到此处上传"
                      }}
                    </div>
                    <div class="upload-dragger-hint">
                      仅支持 .zip 格式，一次上传一个文件
                    </div>
                  </div>
                </template>
              </a-upload>
              <div v-if="uploadFileName" style="margin-top: 12px">
                <a-space>
                  <a-tag color="green">已上传压缩包</a-tag>
                  <span>{{ uploadFileName }}</span>
                </a-space>
              </div>
            </div>
          </a-form-item>
          <div style="margin-top: 16px" />
          <a-form-item>
            <a-button type="primary" style="min-width: 200px" @click="doSubmit"
              >提交
            </a-button>
          </a-form-item>
        </a-form>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import MdEditor from "@/components/MdEditor.vue";
import {
  DEFAULT_EPSILON,
  DEFAULT_JUDGE_MODE,
  JUDGE_MODE_OPTIONS,
} from "@/constants/judgeMode";
import {
  FileControllerService,
  QuestionControllerService,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
import { IconUpload } from "@arco-design/web-vue/es/icon";
import { useRoute } from "vue-router";

const route = useRoute();
// 如果页面地址包含 update，视为更新页面
const updatePage = route.path.includes("update");

let form = ref({
  customId: "",
  title: "",
  tags: [],
  description: "",
  content: "",
  inputFormat: "",
  outputFormat: "",
  judgeConfig: {
    memoryLimit: 256,
    timeLimit: 1000,
    judgeMode: DEFAULT_JUDGE_MODE,
    epsilon: DEFAULT_EPSILON,
  },
  judgeCase: [
    {
      input: "",
      output: "",
    },
  ],
  inOutPath: "",
});

/**
 * 根据题目 id 获取老的数据
 */
const loadData = async () => {
  const id = route.query.id;
  if (!id) {
    return;
  }
  const res = await QuestionControllerService.getQuestionByIdUsingGet(
    id as any
  );
  if (res.code === 0) {
    form.value = res.data as any;
    // json 转 js 对象
    if (!form.value.judgeCase) {
      form.value.judgeCase = [
        {
          input: "",
          output: "",
        },
      ];
    } else {
      form.value.judgeCase = JSON.parse(form.value.judgeCase as any);
    }
    if (!form.value.judgeConfig) {
      form.value.judgeConfig = {
        memoryLimit: 256,
        timeLimit: 1000,
        judgeMode: DEFAULT_JUDGE_MODE,
        epsilon: DEFAULT_EPSILON,
      };
    } else {
      form.value.judgeConfig = JSON.parse(form.value.judgeConfig as any);
      // 旧数据缺省判题模式 / 浮点容限时补齐默认值，保证下拉与容限输入框有值
      if (!form.value.judgeConfig.judgeMode) {
        form.value.judgeConfig.judgeMode = DEFAULT_JUDGE_MODE;
      }
      if (form.value.judgeConfig.epsilon == null) {
        form.value.judgeConfig.epsilon = DEFAULT_EPSILON;
      }
    }
    if (!form.value.tags) {
      form.value.tags = [];
    } else {
      form.value.tags = JSON.parse(form.value.tags as any);
    }
    // 旧数据可能没有输入/输出格式字段，兜底为空字符串
    if (!form.value.inputFormat) {
      form.value.inputFormat = "";
    }
    if (!form.value.outputFormat) {
      form.value.outputFormat = "";
    }
  } else {
    message.error("加载失败，" + res.message);
  }
};

onMounted(() => {
  loadData();
});

const doSubmit = async () => {
  console.log(form.value);
  // 区分更新还是创建
  if (updatePage) {
    const res = await QuestionControllerService.updateQuestionUsingPost(
      form.value
    );
    if (res.code === 0) {
      message.success("更新成功");
    } else {
      message.error("更新失败，" + res.message);
    }
  } else {
    const res = await QuestionControllerService.addQuestionUsingPost(
      form.value
    );
    if (res.code === 0) {
      message.success("创建成功");
    } else {
      message.error("创建失败，" + res.message);
    }
  }
};

/**
 * 新增判题用例
 */
const handleAdd = () => {
  form.value.judgeCase.push({
    input: "",
    output: "",
  });
};

/**
 * 已上传压缩包文件名
 */
const uploadFileName = ref("");

/**
 * 上传区拖拽态：文件拖到拖拽区时高亮，松开或拖出后恢复
 */
const uploadDragging = ref(false);

/**
 * 拖入：仅响应文件拖拽，避免拖动文本/链接时误触发
 */
const onUploadDragEnter = (e: DragEvent) => {
  if (!e.dataTransfer?.types.includes("Files")) {
    return;
  }
  uploadDragging.value = true;
};

/**
 * 拖出：在拖拽区内部子元素间移动时忽略，真正离开拖拽区才取消高亮
 */
const onUploadDragLeave = (e: DragEvent) => {
  const uploadEl = e.currentTarget as HTMLElement | null;
  const nextEl = e.relatedTarget;
  if (uploadEl && nextEl instanceof Node && uploadEl.contains(nextEl)) {
    return;
  }
  uploadDragging.value = false;
};

/**
 * 松开：文件交由 Arco Upload 的 drop 逻辑处理，这里只重置高亮
 */
const onUploadDrop = () => {
  uploadDragging.value = false;
};

/**
 * 上传判题用例压缩包：直接传给后端,保存返回的文件路径
 */
const doUploadJudgeCaseFile = async (option: any) => {
  // Arco 的 custom-request 回调中,原生文件在 option.fileItem.file
  const file = option.fileItem?.file as File;
  if (!file) {
    option.onError(new Error("未获取到文件"));
    return;
  }
  const res = await FileControllerService.uploadFileUsingPost(file);
  if (res.code === 0 && res.data) {
    form.value.inOutPath = res.data;
    uploadFileName.value = file.name;
    message.success("压缩包上传成功");
    option.onSuccess(res);
  } else {
    message.error("压缩包上传失败，" + res.message);
    option.onError(new Error(res.message));
  }
};

/**
 * 删除判题用例
 */
const handleDelete = (index: number) => {
  form.value.judgeCase.splice(index, 1);
};

const onContentChange = (value: string) => {
  form.value.content = value;
};

const onInputFormatChange = (value: string) => {
  form.value.inputFormat = value;
};

const onOutputFormatChange = (value: string) => {
  form.value.outputFormat = value;
};

const onDescriptionChange = (value: string) => {
  form.value.description = value;
};
</script>

<style scoped>
#addQuestionView {
}

/* 题目内容/说明 Markdown 编辑器：宽度 960px（与发评论弹窗标准一致），高度由 MdEditor 组件控制 */
#addQuestionView :deep(.md-editor) {
  width: 960px;
}

/* 判题用例压缩包拖拽区：整块可点击、可拖入，样式参考常见 Dragger 上传区 */
.upload-dragger {
  box-sizing: border-box;
  width: 260px;
  max-width: 100%;
  padding: 12px 10px;
  text-align: center;
  cursor: pointer;
  background-color: var(--color-fill-1);
  border: 1px dashed var(--color-neutral-3);
  border-radius: 8px;
  transition: border-color 0.2s, background-color 0.2s;
}

.upload-dragger:hover {
  background-color: var(--color-fill-3);
  border-color: var(--color-neutral-4);
}

.upload-dragger.upload-drag-active {
  background-color: var(--color-primary-light-1);
  border-color: rgb(var(--primary-6));
}

.upload-dragger-icon {
  font-size: 22px;
  color: var(--color-text-2);
}

.upload-dragger:hover .upload-dragger-icon,
.upload-dragger.upload-drag-active .upload-dragger-icon {
  color: rgb(var(--primary-6));
}

.upload-dragger-text {
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-1);
}

.upload-dragger-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
