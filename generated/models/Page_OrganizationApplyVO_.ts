/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { OrganizationApplyVO } from "./OrganizationApplyVO";
import type { OrderItem } from "./OrderItem";

export type Page_OrganizationApplyVO_ = {
  countId?: string;
  current?: number;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: Array<OrderItem>;
  pages?: number;
  records?: Array<OrganizationApplyVO>;
  searchCount?: boolean;
  size?: number;
  total?: number;
};
