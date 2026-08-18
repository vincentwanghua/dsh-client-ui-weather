import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { IconCloseOutline16, IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WeatherRequest } from './weather-data.ts'
import {
  DEFAULT_CITY,
  fetchWeather,
  fallbackWeather,
  WEATHER_CITIES,
  type DayForecast,
  type WeatherCity,
  type WeatherCondition,
  type WeatherSnapshot,
} from './weather-data.ts'
import css from './WeatherDashboard.module.css'

/** The plain injected face used by the weather overlay. */
export interface WeatherDashboardInjected {
  /** Browser fetch narrowed to the public weather endpoint. */
  request: WeatherRequest
}

/** Full props for the root-scoped shell overlay entry. */
export type WeatherDashboardProps = PropsRuntime<'shell.overlay'> & WeatherDashboardInjected

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: '晴',
  'partly-cloudy': '晴间多云',
  cloudy: '多云',
  rain: '小雨',
  storm: '雷雨',
  snow: '小雪',
}

const CONDITION_GLYPHS: Record<WeatherCondition, string> = {
  clear: '☀',
  'partly-cloudy': '◐',
  cloudy: '☁',
  rain: '☂',
  storm: 'ϟ',
  snow: '✳',
}

/** Small semantic weather glyph; no external image asset or icon font required. */
function WeatherGlyph({ condition, large = false }: { condition: WeatherCondition; large?: boolean }): ReactElement {
  return (
    <span
      className={large ? `${css.glyph} ${css.glyphLarge}` : css.glyph}
      data-condition={condition}
      aria-hidden="true"
    >
      {CONDITION_GLYPHS[condition]}
    </span>
  )
}

