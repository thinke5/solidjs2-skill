# React → SolidJS 2 API 对照

以 SolidJS 2.0 为准。2.0 移除了 1.x 的部分 API，参考 1.x 文档会得到错误结论。
1.x 与 2.0 的完整差异见 `references/solid-1-vs-2.md`，本表只列 React 侧的对应关系。

## 状态与派生

| React                           | SolidJS 2                                 | 说明                                    |
| ------------------------------- | ----------------------------------------- | --------------------------------------- |
| `useState(0)`                   | `createSignal(0)`                         | 返回 `[get, set]`，读取必须调用 `get()` |
| `setCount(v => v + 1)`          | `setCount(v => v + 1)`                    | 同名签名，函数式更新保留                |
| `useState` 存对象               | `createStore({ ... })`                    | 按属性订阅，setter 接收 draft           |
| `useReducer`                    | `createSignal` + 纯函数，或 `createStore` | Solid 无 reducer 机制，直接调函数       |
| `useMemo(fn, deps)`             | `createMemo(fn)`                          | 无依赖数组，读取自动追踪                |
| `useMemo` 小派生                | 普通函数 `const x = () => a() + b()`      | 调用方作用域负责追踪                    |
| `useCallback(fn, deps)`         | 普通函数                                  | setup 内函数本身已稳定           |
| `useRef(initial)`（不改响应式） | `let value = initial`                     | 普通闭包变量即可                        |
| `useRef` 存可变状态             | `createSignal`                            | 需要更新 UI 时用 signal                 |
| `useContext(Ctx)`               | `useContext(Ctx)`                         | 同名同用途                              |
| `createContext(default)`        | `createContext(default)`                  | 无默认值时，脱离 Provider 读取会抛错    |
| `<Ctx.Provider value={v}>`      | `<Ctx value={v}>`                         | Context 对象自身即 Provider 组件        |

## 副作用与生命周期

| React                  | SolidJS 2                           | 说明                                       |
| ---------------------- | ----------------------------------- | ------------------------------------------ |
| `useEffect(fn, [])`    | `onSettled(fn)`                     | 首次稳定渲染后执行，含 pending 异步读取；返回值即清理 |
| `useEffect(fn, [dep])` | `createEffect(() => dep(), effect)` | compute 追踪依赖，effect 执行副作用        |
| `useEffect` 清理函数   | effect 函数返回值                   | 下次执行前或销毁时调用                     |
| `useLayoutEffect`      | 无等价项                            | 读节点用 ref 回调；需节点已进入文档再初始化用 `onSettled` |
| `componentDidMount`    | `onSettled`                         | 2.0 无 `onMount`                           |
| `componentWillUnmount` | `onSettled` 返回的清理函数          | 组件体内不直接调用 `onCleanup`             |
| `componentDidUpdate`   | `createEffect`                      | 与首次执行合流，需要区分时在 effect 内判断 |
| `useSyncExternalStore` | 无等价 API                          | 在 effect 中订阅外部源并写入 signal，返回取消函数 |

## 组件与引用

| React                 | SolidJS 2                              | 说明                         |
| --------------------- | -------------------------------------- | ---------------------------- |
| 解构 props            | 保留 `props.xxx`                       | 解构会丢失响应性             |
| `children`            | `props.children`                       | Solid 中是惰性 getter        |
| `forwardRef`          | `props.ref`                            | 2.0 直接把 `ref` 当普通 prop |
| `ref={refObj}`        | `ref={el => ...}` 或 `ref={letVar}`    | 无 `current` 属性            |
| `useImperativeHandle` | 无对应                                 | ref 数组只组合 DOM 元素；命令式对象用普通回调 prop 显式传递 |
| `React.memo`          | 无对应                                 | 不存在重渲染，无需包裹       |
| `React.lazy`          | `lazy`（`solid-js`）                   | 加载态交给 `Loading` 处理，不限于路由 |
| `React.Fragment`      | `<>...</>`                             | 语法一致                     |
| `useId`               | `createUniqueId`                       | SSR 与客户端一致             |

## 渲染结构

| React                              | SolidJS 2                                            | 说明                                 |
| ---------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| `cond && <A />`                    | 保留，或用 `<Show when={cond} fallback={...}>`       | 编译器把三元/短路编译为响应式条件    |
| `<Show>` 子节点                    | 函数子节点接收 narrowed accessor                     | `keyed` 时传原始值并重挂载           |
| `arr.map(x => <Row key={x.id} />)` | `<For each={arr()} keyed={x => x.id}>`               | `map` 可用但会整体重建               |
| `<For>` 回调参数                   | 默认 `(item, index)`：item 为原始值、index 为 accessor；`keyed={false}` 时 item 为 accessor | 三种 keying 模式参数形状不同 |
| `<Suspense fallback>`              | `<Loading fallback>`                                 | 按读取点判定就绪                     |
| `<ErrorBoundary fallback>`         | `<Errored fallback={err => ...}>`                    | 错误沿响应式图传播                   |
| `<SuspenseList>`                   | `<Reveal order="sequential \| together \| natural">` | 仅控制揭示顺序                       |
| `createPortal`                     | `Portal`（`@solidjs/web`）                           | 导入路径不同                         |

## JSX 与 DOM

| React                         | SolidJS 2                             | 说明                                           |
| ----------------------------- | ------------------------------------- | ---------------------------------------------- |
| `className`                   | `class`                               | 支持字符串、条件对象、嵌套数组                 |
| `htmlFor`                     | `for`                                 |                                                |
| `onChange`（输入框）          | `onInput`                             | 原生 change 时机随控件而定                   |
| `SyntheticEvent`              | 原生 `Event`                          | 无合成事件层，`currentTarget` 有类型           |
| `event.currentTarget.value`   | 同左                                  |                                                |
| `style={{ backgroundColor }}` | `style={{ "background-color": ... }}` | 用 CSS 属性名，数值不加单位                    |
| `dangerouslySetInnerHTML`     | `innerHTML`                           | 只用于可信内容                                 |
| `{text}` 子节点               | `textContent={text}`                  | 需要纯文本转义时更明确                         |
| `key` 属性                    | 移除语义                              | 行身份由 `For` 的 keying 决定                  |

## 异步与并发

| React                        | SolidJS 2                      | 说明                                 |
| ---------------------------- | ------------------------------ | ------------------------------------ |
| `async` 组件 / `use()`       | `createMemo(async () => ...)`  | 异步 memo 仍是 accessor              |
| `useTransition`              | 无显式 API                     | 下游有异步计算时自动成为 held update |
| `isPending`（useTransition） | `isPending(() => ...)`         | 读取挂起状态                         |
| `startTransition`            | 无对应                         | 同一同步调用栈的写入自动合并         |
| `useDeferredValue`           | 待核实                         | 官方迁移指南未列出等价项             |
| `useActionState`             | `action` + 乐观状态            | 契约不同，不能逐行替换               |

## 无需迁移

以下 React 概念在 Solid 2 中没有对应物，直接删除即可：

- `React.memo`、`shouldComponentUpdate`
- `useCallback` / `useMemo` 用于稳定引用的部分
- `StrictMode` 的双次调用约束
- 依赖数组
- `key` 属性（列表身份改用 `For` 的 keying；用于重置子树的 `key` 需显式表达）
- 合成事件系统
