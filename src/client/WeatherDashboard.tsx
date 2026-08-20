import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { IconCloseOutline16, IconRefreshOutline14, IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WeatherRequest } from './weather-data.ts'
import {
  DEFAULT_CITY,
  fetchWeather,
  fallbackWeather,
  geocodeCity,
  loadCustomCities,
  loadDragPosition,
  loadHiddenBuiltinIds,
  saveCustomCities,
  saveDragPosition,
  saveHiddenBuiltinIds,
  WEATHER_CITIES,
  type DayForecast,
  type DragPosition,
  type GeocodeResult,
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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
  const [customCities, setCustomCities] = useState<WeatherCity[]>(loadCustomCities)
  const [hiddenBuiltinIds, setHiddenBuiltinIds] = useState<string[]>(loadHiddenBuiltinIds)
  const visibleCities = useMemo<WeatherCity[]>(
    () => WEATHER_CITIES.filter((city) => !hiddenBuiltinIds.includes(city.id)).concat(customCities),
    [hiddenBuiltinIds, customCities],
  )
  const [cityId, setCityId] = useState(DEFAULT_CITY.id)
  const [cityMenuOpen, setCityMenuOpen] = useState(false)
  const [data, setData] = useState<WeatherSnapshot>(() => fallbackWeather(DEFAULT_CITY))
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<GeocodeResult[]>([])
  const [searchingCity, setSearchingCity] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const requestId = useRef(0)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const selectedCity = visibleCities.find((city) => city.id === cityId) ?? visibleCities[0] ?? DEFAULT_CITY

  const searchCity = useCallback(async (): Promise<void> => {
    const query = cityQuery.trim()
    if (!query) return
    setSearchingCity(true)
    setCityResults([])
    try {
      const results = await geocodeCity(query, request)
      setCityResults(results)
    } catch {
      setCityResults([])
    } finally {
      setSearchingCity(false)
    }
  }, [cityQuery, request])

  const addCustomCity = useCallback((city: GeocodeResult): void => {
    setCustomCities((prev) => {
      if (prev.some((item) => item.id === city.id)) return prev
      const next = [...prev, city]
      saveCustomCities(next)
      return next
    })
    setCityId(city.id)
    setCityQuery('')
    setCityResults([])
  }, [])

  const removeCity = useCallback((cityIdToRemove: string): void => {
    const isBuiltin = WEATHER_CITIES.some((city) => city.id === cityIdToRemove)
    if (isBuiltin) {
      setHiddenBuiltinIds((prev) => {
        if (prev.includes(cityIdToRemove)) return prev
        const next = [...prev, cityIdToRemove]
        saveHiddenBuiltinIds(next)
        return next
      })
    } else {
      setCustomCities((prev) => {
        const next = prev.filter((city) => city.id !== cityIdToRemove)
        saveCustomCities(next)
        return next
      })
    }
    setCityId((current) => {
      if (current !== cityIdToRemove) return current
      const remaining = visibleCities.filter((city) => city.id !== cityIdToRemove)
      return remaining.length > 0 ? remaining[0]!.id : DEFAULT_CITY.id
    })
  }, [visibleCities])

  const restoreAllCities = useCallback((): void => {
    setHiddenBuiltinIds((prev) => {
      if (prev.length === 0) return prev
      saveHiddenBuiltinIds([])
      return []
    })
  }, [])

  // Draggable dashboard: press and hold the header to move the card.
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(loadDragPosition)
  const [dragging, setDragging] = useState(false)
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; originLeft: number; originTop: number } | null>(null)

  const beginHeaderDrag = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    // Let buttons/inputs handle their own interactions instead of dragging.
    if (target.closest('button, select, input, [data-weather-city-menu], [data-weather-search]')) return
    const root = rootRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }, [])

  const moveHeaderDrag = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragStateRef.current
    const root = rootRef.current
    if (!drag || !root || event.pointerId !== drag.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const width = root.offsetWidth
    const height = root.offsetHeight
    const margin = 8
    const left = Math.min(Math.max(drag.originLeft + dx, margin), window.innerWidth - width - margin)
    const top = Math.min(Math.max(drag.originTop + dy, margin), window.innerHeight - height - margin)
    setDragPosition({ left, top })
  }, [])

  const endHeaderDrag = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragStateRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragStateRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // pointer capture may already be released
    }
  }, [])

  useEffect(() => {
    if (dragPosition !== null) saveDragPosition(dragPosition)
  }, [dragPosition])

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
    <div
      ref={rootRef}
      className={css.root}
      data-weather-dashboard
      data-open={open || undefined}
      data-dragging={dragging || undefined}
      style={dragPosition !== null ? { left: dragPosition.left, top: dragPosition.top } : undefined}
    >
      {!open && (
        <button type="button" className={css.pulse} onClick={() => { setOpen(true) }} aria-label="打开天气看板">
          <WeatherGlyph condition={current.condition} />
          <span>{formatTemperature(current.temperature)}</span>
          <span className={css.pulseCity}>{data.city}</span>
        </button>
      )}
      {open && (
        <section className={css.card} aria-label="天气看板">
          <header
            className={css.header}
            onPointerDown={beginHeaderDrag}
            onPointerMove={moveHeaderDrag}
            onPointerUp={endHeaderDrag}
            onPointerCancel={endHeaderDrag}
            style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          >
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
              <span className={css.country}>
                {(selectedCity as WeatherCity).area ?? data.country} · 更新于 {formatUpdatedAt(data.updatedAt, selectedCity.timezone)}
              </span>
            </div>
            <button
              type="button"
              className={css.iconButton}
              onClick={() => { setCityMenuOpen((prev) => !prev) }}
              aria-label="切换或管理城市"
              title="切换或管理城市"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, width: 'auto', minWidth: '52px', padding: '0 6px' }}
            >
              <span>{data.city}</span>
              <span style={{ fontSize: '9px', opacity: '.7' }}>{cityMenuOpen ? '▲' : '▼'}</span>
            </button>
            <button
              type="button"
              className={css.iconButton}
              onClick={() => {
                setSearchOpen((prev) => !prev)
                if (!searchOpen) {
                  setCityResults([])
                  setCityQuery('')
                  setSearchingCity(false)
                }
              }}
              aria-label="添加城市"
              title="搜索并添加城市"
            >
              <IconSearchOutline16 size={14} />
            </button>
          </div>

          {cityMenuOpen && (
            <div
              data-weather-city-menu
              style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'auto' }}
              onClick={() => { setCityMenuOpen(false) }}
            />
          )}
          {cityMenuOpen && (
            <div
              data-weather-city-menu
              style={{
                position: 'relative',
                zIndex: 21,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                margin: '0 12px 8px',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--dsw-alias-border-l2)',
                background: 'var(--dsw-alias-bg-layer-2)',
                boxShadow: 'var(--dsw-shadow-lv3)',
                pointerEvents: 'auto',
              }}
            >
              {visibleCities.map((city) => (
                <div
                  key={city.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    padding: '5px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: city.id === cityId ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
                    color: 'var(--dsw-alias-label-primary)',
                    fontSize: '12px',
                  }}
                  onClick={() => {
                    setCityId(city.id)
                    setData(fallbackWeather(city))
                    setCityMenuOpen(false)
                  }}
                >
                  <span>{city.name}</span>
                  <button
                    type="button"
                    className={css.iconButton}
                    onClick={(event) => {
                      event.stopPropagation()
                      removeCity(city.id)
                    }}
                    aria-label={`移除城市 ${city.name}`}
                    title="移除该城市"
                    style={{ width: '20px', height: '20px', fontSize: '11px', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {hiddenBuiltinIds.length > 0 && (
                <button
                  type="button"
                  className={css.iconButton}
                  onClick={(event) => {
                    event.stopPropagation()
                    restoreAllCities()
                  }}
                  style={{ marginTop: '4px', justifyContent: 'center', width: '100%', padding: '4px 8px', fontSize: '11px', color: 'var(--weather-accent)' }}
                >
                  恢复默认城市
                </button>
              )}
            </div>
          )}

          {searchOpen && (
            <div data-weather-search style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1)', pointerEvents: 'auto' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(event) => { setCityQuery(event.currentTarget.value) }}
                  onKeyDown={(event) => { if (event.key === 'Enter') void searchCity() }}
                  placeholder="输入区/地名，如 海淀区 / 中关村大街 / Chengdu"
                  aria-label="搜索城市"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    background: 'var(--dsw-alias-bg-layer-1)',
                    color: 'var(--dsw-alias-label-primary)',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="button"
                  className={css.iconButton}
                  onClick={() => { void searchCity() }}
                  disabled={searchingCity}
                  aria-label="搜索"
                >
                  {searchingCity ? '…' : '搜索'}
                </button>
              </div>
              {cityResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                  {cityResults.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      className={css.iconButton}
                      onClick={() => { addCustomCity(city) }}
                      style={{ justifyContent: 'flex-start', width: '100%', padding: '6px 8px', borderRadius: '8px', gap: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-primary)' }}
                    >
                      <span>{city.name}</span>
                      <span style={{ color: 'var(--dsw-alias-label-secondary)', fontSize: '11px' }}>
                        {(city.area ?? city.country)} · {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {cityResults.length === 0 && searchingCity && (
                <span style={{ fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' }}>搜索中…</span>
              )}
              {cityResults.length === 0 && !searchingCity && cityQuery.trim() && (
                <span style={{ fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' }}>未找到「{cityQuery.trim()}」，试试更短的地名或城市名</span>
              )}
            </div>
          )}

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
