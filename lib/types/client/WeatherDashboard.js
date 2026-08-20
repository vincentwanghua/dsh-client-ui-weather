import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconCloseOutline16, IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import { DEFAULT_CITY, fetchWeather, fallbackWeather, WEATHER_CITIES, } from "./weather-data.js";
import css from './WeatherDashboard.module.css';
const CONDITION_LABELS = {
    clear: '晴',
    'partly-cloudy': '晴间多云',
    cloudy: '多云',
    rain: '小雨',
    storm: '雷雨',
    snow: '小雪',
};
const CONDITION_GLYPHS = {
    clear: '☀',
    'partly-cloudy': '◐',
    cloudy: '☁',
    rain: '☂',
    storm: 'ϟ',
    snow: '✳',
};
/** Small semantic weather glyph; no external image asset or icon font required. */
function WeatherGlyph({ condition, large = false }) {
    return (_jsx("span", { className: large ? `${css.glyph} ${css.glyphLarge}` : css.glyph, "data-condition": condition, "aria-hidden": "true", children: CONDITION_GLYPHS[condition] }));
}
function formatUpdatedAt(timestamp, timeZone) {
    return new Intl.DateTimeFormat('zh-CN', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
    }).format(timestamp);
}
function formatTemperature(value) {
    return `${Math.round(value)}°`;
}
function windDirection(degrees) {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    return directions[Math.round(degrees / 45) % directions.length];
}
function chartPath(points) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
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
        x: 14 + (index * 252) / (hourly.length - 1),
        y: 82 - ((point.temperature - min) / (max - min)) * 48,
    }));
    const path = chartPath(points);
    const area = `${path} L ${points[points.length - 1].x.toFixed(1)} 90 L ${points[0].x.toFixed(1)} 90 Z`;
    return (_jsxs("div", { className: css.chartBox, children: [_jsxs("div", { className: css.chartHeader, children: [_jsxs("div", { children: [_jsx("span", { className: css.sectionKicker, children: "\u6E29\u5EA6\u8D8B\u52BF" }), _jsx("span", { className: css.chartUnit, children: "\u672A\u6765 8 \u5C0F\u65F6 \u00B7 \u00B0C" })] }), _jsxs("span", { className: css.chartRange, children: [formatTemperature(Math.min(...values)), " \u2014 ", formatTemperature(Math.max(...values))] })] }), _jsxs("svg", { className: css.chart, viewBox: "0 0 280 118", role: "img", "aria-label": "\u672A\u6765\u516B\u5C0F\u65F6\u6E29\u5EA6\u8D8B\u52BF", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "weather-chart-fill", x1: "0", x2: "0", y1: "0", y2: "1", children: [_jsx("stop", { offset: "0", stopColor: "var(--weather-accent)", stopOpacity: ".22" }), _jsx("stop", { offset: "1", stopColor: "var(--weather-accent)", stopOpacity: "0" })] }) }), _jsx("path", { d: "M 14 90 H 266", className: css.chartAxis }), _jsx("path", { d: area, className: css.chartArea }), _jsx("path", { d: path, className: css.chartLine }), points.map((point, index) => (_jsxs("g", { children: [_jsx("circle", { cx: point.x, cy: point.y, r: "3.5", className: css.chartPoint }), _jsx("text", { x: point.x, y: "108", textAnchor: "middle", className: css.chartLabel, children: hourly[index]?.time.slice(0, 5) })] }, hourly[index]?.time)))] })] }));
}
function ForecastRow({ forecast }) {
    return (_jsxs("div", { className: css.forecastRow, children: [_jsxs("div", { className: css.forecastDay, children: [_jsx("strong", { children: forecast.day }), _jsx("span", { children: forecast.date })] }), _jsx(WeatherGlyph, { condition: forecast.condition }), _jsx("span", { className: css.forecastCondition, children: CONDITION_LABELS[forecast.condition] }), _jsxs("div", { className: css.precipitation, title: `降水概率 ${forecast.precipitation}%`, children: [_jsx("span", { className: css.rainDot }), forecast.precipitation, "%"] }), _jsxs("div", { className: css.forecastTemps, children: [_jsx("strong", { children: formatTemperature(forecast.high) }), _jsx("span", { children: formatTemperature(forecast.low) })] })] }));
}
/**
 * Floating weather dashboard. It starts open so the current conditions are
 * visible on the first paint, then can be reduced to a quiet pulse button.
 * @param props - injected browser request and root-slot runtime share.
 * @returns the weather pulse or expanded dashboard card.
 */
