/** Browser-safe weather data used by the dashboard view. */
export interface WeatherSnapshot {
  readonly city: string
  readonly country: string
  readonly source: 'live' | 'sample'
  readonly updatedAt: number
  readonly current: {
    readonly temperature: number
    readonly feelsLike: number
    readonly condition: WeatherCondition
    readonly humidity: number
    readonly wind: number
    readonly windDirection: number
    readonly pressure: number
    readonly visibility: number
  }
  readonly hourly: readonly HourPoint[]
  readonly daily: readonly DayForecast[]
}

/** One point in the city's eight-hour temperature trend. */
export interface HourPoint {
  readonly time: string
  readonly temperature: number
  readonly precipitation: number
  readonly condition: WeatherCondition
}

/** One row in the five-day forecast. */
export interface DayForecast {
  readonly day: string
  readonly date: string
  readonly condition: WeatherCondition
  readonly high: number
  readonly low: number
  readonly precipitation: number
}

/** Compact condition vocabulary rendered by the dashboard. */
export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'snow'

/** Supported city coordinates and the timezone used by Open-Meteo. */
export interface WeatherCity {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly latitude: number
  readonly longitude: number
  readonly timezone: string
}

/** Cities offered by the dashboard selector. */
export const WEATHER_CITIES: readonly WeatherCity[] = [
  { id: 'shanghai', name: '上海', country: '中国', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' },
  { id: 'beijing', name: '北京', country: '中国', latitude: 39.90, longitude: 116.40, timezone: 'Asia/Shanghai' },
  { id: 'shenzhen', name: '深圳', country: '中国', latitude: 22.54, longitude: 114.06, timezone: 'Asia/Shanghai' },
  { id: 'tokyo', name: '东京', country: '日本', latitude: 35.68, longitude: 139.65, timezone: 'Asia/Tokyo' },
  { id: 'london', name: '伦敦', country: '英国', latitude: 51.51, longitude: -0.13, timezone: 'Europe/London' },
  { id: 'new-york', name: '纽约', country: '美国', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' },
]

/** Default city shown on the first render. */
export const DEFAULT_CITY: WeatherCity = WEATHER_CITIES[0]!

/** Narrow request face injected by the browser plugin for deterministic tests. */
export type WeatherRequest = typeof fetch

/** localStorage key holding user-added cities (custom city support). */
const CUSTOM_CITIES_KEY = 'dsh-weather.custom-cities'

/** Read user-added cities from localStorage; malformed data is ignored. */
export function loadCustomCities(): WeatherCity[] {
  try {
    const raw = globalThis.localStorage?.getItem(CUSTOM_CITIES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((city): city is WeatherCity => {
      if (city === null || typeof city !== 'object') return false
      const candidate = city as Record<string, unknown>
      return typeof candidate.id === 'string'
        && typeof candidate.name === 'string'
        && typeof candidate.country === 'string'
        && typeof candidate.latitude === 'number'
        && typeof candidate.longitude === 'number'
        && typeof candidate.timezone === 'string'
    })
  } catch {
    return []
  }
}

/** Persist user-added cities; storage failures are silently ignored. */
export function saveCustomCities(cities: readonly WeatherCity[]): void {
  try {
    globalThis.localStorage?.setItem(CUSTOM_CITIES_KEY, JSON.stringify(cities))
  } catch {
    // ignore storage failures
  }
}

/** localStorage key holding built-in city ids hidden by the user. */
const HIDDEN_BUILTIN_KEY = 'dsh-weather.hidden-builtin'

/** Read hidden built-in city ids; malformed data is ignored. */
export function loadHiddenBuiltinIds(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(HIDDEN_BUILTIN_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string' && WEATHER_CITIES.some((city) => city.id === id))
  } catch {
    return []
  }
}

/** Persist hidden built-in city ids; storage failures are silently ignored. */
export function saveHiddenBuiltinIds(ids: readonly string[]): void {
  try {
    globalThis.localStorage?.setItem(HIDDEN_BUILTIN_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage failures
  }
}

/** A geocoding match from the Open-Meteo search endpoint. */
export interface GeocodeResult {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly latitude: number
  readonly longitude: number
  readonly timezone: string
}

/**
 * Search Open-Meteo geocoding for a city name (same provider, no API key).
 * @param query - city name or partial name.
 * @param request - browser request function.
 * @param signal - optional cancellation signal.
 * @returns candidate cities with coordinates, country and timezone.
 */
export async function geocodeCity(
  query: string,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'zh',
    format: 'json',
  })
  const controller = new AbortController()
  let rejectAbort: (() => void) | undefined
  const abortPromise = new Promise<never>((_, reject) => {
    rejectAbort = () => { reject(new Error('geocode request aborted')) }
  })
  const abort = (): void => {
    controller.abort()
    rejectAbort?.()
  }
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await Promise.race([
      abortPromise,
      request(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, { signal: controller.signal }),
    ])
    if (!response.ok) throw new Error(`geocode request failed: ${response.status}`)
    const payload: unknown = await response.json()
    const results = (payload as { results?: unknown }).results
    if (!Array.isArray(results)) return []
    return results.flatMap((item): GeocodeResult[] => {
      if (item === null || typeof item !== 'object') return []
      const candidate = item as Record<string, unknown>
      if (typeof candidate.name !== 'string' || typeof candidate.latitude !== 'number' || typeof candidate.longitude !== 'number') return []
      const name = candidate.name
      return [{
        id: `custom-${candidate.latitude.toFixed(3)}-${candidate.longitude.toFixed(3)}-${name}`,
        name,
        country: typeof candidate.country === 'string' ? candidate.country : typeof candidate.country_code === 'string' ? candidate.country_code : '',
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        timezone: typeof candidate.timezone === 'string' ? candidate.timezone : 'UTC',
      }]
    })
  } finally {
    signal?.removeEventListener('abort', abort)
  }
}

/** Upper bound for one public-provider request before sample data takes over. */
const WEATHER_REQUEST_TIMEOUT_MS = 10_000

/** Return the local calendar parts used by a city's forecast timezone. */
function localParts(timestamp: number, timeZone: string): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(timestamp).map(({ type, value }) => [type, value]))
}

