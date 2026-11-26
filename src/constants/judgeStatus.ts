/**
 * 测评结果（判题状态）统一映射与样式：与后端枚举字符串一致。
 * 全项目唯一来源，各页面统一从这里引用，避免多处重复定义。
 */

/**
 * 测评结果字符串中文映射
 */
export const JUDGE_STATUS_TEXT_MAP: Record<string, string> = {
  Compiling: "正在编译",
  Waiting_Judge: "等待判题",
  Judging: "正在测评",
  Accepted: "答案正确",
  Wrong_Answer: "答案错误",
  Compile_Error: "编译错误",
  Memory_Limit_Exceeded: "内存溢出",
  Time_Limit_Exceeded: "运行超时",
  Signalled: "运行错误",
  Presentation_Error: "格式错误",
  Nonzero_Exit_Status: "非零返回",
  Output_Limit_Exceeded: "输出溢出",
  Internal_Error: "系统错误",
  File_Error: "文件错误",
  Unknown: "未知结果",
};

/**
 * 测评结果枚举列表（用于搜索栏下拉选项，顺序与映射声明顺序一致）
 */
export const JUDGE_STATUS_LIST: string[] = Object.keys(JUDGE_STATUS_TEXT_MAP);

/**
 * 测评结果 → 中文文案（未知结果直接展示原始值）
 */
export const getJudgeStatusText = (status?: string) =>
  JUDGE_STATUS_TEXT_MAP[status ?? ""] ?? status ?? "";

/**
 * 测评结果 → 标签颜色：通过绿 / 判题中橙 / 其余红
 */
export const getJudgeStatusColor = (status?: string) => {
  if (status === "Accepted") {
    return "green";
  }
  if (
    status === "Time_Limit_Exceeded" ||
    status === "Presentation_Error" ||
    status === "Memory_Limit_Exceeded" ||
    status === "Output_Limit_Exceeded"
  ) {
    return "orange";
  }
  if (status === "Internal_Error" || status === "Compile_Error") {
    return "grey";
  }
  if (status === "Unknown") {
    return "amber";
  }
  if (
    status === "File_Error" ||
    status === "Signalled" ||
    status === "Judging"
  ) {
    return "purple";
  }
  if (status === "Waiting_Judge") {
    return "blue";
  }
  if (status === "Compiling") {
    return "pink";
  }
  return "red";
};

/**
 * 测评结果文本颜色（rgb 形式，与标签预设色一致）
 */
const JUDGE_STATUS_TEXT_COLOR_MAP: Record<string, string> = {
  green: "rgb(0, 180, 42)",
  orange: "rgb(244, 164, 96)",
  red: "rgb(245, 63, 63)",
  grey: "rgb(124, 126, 131)",
  purple: "rgb(153, 50, 204)",
  amber: "rgb(240, 160, 32)",
  blue: "rgb(22, 93, 255)",
  pink: "rgb(235, 10, 164)",
};

/**
 * 测评结果 → 文本样式：用于搜索栏下拉选项与已选值
 */
export const getJudgeStatusTextStyle = (status?: string) => ({
  color: JUDGE_STATUS_TEXT_COLOR_MAP[getJudgeStatusColor(status)],
});

/**
 * 逐测试点状态中文映射（大写蛇形，与后端 JudgeInfoMessageEnum 枚举名一致）
 */
export const JUDGE_CASE_STATUS_TEXT_MAP: Record<string, string> = {
  ACCEPTED: "答案正确",
  WRONG_ANSWER: "答案错误",
  PRESENTATION_ERROR: "格式错误",
  TIME_LIMIT_EXCEEDED: "运行超时",
  MEMORY_LIMIT_EXCEEDED: "内存溢出",
  SIGNALLED: "运行错误",
  NONZERO_EXIT_STATUS: "非零返回",
  OUTPUT_LIMIT_EXCEEDED: "输出溢出",
  INTERNAL_ERROR: "系统错误",
  FILE_ERROR: "文件错误",
  UNKNOWN: "未知结果",
  NOT_RUN: "未运行",
};

/**
 * 逐测试点状态 → 中文文案（无状态视为未运行）
 */
export const getJudgeCaseStatusText = (status?: string) =>
  JUDGE_CASE_STATUS_TEXT_MAP[status ?? ""] ?? status ?? "未运行";

/**
 * 逐测试点状态 → 标签颜色：通过绿 / 未运行与系统错误灰 / 其余红
 */
export const getJudgeCaseStatusColor = (status?: string) => {
  if (status === "ACCEPTED") {
    return "green";
  }
  if (
    !status ||
    status === "NOT_RUN" ||
    status === "INTERNAL_ERROR" ||
    status === "UNKNOWN"
  ) {
    return "gray";
  }
  return "red";
};
