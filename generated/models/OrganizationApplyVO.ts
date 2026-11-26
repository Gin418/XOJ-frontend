/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UserVO } from "./UserVO";

export type OrganizationApplyVO = {
  createTime?: string;
  id?: number;
  organizationId?: number;
  organizationName?: string;
  // 申请状态：pending 待审核、approved 已同意、rejected 已拒绝
  status?: string;
  userVO?: UserVO;
};
