/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CompetitionRankQuestionVO } from "./CompetitionRankQuestionVO";
import type { UserVO } from "./UserVO";

export type CompetitionRankItemVO = {
    acceptedCount?: number;
    penaltyTime?: number;
    questions?: Record<string, CompetitionRankQuestionVO>;
    rank?: number;
    userId?: string;
    userVO?: UserVO;
};
