# 状态与异步

## Store

`createStore` 返回只读代理与 setter，setter 接收 draft：

```ts
const [cart, setCart] = createStore({ items: [] as CartItem[], coupon: "" });

setCart(draft => {
  draft.coupon = "SAVE10";
  draft.items.push({ id: "1", name: "Mug" });
});
```

- 读取 `cart.items[0].name` 只订阅该属性。
- 直接写 `cart.coupon = x` 会被静默忽略，必须走 setter。
- 用 `map` + 展开生成新对象会改变 item 身份，导致行重建；保留原对象引用，或直接在 draft 上修改元素。
- `Map`、`Set`、`Date` 作为平台对象原样存储，不参与属性级追踪；需要更新时整体替换。

## 可写派生

函数形式创建可写派生：默认跟随上游，本地写入形成覆盖，上游变化时覆盖失效。

```ts
const [draft, setDraft] = createSignal(() => props.value);
const [form, setForm] = createStore(() => props.initial);
```

不要用“signal 复制 + effect 同步”实现同样效果。

## Projection

由其他响应式值派生出对象或数组时用 `createProjection`，它按 id 把结果 reconcile 进同一个代理，保持 item 身份。

```ts
const visible = createProjection(
  () => cart.items.filter(item => showSaved() || !item.savedForLater),
  [] as CartItem[]
);
```

- 数组投影必须给种子 `[]`。
- 默认按 `id` 匹配，可传字段名，或传 `null` 按位置匹配。
- 标量派生用 `createMemo`，不要用 projection。

## 从服务端加载

```ts
const [cart, setCart] = createStore(async () => api.cart());
```

函数形式本身就是 projection 加 setter。它不接收 draft，必须返回完整值：对象根可省略种子，数组根仍需 `[]`。
首次响应前读取方等待，`Loading` 显示 fallback；后续响应按 id reconcile，未变化的行保持 DOM 身份。给了种子不等于首次异步读取立即返回种子，除非同时声明 `seedLoadingValue`。

refetch 状态用 `isPending(() => cart.items)`。需要刷新且显示 pending 时，先 `affects(cart)` 再 `refresh(cart)`；后台刷新直接 `refresh(cart)`，它不会让 `isPending` 翻转。

## 异步计算

请求就是派生值：

```ts
const results = createMemo(async () => {
  const text = query().trim();
  if (!text) return [];
  return api.search(text);
});
```

- 输入在首次 `await` 之前读完，之后读取不建立依赖。
- 新的输入会发起新计算，被取代的旧结果自动丢弃。
- 结果稳定前保留上一次的可见内容，这是默认的 held update 行为。

不要把请求写进 effect 再用 signal 存结果：那样请求、结果、加载态是三份需要手工同步的状态。

## 边界

| 组件 | 作用 |
| --- | --- |
| `Loading` | 读取尚未就绪时显示 fallback |
| `Errored` | 捕获沿响应式图传播的错误，fallback 接收 error accessor 与 reset |
| `Reveal` | 控制同级 `Loading` 的揭示顺序：`sequential` / `together` / `natural` |

`Loading` 只需位于读取点的 owner 祖先，不必包住创建计算的位置。
一个边界可以覆盖多块读取，按设计需要选择覆盖范围。

## 位置选择

- 创建位置：越靠上，请求启动越早，越容易与其他请求并行。
- 阻塞位置：越靠下，fallback 覆盖区域越小。
- 两者独立，中间组件不需要感知异步。

组件嵌套本身不产生瀑布，只有“后一个请求读前一个请求的结果”才会。

## 更新中的状态

| 需求 | API |
| --- | --- |
| 数据正在变更 | `isPending(() => source())`，store 用 `isPending(() => store.items)` |
| 读取进行中的值 | `latest(source)`，`source` 为 accessor |
| 重新请求且标记为 pending | `affects(source)` 后 `refresh(source)` |
| 重新请求但不标记 | `refresh(source)` |

## Action

写入需要跨越异步等待时用 `action`。action 是生成器，内部普通写入在事务结束前保持挂起，乐观写入立即可见并在结束后回落。

```ts
const add = action(function* (item: CartItem) {
  setItems(list => {
    list.push({ ...item, pending: true });
  });
  yield api.add(item);
  refresh(items);
});
```

- 用 `yield` 保持事务，不要在 action 内调用 `flush()`。
- 只能在事件处理器或其他命令式作用域调用，不能在组件体或计算内调用。
- 需要等待服务端回推确认时用 `until(predicate, { timeout })`。

## 乐观更新

`createOptimistic` 用于单值，`createOptimisticStore` 用于集合：

```ts
const [todos, setTodos] = createOptimisticStore(fetchTodos, []);
```

乐观值是临时覆盖，事务结束后回落到服务端结果。
需要只让某一行的状态更新时，把标记放进该行的数据里，而不是新建全局 flag。

## 状态分层

按生命周期分层，组合使用：

1. 服务端数据：function-form `createStore` 或 projection，按 id 保持身份。
2. 每行的 UI 状态：可恢复错误、展开状态，放在行数据或局部 signal。
3. 乐观覆盖：`createOptimistic` / `createOptimisticStore`，事务结束自动清除。

不要把所有东西塞进一个全局 store，也不要为每层都建一套加载态。

## 追踪整个子树与取普通值

| 需求 | API | 行为 |
| --- | --- | --- |
| effect 需要订阅 store 的每个嵌套属性 | `deep(store)` | 在 compute 阶段使用，读取整个子树 |
| 把当前值交给非响应式代码或做序列化 | `snapshot(store)` | 不建立订阅；未变化的分支可能复用引用，不是深拷贝 |

`snapshot` 只保证得到一个非响应式的普通视图，需要隔离可变副本时自行克隆。
