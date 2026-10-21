/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type Competition = {
  competitionTitle?: string;
  createTime?: string;
  description?: string;
  endTime?: string;
  // 封榜时间（封榜后排名不再更新）
  freezeTime?: string;
  id?: number;
  // 竞赛关联的题目 Ids（后端 Long 序列化为字符串）
  questionIds?: Array<string>;
  startTime?: string;
  // 状态：NOT_START 待开始、RUNNING 进行中、END 已结束
  status?: string;
  updateTime?: string;
  userId?: number;
};
