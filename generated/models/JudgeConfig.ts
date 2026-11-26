/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type JudgeConfig = {
    // 浮点误差容限（float_precision 模式使用，默认 1e-6）
    epsilon?: number;
    // 判题模式（JudgeModeEnum 的 value）：exact 精确匹配（默认）、ignore_whitespace 忽略空白、
    // float_precision 浮点精度、multi_answer 多答案、testlib TESTLIB
    judgeMode?: string;
    memoryLimit?: number;
    stackLimit?: number;
    timeLimit?: number;
};
