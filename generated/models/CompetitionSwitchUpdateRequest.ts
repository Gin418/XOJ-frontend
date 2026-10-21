/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CompetitionSwitchUpdateRequest = {
  // 是否允许赛后提交：0 不允许、1 允许
  allowSubmitAfterEnd?: number;
  // 竞赛 id（字符串传输避免雪花 Id 精度丢失）
  id?: string;
  // 是否揭榜：0 未揭榜、1 已揭榜
  isRevealed?: number;
};
