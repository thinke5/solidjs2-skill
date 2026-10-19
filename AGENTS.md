# AGENTS.md

本仓库是 SolidJS 2 的 agent skill 集合，不含可直接运行的代码工程。

## 目录

| 路径 | 作用 |
| --- | --- |
| `skills/<name>/SKILL.md` | skill 入口，唯一入口文件 |
| `skills/<name>/references/` | 按需读取的细节文档 |

需要时再增加 `scripts/`（可执行脚本）或 `assets/`（模板文件），不预建空目录。

## Skill 约定

1. 目录名即 skill name，小写连字符，与 frontmatter 的 `name` 完全一致。
2. frontmatter 只允许 `name`、`description`。`description` 写适用场景，不写实现细节。
3. `SKILL.md` 保持在 200 行内，只放工作流和索引；细节拆到 `references/`，单文件不超过 300 行。
4. `SKILL.md` 引用 reference 时写明相对路径，例如 `references/api-mapping.md`。
5. 新增 reference 后同步更新对应 `SKILL.md` 的待补内容或索引。
6. 每个 skill 必须独立可用：不引用其他 skill 的文件或概念；版本、依赖包等外部前提写在 `SKILL.md` 内。

## 写作规范

- 简体中文，句式简短。
- 代码示例必须标注语言。SolidJS 代码可用 `.jsx` 或 `.tsx`，同一文件内保持一致；需要体现类型签名时用 `tsx`。
- 表格用于对照关系，流程用 `mermaid`，不用字符画。
- 不写项目背景、动机、路线图，只写可执行的事实与操作。

## 内容准确性

- React 与 SolidJS 2 的 API 对照必须能对应到官方文档，不确定就留空并标注 `待核实`。
- 迁移建议要给出改前/改后代码，不只描述差异。

## 信息源

本地浅克隆在 `tmp/`，不入库。写内容前先查这里，不要凭记忆。

| 路径 | 分支 | 内容 |
| --- | --- | --- |
| `tmp/solid-docs/src/routes/` | `v2-rebuild` | 官方 2.0 文档，`.mdx` |
| `tmp/solid-docs/src/routes/(6)migration/(5)from-react.mdx` | `v2-rebuild` | React 迁移指南，skill 1 的直接依据 |
| `tmp/solid-docs/src/routes/(2)concepts/` | `v2-rebuild` | 响应式、组件、stores、异步、SSR |
| `tmp/solid-docs/src/routes/reference/` | `v2-rebuild` | API 参考 |
| `tmp/solid/packages/signals/src/` | `next` | 响应式内核实现 |
| `tmp/solid/packages/solid/src/` | `next` | 运行时与 JSX 实现 |
| `tmp/solid/documentation/` | `next` | 设计文档、`solid-2.0/` 迁移说明 |

重新拉取使用 `--depth 1 --branch`，避免完整历史。

## 检查

无构建步骤。提交前逐项确认：

- [ ] 目录名与 `name` 一致
- [ ] frontmatter 可被 YAML 解析
- [ ] 引用的 reference 文件存在
- [ ] 无 `TODO` 残留在正式内容中（骨架阶段除外）
