# SolidJS 2 Skills

SolidJS 2 相关的 agent skill 集合。

## 使用

### 1. 安装

**方式一：skills.sh CLI**

仓库推送到 GitHub 后，`npx skills` 可直接解析，并自动识别 `skills/` 下的目录。

```bash
# 查看仓库里有哪些 skill
npx skills add thinke5/solidjs2-skill --list

# 安装全部到用户目录
npx skills add thinke5/solidjs2-skill --skill '*' -g

# 只装一个
npx skills add thinke5/solidjs2-skill --skill react-to-solidjs2 -g

# 直接指向单个 skill 目录
npx skills add https://github.com/thinke5/solidjs2-skill/tree/main/skills/react-to-solidjs2
```

- `-g` 装到用户目录，跨项目可用；省略则装到当前项目的 agent skills 目录。
- `-a <agent>` 指定目标 agent，例如 `-a claude-code`；省略时交互选择。可用名称以 `npx skills` 列出为准。
- `--copy` 复制文件，默认使用符号链接。

也可不安装，直接生成提示词：

```bash
npx skills use thinke5/solidjs2-skill@solidjs2-best-practices | claude
```

**方式二：手动复制**

克隆或下载本仓库，把 skill 目录复制到 agent 的 skills 目录。以 CodeBuddy 为例，用户级目录是 `~/.codebuddy/skills/`；其他 agent 换成各自的 skills 目录。

```bash
git clone https://github.com/thinke5/solidjs2-skill.git solidjs2-skill
cp -r solidjs2-skill/skills/react-to-solidjs2 ~/.codebuddy/skills/
cp -r solidjs2-skill/skills/solidjs2-best-practices ~/.codebuddy/skills/
```

两个 skill 可单独安装，只用一个就只复制一个目录。

### 2. 确认

安装后的目录结构：

```
<skills 目录>/react-to-solidjs2/
├── SKILL.md
└── references/
```

缺少 `references/` 时 skill 仍能触发，但细节内容读不到。

### 3. 使用

安装后按 `description` 自动匹配，也可以直接点名：

- 「把 `src/components/Cart.tsx` 迁到 Solid」
- 「审查这个 Solid 组件，看看写法有没有问题」
- 「用 react-to-solidjs2 处理这个目录」

| 场景 | 用哪个 |
| --- | --- |
| 已有 React 代码，要改写成 SolidJS 2 | `react-to-solidjs2` |
| 新写或审查 Solid 代码，判断写法是否正确 | `solidjs2-best-practices` |
| 先迁移、再复查 | 两个依次使用 |

两个 skill 均以 SolidJS 2.x 为前提，依赖包与示例语言写在各 `SKILL.md` 的「前提」内。

## 目录结构

```
solidjs2-skill/
├── skills/
│   ├── react-to-solidjs2/        # skill 1：React 迁移到 SolidJS 2
│   │   ├── SKILL.md              # 入口，frontmatter + 使用说明
│   │   └── references/           # API 对照、场景代码、迁移方案
│   └── solidjs2-best-practices/  # skill 2：SolidJS 2 最佳实践
│       ├── SKILL.md
│       └── references/
└── README.md
```

## Skill 说明

| Skill | 用途 |
| --- | --- |
| `react-to-solidjs2` | 把 React 组件/项目迁移到 SolidJS 2，处理 API、心智模型与响应式系统差异 |
| `solidjs2-best-practices` | 编写与审查 SolidJS 2 代码时的规范、模式与性能建议 |

## 参考仓库

浅克隆到 `tmp/`，不入库。写内容前先查这里，不要凭记忆。

| 仓库 | 分支 | 本地路径 | 用途 |
| --- | --- | --- | --- |
| https://github.com/solidjs/solid-docs.git | `v2-rebuild` | `tmp/solid-docs` | 官方 2.0 文档，`src/routes/` 为文档正文 |
| https://github.com/solidjs/solid.git | `next` | `tmp/solid` | 源码，`packages/` 为运行时与编译器，`documentation/` 为设计文档 |

拉取命令：

```bash
git clone --depth 1 --branch v2-rebuild https://github.com/solidjs/solid-docs.git tmp/solid-docs
git clone --depth 1 --branch next       https://github.com/solidjs/solid.git      tmp/solid
```

## 约定

- 每个 skill 一个目录，目录名即 skill name（小写连字符）。
- `SKILL.md` 只放索引与工作流，细节放 `references/`，按需读取。
- `references/` 单文件不超过 300 行，超出即拆分。