function calendarDateKey(timestamp: number, timeZone: string): string {
  const parts = localParts(timestamp, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function addCalendarDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Demo-quality fallback keeps the dashboard useful when an API is offline.
 * @param city - selected city metadata.
 * @param now - timestamp used to seed the sample values.
 * @returns deterministic sample weather for the selected city.
 */
export function fallbackWeather(city: WeatherCity, now = Date.now()): WeatherSnapshot {
  const seed = Math.round((city.latitude + city.longitude) * 10)
  const base = 18 + Math.abs(seed % 11)
  const hourly = Array.from({ length: 8 }, (_, index) => {
    const parts = localParts(now + index * 3_600_000, city.timezone)
    const wave = Math.round(Math.sin(index / 2.1) * 3)
    return {
      time: `${parts.hour}:00`,
      temperature: base + wave,
      precipitation: index % 5 === 3 ? 34 : index % 3 === 0 ? 12 : 4,
      condition: index > 4 ? 'partly-cloudy' as const : 'clear' as const,
    }
  })
  const startDate = calendarDateKey(now, city.timezone)
  const daily = Array.from({ length: 5 }, (_, index) => {
    const dateKey = addCalendarDays(startDate, index)
    const date = new Date(`${dateKey}T12:00:00Z`)
    const high = base + 3 + (index % 2)
    return {
      day: index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: 'UTC' }).format(date),
      date: `${Number(dateKey.slice(5, 7))}/${Number(dateKey.slice(8, 10))}`,
      condition: index === 2 ? 'rain' as const : index === 4 ? 'cloudy' as const : 'partly-cloudy' as const,
      high,
      low: high - 8,
      precipitation: index === 2 ? 52 : index === 4 ? 28 : 12,
    }
  })
  return {
    city: city.name,
    country: city.country,
    source: 'sample',
    updatedAt: now,
    current: {
      temperature: base,
      feelsLike: base + 1,
      condition: 'partly-cloudy',
      humidity: 68,
      wind: 13,
      windDirection: 235,
      pressure: 1012,
      visibility: 10,
    },
    hourly,
    daily,
  }
}

