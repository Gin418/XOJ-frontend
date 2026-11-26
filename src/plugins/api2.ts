// 第二个后端的请求能力：同一页面可通过 callApi2() 向另一个后端地址发起请求，
// 与主后端（OpenAPI.BASE）互不干扰
import { OpenAPI } from "../../generated";
import type { CancelablePromise } from "../../generated/core/CancelablePromise";

// 第二个后端的请求基础地址（构建期从 .env 文件注入，修改后需重启 yarn serve）
export const API2_BASE = process.env.VUE_APP_API_BASE2 || "";

/**
 * 在第二个后端上调用任意生成的 service 方法，例如：
 *   const res = await callApi2(() =>
 *     QuestionControllerService.getQuestionVoByCustomIdUsingGet(id)
 *   );
 * 原理：request() 在 service 方法被调用的同一同步时序内完成 URL 拼接，
 * 这里同步恢复 OpenAPI.BASE，因此与主后端的并发请求互不串扰
 */
export const callApi2 = <T>(
  call: () => CancelablePromise<T>
): CancelablePromise<T> => {
  const prev = OpenAPI.BASE;
  OpenAPI.BASE = API2_BASE;
  try {
    return call();
  } finally {
    OpenAPI.BASE = prev;
  }
};
