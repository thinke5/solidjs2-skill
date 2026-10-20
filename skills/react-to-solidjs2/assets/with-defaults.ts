import { merge } from 'solid-js';

/** 默认字段必选；保留原属性的非 undefined 类型及默认值类型。 */
export type WithDefaults<P extends object, D extends Partial<P>> = Omit<P, keyof D> & {
  [K in keyof P & keyof D]-?: Exclude<P[K], undefined> | D[K];
};

/** 创建逐属性默认值视图，仅在原属性为 undefined 时读取默认值。 */
export function withDefaults<P extends object, const D extends Partial<P>>(
  props: P,
  defaults: D & Record<Exclude<keyof D, keyof P>, never>,
): WithDefaults<P, D> {
  const overrides = Object.create(null);
  for (const key of Object.keys(defaults) as (keyof P & keyof D)[]) {
    Object.defineProperty(overrides, key, {
      enumerable: true,
      get() {
        const value = props[key];
        return value === undefined ? defaults[key] : value;
      },
    });
  }
  return merge(props, overrides) as WithDefaults<P, D>;
}
