/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { OrganizationVO } from "./OrganizationVO";
import type { OrderItem } from "./OrderItem";

export type Page_OrganizationVO_ = {
  countId?: string;
  current?: number;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: Array<OrderItem>;
  pages?: number;
  records?: Array<OrganizationVO>;
  searchCount?: boolean;
  size?: number;
  total?: number;
};
