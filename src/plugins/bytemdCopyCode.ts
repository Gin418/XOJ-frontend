import type { BytemdPlugin } from "bytemd";

/**
 * 常见语言名映射：markdown 代码块的语言标记（language-xxx）转显示名
 * 未列出的语言兜底为首字母大写
 */
const languageNames: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  java: "Java",
  python: "Python",
  py: "Python",
  cpp: "C++",
  "c++": "C++",
  c: "C",
  csharp: "C#",
  cs: "C#",
  go: "Go",
  golang: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  php: "PHP",
  ruby: "Ruby",
  swift: "Swift",
  sql: "SQL",
  bash: "Bash",
  shell: "Shell",
  sh: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  xml: "XML",
  yaml: "YAML",
  markdown: "Markdown",
};

/**
 * 解析代码块语言显示名，无语言标记（``` 后未写语言）时返回空字符串
 */
const getLanguageName = (code: HTMLElement): string => {
  const match = code.className.match(/language-([\w+-]+)/);
  if (!match) {
    return "";
  }
  const lang = match[1].toLowerCase();
  return languageNames[lang] ?? lang.charAt(0).toUpperCase() + lang.slice(1);
};

/**
 * ByteMD 插件：把每个代码块重排为「标题栏 + 代码区」结构
 * 标题栏左侧显示语言名，右侧是复制与收起/展开按钮
 * 样式见 src/styles/markdown.css 中 .bytemd-code-* 相关规则
 */
export default function copyCode(): BytemdPlugin {
  return {
    viewerEffect({ markdownBody }) {
      markdownBody.querySelectorAll("pre").forEach((pre) => {
        // 防止同一代码块被重复处理
        if (pre.parentElement?.classList.contains("bytemd-code-block")) {
          return;
        }
        const code = pre.querySelector("code");

        // 包裹层：标题栏 + 代码区
        const wrapper = document.createElement("div");
        wrapper.className = "bytemd-code-block";

        // 标题栏
        const header = document.createElement("div");
        header.className = "bytemd-code-header";

        // 左侧语言标签：仅在代码块声明了语言时显示
        const lang = code ? getLanguageName(code) : "";
        if (lang) {
          const tag = document.createElement("span");
          tag.className = "bytemd-code-lang";
          tag.textContent = lang;
          header.appendChild(tag);
        } else {
          // 无语言时放一个空占位，保持按钮靠右对齐
          header.appendChild(document.createElement("span"));
        }

        // 右侧操作按钮区
        const actions = document.createElement("div");
        actions.className = "bytemd-code-actions";

        // 复制按钮
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "bytemd-code-copy-btn";
        copyBtn.textContent = "复制";
        copyBtn.addEventListener("click", async () => {
          const text = code?.textContent ?? "";
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            // 非安全上下文（http 等）或旧浏览器：退回 execCommand
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
          }
          copyBtn.textContent = "已复制";
          window.setTimeout(() => {
            copyBtn.textContent = "复制";
          }, 1500);
        });
        actions.appendChild(copyBtn);

        // 收起/展开按钮：箭头图标，收起后代码区完全隐藏，只留标题栏
        const collapseBtn = document.createElement("button");
        collapseBtn.type = "button";
        collapseBtn.className = "bytemd-code-collapse-btn";
        collapseBtn.title = "收起";
        collapseBtn.innerHTML =
          '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' +
          '<path d="M12.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 1.06-1.06L8 8.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"/>' +
          "</svg>";
        collapseBtn.addEventListener("click", () => {
          const collapsed = wrapper.classList.toggle("bytemd-code-collapsed");
          collapseBtn.classList.toggle("is-collapsed", collapsed);
          collapseBtn.title = collapsed ? "展开" : "收起";
        });
        actions.appendChild(collapseBtn);

        header.appendChild(actions);

        // 重组 DOM：包裹层插到 pre 原位置，标题栏与 pre 放入包裹层
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
      });
    },
  };
}