function formatUpdatedAt(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function formatTemperature(value: number): string {
  return `${Math.round(value)}°`
}

function windDirection(degrees: number): string {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return directions[Math.round(degrees / 45) % directions.length]!
}

function chartPath(points: readonly { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
}

/**
 * Accessible hourly temperature trend chart. The labels and points remain
 * visible without hover, following the dashboard's editorial data-viz rules.
 */
function HourlyChart({ hourly }: { hourly: WeatherSnapshot['hourly'] }): ReactElement {
  const values = hourly.map((point) => point.temperature)
  const min = Math.min(...values) - 1
  const max = Math.max(...values) + 1
  const points = hourly.map((point, index) => ({
    x: 14 + (index * 252) / (hourly.length - 1),
    y: 82 - ((point.temperature - min) / (max - min)) * 48,
  }))
  const path = chartPath(points)
  const area = `${path} L ${points[points.length - 1]!.x.toFixed(1)} 90 L ${points[0]!.x.toFixed(1)} 90 Z`
  return (
    <div className={css.chartBox}>
      <div className={css.chartHeader}>
        <div>
          <span className={css.sectionKicker}>温度趋势</span>
          <span className={css.chartUnit}>未来 8 小时 · °C</span>
        </div>
        <span className={css.chartRange}>{formatTemperature(Math.min(...values))} — {formatTemperature(Math.max(...values))}</span>
      </div>
      <svg className={css.chart} viewBox="0 0 280 118" role="img" aria-label="未来八小时温度趋势">
        <defs>
          <linearGradient id="weather-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--weather-accent)" stopOpacity=".22" />
            <stop offset="1" stopColor="var(--weather-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M 14 90 H 266" className={css.chartAxis} />
        <path d={area} className={css.chartArea} />
        <path d={path} className={css.chartLine} />
        {points.map((point, index) => (
          <g key={hourly[index]?.time}>
            <circle cx={point.x} cy={point.y} r="3.5" className={css.chartPoint} />
            <text x={point.x} y="108" textAnchor="middle" className={css.chartLabel}>{hourly[index]?.time.slice(0, 5)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function ForecastRow({ forecast }: { forecast: DayForecast }): ReactElement {
  return (
    <div className={css.forecastRow}>
      <div className={css.forecastDay}>
        <strong>{forecast.day}</strong>
        <span>{forecast.date}</span>
      </div>
      <WeatherGlyph condition={forecast.condition} />
      <span className={css.forecastCondition}>{CONDITION_LABELS[forecast.condition]}</span>
      <div className={css.precipitation} title={`降水概率 ${forecast.precipitation}%`}>
        <span className={css.rainDot} />
        {forecast.precipitation}%
      </div>
      <div className={css.forecastTemps}>
        <strong>{formatTemperature(forecast.high)}</strong>
        <span>{formatTemperature(forecast.low)}</span>
      </div>
    </div>
  )
}

/**
 * Floating weather dashboard. It starts open so the current conditions are
 * visible on the first paint, then can be reduced to a quiet pulse button.
 * @param props - injected browser request and root-slot runtime share.
 * @returns the weather pulse or expanded dashboard card.
 */
export function WeatherDashboard({ request }: WeatherDashboardProps): ReactElement {
  const [cityId, setCityId] = useState(DEFAULT_CITY.id)
  const [data, setData] = useState<WeatherSnapshot>(() => fallbackWeather(DEFAULT_CITY))
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const selectedCity = WEATHER_CITIES.find((city) => city.id === cityId)!

  const load = useCallback(async (city: WeatherCity): Promise<void> => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const id = ++requestId.current
    setData(fallbackWeather(city))
    setLoading(true)
    try {
      const next = await fetchWeather(city, request, Date.now(), controller.signal)
      if (id !== requestId.current) return
      setData(next)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [request])

  useEffect(() => {
    void load(selectedCity)
    return () => {
      requestId.current += 1
      abortRef.current?.abort()
      abortRef.current = undefined
    }
  }, [load, selectedCity])

  const current = data.current
  const metrics = useMemo(() => [
    { label: '体感', value: formatTemperature(current.feelsLike) },
    { label: '湿度', value: `${current.humidity}%` },
    { label: '风速', value: `${current.wind} km/h` },
    { label: '能见度', value: `${current.visibility} km` },
  ], [current])

  return (
    <div className={css.root} data-weather-dashboard data-open={open || undefined}>
      {!open && (
        <button type="button" className={css.pulse} onClick={() => { setOpen(true) }} aria-label="打开天气看板">
          <WeatherGlyph condition={current.condition} />
          <span>{formatTemperature(current.temperature)}</span>
          <span className={css.pulseCity}>{data.city}</span>
        </button>
      )}
      {open && (
        <section className={css.card} aria-label="天气看板">
          <header className={css.header}>
            <div className={css.brandLine}>
              <span className={css.liveMark} />
              <span className={css.eyebrow}>WEATHER DESK</span>
              <span className={css.source}>{data.source === 'live' ? '实时' : '示例数据'}</span>
            </div>
            <div className={css.headerActions}>
              <button type="button" className={css.iconButton} onClick={() => { void load(selectedCity) }} disabled={loading} aria-label="刷新天气">
                <IconRefreshOutline14 className={loading ? css.spinning : undefined} />
              </button>
              <button type="button" className={css.iconButton} onClick={() => { setOpen(false) }} aria-label="收起天气看板">
                <IconCloseOutline16 size={14} />
              </button>
            </div>
          </header>

          <div className={css.cityRow}>
            <div>
              <span className={css.label}>当前城市</span>
              <h2>{data.city}</h2>
              <span className={css.country}>{data.country} · 更新于 {formatUpdatedAt(data.updatedAt, selectedCity.timezone)}</span>
            </div>
            <select
              aria-label="选择城市"
              value={cityId}
              onChange={(event) => {
                const city = WEATHER_CITIES.find((item) => item.id === event.currentTarget.value)!
                setCityId(city.id)
                setData(fallbackWeather(city))
              }}
            >
              {WEATHER_CITIES.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </div>

          <div className={css.heroWeather}>
            <div className={css.heroTemperature}>{formatTemperature(current.temperature)}</div>
            <div className={css.heroCondition}>
              <WeatherGlyph condition={current.condition} large />
              <div>
                <strong>{CONDITION_LABELS[current.condition]}</strong>
                <span>风向 {windDirection(current.windDirection)} · 气压 {current.pressure} hPa</span>
              </div>
            </div>
          </div>

          <div className={css.metrics}>
            {metrics.map((metric) => (
              <div className={css.metric} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <HourlyChart hourly={data.hourly} />

          <div className={css.forecast}>
            <div className={css.sectionHeader}>
              <div>
                <span className={css.sectionKicker}>未来预报</span>
                <span className={css.chartUnit}>五日趋势</span>
              </div>
              <span className={css.sectionNote}>最高 / 最低</span>
            </div>
            {data.daily.map((forecast) => <ForecastRow key={forecast.date} forecast={forecast} />)}
          </div>
          <footer className={css.footer}>
            <span>数据来源 · Open-Meteo</span>
            <span>自动回退示例数据</span>
          </footer>
        </section>
      )}
    </div>
  )
}
