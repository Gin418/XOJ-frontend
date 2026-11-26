/**
 * 判题模式统一映射与选项：与后端 JudgeModeEnum 枚举 value 一致。
 * 全项目唯一来源，创建/更新题目的判题配置处统一从这里引用，避免多处重复定义。
 */

/**
 * 判题模式 value 中文映射
 */
export const JUDGE_MODE_TEXT_MAP: Record<string, string> = {
  exact: "精确匹配",
  ignore_whitespace: "忽略空白",
  float_precision: "浮点精度",
  multi_answer: "多答案",
  testlib: "TESTLIB",
};

/**
 * 判题模式下拉选项列表（顺序与后端枚举声明顺序一致）
 */
export const JUDGE_MODE_OPTIONS = Object.keys(JUDGE_MODE_TEXT_MAP).map(
  (value) => ({ value, label: JUDGE_MODE_TEXT_MAP[value] })
);

/**
 * 默认判题模式：精确匹配（后端 judgeConfig.judgeMode 缺省值）
 */
export const DEFAULT_JUDGE_MODE = "exact";

/**
 * 默认浮点误差容限（float_precision 模式使用，后端缺省 1e-6）
 */
export const DEFAULT_EPSILON = 1e-6;
