---
name: react-to-solidjs2
description: 将 React 组件或项目迁移到 SolidJS 2。适用于 React 代码改写、hooks 转 signals、响应式模型差异排查、迁移方案制定与迁移结果验证等场景。
---

# React 迁移到 SolidJS 2

## 前提

- 目标运行时：SolidJS 2.x。文中 `onSettled`、两阶段 `createEffect`、`Loading` / `Errored` / `Reveal` 均为 2.0 API。
- React 代码只作对照来源，迁移完成后不保留 React 运行时。
- 包：核心来自 `solid-js`，DOM 渲染与 `Portal`、`dynamic` 来自 `@solidjs/web`。
- 示例：`.tsx`，两侧沿用同一语法，便于对照。

## 先建立执行模型

React 组件在状态变化时重新执行。
Solid 组件只在挂载时执行一次，之后由 signals 通知读取它们的表达式。

这一条决定了所有改写方式：**不要按“重新渲染”的思路翻译代码**。
组件体内的读取是一次性快照；只有 JSX、memo、effect 的 compute 函数，以及异步计算首次 `await` 之前的同步段属于追踪作用域。

## 迁移顺序

按下列顺序改写单个组件，每一步完成后再进入下一步：

1. **签名**：不解构 props，保留 `props.xxx` 形式。
2. **状态**：`useState` → `createSignal`，读取改为 `value()`。
3. **派生**：删掉“signal + effect 同步”的写法，改为普通函数或 `createMemo`。
4. **副作用**：`useEffect` 按职责拆解，多数情况应删除而非翻译。
5. **结构**：响应式列表改 `For`；需要 fallback、值收窄或身份控制时用 `Show`。
6. **属性与事件**：`className` → `class`，`onChange` → `onInput`。

## 关键决策

| 遇到 | 选择 | 依据 |
| --- | --- | --- |
| 局部标量状态 | `createSignal` | 单一身份、整体替换 |
| 对象或集合状态 | `createStore` | 按属性订阅，局部更新 |
| 可被用户覆盖、又跟随 props 的值 | `createSignal(() => props.x)` | 可写派生，无需同步 effect |
| 小派生、单处消费 | 普通函数 | 在调用方作用域内自动追踪 |
| 昂贵派生、多处消费 | `createMemo` | 缓存与相等性边界 |
| 依赖变化要操作外部系统 | `createEffect(compute, effect)` | 两阶段：compute 追踪，effect 执行 |
| 只读一次、不订阅 | `untrack` 或事件处理器内读取 | 事件处理器本身不追踪 |

不确定该用哪种状态容器时，先选 `createSignal`；出现嵌套对象的部分更新需求再换 `createStore`。

## 高频错误

| 错误写法 | 问题 | 修正 |
| --- | --- | --- |
| `const { name } = props` | 解构即快照，props 变化不更新 | 保留 `props.name` 或包 `createMemo` |
| `count` 而非 `count()` | 拿到 accessor 函数本身，渲染成源码文本 | 所有读取处加括号 |
| 组件体顶层读 `count()` 存变量 | 组件只跑一次，值不再更新 | 在 JSX 或 memo 中读取 |
| `useMemo` 直接改成 `const x = ...` | 顶层计算只执行一次 | 改为函数或 `createMemo` |
| 把 `useEffect` 整体翻译成 `createEffect` | 多出不必要的副作用与执行顺序问题 | 先判断是否属于派生或事件 |
| `todos.map(...)` 直接渲染 | 每次重建全部行，丢失行状态 | 用 `<For each={...}>` |
| 依赖数组机械翻译 | Solid 无依赖数组 | 在 compute 函数里读全依赖 |
| 文本输入用 `onChange` | 原生 change 不是逐次输入 | 需要每次输入时改用 `onInput` |
| `style={{ backgroundColor }}` | 属性名不被识别 | 用 `"background-color"` |
| 在模块顶层建 signal 共享状态 | 无 owner，SSR 下跨请求泄漏 | 用 context 或挂在根组件 |

## 异步与边界

React 的 Suspense / ErrorBoundary / SuspenseList 对应 Solid 的 `Loading` / `Errored` / `Reveal`，但契约不同：

- 异步 `createMemo` 仍是 accessor，读取时才可能挂起。
- 挂起按数据归属判定，不阻断子组件的 setup；独立数据的请求可重叠，依赖前序结果的仍需等待。
- 同一同步调用栈内的多次写入自动合并，无需 `startTransition`。
- `Loading` 只需位于读取点的 owner 祖先，不必包住创建计算的位置。

## 索引

| 文件 | 内容 |
| --- | --- |
| `references/api-mapping.md` | React API 与 SolidJS 2 API 逐项对照，含组件与 JSX 属性 |
| `references/patterns.md` | 常见场景的改前/改后代码：状态、派生、副作用、列表、表单、ref、context、异步 |
| `references/migration-plan.md` | 项目级增量迁移顺序、边界划分与验收清单 |
| `references/solid-1-vs-2.md` | Solid 1.x 与 2.0 的差异，用于识别旧文章与旧代码写法 |

## 完成检查

- 所有 signal 读取都带调用括号。
- 需要响应式更新的读取位于 JSX、memo、effect compute 或异步计算中。
- 可变 props 未被解构。
- 派生值未被写成第二个 signal。
- 列表使用 `For` 的 keying 模式，或 `Repeat` 的区间渲染。
- 副作用只用于驱动 Solid 之外的外部系统。
- 异步读取有对应的 `Loading` 与 `Errored` 边界，且没有多余瀑布。
- 没有 React 组件或 React 运行时对象进入 Solid 组件树。
