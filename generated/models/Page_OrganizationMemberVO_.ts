/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { OrganizationMemberVO } from "./OrganizationMemberVO";
import type { OrderItem } from "./OrderItem";

export type Page_OrganizationMemberVO_ = {
  countId?: string;
  current?: number;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: Array<OrderItem>;
  pages?: number;
  records?: Array<OrganizationMemberVO>;
  searchCount?: boolean;
  size?: number;
  total?: number;
};
