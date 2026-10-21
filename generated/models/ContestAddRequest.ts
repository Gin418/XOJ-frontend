/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ContestAddRequest = {
  competitionTitle?: string;
  description?: string;
  endTime?: string;
  // 封榜时间（封榜后排名不再更新）
  freezeTime?: string;
  // 更新时必传：竞赛 id（字符串传输避免雪花 Id 精度丢失）
  id?: string;
  // 题目 Ids（后端 List<Long>，前端用字符串传输避免雪花 Id 精度丢失）
  questionIds?: Array<string>;
  startTime?: string;
};
