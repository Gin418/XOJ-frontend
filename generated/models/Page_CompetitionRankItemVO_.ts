/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CompetitionRankItemVO } from "./CompetitionRankItemVO";
import type { OrderItem } from "./OrderItem";

export type Page_CompetitionRankItemVO_ = {
  countId?: string;
  current?: number;
  maxLimit?: number;
  optimizeCountSql?: boolean;
  orders?: Array<OrderItem>;
  pages?: number;
  records?: Array<CompetitionRankItemVO>;
  searchCount?: boolean;
  size?: number;
  total?: number;
};
