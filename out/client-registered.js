window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-weather",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
	  for (var name in all)
	    __defProp(target, name, { get: all[name], enumerable: true });
	};
	var __copyProps = (to, from, except, desc) => {
	  if (from && typeof from === "object" || typeof from === "function") {
	    for (let key of __getOwnPropNames(from))
	      if (!__hasOwnProp.call(to, key) && key !== except)
	        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
	  }
	  return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	
	// src/client/index.ts
	var index_exports = {};
	__export(index_exports, {
	  apply: () => apply,
	  inject: () => inject
	});
	module.exports = __toCommonJS(index_exports);
	
	// src/client/WeatherDashboard.tsx
	var import_react = require("react");
	var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
	
	// src/client/weather-data.ts
	var WEATHER_CITIES = [
	  { id: "shanghai", name: "\u4E0A\u6D77", country: "\u4E2D\u56FD", latitude: 31.23, longitude: 121.47, timezone: "Asia/Shanghai" },
	  { id: "beijing", name: "\u5317\u4EAC", country: "\u4E2D\u56FD", latitude: 39.9, longitude: 116.4, timezone: "Asia/Shanghai" },
	  { id: "shenzhen", name: "\u6DF1\u5733", country: "\u4E2D\u56FD", latitude: 22.54, longitude: 114.06, timezone: "Asia/Shanghai" },
	  { id: "tokyo", name: "\u4E1C\u4EAC", country: "\u65E5\u672C", latitude: 35.68, longitude: 139.65, timezone: "Asia/Tokyo" },
	  { id: "london", name: "\u4F26\u6566", country: "\u82F1\u56FD", latitude: 51.51, longitude: -0.13, timezone: "Europe/London" },
	  { id: "new-york", name: "\u7EBD\u7EA6", country: "\u7F8E\u56FD", latitude: 40.71, longitude: -74.01, timezone: "America/New_York" }
	];
	var DEFAULT_CITY = WEATHER_CITIES[0];
	var CUSTOM_CITIES_KEY = "dsh-weather.custom-cities";
	function loadCustomCities() {
	  try {
	    const raw = globalThis.localStorage?.getItem(CUSTOM_CITIES_KEY);
	    if (!raw) return [];
	    const parsed = JSON.parse(raw);
	    if (!Array.isArray(parsed)) return [];
	    return parsed.filter((city) => {
	      if (city === null || typeof city !== "object") return false;
	      const candidate = city;
	      return typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.country === "string" && typeof candidate.latitude === "number" && typeof candidate.longitude === "number" && typeof candidate.timezone === "string";
	    });
	  } catch {
	    return [];
	  }
	}
	function saveCustomCities(cities) {
	  try {
	    globalThis.localStorage?.setItem(CUSTOM_CITIES_KEY, JSON.stringify(cities));
	  } catch {
	  }
	}
	var HIDDEN_BUILTIN_KEY = "dsh-weather.hidden-builtin";
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
	function saveHiddenBuiltinIds(ids) {
	  try {
	    globalThis.localStorage?.setItem(HIDDEN_BUILTIN_KEY, JSON.stringify(ids));
	  } catch {
	  }
	}
	var DRAG_POSITION_KEY = "dsh-weather.drag-position";
	function loadDragPosition() {
	  try {
	    const raw = globalThis.localStorage?.getItem(DRAG_POSITION_KEY);
	    if (!raw) return null;
	    const parsed = JSON.parse(raw);
	    if (parsed === null || typeof parsed !== "object") return null;
	    const candidate = parsed;
	    if (typeof candidate.left !== "number" || typeof candidate.top !== "number") return null;
	    if (!Number.isFinite(candidate.left) || !Number.isFinite(candidate.top)) return null;
	    return { left: candidate.left, top: candidate.top };
	  } catch {
	    return null;
	  }
	}
	function saveDragPosition(position) {
	  try {
	    globalThis.localStorage?.setItem(DRAG_POSITION_KEY, JSON.stringify(position));
	  } catch {
	  }
	}
	function resolveAdminArea(candidate) {
	  const levels = ["admin1", "admin2", "admin3", "admin4"];
	  const parts = levels.map((key) => candidate[key]).filter((value) => typeof value === "string" && value.length > 0);
	  return parts.join("\xB7");
	}
	async function geocodeOnce(query, request, signal) {
	  const params = new URLSearchParams({
	    name: query,
	    count: "8",
	    language: "zh",
	    format: "json"
	  });
	  const controller = new AbortController();
	  let rejectAbort;
	  const abortPromise = new Promise((_, reject) => {
	    rejectAbort = () => {
	      reject(new Error("geocode request aborted"));
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
	    const results = payload.results;
	    if (!Array.isArray(results)) return [];
	    return results.flatMap((item) => {
	      if (item === null || typeof item !== "object") return [];
	      const candidate = item;
	      if (typeof candidate.name !== "string" || typeof candidate.latitude !== "number" || typeof candidate.longitude !== "number") return [];
	      const name = candidate.name;
	      const area = resolveAdminArea(candidate);
	      const suffix = area ? `-${area}` : "";
	      return [{
	        id: `custom-${candidate.latitude.toFixed(3)}-${candidate.longitude.toFixed(3)}-${name}${suffix}`,
	        name,
	        country: typeof candidate.country === "string" ? candidate.country : typeof candidate.country_code === "string" ? candidate.country_code : "",
	        area: area || void 0,
	        latitude: candidate.latitude,
	        longitude: candidate.longitude,
	        timezone: typeof candidate.timezone === "string" ? candidate.timezone : "UTC"
	      }];
	    });
	  } finally {
	    signal?.removeEventListener("abort", abort);
	  }
	}
	var ADMIN_SUFFIX = /[省自治市县区乡镇街道盟旗行政区]+$/;
	async function geocodeCity(query, request = fetch, signal) {
	  const base = query.trim();
	  if (!base) return [];
	  const results = await geocodeOnce(base, request, signal);
	  if (results.length > 0) return results;
	  const stripped = base.replace(ADMIN_SUFFIX, "");
	  if (stripped && stripped !== base) {
	    try {
	      return await geocodeOnce(stripped, request, signal);
	    } catch {
	    }
	  }
	  return [];
	}
	var WEATHER_REQUEST_TIMEOUT_MS = 1e4;
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
	      day: index === 0 ? "\u4ECA\u5929" : new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "UTC" }).format(date),
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
	  const currentFields = [
	    currentValues.temperature_2m,
	    currentValues.apparent_temperature,
	    currentValues.relative_humidity_2m,
	    currentValues.wind_speed_10m,
	    currentValues.wind_direction_10m,
	    currentValues.pressure_msl,
	    currentValues.visibility,
	    currentValues.weather_code
	  ];
	  if (!currentFields.every(isFiniteNumber)) return false;
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
	      reject(new Error("weather request aborted"));
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
	    rejectTimeout(new Error("weather request timed out"));
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
	  }).map((row) => ({ ...row, time: row.time.slice(11, 16) }));
	  const hourlyRowsWithFallback = hourlyRows.length >= 4 ? hourlyRows : fallbackWeather(city, now).hourly;
	  const dailyRows = daily.time.slice(0, 5).map((date, index) => {
	    const dayDate = /* @__PURE__ */ new Date(`${date}T12:00:00Z`);
	    const month = date.slice(5, 7);
	    const day = date.slice(8, 10);
	    return {
	      day: index === 0 ? "\u4ECA\u5929" : new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "UTC" }).format(dayDate),
	      date: `${Number(month)}/${Number(day)}`,
	      // The provider's date is already in the requested city timezone.
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
	
	// src/client/WeatherDashboard.module.css
	var __css__ = ".root[data-weather-dashboard] {\n  --weather-accent: var(--dsw-alias-state-business-primary);\n  --weather-warm: var(--dsw-alias-state-warn-primary);\n  --weather-card: var(--dsw-alias-bg-layer-2);\n  --weather-border: var(--dsw-alias-border-l2);\n  pointer-events: none;\n  position: fixed;\n  top: 18px;\n  right: 20px;\n  z-index: 30;\n  width: min(360px, calc(100vw - 32px));\n  font-family: var(--dsw-font-family);\n  color: var(--dsw-alias-label-primary);\n}\n\n.card {\n  box-sizing: border-box;\n  width: 100%;\n  overflow: hidden;\n  border: 1px solid var(--weather-border);\n  border-radius: 18px;\n  background: var(--weather-card);\n  box-shadow: var(--dsw-shadow-lv3);\n  backdrop-filter: blur(16px);\n}\n\n.header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-height: 38px;\n  padding: 10px 12px 8px 16px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n  pointer-events: auto;\n  cursor: grab;\n  user-select: none;\n  -webkit-user-select: none;\n  touch-action: none;\n}\n\n.root[data-dragging] .header {\n  cursor: grabbing;\n}\n\n.brandLine,\n.headerActions,\n.cityRow,\n.heroWeather,\n.heroCondition,\n.chartHeader,\n.sectionHeader,\n.forecastRow,\n.footer,\n.pulse {\n  display: flex;\n  align-items: center;\n}\n\n.brandLine {\n  gap: 7px;\n}\n\n.liveMark {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--weather-accent);\n  box-shadow: 0 0 0 3px var(--dsw-alias-state-business-tertiary);\n}\n\n.eyebrow,\n.sectionKicker {\n  font-size: 11px;\n  line-height: 14px;\n  letter-spacing: .12em;\n  font-weight: 600;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.source {\n  padding: 2px 5px;\n  border-radius: 4px;\n  background: var(--dsw-alias-state-business-tertiary);\n  color: var(--weather-accent);\n  font-size: 10px;\n  line-height: 14px;\n}\n\n.headerActions {\n  gap: 3px;\n}\n\n.iconButton {\n  pointer-events: auto;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 26px;\n  height: 26px;\n  padding: 0;\n  border: 0;\n  border-radius: 7px;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n}\n\n.iconButton:hover,\n.iconButton:focus-visible {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.iconButton:disabled {\n  cursor: wait;\n  opacity: .55;\n}\n\n.spinning {\n  animation: spin 800ms linear infinite;\n}\n\n.cityRow {\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 14px;\n  padding: 14px 16px 2px;\n}\n\n.label,\n.country,\n.chartUnit,\n.sectionNote,\n.metric span,\n.forecastDay span,\n.footer,\n.pulseCity {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  line-height: 16px;\n}\n\n.cityRow h2 {\n  margin: 1px 0 0;\n  font-size: 22px;\n  line-height: 29px;\n  font-weight: 600;\n  letter-spacing: -.03em;\n}\n\n.country {\n  display: block;\n  margin-top: 1px;\n}\n\n.cityRow select {\n  pointer-events: auto;\n  max-width: 92px;\n  padding: 5px 20px 5px 8px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  background: var(--dsw-alias-bg-layer-1);\n  color: var(--dsw-alias-label-secondary);\n  font: inherit;\n  font-size: 11px;\n  outline: none;\n  cursor: pointer;\n}\n\n.cityRow select:focus-visible {\n  border-color: var(--weather-accent);\n}\n\n.heroWeather {\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 9px 16px 13px;\n}\n\n.heroTemperature {\n  font-size: 58px;\n  line-height: 64px;\n  font-weight: 300;\n  letter-spacing: -.08em;\n  font-variant-numeric: tabular-nums;\n}\n\n.heroCondition {\n  min-width: 0;\n  gap: 8px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.heroCondition strong,\n.heroCondition span {\n  display: block;\n}\n\n.heroCondition strong {\n  font-size: 13px;\n  line-height: 20px;\n  font-weight: 500;\n  color: var(--dsw-alias-label-primary);\n}\n\n.heroCondition span {\n  max-width: 122px;\n  font-size: 10px;\n  line-height: 15px;\n}\n\n.glyph {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 22px;\n  height: 22px;\n  color: var(--weather-accent);\n  font-family: 'Arial Unicode MS', var(--dsw-font-family);\n  font-size: 19px;\n  line-height: 22px;\n}\n\n.glyph[data-condition='clear'] {\n  color: var(--weather-warm);\n}\n\n.glyph[data-condition='rain'],\n.glyph[data-condition='storm'] {\n  color: var(--weather-accent);\n}\n\n.glyphLarge {\n  width: 36px;\n  height: 36px;\n  font-size: 32px;\n  line-height: 36px;\n}\n\n.metrics {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  margin: 0 16px 14px;\n  padding: 10px 0 9px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n\n.metric {\n  min-width: 0;\n  padding: 0 8px;\n  border-right: 1px solid var(--dsw-alias-border-l1);\n}\n\n.metric:first-child {\n  padding-left: 0;\n}\n\n.metric:last-child {\n  padding-right: 0;\n  border-right: 0;\n}\n\n.metric span,\n.metric strong {\n  display: block;\n}\n\n.metric strong {\n  margin-top: 2px;\n  font-size: 12px;\n  line-height: 18px;\n  font-weight: 500;\n  font-variant-numeric: tabular-nums;\n}\n\n.chartBox,\n.forecast {\n  margin: 0 16px;\n}\n\n.chartHeader,\n.sectionHeader {\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.chartUnit {\n  margin-left: 7px;\n}\n\n.chartRange,\n.sectionNote {\n  font-size: 11px;\n  line-height: 16px;\n  font-variant-numeric: tabular-nums;\n}\n\n.chart {\n  display: block;\n  width: 100%;\n  height: 118px;\n  margin-top: 2px;\n  overflow: visible;\n}\n\n.chartAxis {\n  stroke: var(--dsw-alias-border-l2);\n  stroke-width: 1;\n}\n\n.chartArea {\n  fill: url(#weather-chart-fill);\n}\n\n.chartLine {\n  fill: none;\n  stroke: var(--weather-accent);\n  stroke-width: 2.5;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n}\n\n.chartPoint {\n  fill: var(--weather-card);\n  stroke: var(--weather-accent);\n  stroke-width: 2;\n}\n\n.chartLabel {\n  fill: var(--dsw-alias-label-tertiary);\n  font-size: 8px;\n  font-variant-numeric: tabular-nums;\n}\n\n.forecast {\n  padding-top: 11px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n\n.forecastRow {\n  gap: 7px;\n  min-height: 36px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n\n.forecastRow:first-of-type {\n  margin-top: 7px;\n}\n\n.forecastDay {\n  display: flex;\n  flex: 0 0 46px;\n  flex-direction: column;\n}\n\n.forecastDay strong {\n  font-size: 11px;\n  line-height: 15px;\n  font-weight: 500;\n}\n\n.forecastCondition {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  line-height: 16px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.precipitation {\n  display: inline-flex;\n  align-items: center;\n  gap: 3px;\n  flex: none;\n  color: var(--weather-accent);\n  font-size: 10px;\n  line-height: 16px;\n  font-variant-numeric: tabular-nums;\n}\n\n.rainDot {\n  width: 4px;\n  height: 4px;\n  border-radius: 50%;\n  background: var(--weather-accent);\n}\n\n.forecastTemps {\n  display: inline-flex;\n  gap: 5px;\n  flex: none;\n  min-width: 51px;\n  justify-content: flex-end;\n  font-size: 11px;\n  line-height: 16px;\n  font-variant-numeric: tabular-nums;\n}\n\n.forecastTemps span {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.footer {\n  justify-content: space-between;\n  gap: 8px;\n  padding: 10px 16px 12px;\n  font-size: 10px;\n  line-height: 14px;\n}\n\n.pulse {\n  pointer-events: auto;\n  gap: 4px;\n  min-height: 34px;\n  padding: 5px 9px 5px 6px;\n  border: 1px solid var(--weather-border);\n  border-radius: 999px;\n  background: var(--weather-card);\n  box-shadow: var(--dsw-shadow-lv2);\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  line-height: 20px;\n  font-variant-numeric: tabular-nums;\n  cursor: pointer;\n  backdrop-filter: blur(16px);\n}\n\n.pulse:hover,\n.pulse:focus-visible {\n  border-color: var(--weather-accent);\n}\n\n.pulseCity {\n  margin-left: 2px;\n}\n\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n@media (max-width: 680px) {\n  .root {\n    top: 10px;\n    right: 10px;\n  }\n\n  .card {\n    border-radius: 15px;\n  }\n}\n\n@media (max-width: 420px) {\n  .root {\n    right: 8px;\n    left: 8px;\n    width: auto;\n  }\n\n  .heroTemperature {\n    font-size: 52px;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .spinning {\n    animation: none;\n  }\n}\n";
	(function() {
	  try {
	    if (typeof document !== "undefined") {
	      var s = document.createElement("style");
	      s.setAttribute("data-weather-css", "1");
	      s.textContent = __css__;
	      (document.head || document.documentElement).appendChild(s);
	    }
	  } catch (e) {
	  }
	})();
	var classes = { "root[data-weather-dashboard]": "root[data-weather-dashboard]", "card": "card", "header": "header", "root[data-dragging]": "root[data-dragging]", "brandLine": "brandLine", "headerActions": "headerActions", "cityRow": "cityRow", "heroWeather": "heroWeather", "heroCondition": "heroCondition", "chartHeader": "chartHeader", "sectionHeader": "sectionHeader", "forecastRow": "forecastRow", "footer": "footer", "pulse": "pulse", "liveMark": "liveMark", "eyebrow": "eyebrow", "sectionKicker": "sectionKicker", "12em": "12em", "source": "source", "iconButton": "iconButton", "iconButton:hover": "iconButton:hover", "iconButton:focus-visible": "iconButton:focus-visible", "iconButton:disabled": "iconButton:disabled", "55": "55", "spinning": "spinning", "label": "label", "country": "country", "chartUnit": "chartUnit", "sectionNote": "sectionNote", "metric": "metric", "forecastDay": "forecastDay", "pulseCity": "pulseCity", "heroTemperature": "heroTemperature", "glyph": "glyph", "glyph[data-condition=": "glyph[data-condition=", "glyphLarge": "glyphLarge", "metrics": "metrics", "metric:first-child": "metric:first-child", "metric:last-child": "metric:last-child", "chartBox": "chartBox", "forecast": "forecast", "chartRange": "chartRange", "chart": "chart", "chartAxis": "chartAxis", "chartArea": "chartArea", "chartLine": "chartLine", "chartPoint": "chartPoint", "chartLabel": "chartLabel", "forecastRow:first-of-type": "forecastRow:first-of-type", "forecastCondition": "forecastCondition", "precipitation": "precipitation", "rainDot": "rainDot", "forecastTemps": "forecastTemps", "pulse:hover": "pulse:hover", "pulse:focus-visible": "pulse:focus-visible", "root": "root" };
	var WeatherDashboard_default = classes;
	
	// src/client/WeatherDashboard.tsx
	var import_jsx_runtime = require("react/jsx-runtime");
	var CONDITION_LABELS = {
	  clear: "\u6674",
	  "partly-cloudy": "\u6674\u95F4\u591A\u4E91",
	  cloudy: "\u591A\u4E91",
	  rain: "\u5C0F\u96E8",
	  storm: "\u96F7\u96E8",
	  snow: "\u5C0F\u96EA"
	};
	var CONDITION_GLYPHS = {
	  clear: "\u2600",
	  "partly-cloudy": "\u25D0",
	  cloudy: "\u2601",
	  rain: "\u2602",
	  storm: "\u03DF",
	  snow: "\u2733"
	};
	function WeatherGlyph({ condition, large = false }) {
	  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	    "span",
	    {
	      className: large ? `${WeatherDashboard_default.glyph} ${WeatherDashboard_default.glyphLarge}` : WeatherDashboard_default.glyph,
	      "data-condition": condition,
	      "aria-hidden": "true",
	      children: CONDITION_GLYPHS[condition]
	    }
	  );
	}
	function formatUpdatedAt(timestamp, timeZone) {
	  return new Intl.DateTimeFormat("zh-CN", {
	    timeZone,
	    year: "numeric",
	    month: "2-digit",
	    day: "2-digit",
	    hour: "2-digit",
	    minute: "2-digit"
	  }).format(timestamp);
	}
	function formatTemperature(value) {
	  return `${Math.round(value)}\xB0`;
	}
	function windDirection(degrees) {
	  const directions = ["\u5317", "\u4E1C\u5317", "\u4E1C", "\u4E1C\u5357", "\u5357", "\u897F\u5357", "\u897F", "\u897F\u5317"];
	  return directions[Math.round(degrees / 45) % directions.length];
	}
	function chartPath(points) {
	  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
	}
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
	  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.chartBox, children: [
	    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.chartHeader, children: [
	      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
	        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.sectionKicker, children: "\u6E29\u5EA6\u8D8B\u52BF" }),
	        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.chartUnit, children: "\u672A\u6765 8 \u5C0F\u65F6 \xB7 \xB0C" })
	      ] }),
	      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: WeatherDashboard_default.chartRange, children: [
	        formatTemperature(Math.min(...values)),
	        " \u2014 ",
	        formatTemperature(Math.max(...values))
	      ] })
	    ] }),
	    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className: WeatherDashboard_default.chart, viewBox: "0 0 280 118", role: "img", "aria-label": "\u672A\u6765\u516B\u5C0F\u65F6\u6E29\u5EA6\u8D8B\u52BF", children: [
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: "weather-chart-fill", x1: "0", x2: "0", y1: "0", y2: "1", children: [
	        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "0", stopColor: "var(--weather-accent)", stopOpacity: ".22" }),
	        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "1", stopColor: "var(--weather-accent)", stopOpacity: "0" })
	      ] }) }),
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M 14 90 H 266", className: WeatherDashboard_default.chartAxis }),
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: area, className: WeatherDashboard_default.chartArea }),
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: path, className: WeatherDashboard_default.chartLine }),
	      points.map((point, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
	        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: point.x, cy: point.y, r: "3.5", className: WeatherDashboard_default.chartPoint }),
	        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", { x: point.x, y: "108", textAnchor: "middle", className: WeatherDashboard_default.chartLabel, children: hourly[index]?.time.slice(0, 5) })
	      ] }, hourly[index]?.time))
	    ] })
	  ] });
	}
	function ForecastRow({ forecast }) {
	  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.forecastRow, children: [
	    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.forecastDay, children: [
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: forecast.day }),
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: forecast.date })
	    ] }),
	    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherGlyph, { condition: forecast.condition }),
	    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.forecastCondition, children: CONDITION_LABELS[forecast.condition] }),
	    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.precipitation, title: `\u964D\u6C34\u6982\u7387 ${forecast.precipitation}%`, children: [
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.rainDot }),
	      forecast.precipitation,
	      "%"
	    ] }),
	    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.forecastTemps, children: [
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatTemperature(forecast.high) }),
	      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTemperature(forecast.low) })
	    ] })
	  ] });
	}
	function WeatherDashboard({ request }) {
	  const [customCities, setCustomCities] = (0, import_react.useState)(loadCustomCities);
	  const [hiddenBuiltinIds, setHiddenBuiltinIds] = (0, import_react.useState)(loadHiddenBuiltinIds);
	  const visibleCities = (0, import_react.useMemo)(
	    () => WEATHER_CITIES.filter((city) => !hiddenBuiltinIds.includes(city.id)).concat(customCities),
	    [hiddenBuiltinIds, customCities]
	  );
	  const [cityId, setCityId] = (0, import_react.useState)(DEFAULT_CITY.id);
	  const [cityMenuOpen, setCityMenuOpen] = (0, import_react.useState)(false);
	  const [data, setData] = (0, import_react.useState)(() => fallbackWeather(DEFAULT_CITY));
	  const [open, setOpen] = (0, import_react.useState)(true);
	  const [loading, setLoading] = (0, import_react.useState)(false);
	  const [cityQuery, setCityQuery] = (0, import_react.useState)("");
	  const [cityResults, setCityResults] = (0, import_react.useState)([]);
	  const [searchingCity, setSearchingCity] = (0, import_react.useState)(false);
	  const [searchOpen, setSearchOpen] = (0, import_react.useState)(false);
	  const requestId = (0, import_react.useRef)(0);
	  const abortRef = (0, import_react.useRef)(void 0);
	  const selectedCity = visibleCities.find((city) => city.id === cityId) ?? visibleCities[0] ?? DEFAULT_CITY;
	  const searchCity = (0, import_react.useCallback)(async () => {
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
	  const addCustomCity = (0, import_react.useCallback)((city) => {
	    setCustomCities((prev) => {
	      if (prev.some((item) => item.id === city.id)) return prev;
	      const next = [...prev, city];
	      saveCustomCities(next);
	      return next;
	    });
	    setCityId(city.id);
	    setCityQuery("");
	    setCityResults([]);
	  }, []);
	  const removeCity = (0, import_react.useCallback)((cityIdToRemove) => {
	    const isBuiltin = WEATHER_CITIES.some((city) => city.id === cityIdToRemove);
	    if (isBuiltin) {
	      setHiddenBuiltinIds((prev) => {
	        if (prev.includes(cityIdToRemove)) return prev;
	        const next = [...prev, cityIdToRemove];
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
	    setCityId((current2) => {
	      if (current2 !== cityIdToRemove) return current2;
	      const remaining = visibleCities.filter((city) => city.id !== cityIdToRemove);
	      return remaining.length > 0 ? remaining[0].id : DEFAULT_CITY.id;
	    });
	  }, [visibleCities]);
	  const restoreAllCities = (0, import_react.useCallback)(() => {
	    setHiddenBuiltinIds((prev) => {
	      if (prev.length === 0) return prev;
	      saveHiddenBuiltinIds([]);
	      return [];
	    });
	  }, []);
	  const rootRef = (0, import_react.useRef)(null);
	  const [dragPosition, setDragPosition] = (0, import_react.useState)(loadDragPosition);
	  const [dragging, setDragging] = (0, import_react.useState)(false);
	  const dragStateRef = (0, import_react.useRef)(null);
	  const beginHeaderDrag = (0, import_react.useCallback)((event) => {
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
	  const moveHeaderDrag = (0, import_react.useCallback)((event) => {
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
	  const endHeaderDrag = (0, import_react.useCallback)((event) => {
	    const drag = dragStateRef.current;
	    if (!drag || event.pointerId !== drag.pointerId) return;
	    dragStateRef.current = null;
	    setDragging(false);
	    try {
	      event.currentTarget.releasePointerCapture?.(event.pointerId);
	    } catch {
	    }
	  }, []);
	  (0, import_react.useEffect)(() => {
	    if (dragPosition !== null) saveDragPosition(dragPosition);
	  }, [dragPosition]);
	  const load = (0, import_react.useCallback)(async (city) => {
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
	  (0, import_react.useEffect)(() => {
	    void load(selectedCity);
	    return () => {
	      requestId.current += 1;
	      abortRef.current?.abort();
	      abortRef.current = void 0;
	    };
	  }, [load, selectedCity]);
	  const current = data.current;
	  const metrics = (0, import_react.useMemo)(() => [
	    { label: "\u4F53\u611F", value: formatTemperature(current.feelsLike) },
	    { label: "\u6E7F\u5EA6", value: `${current.humidity}%` },
	    { label: "\u98CE\u901F", value: `${current.wind} km/h` },
	    { label: "\u80FD\u89C1\u5EA6", value: `${current.visibility} km` }
	  ], [current]);
	  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
	    "div",
	    {
	      ref: rootRef,
	      className: WeatherDashboard_default.root,
	      "data-weather-dashboard": true,
	      "data-open": open || void 0,
	      "data-dragging": dragging || void 0,
	      style: dragPosition !== null ? { left: dragPosition.left, top: dragPosition.top } : void 0,
	      children: [
	        !open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: WeatherDashboard_default.pulse, onClick: () => {
	          setOpen(true);
	        }, "aria-label": "\u6253\u5F00\u5929\u6C14\u770B\u677F", children: [
	          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherGlyph, { condition: current.condition }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTemperature(current.temperature) }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.pulseCity, children: data.city })
	        ] }),
	        open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: WeatherDashboard_default.card, "aria-label": "\u5929\u6C14\u770B\u677F", children: [
	          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
	            "header",
	            {
	              className: WeatherDashboard_default.header,
	              onPointerDown: beginHeaderDrag,
	              onPointerMove: moveHeaderDrag,
	              onPointerUp: endHeaderDrag,
	              onPointerCancel: endHeaderDrag,
	              style: { cursor: dragging ? "grabbing" : "grab", touchAction: "none" },
	              children: [
	                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.brandLine, children: [
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.liveMark }),
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.eyebrow, children: "WEATHER DESK" }),
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.source, children: data.source === "live" ? "\u5B9E\u65F6" : "\u793A\u4F8B\u6570\u636E" })
	                ] }),
	                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.headerActions, children: [
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: WeatherDashboard_default.iconButton, onClick: () => {
	                    void load(selectedCity);
	                  }, disabled: loading, "aria-label": "\u5237\u65B0\u5929\u6C14", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRefreshOutline14, { className: loading ? WeatherDashboard_default.spinning : void 0 }) }),
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: WeatherDashboard_default.iconButton, onClick: () => {
	                    setOpen(false);
	                  }, "aria-label": "\u6536\u8D77\u5929\u6C14\u770B\u677F", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 }) })
	                ] })
	              ]
	            }
	          ),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.cityRow, children: [
	            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
	              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.label, children: "\u5F53\u524D\u57CE\u5E02" }),
	              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: data.city }),
	              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: WeatherDashboard_default.country, children: [
	                selectedCity.area ?? data.country,
	                " \xB7 \u66F4\u65B0\u4E8E ",
	                formatUpdatedAt(data.updatedAt, selectedCity.timezone)
	              ] })
	            ] }),
	            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
	              "button",
	              {
	                type: "button",
	                className: WeatherDashboard_default.iconButton,
	                onClick: () => {
	                  setCityMenuOpen((prev) => !prev);
	                },
	                "aria-label": "\u5207\u6362\u6216\u7BA1\u7406\u57CE\u5E02",
	                title: "\u5207\u6362\u6216\u7BA1\u7406\u57CE\u5E02",
	                style: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, width: "auto", minWidth: "52px", padding: "0 6px" },
	                children: [
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: data.city }),
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "9px", opacity: ".7" }, children: cityMenuOpen ? "\u25B2" : "\u25BC" })
	                ]
	              }
	            ),
	            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	              "button",
	              {
	                type: "button",
	                className: WeatherDashboard_default.iconButton,
	                onClick: () => {
	                  setSearchOpen((prev) => !prev);
	                  if (!searchOpen) {
	                    setCityResults([]);
	                    setCityQuery("");
	                    setSearchingCity(false);
	                  }
	                },
	                "aria-label": "\u6DFB\u52A0\u57CE\u5E02",
	                title: "\u641C\u7D22\u5E76\u6DFB\u52A0\u57CE\u5E02",
	                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 })
	              }
	            )
	          ] }),
	          cityMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	            "div",
	            {
	              "data-weather-city-menu": true,
	              style: { position: "fixed", inset: 0, zIndex: 20, pointerEvents: "auto" },
	              onClick: () => {
	                setCityMenuOpen(false);
	              }
	            }
	          ),
	          cityMenuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
	            "div",
	            {
	              "data-weather-city-menu": true,
	              style: {
	                position: "relative",
	                zIndex: 21,
	                display: "flex",
	                flexDirection: "column",
	                gap: "2px",
	                margin: "0 12px 8px",
	                padding: "6px",
	                borderRadius: "12px",
	                border: "1px solid var(--dsw-alias-border-l2)",
	                background: "var(--dsw-alias-bg-layer-2)",
	                boxShadow: "var(--dsw-shadow-lv3)",
	                pointerEvents: "auto"
	              },
	              children: [
	                visibleCities.map((city) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
	                  "div",
	                  {
	                    style: {
	                      display: "flex",
	                      alignItems: "center",
	                      justifyContent: "space-between",
	                      gap: "6px",
	                      padding: "5px 8px",
	                      borderRadius: "8px",
	                      cursor: "pointer",
	                      background: city.id === cityId ? "var(--dsw-alias-interactive-bg-hover)" : "transparent",
	                      color: "var(--dsw-alias-label-primary)",
	                      fontSize: "12px"
	                    },
	                    onClick: () => {
	                      setCityId(city.id);
	                      setData(fallbackWeather(city));
	                      setCityMenuOpen(false);
	                    },
	                    children: [
	                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: city.name }),
	                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	                        "button",
	                        {
	                          type: "button",
	                          className: WeatherDashboard_default.iconButton,
	                          onClick: (event) => {
	                            event.stopPropagation();
	                            removeCity(city.id);
	                          },
	                          "aria-label": `\u79FB\u9664\u57CE\u5E02 ${city.name}`,
	                          title: "\u79FB\u9664\u8BE5\u57CE\u5E02",
	                          style: { width: "20px", height: "20px", fontSize: "11px", flexShrink: 0 },
	                          children: "\u2715"
	                        }
	                      )
	                    ]
	                  },
	                  city.id
	                )),
	                hiddenBuiltinIds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	                  "button",
	                  {
	                    type: "button",
	                    className: WeatherDashboard_default.iconButton,
	                    onClick: (event) => {
	                      event.stopPropagation();
	                      restoreAllCities();
	                    },
	                    style: { marginTop: "4px", justifyContent: "center", width: "100%", padding: "4px 8px", fontSize: "11px", color: "var(--weather-accent)" },
	                    children: "\u6062\u590D\u9ED8\u8BA4\u57CE\u5E02"
	                  }
	                )
	              ]
	            }
	          ),
	          searchOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { "data-weather-search": true, style: { display: "flex", flexDirection: "column", gap: "6px", padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-border-l1)", pointerEvents: "auto" }, children: [
	            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "6px", alignItems: "center" }, children: [
	              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	                "input",
	                {
	                  type: "text",
	                  value: cityQuery,
	                  onChange: (event) => {
	                    setCityQuery(event.currentTarget.value);
	                  },
	                  onKeyDown: (event) => {
	                    if (event.key === "Enter") void searchCity();
	                  },
	                  placeholder: "\u8F93\u5165\u533A/\u5730\u540D\uFF0C\u5982 \u6D77\u6DC0\u533A / \u4E2D\u5173\u6751\u5927\u8857 / Chengdu",
	                  "aria-label": "\u641C\u7D22\u57CE\u5E02",
	                  style: {
	                    flex: 1,
	                    minWidth: 0,
	                    padding: "6px 8px",
	                    borderRadius: "8px",
	                    border: "1px solid var(--dsw-alias-border-l2)",
	                    background: "var(--dsw-alias-bg-layer-1)",
	                    color: "var(--dsw-alias-label-primary)",
	                    fontSize: "12px"
	                  }
	                }
	              ),
	              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
	                "button",
	                {
	                  type: "button",
	                  className: WeatherDashboard_default.iconButton,
	                  onClick: () => {
	                    void searchCity();
	                  },
	                  disabled: searchingCity,
	                  "aria-label": "\u641C\u7D22",
	                  children: searchingCity ? "\u2026" : "\u641C\u7D22"
	                }
	              )
	            ] }),
	            cityResults.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: "2px", maxHeight: "180px", overflowY: "auto" }, children: cityResults.map((city) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
	              "button",
	              {
	                type: "button",
	                className: WeatherDashboard_default.iconButton,
	                onClick: () => {
	                  addCustomCity(city);
	                },
	                style: { justifyContent: "flex-start", width: "100%", padding: "6px 8px", borderRadius: "8px", gap: "6px", fontSize: "12px", color: "var(--dsw-alias-label-primary)" },
	                children: [
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: city.name }),
	                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: "11px" }, children: [
	                    city.area ?? city.country,
	                    " \xB7 ",
	                    city.latitude.toFixed(2),
	                    ", ",
	                    city.longitude.toFixed(2)
	                  ] })
	                ]
	              },
	              city.id
	            )) }),
	            cityResults.length === 0 && searchingCity && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-secondary)" }, children: "\u641C\u7D22\u4E2D\u2026" }),
	            cityResults.length === 0 && !searchingCity && cityQuery.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: "11px", color: "var(--dsw-alias-label-secondary)" }, children: [
	              "\u672A\u627E\u5230\u300C",
	              cityQuery.trim(),
	              "\u300D\uFF0C\u8BD5\u8BD5\u66F4\u77ED\u7684\u5730\u540D\u6216\u57CE\u5E02\u540D"
	            ] })
	          ] }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.heroWeather, children: [
	            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: WeatherDashboard_default.heroTemperature, children: formatTemperature(current.temperature) }),
	            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.heroCondition, children: [
	              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeatherGlyph, { condition: current.condition, large: true }),
	              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
	                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: CONDITION_LABELS[current.condition] }),
	                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
	                  "\u98CE\u5411 ",
	                  windDirection(current.windDirection),
	                  " \xB7 \u6C14\u538B ",
	                  current.pressure,
	                  " hPa"
	                ] })
	              ] })
	            ] })
	          ] }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: WeatherDashboard_default.metrics, children: metrics.map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.metric, children: [
	            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: metric.label }),
	            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: metric.value })
	          ] }, metric.label)) }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HourlyChart, { hourly: data.hourly }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.forecast, children: [
	            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: WeatherDashboard_default.sectionHeader, children: [
	              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
	                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.sectionKicker, children: "\u672A\u6765\u9884\u62A5" }),
	                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.chartUnit, children: "\u4E94\u65E5\u8D8B\u52BF" })
	              ] }),
	              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: WeatherDashboard_default.sectionNote, children: "\u6700\u9AD8 / \u6700\u4F4E" })
	            ] }),
	            data.daily.map((forecast) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForecastRow, { forecast }, forecast.date))
	          ] }),
	          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { className: WeatherDashboard_default.footer, children: [
	            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6570\u636E\u6765\u6E90 \xB7 Open-Meteo" }),
	            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u81EA\u52A8\u56DE\u9000\u793A\u4F8B\u6570\u636E" })
	          ] })
	        ] })
	      ]
	    }
	  );
	}
	
	// src/client/index.ts
	var inject = ["slots"];
	function apply(ctx) {
	  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
	    name: "shell.overlay",
	    id: "weather",
	    order: 80,
	    inject: () => ({ request: globalThis.fetch.bind(globalThis) })
	  }, WeatherDashboard));
	}
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
