import { expectTypeOf, it } from 'vitest';
import { withDefaults } from '../../skills/react-to-solidjs2/assets/with-defaults';

it('非 undefined 默认值使字段必选，保留属性联合类型与 null', () => {
  const raw: { htmlType?: 'button' | 'submit'; label?: string | null; title?: string } = {};
  const props = withDefaults(raw, { htmlType: 'button', label: '默认' });
  expectTypeOf(props.htmlType).toEqualTypeOf<'button' | 'submit'>();
  expectTypeOf(props.label).toEqualTypeOf<string | null>();
  expectTypeOf(props.title).toEqualTypeOf<string | undefined>();
  expectTypeOf(props).toExtend<{ htmlType: 'button' | 'submit'; label: string | null }>();
});

it('默认值为 undefined 时不错误消除 undefined', () => {
  const raw: { loading?: boolean } = {};
  const props = withDefaults(raw, { loading: undefined });
  expectTypeOf(props.loading).toEqualTypeOf<boolean | undefined>();
});

it('拒绝类型不匹配或未知字段的默认值', () => {
  const raw: { loading?: boolean } = {};
  // @ts-expect-error 默认值必须符合属性类型。
  withDefaults(raw, { loading: '错误' });
  // @ts-expect-error 不接受 props 未声明的默认字段。
  withDefaults(raw, { unknown: true });
});
