import axios from "axios";
import type { UserVO } from "../../generated";

/**
 * @ 提及匹配（交替正则，按顺序优先）：
 * 1. [@用户名](mention:用户id) 完整语法——携带用户 id，点击无需再查询
 * 2. @用户名 裸文本——兼容手写输入，点击时按用户名查询 id
 */
export const MENTION_RE =
  /\[@([^\]]+)\]\(mention:(\d+)\)|@([\u4e00-\u9fa5\w-]+)/g;

/**
 * 遍历容器内文本节点，把 @ 提及替换为可点击链接
 * 跳过代码块、行内代码、已有链接与代码编辑器输入区
 */
export const decorateMentions = (root?: HTMLElement | null) => {
  if (!root) {
    return;
  }
  // markdown-it 若把 mention: 协议解析成 <a>，将其转换为我们的提及链接
  root
    .querySelectorAll<HTMLAnchorElement>('a[href^="mention:"]')
    .forEach((a) => {
      const href = a.getAttribute("href") || "";
      const userId = href.replace("mention:", "");
      const userName = (a.textContent || "").replace(/^@/, "");
      a.classList.add("mention-link");
      a.dataset.userId = userId;
      a.dataset.userName = userName;
      // 指向用户主页：右键可复制链接地址，点击由事件委托走 SPA 跳转
      a.setAttribute("href", "/user/profile?userId=" + userId);
    });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest("pre, code, a, .cm-editor")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue?.includes("@")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }
  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue ?? "";
    if (!MENTION_RE.test(text)) {
      return;
    }
    MENTION_RE.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = MENTION_RE.exec(text))) {
      if (match.index > last) {
        fragment.appendChild(
          document.createTextNode(text.slice(last, match.index))
        );
      }
      const link = document.createElement("a");
      link.className = "mention-link";
      if (match[1] !== undefined && match[2] !== undefined) {
        // [@用户名](mention:用户id)：链接自带用户 id，显示为 @用户名
        link.dataset.userName = match[1];
        link.dataset.userId = match[2];
        link.textContent = "@" + match[1];
        // 指向用户主页：右键可复制链接地址，点击由事件委托走 SPA 跳转
        link.href = "/user/profile?userId=" + match[2];
      } else {
        // @用户名 裸文本：点击时再按用户名查询 id
        link.dataset.userName = match[3];
        link.textContent = match[0];
      }
      fragment.appendChild(link);
      last = match.index + match[0].length;
    }
    if (last < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(last)));
    }
    textNode.replaceWith(fragment);
  });
};

/**
 * 按用户名查询用户 id（同名取第一个），未匹配返回 undefined
 */
export const resolveUserIdByUserName = async (
  userName: string
): Promise<string | undefined> => {
  try {
    const res = await axios.get("/api/user/get/userName/vo", {
      params: { userName },
    });
    const body = res.data as {
      code: number;
      data?: UserVO[];
      message?: string;
    };
    if (body.code === 0 && body.data?.length) {
      return String(body.data[0].id);
    }
    return undefined;
  } catch {
    return undefined;
  }
};

/**
 * 从 @ 提及链接取用户 id：优先链接自带的 id（[@用户名](mention:用户id) 语法），
 * 否则按用户名查询接口；裸文本链接查询成功后回填 href，支持复制链接地址
 */
export const getMentionUserId = async (
  link: HTMLAnchorElement
): Promise<string | undefined> => {
  if (link.dataset.userId) {
    return link.dataset.userId;
  }
  const userName = link.dataset.userName;
  if (!userName) {
    return undefined;
  }
  const userId = await resolveUserIdByUserName(userName);
  if (userId) {
    link.href = "/user/profile?userId=" + userId;
  }
  return userId;
};
