# Repository Guidelines

## 项目结构与模块组织
当前仓库为静态网页项目，按以下结构组织：
- `src/`：网页源代码（`index.html` / `styles.css` / `main.js`）。
- `assets/`：图片资源（场景、角色、道具、UI 等）。
- `scripts/`：开发脚本（如图像裁切与缩放）。
- `output/`：图像生成与中间产物（不参与网页运行）。
- `tests/`：预留测试目录（当前未使用）。
- `docs/`：预留文档目录（当前未使用）。

## 构建、测试与本地开发命令
当前为纯静态页面，不依赖构建工具：
- 预览（推荐）：`python3 -m http.server 8080`，浏览 `http://localhost:8080/src/index.html`。
- 直接打开：可用浏览器直接打开 `src/index.html`（部分浏览器可能限制本地资源加载）。

如需继续扩展为工程化项目，可引入 Vite/Next 并在 `README.md` 更新命令。

## 编码风格与命名约定
- 缩进：2 空格。
- 文件命名：`kebab-case` 或 `snake_case`。
- 类名/类型：`PascalCase`；变量/函数：`camelCase`。
- 资源命名：沿用既有文件名，不随意改名。

## 测试指南
当前无测试框架。若后续加入交互逻辑复杂化：
- Web/JS：建议 `Vitest` 或 `Jest`。
- 示例命名：`*.test.js` 或 `*.spec.js`。

## 依赖与脚本说明
- 图像生成与后处理脚本：`scripts/imagegen_postprocess.py`（依赖 `openai`、`pillow`，仅用于资产生产，不影响网页运行）。
- 资产最终放置于 `assets/`，网页仅引用该目录。

## 提交与 Pull Request 规范
- 提交信息：`type(scope): summary`（示例：`feat(ui): add hero section`）。
- PR 说明包含：改动摘要、测试结果、截图（如涉及 UI）。

## 代理/自动化说明
本仓库包含 `AGENTS.md`，用于指导协作与自动化工具。新增脚本或依赖时，请同步更新本文件与 `README.md`。
