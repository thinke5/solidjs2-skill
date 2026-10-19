# 响应式规则

## 追踪作用域

依赖记录发生在活跃的追踪计算中，常见入口：

| 位置 | 何时追踪 |
| --- | --- |
| JSX 表达式 | 每次求值 |
| `createMemo` 的函数 | 每次重算 |
| `createEffect` 的 compute 函数 | 每次重跑 |
| 异步计算的同步段 | 首次 `await` 之前 |

其他位置读到的是当前值，不建立订阅：组件体、事件处理器、effect 函数、`untrack` 内的代码。

```tsx
const [count, setCount] = createSignal(0);

// 错误：组件体只执行一次
const doubled = count() * 2;

// 正确：读取发生在调用方的追踪作用域
const doubled = () => count() * 2;
```

## 派生

默认写函数。函数没有自己的状态，在哪个作用域被调用就在哪里追踪。

同步派生只在三种情况下改用 `createMemo`：

1. 多个读取方共享同一结果。
2. 计算开销明显。
3. 需要相等性边界，结果不变时阻断下游更新。

```tsx
const subtotal = createMemo(() => quantity() * price);
const discount = createMemo(() => (code() === "SAVE10" ? 0.1 : 0));
const total = createMemo(() => subtotal() * (1 - discount()));
```

用户从 `SAVE` 输入到 `SAVE1` 时，`discount` 重算结果仍是 `0`，相等判断使 `total` 不重算；输入到 `SAVE10` 时结果变为 `0.1`，`total` 正常重算。

memo 的函数不得写入 signal 或 store。写入会抛 `[REACTIVE_WRITE_IN_OWNED_SCOPE]`。
想写出去的值本身就是派生值，直接返回它。

memo 的函数可以是 async。首次尚无结果时读取方等待，最近的 `Loading` 显示 fallback；已有结果时保留旧内容，直到新结果就绪。

## Effect

`createEffect` 有两个阶段：

```ts
createEffect(
  () => ({ amount: subtotal(), currency: currency() }),
  ({ amount, currency }) => {
    const widget = payments.mount(element, { amount, currency });
    return () => widget.unmount();
  }
);
```

- compute 阶段：追踪，只读，返回值传给 effect。
- effect 阶段：不追踪，执行命令式操作，可返回清理函数。
- compute 收到上一个返回值，首次为 `undefined`。
- compute 遇到未就绪的异步值时，effect 会等它稳定后执行。

effect 函数里读取的 signal 不会让 effect 重跑。
所有输入必须在 compute 阶段读出来，并随返回值一起传递。

## 写入时序

写入被暂存，在当前同步代码结束后由微任务统一提交。

```ts
setCount(3);
count(); // 仍是旧值
flush();
count(); // 3
```

同一次事件处理器内的多次写入合并为一次更新。
一次提交内，先执行所有受影响的 compute 函数，再执行 effect 函数。
因此 effect 里的写入属于下一轮，读取该写入的组件会慢一拍——这正是“派生用 effect 写回”导致撕裂的原因。

`flush()` 只用于测试或必须在当前栈观察结果的命令式集成。

## Owner 与清理

owner 决定响应式节点的生命周期。组件、memo、effect 都会创建 owner。

| 场景 | 做法 |
| --- | --- |
| 组件挂载后的初始化和清理 | `onSettled` 内初始化，返回清理函数 |
| 自定义 primitive 内部的清理 | 建立时调用 `onCleanup` |
| effect 的清理 | 由 effect 函数返回 |
| ref 回调里的清理 | 不允许，ref 回调无 owner |

```tsx
onSettled(() => {
  const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
  observer.observe(element);
  return () => observer.disconnect();
});
```

`onSettled` 只执行一次，等待当前 owner 范围内的异步读取全部稳定、队列清空后运行。
回调内的读取不追踪。

ref 回调只负责把节点交出来。需要响应式初始化时，在组件 setup 中创建 primitive，ref 回调只保存节点。

## 常见问题

| 现象 | 原因 | 修正 |
| --- | --- | --- |
| 值慢一拍 | effect 写入派生 signal | 改成派生函数或 memo |
| effect 每次执行两遍 | effect 写回了自己读取的源 | 写入改为 memo，或改在源头写 |
| signal 变了 effect 不重跑 | 依赖在 effect 函数里读取 | 移到 compute 阶段 |
| 组件内取值不更新 | 在组件体顶层读取 | 移入 JSX 或计算 |
| 清理不执行 | 在 ref 回调或无 owner 作用域注册 | 移到组件 setup 的 `onSettled` |
| memo 抛写入错误 | memo 内调用了 setter | 返回派生值，不写入 |

## 诊断

开发模式会给出下列提示，不要屏蔽：

| 标识 | 含义 |
| --- | --- |
| `[STRICT_READ_UNTRACKED]` | 在非追踪作用域读取了响应式值 |
| `[REACTIVE_WRITE_IN_OWNED_SCOPE]` | 在组件体、memo 等 owned 作用域写入 |
| `[EFFECT_RELAY_TEAR]` | effect 把 compute 结果写回 signal，等于延迟一拍的派生 |
| `[EFFECT_WRITES_OWN_SOURCE]` | effect 写入了自己依赖的源 |
