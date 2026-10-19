# 组件与 JSX

示例省略类型导入：`JSX.Element`、`Accessor`、`Setter`、`children`、`merge`、`omit` 均从 `solid-js` 导入，DOM 相关类型从 `@solidjs/web` 导入。

## 执行方式

组件函数在挂载时执行一次，负责建立响应式节点并返回 JSX。
之后的更新只重新求值读到了变更的 JSX 表达式，组件函数不会再次执行。

因此组件体内不能假设“会再跑一次”：

```tsx
function Counter() {
  const [count, setCount] = createSignal(0);
  const doubled = () => count() * 2; // 函数，不是值
  return <button onClick={() => setCount(v => v + 1)}>{count()} / {doubled()}</button>;
}
```

## Props

props 是惰性 getter，读取时才取当前值。

```tsx
// 错误：解构即快照
function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}</p>;
}

// 正确
function Greeting(props: { name: string }) {
  return <p>Hello, {props.name}</p>;
}
```

需要把 props 组合成本地名字时，默认用函数：

```tsx
const fullName = () => `${props.first} ${props.last}`;
```

多个读取方共享、计算昂贵或需要相等性边界时，才换成 `createMemo`。

需要合并默认值时用 `merge`，需要排除部分 props 时用 `omit`。

## Children

`props.children` 是惰性的 getter，只负责渲染时直接透传：

```tsx
function Panel(props: { children: JSX.Element }) {
  return <section class="panel">{props.children}</section>;
}
```

需要检查、计数或遍历 children 时，用 `children()` 解析一次并在组件体内复用结果；多处读 `props.children` 会重复创建：

```tsx
import { children } from "solid-js";

function List(props: { children: JSX.Element }) {
  const items = children(() => props.children);
  return <ul>{items.toArray().map(item => <li>{item}</li>)}</ul>;
}
```

需要把状态传给 children 时，优先用 context。

## Ref 与指令

```tsx
let input!: HTMLInputElement;
<input ref={el => (input = el)} />;
```

- ref 回调在节点创建后调用，无 owner，不能在其中创建 effect 或注册清理。
- 组件对外暴露节点用 `props.ref`，本地与外部组合用数组：`ref={[props.ref, el => (input = el)]}`。
- 需要复用元素级行为时写成指令工厂：在组件 setup 中创建响应式逻辑，返回 ref 回调保存节点。

## class

`class` 支持字符串、条件对象、嵌套数组：

```tsx
<button class={["btn", { active: selected(), pending: saving() }]}>Save</button>
```

不要使用 `classList`。

## 列表

`For` 按身份复用行，身份模式决定回调参数形状：

| 模式 | 回调参数 | 适用 |
| --- | --- | --- |
| 默认 | `(item, index)`，item 为原始值 | 数组元素本身稳定 |
| `keyed={false}` | `(item, index)`，item 为 accessor | 按位置渲染 |
| `keyed={fn}` | item 为 accessor，index 为 accessor | 数据每次都是新对象，需要按 id 匹配 |

```tsx
<For each={todos()} keyed={todo => todo.id}>
  {todo => <TodoRow todo={todo()} />}
</For>
```

行被整体重建的常见原因：每次读取都 `map` 出新对象。修法是保持对象身份，改用 keying 函数，或用 store 让更新落在原对象上。

`Repeat` 用于按位置渲染固定区间，不做 diff。

## 条件

`Show` 的 `when` 按真值判断，`0` 和空串都是假值：

```tsx
<Show when={count() !== undefined} fallback={<Empty />}>
  <span>{count()}</span>
</Show>
```

多分支用 `Switch` / `Match`。三元表达式可以用，编译器会把它编译为响应式条件。

`Show` 默认跨真值切换保留子节点；`keyed` 时按值身份重挂载。

## Context

Context 对象本身就是 Provider 组件：

```tsx
const ThemeContext = createContext<{ theme: Accessor<Theme>; setTheme: Setter<Theme> }>();

<ThemeContext value={{ theme, setTheme }}>{props.children}</ThemeContext>;
```

传递 signal 或 store，不要传裸值，否则子节点无法订阅。
不要用模块顶层 signal 作为共享状态：它没有 owner，SSR 下会在请求间泄漏。

## 动态组件

用 `dynamic` 包裹来源，组件在 JSX 外创建一次。`dynamic` 从 `@solidjs/web` 导入：

```tsx
const Comp = dynamic(() => props.as);
return <Comp {...props} />;
```

## 常见问题

| 现象 | 原因 | 修正 |
| --- | --- | --- |
| 父组件更新，子组件不变 | 子组件解构或顶层读取了 prop | 在 JSX 中读 `props.x` |
| 列表每次全量重建 | item 身份每次变化 | 稳定对象引用，或 `keyed` 按 id |
| 值为 0 时显示 fallback | `when` 真值判断 | 显式比较 |
| ref 中的清理不执行 | ref 回调无 owner | 移到 `onSettled` 或指令工厂 |
| 动态组件每次重建 | 在 JSX 内调用 `dynamic` | 在 setup 中创建一次 |
