/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { JudgeConfig } from "./JudgeConfig";
import type { UserVO } from "./UserVO";
import { JudgeCase } from "./JudgeCase";

export type QuestionVO = {
  acceptedNum?: number;
  content?: string;
  createTime?: string;
  favourNum?: number;
  id?: number;
  judgeCase?: Array<JudgeCase>;
  judgeConfig?: JudgeConfig;
  submitNum?: number;
  tags?: Array<string>;
  thumbNum?: number;
  title?: string;
  updateTime?: string;
  userId?: number;
  userVO?: UserVO;
};
