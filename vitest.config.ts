import { defineConfig } from 'vitest/config';

/** 使用客户端响应式构建，并同时执行运行时与类型测试。 */
export default defineConfig({
  ssr: {
    resolve: { conditions: ['browser'] },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    server: { deps: { inline: ['solid-js'] } },
    typecheck: {
      enabled: true,
      include: ['tests/**/*.test-d.ts'],
    },
  },
});