export function WeatherDashboard({ request }) {
    const [cityId, setCityId] = useState(DEFAULT_CITY.id);
    const [data, setData] = useState(() => fallbackWeather(DEFAULT_CITY));
    const [open, setOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const requestId = useRef(0);
    const abortRef = useRef(undefined);
    const selectedCity = WEATHER_CITIES.find((city) => city.id === cityId);
    const load = useCallback(async (city) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const id = ++requestId.current;
        setData(fallbackWeather(city));
        setLoading(true);
        try {
            const next = await fetchWeather(city, request, Date.now(), controller.signal);
            if (id !== requestId.current)
                return;
            setData(next);
        }
        finally {
            if (id === requestId.current)
                setLoading(false);
        }
    }, [request]);
    useEffect(() => {
        void load(selectedCity);
        return () => {
            requestId.current += 1;
            abortRef.current?.abort();
            abortRef.current = undefined;
        };
    }, [load, selectedCity]);
    const current = data.current;
    const metrics = useMemo(() => [
        { label: '体感', value: formatTemperature(current.feelsLike) },
        { label: '湿度', value: `${current.humidity}%` },
        { label: '风速', value: `${current.wind} km/h` },
        { label: '能见度', value: `${current.visibility} km` },
    ], [current]);
    return (_jsxs("div", { className: css.root, "data-weather-dashboard": true, "data-open": open || undefined, children: [!open && (_jsxs("button", { type: "button", className: css.pulse, onClick: () => { setOpen(true); }, "aria-label": "\u6253\u5F00\u5929\u6C14\u770B\u677F", children: [_jsx(WeatherGlyph, { condition: current.condition }), _jsx("span", { children: formatTemperature(current.temperature) }), _jsx("span", { className: css.pulseCity, children: data.city })] })), open && (_jsxs("section", { className: css.card, "aria-label": "\u5929\u6C14\u770B\u677F", children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { className: css.brandLine, children: [_jsx("span", { className: css.liveMark }), _jsx("span", { className: css.eyebrow, children: "WEATHER DESK" }), _jsx("span", { className: css.source, children: data.source === 'live' ? '实时' : '示例数据' })] }), _jsxs("div", { className: css.headerActions, children: [_jsx("button", { type: "button", className: css.iconButton, onClick: () => { void load(selectedCity); }, disabled: loading, "aria-label": "\u5237\u65B0\u5929\u6C14", children: _jsx(IconRefreshOutline14, { className: loading ? css.spinning : undefined }) }), _jsx("button", { type: "button", className: css.iconButton, onClick: () => { setOpen(false); }, "aria-label": "\u6536\u8D77\u5929\u6C14\u770B\u677F", children: _jsx(IconCloseOutline16, { size: 14 }) })] })] }), _jsxs("div", { className: css.cityRow, children: [_jsxs("div", { children: [_jsx("span", { className: css.label, children: "\u5F53\u524D\u57CE\u5E02" }), _jsx("h2", { children: data.city }), _jsxs("span", { className: css.country, children: [data.country, " \u00B7 \u66F4\u65B0\u4E8E ", formatUpdatedAt(data.updatedAt, selectedCity.timezone)] })] }), _jsx("select", { "aria-label": "\u9009\u62E9\u57CE\u5E02", value: cityId, onChange: (event) => {
                                    const city = WEATHER_CITIES.find((item) => item.id === event.currentTarget.value);
                                    setCityId(city.id);
                                    setData(fallbackWeather(city));
                                }, children: WEATHER_CITIES.map((city) => _jsx("option", { value: city.id, children: city.name }, city.id)) })] }), _jsxs("div", { className: css.heroWeather, children: [_jsx("div", { className: css.heroTemperature, children: formatTemperature(current.temperature) }), _jsxs("div", { className: css.heroCondition, children: [_jsx(WeatherGlyph, { condition: current.condition, large: true }), _jsxs("div", { children: [_jsx("strong", { children: CONDITION_LABELS[current.condition] }), _jsxs("span", { children: ["\u98CE\u5411 ", windDirection(current.windDirection), " \u00B7 \u6C14\u538B ", current.pressure, " hPa"] })] })] })] }), _jsx("div", { className: css.metrics, children: metrics.map((metric) => (_jsxs("div", { className: css.metric, children: [_jsx("span", { children: metric.label }), _jsx("strong", { children: metric.value })] }, metric.label))) }), _jsx(HourlyChart, { hourly: data.hourly }), _jsxs("div", { className: css.forecast, children: [_jsxs("div", { className: css.sectionHeader, children: [_jsxs("div", { children: [_jsx("span", { className: css.sectionKicker, children: "\u672A\u6765\u9884\u62A5" }), _jsx("span", { className: css.chartUnit, children: "\u4E94\u65E5\u8D8B\u52BF" })] }), _jsx("span", { className: css.sectionNote, children: "\u6700\u9AD8 / \u6700\u4F4E" })] }), data.daily.map((forecast) => _jsx(ForecastRow, { forecast: forecast }, forecast.date))] }), _jsxs("footer", { className: css.footer, children: [_jsx("span", { children: "\u6570\u636E\u6765\u6E90 \u00B7 Open-Meteo" }), _jsx("span", { children: "\u81EA\u52A8\u56DE\u9000\u793A\u4F8B\u6570\u636E" })] })] }))] }));
}
//# sourceMappingURL=WeatherDashboard.js.map