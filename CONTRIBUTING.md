# Contributing

感谢参与 DSH Weather Dashboard。

## 提交前检查

插件需要在 DeepSeek Harness monorepo 中验证，因为它依赖 Harness 的 client runtime、slot system、layout 和 primitives：

```sh
pnpm exec tsc -b packages/client/ui-weather/tsconfig.json
pnpm exec vitest run packages/client/ui-weather/tests
pnpm exec vitest run --coverage --coverage.include='packages/client/ui-weather/src/**/*.{ts,tsx}' packages/client/ui-weather/tests
pnpm --filter @deepseek-ai/dsh-client-ui-weather bundle
```

请保持以下约束：

- UI 通过 `shell.overlay` additive slot 注册，不替换 `root` 或其他 Shell occupant。
- 公开数据异常时必须回退示例数据，不能把不完整 provider payload 标记成实时数据。
- 外部请求必须可取消，并有固定超时。
- 保持中英文 README 同步。
- 不要提交密钥、用户数据或本地构建缓存。
