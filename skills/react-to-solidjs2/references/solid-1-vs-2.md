# Solid 1.x → 2.0 差异

React 迁移时容易搜到 Solid 1.x 的教程与代码。本页只用于识别和纠正这类旧写法，不替代官方 1.x 迁移指南。

## 包与导入

| Solid 1.x | Solid 2.0 |
| --- | --- |
| `import { createStore } from "solid-js/store"` | `import { createStore } from "solid-js"` |
| `import { render } from "solid-js/web"` | `import { render } from "@solidjs/web"` |
| `solid-js/h` | `@solidjs/h` |
| `solid-js/html` | `@solidjs/html` |
| `solid-js/universal` | `@solidjs/universal` |
| `vite-plugin-solid` | `@solidjs/vite-plugin` |
| `jsxImportSource: "solid-js"` | `"@solidjs/web"` |

Store API 移入 `solid-js`，Web 渲染与 DOM JSX 类型移入 `@solidjs/web`。
运行时、渲染器、编译器、框架集成必须一起升级，2.0 不提供旧的包导出。

## 执行模型

| 项 | Solid 1.x | Solid 2.0 |
| --- | --- | --- |
| 写入生效时机 | 同步 | 暂存到微任务，紧跟读取拿到旧值 |
| 批量更新 | `batch()` | 默认合并，`batch` 移除 |
| 同步观察 | 无 | `flush()` / `flush(fn)`，仅用于测试或命令式边界 |
| 组件体内写入 | 允许 | 开发模式报错，需移到事件、action 或 effect |
| 顶层响应式读取 | 静默失效 | 开发模式警告 |

```ts
const [count, setCount] = createSignal(0);

setCount(1);
count(); // 0
flush();
count(); // 1
```

不要用 `flush` 替换每个 `batch`：前者把延迟工作变成同步工作。

## 响应式 API

| Solid 1.x | Solid 2.0 | 说明 |
| --- | --- | --- |
| `createSignal(v)` | 不变 | 新增 `createSignal(fn)`：可写派生 |
| `createSignal` 仅在 component 内 | 不变 | 无 |
| `createMemo(fn, value)` | `createMemo(fn, options?)` | 第二个参数改为选项对象 |
| `createEffect(fn, value)` | `createEffect(compute, effect)` | 追踪与副作用分离，无 initialValue |
| `on(deps, fn)` | 无 | 依赖直接写进 compute 函数 |
| `onMount(fn)` | `onSettled(fn)` | 返回值即清理函数 |
| effect 内 `onCleanup` | effect 返回清理函数 | |
| `createComputed` | 无 | 派生用 `createMemo`，副作用拆 `createEffect` |
| `createSelector` | `createProjection` 或函数式 `createStore` | |
| `catchError` / `onError` | `Errored` 边界或 effect bundle | |
| `createTrackedEffect` 不存在 | 新增 | 只有一个追踪回调时使用 |

`createEffect` 的两种写法：

```tsx
// 1.x
createEffect(() => {
  document.title = title();
});

// 2.0
createEffect(
  () => title(),
  value => {
    document.title = value;
  }
);
```

compute 阶段只读，不写；effect 阶段不追踪。需要订阅 store 的多个字段时，在 compute 里取值传入：

```ts
createEffect(
  () => ({ name: user.name, role: user.role }),
  v => sendAnalytics(v.name, v.role)
);
```

## Store

| Solid 1.x | Solid 2.0 |
| --- | --- |
| `setState("user", "name", v)` | `setState(d => { d.user.name = v })` |
| `setState(path, filter, value)` | draft 内普通循环 |
| `setState("key", undefined)` | `delete draft.key` |
| `produce(fn)` | 直接传 draft 回调 |
| `createMutable` / `modifyMutable` | `createStore` + draft setter |
| `unwrap(store)` | `snapshot(store)` |
| `mergeProps(...)` | `merge(...)`，`undefined` 会显式覆盖 |
| `splitProps(props, keys)` | `omit(props, keys)` |
| `setState("todos", reconcile(data))` | `setState(d => { reconcile(data, "id")(d.todos) })` |

Store 写入与 signal 同样走暂存时序。

## 控制流与 JSX

| Solid 1.x | Solid 2.0 |
| --- | --- |
| `<Suspense fallback>` | `<Loading fallback>` |
| `<ErrorBoundary fallback>` | `<Errored fallback={err => ...}>`，参数是 accessor |
| `<SuspenseList>` | `<Reveal order>` |
| `<Index>` | `<For keyed={false}>` |
| `<Context.Provider value>` | `<Context value>` |
| `<Dynamic component>` | `dynamic(() => source)`，组件在 JSX 外创建 |
| `classList={{ active }}` | `class={{ active }}` 或数组形式 |
| `use:directive` | `ref` 回调或指令工厂 |
| `on:click` / `oncapture:keydown` | `onClick` / `onKeyDown` |
| `onclick={fn}` | `onClick={fn}`，小写会被当作普通属性 |
| `attr:name` / `bool:disabled` | 普通属性与布尔存在性 |
| `/*@once*/` | 移除 |

需要原生监听器选项时，用 `ref` 回调配合 `addEventListener`。

## 异步

| Solid 1.x | Solid 2.0 |
| --- | --- |
| `createResource(source, fetcher)` | `createMemo(() => fetcher(source()))` 配合 `Loading` |
| `resource.loading` | 初始就绪用 `Loading`，变更中状态用 `isPending` |
| `resource.error` | `Errored` 边界 |
| `refetch()` | `refresh(source)` |
| `mutate()` | `action` + `createOptimistic` |
| `resource.latest` | `latest(source)` |
| `startTransition` / `useTransition` | 移除，异步计算自动形成 held update |

异步计算的输入在首次 `await` 之前读取，之后读取不建立依赖。

## 渲染与 SSR

| Solid 1.x | Solid 2.0 |
| --- | --- |
| `render` / `hydrate` 来自 `solid-js/web` | 来自 `@solidjs/web` |
| `renderToStringAsync` | `await renderToStream(() => <App />)` |
| 文档级事件委托 | 按 render root 作用域，随 root 销毁 |
| `clearDelegatedEvents` | 移除 |

`renderToString` 同步输出并对未就绪读取渲染 fallback；需要完整 HTML 时消费 `renderToStream` 的流。

## 已移除 API 速查

| 移除 | 替代 |
| --- | --- |
| `batch` | 默认批处理；同步观察用 `flush` |
| `on` | 写进 effect 的 compute 函数 |
| `onMount` | `onSettled` |
| `createComputed` | `createMemo` / `createEffect` / 函数式 `createSignal` |
| `createSelector` | `createProjection` / 函数式 `createStore` |
| `createResource` | 异步计算 + `Loading` / `Errored` |
| `createMutable` / `modifyMutable` | `createStore` + draft |
| `produce` | 直接传 draft 回调 |
| `indexArray` | `mapArray(..., { keyed: false })` |
| `resetErrorBoundaries` | 边界自身的重置回调 |
| `from` / `observable` | 异步迭代器；无标准 Observable 适配器 |
| `createDeferred` | 调度策略移到 Solid 外部（文档与源码存在版本差异） |

