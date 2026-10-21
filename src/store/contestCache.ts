import { ContestControllerService } from "../../generated";
import type { Competition } from "../../generated";

/**
 * 竞赛详情共享缓存：GlobalHeader（顶部标题）与 ContestDetailView（预览页）
 * 都需要竞赛详情数据，通过该加载器保证同一竞赛只请求一次。
 */
const detailCache = new Map<string, Competition | undefined>();
const pendingMap = new Map<string, Promise<Competition | undefined>>();

/**
 * 获取竞赛详情（带缓存与并发去重）
 * @param id 竞赛 id
 * @param force 强制刷新：绕过缓存重新请求（导航切换时需要最新数据）
 * @returns 竞赛详情，失败返回 undefined
 */
export function getContestDetail(
  id: string,
  force = false
): Promise<Competition | undefined> {
  // 未强制刷新且已加载过：直接返回缓存
  if (!force && detailCache.has(id)) {
    return Promise.resolve(detailCache.get(id));
  }
  // 请求进行中：复用同一个 Promise，避免重复请求（无论是否强制刷新）
  const pending = pendingMap.get(id);
  if (pending) {
    return pending;
  }
  const promise = ContestControllerService.getCompetitionDetailUsingGet(id)
    .then((res) => {
      pendingMap.delete(id);
      const data = res.code === 0 ? res.data : undefined;
      detailCache.set(id, data);
      return data;
    })
    .catch(() => {
      pendingMap.delete(id);
      return undefined;
    });
  pendingMap.set(id, promise);
  return promise;
}
