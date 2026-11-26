/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseResponse_boolean_ } from "../models/BaseResponse_boolean_";
import type { BaseResponse_long_ } from "../models/BaseResponse_long_";
import type { BaseResponse_OrganizationVO_ } from "../models/BaseResponse_OrganizationVO_";
import type { BaseResponse_OrganizationMemberVO_ } from "../models/BaseResponse_OrganizationMemberVO_";
import type { BaseResponse_List_OrganizationVO_ } from "../models/BaseResponse_List_OrganizationVO_";
import type { BaseResponse_Page_OrganizationVO_ } from "../models/BaseResponse_Page_OrganizationVO_";
import type { BaseResponse_Page_OrganizationMemberVO_ } from "../models/BaseResponse_Page_OrganizationMemberVO_";
import type { BaseResponse_Page_OrganizationApplyVO_ } from "../models/BaseResponse_Page_OrganizationApplyVO_";
import type { BaseResponse_string_ } from "../models/BaseResponse_string_";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class OrganizationControllerService {
  /**
   * addOrganization：创建组织（创建者自动成为组织所有者）
   * @param organizationAddRequest organizationAddRequest（organizationName 组织名称、description 简介、avatar 头像）
   * @returns BaseResponse_long_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static addOrganizationUsingPost(organizationAddRequest: {
    organizationName: string;
    description?: string;
    avatar?: string;
  }): CancelablePromise<BaseResponse_long_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/add",
      body: organizationAddRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * updateOrganization：修改组织（仅系统管理员、组织所有者或组织管理员）
   * @param organizationUpdateRequest organizationUpdateRequest
   * @returns BaseResponse_boolean_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static updateOrganizationUsingPost(organizationUpdateRequest: {
    organizationId: number;
    organizationName?: string;
    description?: string;
    avatar?: string;
  }): CancelablePromise<BaseResponse_boolean_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/update",
      body: organizationUpdateRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * deleteOrganization：删除组织（仅系统管理员或组织所有者）
   * @param organizationId organizationId
   * @returns BaseResponse_boolean_ OK
   * @throws ApiError
   */
  public static deleteOrganizationUsingGet(
    organizationId: number
  ): CancelablePromise<BaseResponse_boolean_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/delete/${organizationId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getOrganization：查询组织详情
   * @param organizationId organizationId
   * @returns BaseResponse_OrganizationVO_ OK
   * @throws ApiError
   */
  public static getOrganizationUsingGet(
    organizationId: number
  ): CancelablePromise<BaseResponse_OrganizationVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/${organizationId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * quitOrganization：退出组织（组织所有者不能退出）
   * @param organizationJoinRequest organizationJoinRequest
   * @returns BaseResponse_boolean_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static quitOrganizationUsingPost(organizationJoinRequest: {
    organizationId: number;
  }): CancelablePromise<BaseResponse_boolean_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/quit",
      body: organizationJoinRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getJoinStatus：查询当前用户是否已加入组织
   * @param organizationId organizationId
   * @returns BaseResponse_boolean_ OK
   * @throws ApiError
   */
  public static getJoinStatusUsingGet(
    organizationId: number
  ): CancelablePromise<BaseResponse_boolean_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/join/status/${organizationId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getMemberInfo：查询当前用户在组织中的成员信息（角色、加入时间、用户信息），未加入时仅返回用户信息
   * @param organizationId organizationId
   * @returns BaseResponse_OrganizationMemberVO_ OK
   * @throws ApiError
   */
  public static getMemberInfoUsingGet(
    organizationId: number
  ): CancelablePromise<BaseResponse_OrganizationMemberVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/member/${organizationId}/info`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * listMyOrganizations：分页查询当前用户加入的组织列表（按加入时间倒序）
   * @param current 页码（从 1 开始）
   * @param pageSize 每页条数
   * @returns BaseResponse_Page_OrganizationVO_ OK
   * @throws ApiError
   */
  public static listMyOrganizationsUsingGet(
    current?: number,
    pageSize?: number
  ): CancelablePromise<BaseResponse_Page_OrganizationVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/organization/my/list",
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
   * listMembers：分页查询组织成员列表（按加入时间倒序，含角色与用户信息）
   * @param organizationId organizationId
   * @param current 页码（从 1 开始）
   * @param pageSize 每页条数
   * @returns BaseResponse_Page_OrganizationMemberVO_ OK
   * @throws ApiError
   */
  public static listMembersUsingGet(
    organizationId: number,
    current?: number,
    pageSize?: number
  ): CancelablePromise<BaseResponse_Page_OrganizationMemberVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/members/page/${organizationId}`,
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
   * listOrganization：查询组织列表（全量返回，含成员数与当前用户加入状态，不分页，按创建时间升序）
   * @param organizationListRequest organizationListRequest（organizationName 组织名称）
   * @returns BaseResponse_List_OrganizationVO_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static listOrganizationUsingPost(organizationListRequest: {
    organizationName?: string;
  }): CancelablePromise<BaseResponse_List_OrganizationVO_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/list",
      body: organizationListRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * apply：发起加入组织申请（已拒绝的申请可重新发起）
   * @param organizationApplyRequest organizationApplyRequest
   * @returns BaseResponse_long_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static applyUsingPost(organizationApplyRequest: {
    organizationId: number;
  }): CancelablePromise<BaseResponse_long_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/apply",
      body: organizationApplyRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * cancelApply：撤销加入组织申请（仅待审核状态可撤销）
   * @param organizationApplyRequest organizationApplyRequest
   * @returns BaseResponse_boolean_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static cancelApplyUsingPost(organizationApplyRequest: {
    organizationId: number;
  }): CancelablePromise<BaseResponse_boolean_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/apply/cancel",
      body: organizationApplyRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * getApplyStatus：查询当前用户在组织的申请状态（未申请返回 null）
   * @param organizationId organizationId
   * @returns BaseResponse_string_ OK
   * @throws ApiError
   */
  public static getApplyStatusUsingGet(
    organizationId: number
  ): CancelablePromise<BaseResponse_string_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/apply/status/${organizationId}`,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }

  /**
   * listApplies：分页查询组织申请列表（仅系统管理员、组织所有者或组织管理员）
   * @param organizationId organizationId
   * @param status 申请状态（可选，空表示全部）
   * @param current 页码（从 1 开始）
   * @param pageSize 每页条数
   * @returns BaseResponse_Page_OrganizationApplyVO_ OK
   * @throws ApiError
   */
  public static listAppliesUsingGet(
    organizationId: number,
    status?: string,
    current?: number,
    pageSize?: number
  ): CancelablePromise<BaseResponse_Page_OrganizationApplyVO_> {
    return __request(OpenAPI, {
      method: "GET",
      url: `/api/organization/apply/list/${organizationId}`,
      query: {
        status: status,
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
   * auditApply：审核加入组织申请（同意/拒绝）
   * @param auditRequest auditRequest（applyId 申请 id、approve 是否同意）
   * @returns BaseResponse_boolean_ OK
   * @returns any Created
   * @throws ApiError
   */
  public static auditApplyUsingPost(auditRequest: {
    applyId: number;
    approve: boolean;
  }): CancelablePromise<BaseResponse_boolean_ | any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/organization/apply/audit",
      body: auditRequest,
      errors: {
        401: `Unauthorized`,
        403: `Forbidden`,
        404: `Not Found`,
      },
    });
  }
}
