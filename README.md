# DSH Weather Dashboard

[English](README.md) | [中文](README.zh.md)

A polished weather dashboard plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI.

## Features

- Switch between Shanghai, Beijing, Shenzhen, Tokyo, London, and New York.
- Show current temperature, feels-like temperature, humidity, wind, visibility, pressure, and direction.
- Render an accessible eight-hour temperature trend chart.
- Show a five-day forecast with high/low temperatures and precipitation probability.
- Start with a visible dashboard and collapse it into a compact weather pill.
- Keep the overlay click-through except for its controls, so it does not block the shell.
- Use Open-Meteo without an API key.
- Fall back to deterministic sample data when the provider fails, times out, or returns invalid data.
- Cancel superseded requests and enforce a ten-second timeout.
- Use city-timezone calendar dates, including DST-safe fallback dates.

## Install in a DeepSeek Harness checkout

This repository contains the standalone plugin source. The supported runtime is the DeepSeek Harness monorepo because the plugin composes through its `shell.overlay` slot and imports the Harness client packages.

The repository declares a `dsh.bundle` manifest and ships `cordis.patch.yml`, so it can be installed with the normal bundle command:

```sh
dsh plugin --profile web add github:mercy719/dsh-client-ui-weather
```

For source development, copy or vendor this directory as `packages/client/ui-weather`, then add the package to the Web bundle roster:

```yaml
# packages/bundle/web-app/cordis.patch.yml
- id: ui-weather
  name: '@deepseek-ai/dsh-client-ui-weather'
```

Add the workspace dependency to `packages/bundle/web-app/package.json`, add the TypeScript project reference, and build the package:

```sh
pnpm exec tsc -b packages/client/ui-weather/tsconfig.json
pnpm --filter @deepseek-ai/dsh-client-ui-weather bundle
pnpm run test:gui
```

The package manifest's `dsh.client.inject` list records package-level bundle/artifact dependencies for the boot graph and watcher. The browser entry separately declares the actual Cordis service dependency, `export const inject = ['slots']`.

## Data source and privacy

The browser requests public forecast data from [Open-Meteo](https://open-meteo.com/). No API key, host credential, model input, session event, or durable state is involved. The selected city and expanded/collapsed state reset on reload.

## Model Experience

### Weather dashboard

#### What the model sees

None. The plugin is a human-facing weather projection and does not alter prompts, messages, tools, model requests, or session logs.

#### Token effect

None; weather data is not added to model context.

#### KV Cache effect

None; the plugin does not assemble or send provider requests.

## Known Limitations and Deferred Work

- **Public provider only** — deployments that need private credentials, server-side caching, or a rate-limit policy should replace the injected request capability with a host-owned weather service.
- **No persistence** — the city and expanded/collapsed state reset after reload.
- **No automatic polling** — refresh is explicit to avoid unbounded timers and duplicate requests across browser tabs.

## License

MIT. See [LICENSE](LICENSE).