/** Open-Meteo weather codes mapped to the small condition vocabulary.
 * @param code - Open-Meteo numeric weather code.
 * @returns the dashboard condition corresponding to the code.
 */
export function conditionFromCode(code: number): WeatherCondition {
  if (code === 0) return 'clear'
  if (code <= 3) return 'partly-cloudy'
  if (code <= 48) return 'cloudy'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

interface OpenMeteoResponse {
  readonly current: {
    readonly temperature_2m: number
    readonly apparent_temperature: number
    readonly relative_humidity_2m: number
    readonly wind_speed_10m: number
    readonly wind_direction_10m: number
    readonly pressure_msl: number
    readonly visibility: number
    readonly weather_code: number
  }
  readonly hourly: {
    readonly time: readonly string[]
    readonly temperature_2m: readonly number[]
    readonly precipitation_probability: readonly number[]
    readonly weather_code: readonly number[]
  }
  readonly daily: {
    readonly time: readonly string[]
    readonly temperature_2m_max: readonly number[]
    readonly temperature_2m_min: readonly number[]
    readonly precipitation_probability_max: readonly number[]
    readonly weather_code: readonly number[]
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every(isFiniteNumber)
}

function isStringArray(value: unknown, pattern: RegExp): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && pattern.test(item))
}

