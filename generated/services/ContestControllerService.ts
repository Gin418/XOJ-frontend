/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseResponse_boolean_ } from "../models/BaseResponse_boolean_";
import type { BaseResponse_Competition_ } from "../models/BaseResponse_Competition_";
import type { BaseResponse_CompetitionQuestion_ } from "../models/BaseResponse_CompetitionQuestion_";
import type { BaseResponse_CompetitionWeekStatsVO_ } from "../models/BaseResponse_CompetitionWeekStatsVO_";
import type { BaseResponse_List_QuestionVO_ } from "../models/BaseResponse_List_QuestionVO_";
import type { BaseResponse_List_CompetitionRankQuestionInfoVO_ } from "../models/BaseResponse_List_CompetitionRankQuestionInfoVO_";
import type { BaseResponse_List_SimpleQuestionVO_ } from "../models/BaseResponse_List_SimpleQuestionVO_";
import type { BaseResponse_long_ } from "../models/BaseResponse_long_";
import type { BaseResponse_Page_Competition_ } from "../models/BaseResponse_Page_Competition_";
import type { BaseResponse_Page_CompetitionRankItemVO_ } from "../models/BaseResponse_Page_CompetitionRankItemVO_";
import type { BaseResponse_Page_QuestionSubmitVO_ } from "../models/BaseResponse_Page_QuestionSubmitVO_";
import type { ContestAddRequest } from "../models/ContestAddRequest";
import type { CompetitionQueryRequest } from "../models/CompetitionQueryRequest";
import type { CompetitionSwitchUpdateRequest } from "../models/CompetitionSwitchUpdateRequest";
import type { DeleteRequest } from "../models/DeleteRequest";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ContestControllerService {
  /**
   * joinCompetition：参加竞赛
   * @param competitionJoinRequest competitionJoinRequest（competitionId 竞赛 id，字符串传输避免雪花 Id 精度丢失）
   * @returns BaseResponse_long_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static joinCompetitionUsingPost(competitionJoinRequest: {
    competitionId: string;
  }): CancelablePromise<BaseResponse_long_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/join",
      body: competitionJoinRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getJoinStatus：查询当前用户是否已参加竞赛
   * @param competitionId competitionId
   * @returns BaseResponse_boolean_ OK
   * @throws ApiError
   */
  public static getJoinStatusUsingGet(
    competitionId: string
  ): CancelablePromise<BaseResponse_boolean_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/competition/join/status/${competitionId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getWeekStats：获取本周赛事统计（总数、未开始数、进行中数）
   * @returns BaseResponse_CompetitionWeekStatsVO_ OK
   * @throws ApiError
   */
  public static getWeekStatsUsingGet(): CancelablePromise<BaseResponse_CompetitionWeekStatsVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/competition/week/stats",
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * listMyCompetitions：分页查询当前用户参加的竞赛列表（按参加时间倒序）
   * @param current 页码（从 1 开始）
   * @param pageSize 每页条数
   * @returns BaseResponse_Page_Competition_ OK
   * @throws ApiError
   */
  public static listMyCompetitionsUsingGet(
    current?: number,
    pageSize?: number
  ): CancelablePromise<BaseResponse_Page_Competition_> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/competition/my/list",
      query: {
        current: current,
        pageSize: pageSize,
      },
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * updateCompetitionSwitch：修改竞赛开关（是否允许赛后提交、是否揭榜），仅管理员或竞赛创建者
   * @param competitionSwitchUpdateRequest competitionSwitchUpdateRequest
   * @returns BaseResponse_boolean_ OK
   * @throws ApiError
   */
  public static updateCompetitionSwitchUsingPost(
    competitionSwitchUpdateRequest: CompetitionSwitchUpdateRequest
  ): CancelablePromise<BaseResponse_boolean_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/update/switch",
      body: competitionSwitchUpdateRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * addCompetition
   * @param contestAddRequest contestAddRequest
   * @returns BaseResponse_long_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static addCompetitionUsingPost(
    contestAddRequest: ContestAddRequest
  ): CancelablePromise<BaseResponse_long_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/add",
      body: contestAddRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * listCompetitionByPage
   * @param competitionQueryRequest competitionQueryRequest
   * @returns BaseResponse_Page_Competition_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static listCompetitionByPageUsingPost(
    competitionQueryRequest: CompetitionQueryRequest
  ): CancelablePromise<BaseResponse_Page_Competition_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/page",
      body: competitionQueryRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getCompetitionDetail
   * @param id id
   * @returns BaseResponse_Competition_ OK
   * @throws ApiError
   */
  public static getCompetitionDetailUsingGet(
    id: string
  ): CancelablePromise<BaseResponse_Competition_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/competition/${id}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getSimpleQuestions：获取竞赛关联的题目列表（用于修改竞赛回显）
   * @param competitionId competitionId
   * @returns BaseResponse_List_SimpleQuestionVO_ OK
   * @throws ApiError
   */
  public static getSimpleQuestionsUsingGet(
    competitionId: string
  ): CancelablePromise<BaseResponse_List_SimpleQuestionVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/competition/simpleQuestions/${competitionId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getCompetitionQuestions：获取竞赛题目列表（完整题目信息）
   * @param competitionId competitionId
   * @returns BaseResponse_List_QuestionVO_ OK
   * @throws ApiError
   */
  public static getCompetitionQuestionsUsingGet(
    competitionId: string
  ): CancelablePromise<BaseResponse_List_QuestionVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/competition/questions/${competitionId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getCompetitionQuestionByCustomId：按题号获取竞赛中的题目详情
   * @param competitionId competitionId
   * @param customId customId
   * @returns BaseResponse_CompetitionQuestion_ OK
   * @throws ApiError
   */
  public static getCompetitionQuestionByCustomIdUsingGet(
    competitionId: string,
    customId: string
  ): CancelablePromise<BaseResponse_CompetitionQuestion_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/competition/questions/${competitionId}/${customId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getCompetitionRank：分页获取竞赛排名（通过数、罚时、每题通过情况、用户信息）
   * @param competitionId competitionId
   * @param pageRequest 分页参数：current 当前页号（默认 1）、pageSize 页面大小（默认 10）、
   *   sortField 排序字段、sortOrder 排序顺序、realTime 是否实时榜单
   *   （true 查全部提交、false 正式榜单只查比赛期间的提交，默认 false）
   * @returns BaseResponse_Page_CompetitionRankItemVO_ OK
   * @throws ApiError
   */
  public static getCompetitionRankUsingPost(
    competitionId: string,
    pageRequest: {
      current: number;
      pageSize: number;
      sortField?: string;
      sortOrder?: string;
      realTime?: boolean;
    }
  ): CancelablePromise<BaseResponse_Page_CompetitionRankItemVO_> {
    return __request(OpenAPI, {
      method: "POST",
      url: `/api/competition/rank/${competitionId}`,
      body: pageRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getRankQuestionInfoList：获取竞赛排名页题目统计（题目 id、题号、标题、提交数、通过数）
   * @param competitionId competitionId
   * @returns BaseResponse_List_CompetitionRankQuestionInfoVO_ OK
   * @throws ApiError
   */
  public static getRankQuestionsUsingGet(
    competitionId: string
  ): CancelablePromise<BaseResponse_List_CompetitionRankQuestionInfoVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/competition/rank/questions/${competitionId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * listCompetitionSubmitByPage：竞赛提交记录分页查询
   * @param request 查询条件：competitionId 必传，questionId 题号（题目 id）、
   *   languageId 编程语言、status 测评结果、userName 提交用户、onlyMine 只看我的、
   *   current/pageSize 分页、sortField/sortOrder 排序
   * @returns BaseResponse_Page_QuestionSubmitVO_ OK
   * @throws ApiError
   */
  public static listCompetitionSubmitByPageUsingPost(request: {
    competitionId: string;
    questionId?: string;
    languageId?: number;
    status?: string;
    userName?: string;
    onlyMine?: boolean;
    current: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: string;
  }): CancelablePromise<BaseResponse_Page_QuestionSubmitVO_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/submit/page",
      body: request,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * updateCompetition
   * @param contestAddRequest contestAddRequest
   * @returns BaseResponse_long_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static updateCompetitionUsingPost(
    contestAddRequest: ContestAddRequest
  ): CancelablePromise<BaseResponse_long_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/update",
      body: contestAddRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * deleteCompetition
   * @param deleteRequest deleteRequest
   * @returns BaseResponse_long_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static deleteCompetitionUsingPost(
    deleteRequest: DeleteRequest
  ): CancelablePromise<BaseResponse_long_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/competition/delete",
      body: deleteRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }
}
