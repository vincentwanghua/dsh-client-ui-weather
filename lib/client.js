window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-weather",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/weather-data.ts
		/** Cities offered by the dashboard selector. */
		const WEATHER_CITIES = [
			{
				id: "shanghai",
				name: "上海",
				country: "中国",
				latitude: 31.23,
				longitude: 121.47,
				timezone: "Asia/Shanghai"
			},
			{
				id: "beijing",
				name: "北京",
				country: "中国",
				latitude: 39.9,
				longitude: 116.4,
				timezone: "Asia/Shanghai"
			},
			{
				id: "shenzhen",
				name: "深圳",
				country: "中国",
				latitude: 22.54,
				longitude: 114.06,
				timezone: "Asia/Shanghai"
			},
			{
				id: "tokyo",
				name: "东京",
				country: "日本",
				latitude: 35.68,
				longitude: 139.65,
				timezone: "Asia/Tokyo"
			},
			{
				id: "london",
				name: "伦敦",
				country: "英国",
				latitude: 51.51,
				longitude: -.13,
				timezone: "Europe/London"
			},
			{
				id: "new-york",
				name: "纽约",
				country: "美国",
				latitude: 40.71,
				longitude: -74.01,
				timezone: "America/New_York"
			}
		];
		/** Default city shown on the first render. */
		const DEFAULT_CITY = WEATHER_CITIES[0];
		/** localStorage key holding user-added cities (custom city support). */
		const CUSTOM_CITIES_KEY = "dsh-weather.custom-cities";
		/** Read user-added cities from localStorage; malformed data is ignored. */
		function loadCustomCities() {
			try {
				const raw = globalThis.localStorage?.getItem(CUSTOM_CITIES_KEY);
				if (!raw) return [];
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return [];
				return parsed.filter((city) => city && typeof city.id === "string" && typeof city.name === "string" && Number.isFinite(city.latitude) && Number.isFinite(city.longitude) && typeof city.timezone === "string");
			} catch {
				return [];
			}
		}
		/** Persist user-added cities; storage failures are silently ignored. */
		function saveCustomCities(cities) {
			try {
				globalThis.localStorage?.setItem(CUSTOM_CITIES_KEY, JSON.stringify(cities));
			} catch {
			}
		}
		/** localStorage key holding built-in city ids hidden by the user. */
		const HIDDEN_BUILTIN_KEY = "dsh-weather.hidden-builtin";
		/** Read hidden built-in city ids; malformed data is ignored. */
		function loadHiddenBuiltinIds() {
			try {
				const raw = globalThis.localStorage?.getItem(HIDDEN_BUILTIN_KEY);
				if (!raw) return [];
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return [];
				return parsed.filter((id) => typeof id === "string" && WEATHER_CITIES.some((city) => city.id === id));
			} catch {
				return [];
			}
		}
		/** Persist hidden built-in city ids; storage failures are silently ignored. */
		function saveHiddenBuiltinIds(ids) {
			try {
				globalThis.localStorage?.setItem(HIDDEN_BUILTIN_KEY, JSON.stringify(ids));
			} catch {
			}
		}
		/** localStorage key holding the dashboard's dragged position. */
		const DRAG_POSITION_KEY = "dsh-weather.drag-position";
		/** Read the dragged position; malformed data is ignored. */
		function loadDragPosition() {
			try {
				const raw = globalThis.localStorage?.getItem(DRAG_POSITION_KEY);
				if (!raw) return null;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return null;
				const left = parsed.left;
				const top = parsed.top;
				if (typeof left !== "number" || typeof top !== "number") return null;
				if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
				return { left, top };
			} catch {
				return null;
			}
		}
		/** Persist the dragged position; storage failures are silently ignored. */
		function saveDragPosition(position) {
			try {
				globalThis.localStorage?.setItem(DRAG_POSITION_KEY, JSON.stringify(position));
			} catch {
			}
		}
		/** Search Open-Meteo geocoding for a city name (same provider, no API key).
		* @param query - city name or partial name.
		* @param request - browser request function.
		* @param signal - optional cancellation signal.
		* @returns candidate cities with coordinates, country and timezone.
		*/
		async function geocodeCity(query, request = fetch, signal) {
			const params = new URLSearchParams({
				name: query,
				count: "5",
				language: "zh",
				format: "json"
			});
			const controller = new AbortController();
			let rejectAbort;
			const abortPromise = new Promise((_, reject) => {
				rejectAbort = () => {
					reject(/* @__PURE__ */ new Error("geocode request aborted"));
				};
			});
			const abort = () => {
				controller.abort();
				rejectAbort?.();
			};
			signal?.addEventListener("abort", abort, { once: true });
			try {
				const response = await Promise.race([
					abortPromise,
					request(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, { signal: controller.signal })
				]);
				if (!response.ok) throw new Error(`geocode request failed: ${response.status}`);
				const payload = await response.json();
				const results = payload?.results;
				if (!Array.isArray(results)) return [];
				return results.map((item) => ({
					id: `custom-${item.latitude.toFixed(3)}-${item.longitude.toFixed(3)}-${item.name}`,
					name: item.name,
					country: item.country || item.country_code || "",
					latitude: item.latitude,
					longitude: item.longitude,
					timezone: item.timezone || "UTC"
				}));
			} finally {
				signal?.removeEventListener("abort", abort);
			}
		}
		/** Upper bound for one public-provider request before sample data takes over. */
		const WEATHER_REQUEST_TIMEOUT_MS = 1e4;
		/** Return the local calendar parts used by a city's forecast timezone. */
		function localParts(timestamp, timeZone) {
			return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				hourCycle: "h23"
			}).formatToParts(timestamp).map(({ type, value }) => [type, value]));
		}
		function calendarDateKey(timestamp, timeZone) {
			const parts = localParts(timestamp, timeZone);
			return `${parts.year}-${parts.month}-${parts.day}`;
		}
		function addCalendarDays(dateKey, days) {
			const date = /* @__PURE__ */ new Date(`${dateKey}T12:00:00Z`);
			date.setUTCDate(date.getUTCDate() + days);
			return date.toISOString().slice(0, 10);
		}
		/** Demo-quality fallback keeps the dashboard useful when an API is offline.
		* @param city - selected city metadata.
		* @param now - timestamp used to seed the sample values.
		* @returns deterministic sample weather for the selected city.
		*/
		function fallbackWeather(city, now = Date.now()) {
			const seed = Math.round((city.latitude + city.longitude) * 10);
			const base = 18 + Math.abs(seed % 11);
			const hourly = Array.from({ length: 8 }, (_, index) => {
				const parts = localParts(now + index * 36e5, city.timezone);
				const wave = Math.round(Math.sin(index / 2.1) * 3);
				return {
					time: `${parts.hour}:00`,
					temperature: base + wave,
					precipitation: index % 5 === 3 ? 34 : index % 3 === 0 ? 12 : 4,
					condition: index > 4 ? "partly-cloudy" : "clear"
				};
			});
			const startDate = calendarDateKey(now, city.timezone);
			const daily = Array.from({ length: 5 }, (_, index) => {
				const dateKey = addCalendarDays(startDate, index);
				const date = /* @__PURE__ */ new Date(`${dateKey}T12:00:00Z`);
				const high = base + 3 + index % 2;
				return {
					day: index === 0 ? "今天" : new Intl.DateTimeFormat("zh-CN", {
						weekday: "short",
						timeZone: "UTC"
					}).format(date),
					date: `${Number(dateKey.slice(5, 7))}/${Number(dateKey.slice(8, 10))}`,
					condition: index === 2 ? "rain" : index === 4 ? "cloudy" : "partly-cloudy",
					high,
					low: high - 8,
					precipitation: index === 2 ? 52 : index === 4 ? 28 : 12
				};
			});
			return {
				city: city.name,
				country: city.country,
				source: "sample",
				updatedAt: now,
				current: {
					temperature: base,
					feelsLike: base + 1,
					condition: "partly-cloudy",
					humidity: 68,
					wind: 13,
					windDirection: 235,
					pressure: 1012,
					visibility: 10
				},
				hourly,
				daily
			};
		}
		/** Open-Meteo weather codes mapped to the small condition vocabulary.
		* @param code - Open-Meteo numeric weather code.
		* @returns the dashboard condition corresponding to the code.
		*/
		function conditionFromCode(code) {
			if (code === 0) return "clear";
			if (code <= 3) return "partly-cloudy";
			if (code <= 48) return "cloudy";
			if (code <= 67 || code >= 80 && code <= 82) return "rain";
			if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return "snow";
			if (code >= 95) return "storm";
			return "cloudy";
		}
		function isFiniteNumber(value) {
			return typeof value === "number" && Number.isFinite(value);
		}
		function isNumberArray(value) {
			return Array.isArray(value) && value.every(isFiniteNumber);
		}
		function isStringArray(value, pattern) {
			return Array.isArray(value) && value.every((item) => typeof item === "string" && pattern.test(item));
		}
		function isOpenMeteoResponse(value) {
			if (value === null || typeof value !== "object") return false;
			const payload = value;
			const current = payload.current;
			const hourly = payload.hourly;
			const daily = payload.daily;
			if (current === null || typeof current !== "object" || hourly === null || typeof hourly !== "object" || daily === null || typeof daily !== "object") return false;
			const currentValues = current;
			const hourlyValues = hourly;
			const dailyValues = daily;
			if (![
				currentValues.temperature_2m,
				currentValues.apparent_temperature,
				currentValues.relative_humidity_2m,
				currentValues.wind_speed_10m,
				currentValues.wind_direction_10m,
				currentValues.pressure_msl,
				currentValues.visibility,
				currentValues.weather_code
			].every(isFiniteNumber)) return false;
			const hourlyTime = hourlyValues.time;
			const hourlyTemperature = hourlyValues.temperature_2m;
			const hourlyPrecipitation = hourlyValues.precipitation_probability;
			const hourlyCode = hourlyValues.weather_code;
			const dailyTime = dailyValues.time;
			const dailyHigh = dailyValues.temperature_2m_max;
			const dailyLow = dailyValues.temperature_2m_min;
			const dailyPrecipitation = dailyValues.precipitation_probability_max;
			const dailyCode = dailyValues.weather_code;
			if (!isStringArray(hourlyTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) || !isNumberArray(hourlyTemperature) || !isNumberArray(hourlyPrecipitation) || !isNumberArray(hourlyCode) || !isStringArray(dailyTime, /^\d{4}-\d{2}-\d{2}$/) || !isNumberArray(dailyHigh) || !isNumberArray(dailyLow) || !isNumberArray(dailyPrecipitation) || !isNumberArray(dailyCode)) return false;
			return hourlyTime.length === hourlyTemperature.length && hourlyTime.length === hourlyPrecipitation.length && hourlyTime.length === hourlyCode.length && dailyTime.length === dailyHigh.length && dailyTime.length === dailyLow.length && dailyTime.length === dailyPrecipitation.length && dailyTime.length === dailyCode.length && hourlyTime.length >= 4 && dailyTime.length >= 5;
		}
		/**
		* Fetch and normalize one city from Open-Meteo. The injected request function
		* keeps the component testable and lets the browser use its native fetch.
		* @param city - selected city coordinates and timezone.
		* @param request - browser request function.
		* @param now - timestamp used for stable test and fallback values.
		* @param signal - optional cancellation signal for a superseded request.
		* @returns normalized dashboard data.
		*/
		async function fetchWeather(city, request = fetch, now = Date.now(), signal) {
			const params = new URLSearchParams({
				latitude: String(city.latitude),
				longitude: String(city.longitude),
				timezone: city.timezone,
				forecast_days: "5",
				current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,weather_code",
				hourly: "temperature_2m,precipitation_probability,weather_code",
				daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"
			});
			if (signal?.aborted) return fallbackWeather(city, now);
			const controller = new AbortController();
			let rejectAbort;
			const abortPromise = new Promise((_, reject) => {
				rejectAbort = () => {
					reject(/* @__PURE__ */ new Error("weather request aborted"));
				};
			});
			const abort = () => {
				controller.abort();
				rejectAbort?.();
			};
			signal?.addEventListener("abort", abort, { once: true });
			let rejectTimeout;
			const timeoutPromise = new Promise((_, reject) => {
				rejectTimeout = reject;
			});
			const timeout = setTimeout(() => {
				controller.abort();
				rejectTimeout(/* @__PURE__ */ new Error("weather request timed out"));
			}, WEATHER_REQUEST_TIMEOUT_MS);
			try {
				const response = await Promise.race([
					abortPromise,
					request(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: controller.signal }),
					timeoutPromise
				]);
				if (!response.ok) throw new Error(`weather request failed: ${response.status}`);
				const payload = await response.json();
				if (!isOpenMeteoResponse(payload)) throw new Error("weather response is incomplete or invalid");
				return normalizeWeather(city, payload, now);
			} catch {
				return fallbackWeather(city, now);
			} finally {
				clearTimeout(timeout);
				signal?.removeEventListener("abort", abort);
			}
		}
		function normalizeWeather(city, payload, now) {
			const { current, hourly, daily } = payload;
			const currentParts = localParts(now, city.timezone);
			const currentKey = `${currentParts.year}-${currentParts.month}-${currentParts.day}T${currentParts.hour}:00`;
			const startIndex = hourly.time.findIndex((time) => time >= currentKey);
			const hourlyRows = hourly.time.slice(startIndex < 0 ? 0 : startIndex, (startIndex < 0 ? 0 : startIndex) + 8).map((time, offset) => {
				const index = (startIndex < 0 ? 0 : startIndex) + offset;
				return {
					time,
					temperature: hourly.temperature_2m[index],
					precipitation: hourly.precipitation_probability[index],
					condition: conditionFromCode(hourly.weather_code[index])
				};
			}).map((row) => ({
				...row,
				time: row.time.slice(11, 16)
			}));
			const hourlyRowsWithFallback = hourlyRows.length >= 4 ? hourlyRows : fallbackWeather(city, now).hourly;
			const dailyRows = daily.time.slice(0, 5).map((date, index) => {
				const dayDate = /* @__PURE__ */ new Date(`${date}T12:00:00Z`);
				const month = date.slice(5, 7);
				const day = date.slice(8, 10);
				return {
					day: index === 0 ? "今天" : new Intl.DateTimeFormat("zh-CN", {
						weekday: "short",
						timeZone: "UTC"
					}).format(dayDate),
					date: `${Number(month)}/${Number(day)}`,
					condition: conditionFromCode(daily.weather_code[index]),
					high: Math.round(daily.temperature_2m_max[index]),
					low: Math.round(daily.temperature_2m_min[index]),
					precipitation: daily.precipitation_probability_max[index]
				};
			});
			return {
				city: city.name,
				country: city.country,
				source: "live",
				updatedAt: now,
				current: {
					temperature: Math.round(current.temperature_2m),
					feelsLike: Math.round(current.apparent_temperature),
					condition: conditionFromCode(current.weather_code),
					humidity: Math.round(current.relative_humidity_2m),
					wind: Math.round(current.wind_speed_10m),
					windDirection: Math.round(current.wind_direction_10m),
					pressure: Math.round(current.pressure_msl),
					visibility: Math.round(current.visibility / 1e3)
				},
				hourly: hourlyRowsWithFallback,
				daily: dailyRows
			};
		}
		//#endregion
		//#region \0dsh-css:/Users/duola/Documents/dsharness/deepseek-harness/packages/client/ui-weather/src/client/WeatherDashboard.module.css.mjs
		const css = "._7g82W_root[data-weather-dashboard]{--weather-accent:var(--dsw-alias-state-business-primary);--weather-warm:var(--dsw-alias-state-warn-primary);--weather-card:var(--dsw-alias-bg-layer-2);--weather-border:var(--dsw-alias-border-l2);pointer-events:none;z-index:30;width:min(360px,100vw - 32px);font-family:var(--dsw-font-family);color:var(--dsw-alias-label-primary);position:fixed;top:18px;right:20px}._7g82W_card{box-sizing:border-box;border:1px solid var(--weather-border);background:var(--weather-card);width:100%;box-shadow:var(--dsw-shadow-lv3);backdrop-filter:blur(16px);border-radius:18px;overflow:hidden}._7g82W_header{pointer-events:auto;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;border-bottom:1px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:center;min-height:38px;padding:10px 12px 8px 16px;display:flex}._7g82W_brandLine,._7g82W_headerActions,._7g82W_cityRow,._7g82W_heroWeather,._7g82W_heroCondition,._7g82W_chartHeader,._7g82W_sectionHeader,._7g82W_forecastRow,._7g82W_footer,._7g82W_pulse{align-items:center;display:flex}._7g82W_brandLine{gap:7px}._7g82W_liveMark{background:var(--weather-accent);width:6px;height:6px;box-shadow:0 0 0 3px var(--dsw-alias-state-business-tertiary);border-radius:50%}._7g82W_eyebrow,._7g82W_sectionKicker{letter-spacing:.12em;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;line-height:14px}._7g82W_source{background:var(--dsw-alias-state-business-tertiary);color:var(--weather-accent);border-radius:4px;padding:2px 5px;font-size:10px;line-height:14px}._7g82W_headerActions{gap:3px}._7g82W_iconButton{pointer-events:auto;width:26px;height:26px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:7px;justify-content:center;align-items:center;padding:0;display:inline-flex}._7g82W_iconButton:hover,._7g82W_iconButton:focus-visible{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._7g82W_iconButton:disabled{cursor:wait;opacity:.55}._7g82W_spinning{animation:.8s linear infinite _7g82W_spin}._7g82W_cityRow{justify-content:space-between;align-items:flex-start;gap:14px;padding:14px 16px 2px}._7g82W_label,._7g82W_country,._7g82W_chartUnit,._7g82W_sectionNote,._7g82W_metric span,._7g82W_forecastDay span,._7g82W_footer,._7g82W_pulseCity{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}._7g82W_cityRow h2{letter-spacing:-.03em;margin:1px 0 0;font-size:22px;font-weight:600;line-height:29px}._7g82W_country{margin-top:1px;display:block}._7g82W_cityRow select{pointer-events:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);max-width:92px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:7px;outline:none;padding:5px 20px 5px 8px;font-size:11px}._7g82W_cityRow select:focus-visible{border-color:var(--weather-accent)}._7g82W_heroWeather{justify-content:space-between;align-items:center;gap:12px;padding:9px 16px 13px}._7g82W_heroTemperature{letter-spacing:-.08em;font-variant-numeric:tabular-nums;font-size:58px;font-weight:300;line-height:64px}._7g82W_heroCondition{min-width:0;color:var(--dsw-alias-label-secondary);gap:8px}._7g82W_heroCondition strong,._7g82W_heroCondition span{display:block}._7g82W_heroCondition strong{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}._7g82W_heroCondition span{max-width:122px;font-size:10px;line-height:15px}._7g82W_glyph{width:22px;height:22px;color:var(--weather-accent);font-family:\"Arial Unicode MS\", var(--dsw-font-family);justify-content:center;align-items:center;font-size:19px;line-height:22px;display:inline-flex}._7g82W_glyph[data-condition=clear]{color:var(--weather-warm)}._7g82W_glyph[data-condition=rain],._7g82W_glyph[data-condition=storm]{color:var(--weather-accent)}._7g82W_glyphLarge{width:36px;height:36px;font-size:32px;line-height:36px}._7g82W_metrics{border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);grid-template-columns:repeat(4,1fr);margin:0 16px 14px;padding:10px 0 9px;display:grid}._7g82W_metric{border-right:1px solid var(--dsw-alias-border-l1);min-width:0;padding:0 8px}._7g82W_metric:first-child{padding-left:0}._7g82W_metric:last-child{border-right:0;padding-right:0}._7g82W_metric span,._7g82W_metric strong{display:block}._7g82W_metric strong{font-variant-numeric:tabular-nums;margin-top:2px;font-size:12px;font-weight:500;line-height:18px}._7g82W_chartBox,._7g82W_forecast{margin:0 16px}._7g82W_chartHeader,._7g82W_sectionHeader{justify-content:space-between;gap:8px}._7g82W_chartUnit{margin-left:7px}._7g82W_chartRange,._7g82W_sectionNote{font-variant-numeric:tabular-nums;font-size:11px;line-height:16px}._7g82W_chart{width:100%;height:118px;margin-top:2px;display:block;overflow:visible}._7g82W_chartAxis{stroke:var(--dsw-alias-border-l2);stroke-width:1px}._7g82W_chartArea{fill:url(#weather-chart-fill)}._7g82W_chartLine{fill:none;stroke:var(--weather-accent);stroke-width:2.5px;stroke-linecap:round;stroke-linejoin:round}._7g82W_chartPoint{fill:var(--weather-card);stroke:var(--weather-accent);stroke-width:2px}._7g82W_chartLabel{fill:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:8px}._7g82W_forecast{border-top:1px solid var(--dsw-alias-border-l1);padding-top:11px}._7g82W_forecastRow{border-top:1px solid var(--dsw-alias-border-l1);gap:7px;min-height:36px}._7g82W_forecastRow:first-of-type{margin-top:7px}._7g82W_forecastDay{flex-direction:column;flex:0 0 46px;display:flex}._7g82W_forecastDay strong{font-size:11px;font-weight:500;line-height:15px}._7g82W_forecastCondition{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;line-height:16px;overflow:hidden}._7g82W_precipitation{color:var(--weather-accent);font-variant-numeric:tabular-nums;flex:none;align-items:center;gap:3px;font-size:10px;line-height:16px;display:inline-flex}._7g82W_rainDot{background:var(--weather-accent);border-radius:50%;width:4px;height:4px}._7g82W_forecastTemps{font-variant-numeric:tabular-nums;flex:none;justify-content:flex-end;gap:5px;min-width:51px;font-size:11px;line-height:16px;display:inline-flex}._7g82W_forecastTemps span{color:var(--dsw-alias-label-tertiary)}._7g82W_footer{justify-content:space-between;gap:8px;padding:10px 16px 12px;font-size:10px;line-height:14px}._7g82W_pulse{pointer-events:auto;border:1px solid var(--weather-border);background:var(--weather-card);min-height:34px;box-shadow:var(--dsw-shadow-lv2);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;cursor:pointer;backdrop-filter:blur(16px);border-radius:999px;gap:4px;padding:5px 9px 5px 6px;font-size:13px;line-height:20px}._7g82W_pulse:hover,._7g82W_pulse:focus-visible{border-color:var(--weather-accent)}._7g82W_pulseCity{margin-left:2px}@keyframes _7g82W_spin{to{transform:rotate(360deg)}}@media (width<=680px){._7g82W_root{top:10px;right:10px}._7g82W_card{border-radius:15px}}@media (width<=420px){._7g82W_root{width:auto;left:8px;right:8px}._7g82W_heroTemperature{font-size:52px}}@media (prefers-reduced-motion:reduce){._7g82W_spinning{animation:none}}";
		const tagId = "@deepseek-ai/dsh-client-ui-weather/WeatherDashboard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-weather";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var WeatherDashboard_module_css_default = {
			"sectionKicker": "_7g82W_sectionKicker",
			"spin": "_7g82W_spin",
			"spinning": "_7g82W_spinning",
			"sectionNote": "_7g82W_sectionNote",
			"footer": "_7g82W_footer",
			"heroCondition": "_7g82W_heroCondition",
			"country": "_7g82W_country",
			"heroTemperature": "_7g82W_heroTemperature",
			"sectionHeader": "_7g82W_sectionHeader",
			"iconButton": "_7g82W_iconButton",
			"metrics": "_7g82W_metrics",
			"precipitation": "_7g82W_precipitation",
			"chartHeader": "_7g82W_chartHeader",
			"headerActions": "_7g82W_headerActions",
			"glyphLarge": "_7g82W_glyphLarge",
			"root": "_7g82W_root",
			"rainDot": "_7g82W_rainDot",
			"forecastRow": "_7g82W_forecastRow",
			"brandLine": "_7g82W_brandLine",
			"cityRow": "_7g82W_cityRow",
			"chartUnit": "_7g82W_chartUnit",
			"forecastTemps": "_7g82W_forecastTemps",
			"chartPoint": "_7g82W_chartPoint",
			"chartBox": "_7g82W_chartBox",
			"chartArea": "_7g82W_chartArea",
			"pulse": "_7g82W_pulse",
			"forecast": "_7g82W_forecast",
			"chartLabel": "_7g82W_chartLabel",
			"source": "_7g82W_source",
			"forecastDay": "_7g82W_forecastDay",
			"liveMark": "_7g82W_liveMark",
			"chartRange": "_7g82W_chartRange",
			"heroWeather": "_7g82W_heroWeather",
			"label": "_7g82W_label",
			"chart": "_7g82W_chart",
			"chartAxis": "_7g82W_chartAxis",
			"metric": "_7g82W_metric",
			"header": "_7g82W_header",
			"eyebrow": "_7g82W_eyebrow",
			"pulseCity": "_7g82W_pulseCity",
			"chartLine": "_7g82W_chartLine",
			"forecastCondition": "_7g82W_forecastCondition",
			"card": "_7g82W_card",
			"glyph": "_7g82W_glyph"
		};
		//#endregion
		//#region src/client/WeatherDashboard.tsx
		const CONDITION_LABELS = {
			clear: "晴",
			"partly-cloudy": "晴间多云",
			cloudy: "多云",
			rain: "小雨",
			storm: "雷雨",
			snow: "小雪"
		};
		const CONDITION_GLYPHS = {
			clear: "☀",
			"partly-cloudy": "◐",
			cloudy: "☁",
			rain: "☂",
			storm: "ϟ",
			snow: "✳"
		};
		/** Small semantic weather glyph; no external image asset or icon font required. */
		function WeatherGlyph({ condition, large = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: large ? `${WeatherDashboard_module_css_default.glyph} ${WeatherDashboard_module_css_default.glyphLarge}` : WeatherDashboard_module_css_default.glyph,
				"data-condition": condition,
				"aria-hidden": "true",
				children: CONDITION_GLYPHS[condition]
			});
		}
		function formatUpdatedAt(timestamp, timeZone) {
			return new Intl.DateTimeFormat("zh-CN", {
				timeZone,
				hour: "2-digit",
				minute: "2-digit"
			}).format(timestamp);
		}
		function formatTemperature(value) {
			return `${Math.round(value)}°`;
		}
		function windDirection(degrees) {
			const directions = [
				"北",
				"东北",
				"东",
				"东南",
				"南",
				"西南",
				"西",
				"西北"
			];
			return directions[Math.round(degrees / 45) % directions.length];
		}
		function chartPath(points) {
			return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
		}
		/**
		* Accessible hourly temperature trend chart. The labels and points remain
		* visible without hover, following the dashboard's editorial data-viz rules.
		*/
		function HourlyChart({ hourly }) {
			const values = hourly.map((point) => point.temperature);
			const min = Math.min(...values) - 1;
			const max = Math.max(...values) + 1;
			const points = hourly.map((point, index) => ({
				x: 14 + index * 252 / (hourly.length - 1),
				y: 82 - (point.temperature - min) / (max - min) * 48
			}));
			const path = chartPath(points);
			const area = `${path} L ${points[points.length - 1].x.toFixed(1)} 90 L ${points[0].x.toFixed(1)} 90 Z`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: WeatherDashboard_module_css_default.chartBox,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: WeatherDashboard_module_css_default.chartHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: WeatherDashboard_module_css_default.sectionKicker,
						children: "温度趋势"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: WeatherDashboard_module_css_default.chartUnit,
						children: "未来 8 小时 · °C"
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: WeatherDashboard_module_css_default.chartRange,
						children: [
							formatTemperature(Math.min(...values)),
							" — ",
							formatTemperature(Math.max(...values))
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					className: WeatherDashboard_module_css_default.chart,
					viewBox: "0 0 280 118",
					role: "img",
					"aria-label": "未来八小时温度趋势",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
							id: "weather-chart-fill",
							x1: "0",
							x2: "0",
							y1: "0",
							y2: "1",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
								offset: "0",
								stopColor: "var(--weather-accent)",
								stopOpacity: ".22"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
								offset: "1",
								stopColor: "var(--weather-accent)",
								stopOpacity: "0"
							})]
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M 14 90 H 266",
							className: WeatherDashboard_module_css_default.chartAxis
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: area,
							className: WeatherDashboard_module_css_default.chartArea
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: path,
							className: WeatherDashboard_module_css_default.chartLine
						}),
						points.map((point, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: point.x,
							cy: point.y,
							r: "3.5",
							className: WeatherDashboard_module_css_default.chartPoint
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							x: point.x,
							y: "108",
							textAnchor: "middle",
							className: WeatherDashboard_module_css_default.chartLabel,
							children: hourly[index]?.time.slice(0, 5)
						})] }, hourly[index]?.time))
					]
				})]
			});
		}
		function ForecastRow({ forecast }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: WeatherDashboard_module_css_default.forecastRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: WeatherDashboard_module_css_default.forecastDay,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: forecast.day }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: forecast.date })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WeatherGlyph, { condition: forecast.condition }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: WeatherDashboard_module_css_default.forecastCondition,
						children: CONDITION_LABELS[forecast.condition]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: WeatherDashboard_module_css_default.precipitation,
						title: `降水概率 ${forecast.precipitation}%`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WeatherDashboard_module_css_default.rainDot }),
							forecast.precipitation,
							"%"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: WeatherDashboard_module_css_default.forecastTemps,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: formatTemperature(forecast.high) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatTemperature(forecast.low) })]
					})
				]
			});
		}
		/**
		* Floating weather dashboard. It starts open so the current conditions are
		* visible on the first paint, then can be reduced to a quiet pulse button.
		* @param props - injected browser request and root-slot runtime share.
		* @returns the weather pulse or expanded dashboard card.
		*/
		function WeatherDashboard({ request }) {
			const [customCities, setCustomCities] = (0, react.useState)(loadCustomCities);
			const [hiddenBuiltinIds, setHiddenBuiltinIds] = (0, react.useState)(loadHiddenBuiltinIds);
			const visibleCities = (0, react.useMemo)(() => WEATHER_CITIES.filter((city) => !hiddenBuiltinIds.includes(city.id)).concat(customCities), [hiddenBuiltinIds, customCities]);
			const [cityId, setCityId] = (0, react.useState)(DEFAULT_CITY.id);
			const [cityMenuOpen, setCityMenuOpen] = (0, react.useState)(false);
			const [data, setData] = (0, react.useState)(() => fallbackWeather(DEFAULT_CITY));
			const [open, setOpen] = (0, react.useState)(true);
			const [loading, setLoading] = (0, react.useState)(false);
			const [cityQuery, setCityQuery] = (0, react.useState)("");
			const [cityResults, setCityResults] = (0, react.useState)([]);
			const [searchingCity, setSearchingCity] = (0, react.useState)(false);
			const [searchOpen, setSearchOpen] = (0, react.useState)(false);
			const searchCity = (0, react.useCallback)(async () => {
				const query = cityQuery.trim();
				if (!query) return;
				setSearchingCity(true);
				setCityResults([]);
				try {
					const results = await geocodeCity(query, request);
					setCityResults(results);
				} catch {
					setCityResults([]);
				} finally {
					setSearchingCity(false);
				}
			}, [cityQuery, request]);
			const addCustomCity = (0, react.useCallback)((city) => {
				setCustomCities((prev) => {
					if (prev.some((item) => item.id === city.id)) return prev;
					const next = prev.concat(city);
					saveCustomCities(next);
					return next;
				});
				setCityId(city.id);
				setCityQuery("");
				setCityResults([]);
			}, []);
			const removeCity = (0, react.useCallback)((cityIdToRemove) => {
				const isBuiltin = WEATHER_CITIES.some((city) => city.id === cityIdToRemove);
				if (isBuiltin) {
					setHiddenBuiltinIds((prev) => {
						if (prev.includes(cityIdToRemove)) return prev;
						const next = prev.concat(cityIdToRemove);
						saveHiddenBuiltinIds(next);
						return next;
					});
				} else {
					setCustomCities((prev) => {
						const next = prev.filter((city) => city.id !== cityIdToRemove);
						saveCustomCities(next);
						return next;
					});
				}
				setCityId((current) => {
					if (current !== cityIdToRemove) return current;
					const remaining = visibleCities.filter((city) => city.id !== cityIdToRemove);
					return remaining.length > 0 ? remaining[0].id : DEFAULT_CITY.id;
				});
			}, [visibleCities]);
			const restoreAllCities = (0, react.useCallback)(() => {
				setHiddenBuiltinIds((prev) => {
					if (prev.length === 0) return prev;
					saveHiddenBuiltinIds([]);
					return [];
				});
			}, []);
			// Draggable dashboard: press and hold the header to move the card.
			const rootRef = (0, react.useRef)(null);
			const [dragPosition, setDragPosition] = (0, react.useState)(loadDragPosition);
			const [dragging, setDragging] = (0, react.useState)(false);
			const dragStateRef = (0, react.useRef)(void 0);
			const beginHeaderDrag = (0, react.useCallback)((event) => {
				if (event.button !== 0) return;
				const target = event.target;
				if (target.closest("button, select, input, [data-weather-city-menu], [data-weather-search]")) return;
				const root = rootRef.current;
				if (!root) return;
				const rect = root.getBoundingClientRect();
				dragStateRef.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					originLeft: rect.left,
					originTop: rect.top
				};
				setDragging(true);
				event.currentTarget.setPointerCapture?.(event.pointerId);
				event.preventDefault();
			}, []);
			const moveHeaderDrag = (0, react.useCallback)((event) => {
				const drag = dragStateRef.current;
				const root = rootRef.current;
				if (!drag || !root || event.pointerId !== drag.pointerId) return;
				const dx = event.clientX - drag.startX;
				const dy = event.clientY - drag.startY;
				const width = root.offsetWidth;
				const height = root.offsetHeight;
				const margin = 8;
				const left = Math.min(Math.max(drag.originLeft + dx, margin), window.innerWidth - width - margin);
				const top = Math.min(Math.max(drag.originTop + dy, margin), window.innerHeight - height - margin);
				setDragPosition({ left, top });
			}, []);
			const endHeaderDrag = (0, react.useCallback)((event) => {
				const drag = dragStateRef.current;
				if (!drag || event.pointerId !== drag.pointerId) return;
				dragStateRef.current = void 0;
				setDragging(false);
				try {
					event.currentTarget.releasePointerCapture?.(event.pointerId);
				} catch {
				}
			}, []);
			(0, react.useEffect)(() => {
				if (dragPosition !== null) saveDragPosition(dragPosition);
			}, [dragPosition]);
			const requestId = (0, react.useRef)(0);
			const abortRef = (0, react.useRef)(void 0);
			const selectedCity = visibleCities.find((city) => city.id === cityId) ?? visibleCities[0] ?? DEFAULT_CITY;
			const load = (0, react.useCallback)(async (city) => {
				abortRef.current?.abort();
				const controller = new AbortController();
				abortRef.current = controller;
				const id = ++requestId.current;
				setData(fallbackWeather(city));
				setLoading(true);
				try {
					const next = await fetchWeather(city, request, Date.now(), controller.signal);
					if (id !== requestId.current) return;
					setData(next);
				} finally {
					if (id === requestId.current) setLoading(false);
				}
			}, [request]);
			(0, react.useEffect)(() => {
				load(selectedCity);
				return () => {
					requestId.current += 1;
					abortRef.current?.abort();
					abortRef.current = void 0;
				};
			}, [load, selectedCity]);
			const current = data.current;
			const metrics = (0, react.useMemo)(() => [
				{
					label: "体感",
					value: formatTemperature(current.feelsLike)
				},
				{
					label: "湿度",
					value: `${current.humidity}%`
				},
				{
					label: "风速",
					value: `${current.wind} km/h`
				},
				{
					label: "能见度",
					value: `${current.visibility} km`
				}
			], [current]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: WeatherDashboard_module_css_default.root,
				"data-weather-dashboard": true,
				"data-open": open || void 0,
				"data-dragging": dragging || void 0,
				style: dragPosition !== null ? { left: dragPosition.left, top: dragPosition.top } : void 0,
				children: [!open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: WeatherDashboard_module_css_default.pulse,
					onClick: () => {
						setOpen(true);
					},
					"aria-label": "打开天气看板",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WeatherGlyph, { condition: current.condition }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatTemperature(current.temperature) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: WeatherDashboard_module_css_default.pulseCity,
							children: data.city
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: WeatherDashboard_module_css_default.card,
					"aria-label": "天气看板",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: WeatherDashboard_module_css_default.header,
							onPointerDown: beginHeaderDrag,
							onPointerMove: moveHeaderDrag,
							onPointerUp: endHeaderDrag,
							onPointerCancel: endHeaderDrag,
							style: { cursor: dragging ? "grabbing" : "grab", touchAction: "none" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: WeatherDashboard_module_css_default.brandLine,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WeatherDashboard_module_css_default.liveMark }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: WeatherDashboard_module_css_default.eyebrow,
										children: "WEATHER DESK"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: WeatherDashboard_module_css_default.source,
										children: data.source === "live" ? "实时" : "示例数据"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: WeatherDashboard_module_css_default.headerActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: WeatherDashboard_module_css_default.iconButton,
									onClick: () => {
										load(selectedCity);
									},
									disabled: loading,
									"aria-label": "刷新天气",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { className: loading ? WeatherDashboard_module_css_default.spinning : void 0 })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: WeatherDashboard_module_css_default.iconButton,
									onClick: () => {
										setOpen(false);
									},
									"aria-label": "收起天气看板",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: WeatherDashboard_module_css_default.cityRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: WeatherDashboard_module_css_default.label,
									children: "当前城市"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: data.city }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: WeatherDashboard_module_css_default.country,
									children: [
										data.country,
										" · 更新于 ",
										formatUpdatedAt(data.updatedAt, selectedCity.timezone)
									]
								})
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: WeatherDashboard_module_css_default.iconButton,
								onClick: () => {
									setCityMenuOpen((prev) => !prev);
								},
								"aria-label": "切换或管理城市",
								title: "切换或管理城市",
								style: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600", width: "auto", minWidth: "52px", padding: "0 6px" },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: data.city }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { fontSize: "9px", opacity: ".7" },
									children: cityMenuOpen ? "▲" : "▼"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: WeatherDashboard_module_css_default.iconButton,
								onClick: () => {
									setSearchOpen((prev) => !prev);
									if (!searchOpen) {
										setCityResults([]);
										setCityQuery("");
										setSearchingCity(false);
									}
								},
								"aria-label": "添加城市",
								title: "搜索并添加城市",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 })
							})]
						}),
						cityMenuOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-weather-city-menu": true,
							style: { position: "fixed", inset: "0", zIndex: 20, pointerEvents: "auto" },
							onClick: () => {
								setCityMenuOpen(false);
							}
						}),
						cityMenuOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-weather-city-menu": true,
							style: { position: "relative", zIndex: 21, display: "flex", flexDirection: "column", gap: "2px", margin: "0 12px 8px", padding: "6px", borderRadius: "12px", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)", boxShadow: "var(--dsw-shadow-lv3)", pointerEvents: "auto" },
							children: [visibleCities.map((city) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", padding: "5px 8px", borderRadius: "8px", cursor: "pointer", background: city.id === cityId ? "var(--dsw-alias-interactive-bg-hover)" : "transparent", color: "var(--dsw-alias-label-primary)", fontSize: "12px" },
								onClick: () => {
									setCityId(city.id);
									setData(fallbackWeather(city));
									setCityMenuOpen(false);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: city.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: WeatherDashboard_module_css_default.iconButton,
									onClick: (event) => {
										event.stopPropagation();
										removeCity(city.id);
									},
									"aria-label": `移除城市 ${city.name}`,
									title: "移除该城市",
									style: { width: "20px", height: "20px", fontSize: "11px", flexShrink: "0" },
									children: "✕"
								})]
							}, city.id)), hiddenBuiltinIds.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: WeatherDashboard_module_css_default.iconButton,
								onClick: (event) => {
									event.stopPropagation();
									restoreAllCities();
								},
								style: { marginTop: "4px", justifyContent: "center", width: "100%", padding: "4px 8px", fontSize: "11px", color: "var(--weather-accent)" },
								children: "恢复默认城市"
							})]
						}),
						searchOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-weather-search": true,
							style: { display: "flex", flexDirection: "column", gap: "6px", padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-border-l1)", pointerEvents: "auto" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { display: "flex", gap: "6px", alignItems: "center" },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: cityQuery,
									onChange: (event) => {
										setCityQuery(event.currentTarget.value);
									},
									onKeyDown: (event) => {
										if (event.key === "Enter") searchCity();
									},
									placeholder: "输入城市名，如 广州 / Chengdu",
									"aria-label": "搜索城市",
									style: { flex: "1", minWidth: "0", padding: "6px 8px", borderRadius: "8px", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", fontSize: "12px" }
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: WeatherDashboard_module_css_default.iconButton,
									onClick: searchCity,
									disabled: searchingCity,
									"aria-label": "搜索",
									children: searchingCity ? "…" : "搜索"
								})]
							}), cityResults.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { display: "flex", flexDirection: "column", gap: "2px", maxHeight: "180px", overflowY: "auto" },
								children: cityResults.map((city) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: WeatherDashboard_module_css_default.iconButton,
									onClick: () => {
										addCustomCity(city);
									},
									style: { justifyContent: "flex-start", width: "100%", padding: "6px 8px", borderRadius: "8px", gap: "6px", fontSize: "12px", color: "var(--dsw-alias-label-primary)" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: city.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: { color: "var(--dsw-alias-label-secondary)", fontSize: "11px" },
										children: [city.country, " · ", city.latitude.toFixed(2), ", ", city.longitude.toFixed(2)]
									})]
								}, city.id))
							}), cityResults.length === 0 && searchingCity && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "11px", color: "var(--dsw-alias-label-secondary)" },
								children: "搜索中…"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: WeatherDashboard_module_css_default.heroWeather,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: WeatherDashboard_module_css_default.heroTemperature,
								children: formatTemperature(current.temperature)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: WeatherDashboard_module_css_default.heroCondition,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WeatherGlyph, {
									condition: current.condition,
									large: true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: CONDITION_LABELS[current.condition] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"风向 ",
									windDirection(current.windDirection),
									" · 气压 ",
									current.pressure,
									" hPa"
								] })] })]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: WeatherDashboard_module_css_default.metrics,
							children: metrics.map((metric) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: WeatherDashboard_module_css_default.metric,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: metric.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: metric.value })]
							}, metric.label))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HourlyChart, { hourly: data.hourly }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: WeatherDashboard_module_css_default.forecast,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: WeatherDashboard_module_css_default.sectionHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: WeatherDashboard_module_css_default.sectionKicker,
									children: "未来预报"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: WeatherDashboard_module_css_default.chartUnit,
									children: "五日趋势"
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: WeatherDashboard_module_css_default.sectionNote,
									children: "最高 / 最低"
								})]
							}), data.daily.map((forecast) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForecastRow, { forecast }, forecast.date))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: WeatherDashboard_module_css_default.footer,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "数据来源 · Open-Meteo" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "自动回退示例数据" })]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** The dashboard needs only the client slot registry. */
		const inject = ["slots"];
		/**
		* Register the persistent weather card into the additive frame overlay.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "weather",
				order: 80,
				inject: () => ({ request: globalThis.fetch.bind(globalThis) })
			}, WeatherDashboard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map