function isOpenMeteoResponse(value: unknown): value is OpenMeteoResponse {
  if (value === null || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  const current = payload.current
  const hourly = payload.hourly
  const daily = payload.daily
  if (current === null || typeof current !== 'object' || hourly === null || typeof hourly !== 'object'
    || daily === null || typeof daily !== 'object') return false
  const currentValues = current as Record<string, unknown>
  const hourlyValues = hourly as Record<string, unknown>
  const dailyValues = daily as Record<string, unknown>
  const currentFields = [
    currentValues.temperature_2m,
    currentValues.apparent_temperature,
    currentValues.relative_humidity_2m,
    currentValues.wind_speed_10m,
    currentValues.wind_direction_10m,
    currentValues.pressure_msl,
    currentValues.visibility,
    currentValues.weather_code,
  ]
  if (!currentFields.every(isFiniteNumber)) return false
  const hourlyTime = hourlyValues.time
  const hourlyTemperature = hourlyValues.temperature_2m
  const hourlyPrecipitation = hourlyValues.precipitation_probability
  const hourlyCode = hourlyValues.weather_code
  const dailyTime = dailyValues.time
  const dailyHigh = dailyValues.temperature_2m_max
  const dailyLow = dailyValues.temperature_2m_min
  const dailyPrecipitation = dailyValues.precipitation_probability_max
  const dailyCode = dailyValues.weather_code
  if (!isStringArray(hourlyTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) || !isNumberArray(hourlyTemperature) || !isNumberArray(hourlyPrecipitation)
    || !isNumberArray(hourlyCode) || !isStringArray(dailyTime, /^\d{4}-\d{2}-\d{2}$/) || !isNumberArray(dailyHigh)
    || !isNumberArray(dailyLow) || !isNumberArray(dailyPrecipitation) || !isNumberArray(dailyCode)) return false
  return hourlyTime.length === hourlyTemperature.length
    && hourlyTime.length === hourlyPrecipitation.length
    && hourlyTime.length === hourlyCode.length
    && dailyTime.length === dailyHigh.length
    && dailyTime.length === dailyLow.length
    && dailyTime.length === dailyPrecipitation.length
    && dailyTime.length === dailyCode.length
    && hourlyTime.length >= 4
    && dailyTime.length >= 5
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
export async function fetchWeather(
  city: WeatherCity,
  request: typeof fetch = fetch,
  now = Date.now(),
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    timezone: city.timezone,
    forecast_days: '5',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,weather_code',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
  })
  if (signal?.aborted) return fallbackWeather(city, now)
  const controller = new AbortController()
  let rejectAbort: (() => void) | undefined
  const abortPromise = new Promise<never>((_, reject) => {
    rejectAbort = () => { reject(new Error('weather request aborted')) }
  })
  const abort = (): void => {
    controller.abort()
    rejectAbort?.()
  }
  signal?.addEventListener('abort', abort, { once: true })
  let rejectTimeout!: (reason: Error) => void
  const timeoutPromise = new Promise<never>((_, reject) => { rejectTimeout = reject })
  const timeout = setTimeout(() => {
    controller.abort()
    rejectTimeout(new Error('weather request timed out'))
  }, WEATHER_REQUEST_TIMEOUT_MS)
  try {
    const response = await Promise.race([
      abortPromise,
      request(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: controller.signal }),
      timeoutPromise,
    ])
    if (!response.ok) throw new Error(`weather request failed: ${response.status}`)
    const payload: unknown = await response.json()
    if (!isOpenMeteoResponse(payload)) throw new Error('weather response is incomplete or invalid')
    return normalizeWeather(city, payload, now)
  } catch {
    return fallbackWeather(city, now)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

function normalizeWeather(city: WeatherCity, payload: OpenMeteoResponse, now: number): WeatherSnapshot {
  const { current, hourly, daily } = payload
  const currentParts = localParts(now, city.timezone)
  const currentKey = `${currentParts.year}-${currentParts.month}-${currentParts.day}T${currentParts.hour}:00`
  const startIndex = hourly.time.findIndex((time) => time >= currentKey)
  const hourlyRows = hourly.time
    .slice(startIndex < 0 ? 0 : startIndex, (startIndex < 0 ? 0 : startIndex) + 8)
    .map((time, offset) => {
      const index = (startIndex < 0 ? 0 : startIndex) + offset
      return {
        time,
        temperature: hourly.temperature_2m[index]!,
        precipitation: hourly.precipitation_probability[index]!,
        condition: conditionFromCode(hourly.weather_code[index]!),
      }
    })
    .map((row) => ({ ...row, time: row.time.slice(11, 16) }))
  const hourlyRowsWithFallback = hourlyRows.length >= 4
    ? hourlyRows
    : fallbackWeather(city, now).hourly
  const dailyRows = daily.time.slice(0, 5).map((date, index) => {
    const dayDate = new Date(`${date}T12:00:00Z`)
    const month = date.slice(5, 7)
    const day = date.slice(8, 10)
    return {
      day: index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: 'UTC' }).format(dayDate),
      date: `${Number(month)}/${Number(day)}`, // The provider's date is already in the requested city timezone.
      condition: conditionFromCode(daily.weather_code[index]!),
      high: Math.round(daily.temperature_2m_max[index]!),
      low: Math.round(daily.temperature_2m_min[index]!),
      precipitation: daily.precipitation_probability_max[index]!,
    }
  })
  return {
    city: city.name,
    country: city.country,
    source: 'live',
    updatedAt: now,
    current: {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      condition: conditionFromCode(current.weather_code),
      humidity: Math.round(current.relative_humidity_2m),
      wind: Math.round(current.wind_speed_10m),
      windDirection: Math.round(current.wind_direction_10m),
      pressure: Math.round(current.pressure_msl),
      visibility: Math.round(current.visibility / 1_000),
    },
    hourly: hourlyRowsWithFallback,
    daily: dailyRows,
  }
}
