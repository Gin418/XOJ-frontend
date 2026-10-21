<template>
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
        <a-form-item field="description" label="题目说明" :content-flex="false">
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
                <a-input
                  v-model="judgeCaseItem.input"
                  placeholder="请输入测试输入用例"
                />
              </a-form-item>
              <a-form-item
                :field="`form.judgeCase[${index}].output`"
                :label="`输出用例-${index}`"
                :key="index"
              >
                <a-input
                  v-model="judgeCaseItem.output"
                  placeholder="请输入测试输出用例"
                />
              </a-form-item>
              <a-button status="danger" @click="handleDelete(index)">
                删除
              </a-button>
            </a-space>
          </a-form-item>
          <div style="margin-top: 32px">
            <a-space>
              <a-upload
                accept=".zip"
                :show-file-list="false"
                :custom-request="doUploadJudgeCaseFile"
              >
                <template #upload-button>
                  <a-button type="outline" status="success"
                    >上传判题用例压缩包
                  </a-button>
                </template>
              </a-upload>
              <a-button @click="handleAdd" type="outline" status="success"
                >新增测试用例
              </a-button>
            </a-space>
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
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import MdEditor from "@/components/MdEditor.vue";
import {
  FileControllerService,
  QuestionControllerService,
} from "../../../generated";
import message from "@arco-design/web-vue/es/message";
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
  judgeConfig: {
    memoryLimit: 1000,
    timeLimit: 1000,
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
        memoryLimit: 1000,
        timeLimit: 1000,
      };
    } else {
      form.value.judgeConfig = JSON.parse(form.value.judgeConfig as any);
    }
    if (!form.value.tags) {
      form.value.tags = [];
    } else {
      form.value.tags = JSON.parse(form.value.tags as any);
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

const onDescriptionChange = (value: string) => {
  form.value.description = value;
};
</script>

<style scoped>
#addQuestionView {
}

/* 题目内容/说明 Markdown 编辑器：高度统一为 300px（ByteMD 默认高度），宽度 960px（与发评论弹窗标准一致） */
#addQuestionView :deep(.bytemd) {
  height: 300px;
  width: 960px;
}
</style>
