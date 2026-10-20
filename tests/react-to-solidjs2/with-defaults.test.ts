import { afterEach, describe, expect, it } from 'vitest';
import { createEffect, createMemo, createRoot, createSignal, flush, omit } from 'solid-js';
import { withDefaults } from '../../skills/react-to-solidjs2/assets/with-defaults';

const disposers: (() => void)[] = [];

afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
});

describe('默认 props 工具', () => {
  it('缺失字段与显式 undefined 使用默认值', () => {
    const props: { htmlType?: string; loading?: boolean } = { loading: undefined };
    expect(withDefaults(props, { htmlType: 'button', loading: false })).toEqual({
      htmlType: 'button',
      loading: false,
    });
  });

  it.each([null, false, 0, ''])('保留非 undefined 值 %s', (value) => {
    const props = withDefaults<{ value?: unknown }, { value: string }>({ value }, { value: '默认' });
    expect(props.value).toBe(value);
  });

  it('无默认值时保留原有属性', () => {
    const props = withDefaults({ title: '按钮', loading: undefined }, {});
    expect({ ...props }).toEqual({ title: '按钮', loading: undefined });
  });

  it('创建工具不提前读取 props 或默认值 getter', () => {
    let propReads = 0;
    let defaultReads = 0;
    const raw = { get loading() { propReads += 1; return undefined as boolean | undefined; } };
    const defaults = { get loading() { defaultReads += 1; return false; } };
    const props = withDefaults(raw, defaults);
    expect([propReads, defaultReads]).toEqual([0, 0]);
    expect(props.loading).toBe(false);
    expect([propReads, defaultReads]).toEqual([1, 1]);
  });

  it('每次读取使用原 props 作为 getter 的接收者', () => {
    const raw = { source: 'submit', get htmlType() { return this.source; } };
    const props = withDefaults(raw, { htmlType: 'button' });
    expect(props.htmlType).toBe('submit');
    raw.source = 'reset';
    expect(props.htmlType).toBe('reset');
  });

  it('仅追踪正在读取的字段，且属性变回 undefined 时恢复默认值', () => {
    const { props, observed, setTitle, setLoading } = createRoot((dispose) => {
      disposers.push(dispose);
      const [loading, setLoading] = createSignal<boolean>();
      const [title, setTitle] = createSignal('按钮');
      const props = withDefaults({
        get loading() { return loading(); },
        get title() { return title(); },
      }, { loading: false, title: '默认标题' });
      const observed: boolean[] = [];
      createEffect(() => props.loading, (value) => { observed.push(value); });
      return { props, observed, setTitle, setLoading };
    });
    flush();
    expect(observed).toEqual([false]);
    setTitle('新按钮');
    flush();
    expect(observed).toEqual([false]);
    expect(props.title).toBe('新按钮');
    setLoading(true);
    flush();
    expect(observed).toEqual([false, true]);
    setLoading(undefined);
    flush();
    expect(observed).toEqual([false, true, false]);
  });

  it('默认值 getter 仅在原属性为 undefined 时参与追踪', () => {
    const { result, setFallback, setValue, count } = createRoot((dispose) => {
      disposers.push(dispose);
      const [value, setValue] = createSignal<string>();
      const [fallback, setFallback] = createSignal('默认');
      const props = withDefaults({ get value() { return value(); } }, {
        get value() { return fallback(); },
      });
      let computations = 0;
      const result = createMemo(() => { computations += 1; return props.value; });
      return { result, setFallback, setValue, count: () => computations };
    });
    flush();
    expect(result()).toBe('默认');
    setFallback('新默认');
    flush();
    expect(result()).toBe('新默认');
    setValue('用户值');
    flush();
    const before = count();
    setFallback('未使用默认');
    flush();
    expect(result()).toBe('用户值');
    expect(count()).toBe(before);
    setValue(undefined);
    flush();
    expect(result()).toBe('未使用默认');
  });

  it('与 omit 组合保留剩余属性的实时读取', () => {
    const { props, rest, result, setTitle } = createRoot((dispose) => {
      disposers.push(dispose);
      const [title, setTitle] = createSignal('按钮');
      const props = withDefaults({ loading: undefined as boolean | undefined,
        get title() { return title(); },
      }, { loading: false });
      const rest = omit(props, 'loading');
      const result = createMemo(() => rest.title);
      return { props, rest, result, setTitle };
    });
    flush();
    expect(Object.keys(rest)).toEqual(['title']);
    expect(result()).toBe('按钮');
    setTitle('新按钮');
    flush();
    expect(result()).toBe('新按钮');
    expect({ ...props }).toEqual({ loading: false, title: '新按钮' });
  });

  it('对象与函数默认值按引用返回，不调用函数', () => {
    let calls = 0;
    const callback = () => { calls += 1; };
    const options = { delay: 100 };
    const raw: { callback?: () => void; options?: { delay: number } } = {};
    const props = withDefaults(raw, { callback, options });
    expect(props.callback).toBe(callback);
    expect(props.options).toBe(options);
    expect(calls).toBe(0);
  });

  it('默认对象在每次调用时创建可保持实例独立', () => {
    const first = withDefaults<{ options?: { delay: number } }, { options: { delay: number } }>(
      {}, { options: { delay: 100 } },
    );
    const second = withDefaults<{ options?: { delay: number } }, { options: { delay: number } }>(
      {}, { options: { delay: 100 } },
    );
    expect(first.options).not.toBe(second.options);
  });

  it('每次创建独立视图，不向原 props 写入默认值', () => {
    const first: { loading?: boolean } = {};
    const second: { loading?: boolean } = {};
    const a = withDefaults(first, { loading: false });
    const b = withDefaults(second, { loading: true });
    expect(a.loading).toBe(false);
    expect(b.loading).toBe(true);
    expect(first).toEqual({});
    expect(second).toEqual({});
  });
});
