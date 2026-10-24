/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PostQueryRequest } from './PostQueryRequest';

export type PostFavourQueryRequest = {
    current?: number;
    discussionQueryRequest?: PostQueryRequest;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    userId?: number;
};
