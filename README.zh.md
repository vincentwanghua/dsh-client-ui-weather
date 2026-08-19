# DSH 天气看板

[English](README.md) | 中文

一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI 的天气看板插件。

## 功能

- 支持上海、北京、深圳、东京、伦敦和纽约切换。
- **搜索并添加任意城市**：输入城市名（中英文均可），从 Open-Meteo 地理编码结果中选择后加入下拉列表，自定义城市持久化到 localStorage。
- **移除城市**：展开城市菜单后每个城市右侧有 ✕ 按钮，自定义城市直接删除、内置城市移入隐藏列表（菜单底部可一键"恢复默认城市"）。
- 展示当前温度、体感、湿度、风速、能见度、气压和风向。
- 提供无障碍的未来 8 小时温度趋势图。
- 提供未来 5 日最高/最低温度和降水概率。
- 默认展开显示，可收起为紧凑天气胶囊。
- 除控件外点击穿透，不阻塞 Shell 其他操作。
- 使用无需 API key 的 Open-Meteo 公共接口。
- provider 失败、超时或数据无效时回退到确定性示例数据。
- 新请求会取消旧请求，并带有十秒超时。
- 使用城市时区生成日期，兼容 DST 夏令时切换。

## 在 DeepSeek Harness checkout 中安装

本仓库包含独立插件源码。插件通过 Harness 的 `shell.overlay` slot 组合，并依赖 Harness client packages，因此推荐在 DeepSeek Harness monorepo 中使用。

仓库声明了 `dsh.bundle` manifest 并包含 `cordis.patch.yml`，可以使用标准 bundle 命令安装：

```sh
dsh plugin --profile web add github:mercy719/dsh-client-ui-weather
```

进行源码开发时，将本目录复制或 vendor 到 `packages/client/ui-weather`，然后加入 Web bundle roster：

```yaml
# packages/bundle/web-app/cordis.patch.yml
- id: ui-weather
  name: '@deepseek-ai/dsh-client-ui-weather'
```

在 `packages/bundle/web-app/package.json` 增加 workspace dependency，加入 TypeScript project reference，然后构建：

```sh
pnpm exec tsc -b packages/client/ui-weather/tsconfig.json
pnpm --filter @deepseek-ai/dsh-client-ui-weather bundle
pnpm run test:gui
```

包清单中的 `dsh.client.inject` 记录 boot graph 和 watcher 使用的包级 bundle/artifact 依赖；浏览器入口则单独声明实际使用的 Cordis service：`export const inject = ['slots']`。

## 数据来源和隐私

浏览器请求 [Open-Meteo](https://open-meteo.com/) 公共预报数据。不需要 API key、宿主凭据，不新增模型输入、会话事件或持久化状态。刷新页面后城市和展开/收起状态会恢复默认值。

## 模型体验

### 天气看板

#### 模型看到的内容

无。本插件只为人展示天气数据，不修改 prompt、消息、工具、模型请求或会话日志。

#### Token 影响

无；天气数据不会加入模型上下文。

#### KV Cache 影响

无；本插件不组装或发送 provider 请求。

## 已知限制与暂缓事项

- **仅支持公共接口**：如果部署需要私有凭据、服务端缓存或限流策略，应将注入的请求能力替换为宿主天气服务。
- **不持久化**：刷新页面后城市和展开/收起状态会恢复默认值。
- **不自动轮询**：刷新需要显式点击，避免无限计时器和多标签页重复请求。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
