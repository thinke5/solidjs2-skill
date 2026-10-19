# 反模式目录

## 1. effect 写回派生状态

```tsx
// 错误
const [subtotal, setSubtotal] = createSignal(0);
createEffect(
  () => cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
  total => {
    setSubtotal(total);
  }
);
```

表现：修改数量后，小计慢一帧更新。
诊断：`[EFFECT_RELAY_TEAR]`。
修正：

```tsx
const subtotal = () => cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
```

## 2. 组件体顶层读取

```tsx
// 错误
function Total() {
  const total = cart.items.length;
  return <p>{total}</p>;
}
```

表现：只渲染一次，后续不更新。
诊断：`[STRICT_READ_UNTRACKED]`。
修正：

```tsx
function Total() {
  return <p>{cart.items.length}</p>;
}
```

## 3. 解构 props

```tsx
// 错误
function Greeting({ name }: { name: string }) {
  return <p>{name}</p>;
}
```

表现：父组件更新 name，子组件不变。
修正：

```tsx
function Greeting(props: { name: string }) {
  return <p>{props.name}</p>;
}
```

需要组合多个 props 时写派生函数；多个读取方共享时再包 `createMemo`。

## 4. 用 signal 当事件开关

```tsx
// 错误
const [submitted, setSubmitted] = createSignal(false);
createEffect(() => submitted(), flag => {
  if (flag) api.save(snapshot(draft));
});
<button onClick={() => setSubmitted(true)}>Save</button>;
```

表现：第二次点击无效，同一个值不重复通知。
修正：

```tsx
const save = action(function* () {
  yield api.save(snapshot(draft));
});
<button onClick={() => void save()}>Save</button>;
```

## 5. effect 里读取依赖

```ts
// 错误
createEffect(
  () => subtotal(),
  amount => {
    const widget = payments.mount(el, { amount, currency: currency() });
    return () => widget.unmount();
  }
);
```

表现：切换币种不重新执行。
修正：

```ts
createEffect(
  () => ({ amount: subtotal(), currency: currency() }),
  ({ amount, currency }) => {
    const widget = payments.mount(el, { amount, currency });
    return () => widget.unmount();
  }
);
```

## 6. 请求写在 effect 里

```ts
// 错误
const [results, setResults] = createSignal([]);
const [loading, setLoading] = createSignal(false);
createEffect(() => query(), text => {
  setLoading(true);
  api.search(text).then(found => {
    setResults(found);
    setLoading(false);
  });
});
```

表现：快速输入时旧请求覆盖新结果，加载态错乱。
修正：

```tsx
const results = createMemo(async () => api.search(query()));

<Errored fallback={err => <p>{String(err())}</p>}>
  <Loading fallback={<p>Searching…</p>}>
    <For each={results()}>{item => <Row item={item} />}</For>
  </Loading>
</Errored>;
```

## 7. map 渲染响应式列表

```tsx
// 错误
{todos().map(todo => <TodoRow todo={todo} />)}
```

表现：映射表达式每次重算都会重建所有行，行内输入框失焦。
修正：

```tsx
<For each={todos()} keyed={t => t.id}>
  {todo => <TodoRow todo={todo()} />}
</For>
```

`keyed` 传函数时，回调参数是 accessor，需要加括号读取。

## 8. 直接写 store

```ts
// 错误
cart.coupon = "SAVE10";
```

表现：无报错，值不变。
修正：`setCart(draft => { draft.coupon = "SAVE10"; })`。

## 9. Show 的真值陷阱

```tsx
// 错误
<Show when={count()} fallback={<Empty />}>...</Show>
```

表现：count 为 0 时显示 fallback。
修正：`when={count() !== undefined}`。注意 `Match` 的 `when` 同样按真值判断，换组件不能解决问题。

## 10. ref 回调里创建响应式节点

```tsx
// 错误：ref 回调没有 owner
<div ref={el => {
  createEffect(
    () => el,
    node => {
      const observer = new ResizeObserver(onResize);
      observer.observe(node);
      return () => observer.disconnect();
    }
  );
}} />
```

表现：effect 永不执行清理，组件销毁后仍在运行。
修正：

```tsx
let node!: HTMLDivElement;

onSettled(() => {
  const observer = new ResizeObserver(onResize);
  observer.observe(node);
  return () => observer.disconnect();
});

return <div ref={el => (node = el)} />;
```

## 11. 模块顶层共享状态

```ts
// 错误
export const [theme, setTheme] = createSignal("light");
```

表现：无 owner，无法随组件树销毁；SSR 下所有请求共享同一实例。
修正：

```tsx
const ThemeContext = createContext<ThemeContextValue>();

function App() {
  const [theme, setTheme] = createSignal<Theme>("light");
  return <ThemeContext value={{ theme, setTheme }}>{/* ... */}</ThemeContext>;
}
```

## 12. await 之后读输入

```ts
// 错误
const profile = createMemo(async () => {
  const user = await fetchUser(id());
  return { user, canEdit: permissions().includes("edit") };
});
```

表现：`permissions` 变化不触发重算。若晚读的源本身尚未就绪，开发版会抛错交给 `Errored`，生产版可能一直挂起且无法重试。
修正：

```ts
const profile = createMemo(async () => {
  const canEdit = permissions().includes("edit");
  const user = await fetchUser(id());
  return { user, canEdit };
});
```

## 13. 在 memo 内写入

```ts
// 错误
const total = createMemo(() => {
  const sum = items.reduce(...);
  setSummary(sum);
  return sum;
});
```

表现：抛出 `[REACTIVE_WRITE_IN_OWNED_SCOPE]`。
修正：

```ts
const total = createMemo(() => items.reduce((sum, item) => sum + item.price, 0));
```

下游需要这个值时直接读取 `total()`。

## 14. 无差别使用 memo

```ts
// 过度
const fullName = createMemo(() => `${props.first} ${props.last}`);
return <p>{fullName()}</p>; // 只有这一个读取方
```

表现：多一个节点和一次比较，没有收益。
修正：

```tsx
const fullName = () => `${props.first} ${props.last}`;
return <p>{fullName()}</p>;
```

## 15. 用 untrack 掩盖问题

```ts
// 错误：依赖被 untrack 屏蔽
createEffect(
  () => untrack(() => props.value),
  value => doWork(value)
);
```

表现：依赖丢失，更新不触发；单参数调用则直接报 `[MISSING_EFFECT_FN]`。
修正：`untrack` 只用于明确的一次性读取；需要响应式就把读取放在追踪作用域内。

## 排查顺序

1. 看开发诊断标识，定位到具体作用域。
2. 判断属于读（位置不对）还是写（时序不对）：读的问题移入追踪作用域，写的问题改为派生或事件。
