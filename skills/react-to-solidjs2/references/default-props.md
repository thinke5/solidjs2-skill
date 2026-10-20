# 默认 props 工具

## 使用条件

多个字段或组件需要统一默认值时，复制 `../assets/with-defaults.ts` 到目标项目的工具目录。
少量单次使用的默认值可直接判断 `props.x === undefined`，不必引入工具。

`withDefaults` 是本 skill 的工具模板，不是 SolidJS 官方 API。
运行时只依赖 `solid-js` 2.x；模板使用 TypeScript 5.0+ 的 const 类型参数。

## 默认值规则

| 输入属性                       | 返回值   |
| ------------------------------ | -------- |
| 未传入或为 `undefined`         | 默认值   |
| `null`、`false`、`0`、空字符串 | 原属性值 |
| 其他已传值                     | 原属性值 |

不要直接用 `merge(defaults, props)` 替换 React 解构默认值。
SolidJS 2 的 `merge` 会让显式 `undefined` 覆盖默认值。
也不要用 `??` 模拟解构默认值；它会额外将 `null` 替换为默认值。

## 改前与改后

```tsx
// React
/** 使用解构默认值渲染按钮。 */
function Button({
  loading = false,
  danger = false,
  ghost = false,
  block = false,
  htmlType = 'button',
}: ButtonProps) {
  return <button type={htmlType} disabled={loading}>保存</button>;
}
```

```tsx
// Solid：工具已复制到目标项目的工具目录。
import { withDefaults } from '../_util/with-defaults';

/** 合并默认值后渲染按钮。 */
function Button(rawProps: ButtonProps) {
  const props = withDefaults(rawProps, {
    loading: false,
    danger: false,
    ghost: false,
    block: false,
    htmlType: 'button',
  });
  return <button type={props.htmlType} disabled={props.loading}>保存</button>;
}
```

示例的 `ButtonProps.loading` 为 `boolean | undefined`。
真实组件允许 loading 配置对象时，继续交给原有 loading 解析逻辑，不直接绑定 DOM disabled。

## 响应式与类型

- 每个默认字段通过 getter 读取 `rawProps[key]`，仅该值为 `undefined` 时读取默认值。
- `merge(rawProps, getterOverrides)` 组合实时视图，不复制 props 值，不增加 signal 或 effect。
- 继续使用 `props.x`；不要解构或用 `{ ...props }` 保存响应式属性。
- 非 `undefined` 默认值使字段必选并去除该字段的 `undefined`；保留原联合类型与 `null`。
- 默认值本身可能为 `undefined` 时，返回类型也保留 `undefined`。

默认值对象使用固定的可枚举字符串键；工具只在创建时建立这些字段的 getter。
默认值中的对象和函数按引用返回，不克隆，也不将函数当工厂调用。
需要实例独立的可变默认对象时，在每个组件调用时创建，不使用共享模块常量。

组件专用属性仍用 `omit` 从 DOM 转发视图中排除：

```tsx
const rest = omit(props, 'loading', 'danger', 'ghost', 'block', 'htmlType');
<button {...rest} type={props.htmlType} />;
```


