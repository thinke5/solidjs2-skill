# 常见场景改写对照

每段给 React 原写法和 Solid 2 写法，差异点写在该段末尾。

## 1. 局部状态

```tsx
// React
const [count, setCount] = useState(0);
const doubled = count * 2;
return <button onClick={() => setCount(v => v + 1)}>{count} × 2 = {doubled}</button>;
```

```tsx
// Solid
const [count, setCount] = createSignal(0);
const doubled = () => count() * 2;
return <button onClick={() => setCount(v => v + 1)}>{count()} × 2 = {doubled()}</button>;
```

读取即订阅。`doubled` 写成函数，读取时才计算，不占用额外存储。

## 2. 对象状态

```tsx
// React
const [profile, setProfile] = useState({ name: "Ada", role: "Engineer" });
function rename(name: string) {
  setProfile(current => ({ ...current, name }));
}
```

```tsx
// Solid
const [profile, setProfile] = createStore({ name: "Ada", role: "Engineer" });
function rename(name: string) {
  setProfile(draft => {
    draft.name = name;
  });
}
```

Store 的 setter 接收 draft，直接赋值；读取 `profile.name` 只订阅该字段。

## 3. 派生值

```tsx
// React
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
```

```tsx
// Solid：单处消费
const fullName = () => `${firstName()} ${lastName()}`;
```

```tsx
// Solid：昂贵或多处消费
const fullName = createMemo(() => `${firstName()} ${lastName()}`);
```

不要写成“第二个 signal + effect 同步”，那是 React 思维残留。

## 4. 跟随 props 的可编辑值

```tsx
// React
const [previousName, setPreviousName] = useState(name);
const [draft, setDraft] = useState(name);
if (name !== previousName) {
  setPreviousName(name);
  setDraft(name);
}
```

```tsx
// Solid
const [draft, setDraft] = createSignal(() => props.name);
return <input value={draft()} onInput={e => setDraft(e.currentTarget.value)} />;
```

`createSignal` 传函数表示“可写派生”：默认取 `props.name`，用户输入后覆盖，上游变化时覆盖失效。无需任何同步逻辑。

## 5. 副作用

```tsx
// React
useEffect(() => {
  const connection = connect(roomId);
  return () => connection.close();
}, [roomId]);
```

```tsx
// Solid
createEffect(
  () => props.roomId,
  roomId => {
    const connection = connect(roomId);
    return () => connection.close();
  }
);
```

compute 返回的值传给 effect；effect 内的读取不产生依赖。清理函数由 effect 返回。

## 6. 挂载后执行

```tsx
// React
useEffect(() => {
  const observer = new IntersectionObserver(onVisible);
  observer.observe(ref.current!);
  return () => observer.disconnect();
}, []);
```

```tsx
// Solid
let node!: HTMLDivElement;
onSettled(() => {
  const observer = new IntersectionObserver(onVisible);
  observer.observe(node);
  return () => observer.disconnect();
});
return <div ref={el => (node = el)} />;
```

2.0 没有 `onMount`。`onSettled` 在首次稳定渲染后执行，返回值即清理函数。

## 7. 输入框

```tsx
// React
<input value={query} onChange={e => setQuery(e.currentTarget.value)} />
```

```tsx
// Solid
<input value={query()} onInput={e => setQuery(e.currentTarget.value)} />
```

`onChange` 在 Solid 中是原生 change 事件，输入过程中不触发。

## 8. 条件渲染

```tsx
// React
{user ? <Profile user={user} /> : <SignIn />}
```

```tsx
// Solid：三元保留
<>{user() ? <Profile user={user()!} /> : <SignIn />}</>

// Solid：需要 fallback 或值收窄
<Show when={user()} fallback={<SignIn />}>
  {currentUser => <Profile user={currentUser()} />}
</Show>
```

默认 `Show` 跨真值切换保留子节点；`keyed` 时按值身份重挂载。

## 9. 列表

```tsx
// React
{todos.map(todo => <TodoRow key={todo.id} todo={todo} />)}
```

```tsx
// Solid
<For each={todos()} keyed={todo => todo.id}>
  {todo => <TodoRow todo={todo()} />}
</For>
```

直接用 `map` 只会整体重建，行内状态丢失。按位置渲染用 `Repeat`。

## 10. Context

```tsx
// React
const ThemeContext = createContext<Theme>("light");

<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
```

```tsx
// Solid
const ThemeContext = createContext<{
  theme: Accessor<Theme>;
  setTheme: Setter<Theme>;
}>();

<ThemeContext value={{ theme, setTheme }}>{props.children}</ThemeContext>
```

Provider 就是 Context 对象本身，用 `value` 传信号而非裸值，子节点读取 `theme()` 才能订阅。

不要在模块顶层创建 signal 或 store 作为全局状态：无 owner，SSR 下跨请求共享。

## 11. ref

```tsx
// React
const input = useRef<HTMLInputElement>(null);
<input ref={input} />
<button onClick={() => input.current?.select()}>Select</button>
```

```tsx
// Solid
let input!: HTMLInputElement;
<input ref={el => (input = el)} />
<button onClick={() => input.select()}>Select</button>
```

没有 `current`，没有 `forwardRef`。组件外部传入的 ref 通过 `props.ref` 接收，可用数组组合：

```tsx
<input ref={[props.ref, el => (input = el)]} />
```

## 12. 异步数据

```tsx
// React：边界必须在挂起组件之上
function Page({ id }) {
  const userPromise = fetchUser(id);
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Profile userPromise={userPromise} />
    </Suspense>
  );
}

function Profile({ userPromise }) {
  const user = use(userPromise);
  return <article>{user.name}</article>;
}
```

```tsx
// Solid
const user = createMemo(async () => {
  const res = await fetch(`/api/users/${props.id}`);
  if (!res.ok) throw new Error("Could not load user");
  return res.json();
});

function Profile(props) {
  return <article>{props.user().name}</article>;
}

<Errored fallback={err => <p>{String(err())}</p>}>
  <Loading fallback={<p>Loading...</p>}>
    <Profile user={user} />
  </Loading>
</Errored>
```

异步 memo 仍是 accessor，`user()` 未就绪时读取点挂起。`Loading` 只需位于读取点的 owner 祖先，不必包住创建计算的位置。

## 13. 事件与属性

```tsx
// React
<button className="btn" style={{ backgroundColor: color }}>
  Save
</button>
```

```tsx
// Solid
<button class={["btn", { active: selected() }]} style={{ "background-color": color() }}>
  Save
</button>
```

`class` 支持条件对象与嵌套数组；style 用 CSS 属性名，数值需自行加单位。
