/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UserVO } from "./UserVO";

export type OrganizationMemberVO = {
  // 加入时间
  joinTime?: string;
  // 角色：owner 所有者、admin 管理员、member 普通成员
  role?: string;
  userId?: number;
  userVO?: UserVO;
};
