/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Organization } from "./Organization";
import type { OrderItem } from "./OrderItem";

export type Page_Organization_ = {
  countId?: string;
  current?: number;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: Array<OrderItem>;
  pages?: number;
  records?: Array<Organization>;
  searchCount?: boolean;
  size?: number;
  total?: number;
};
