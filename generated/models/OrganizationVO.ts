/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UserVO } from "./UserVO";

export type OrganizationVO = {
  // 组织头像
  avatar?: string;
  createTime?: string;
  // 组织简介
  description?: string;
  // 当前用户是否已加入该组织（列表查询场景返回）
  joined?: boolean;
  // 组织人数
  memberCount?: number;
  // 组织 id
  organizationId?: number;
  // 组织名称
  organizationName?: string;
  // 创建用户 id（组织负责人）
  userId?: number;
  // 所有者信息（脱敏）
  userVO?: UserVO;
};
