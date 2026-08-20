import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  conditionFromCode,
  fallbackWeather,
  fetchWeather,
  WEATHER_CITIES,
} from '../src/client/weather-data.ts'

const NOW = Date.UTC(2026, 6, 1, 12)

afterEach(() => {
  vi.useRealTimers()
})

function response(payload: unknown, ok = true): Response {
  return { ok, json: async () => payload } as Response
}

function validPayload() {
  return {
    current: {
      temperature_2m: 25.4,
      apparent_temperature: 26.2,
      relative_humidity_2m: 55,
      wind_speed_10m: 11,
      wind_direction_10m: 180,
      pressure_msl: 1005,
      visibility: 15_000,
      weather_code: 61,
    },
    hourly: {
      time: [
        '2026-07-01T07:00', '2026-07-01T08:00', '2026-07-01T09:00',
        '2026-07-01T10:00', '2026-07-01T11:00', '2026-07-01T12:00',
        '2026-07-01T13:00', '2026-07-01T14:00', '2026-07-01T15:00',
      ],
      temperature_2m: [19, 20, 21, 22, 23, 24, 25, 26, 27],
      precipitation_probability: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      weather_code: [0, 0, 1, 2, 3, 61, 63, 65, 80],
    },
    daily: {
      time: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'],
      temperature_2m_max: [29, 30, 31, 28, 27],
      temperature_2m_min: [21, 22, 23, 20, 19],
      precipitation_probability_max: [8, 12, 34, 20, 15],
      weather_code: [61, 2, 0, 3, 80],
    },
  }
}

describe('weather data', () => {
  it('maps Open-Meteo condition bands and uses the city timezone in fallback hours', () => {
    expect(conditionFromCode(0)).toBe('clear')
    expect(conditionFromCode(3)).toBe('partly-cloudy')
    expect(conditionFromCode(4)).toBe('cloudy')
    expect(conditionFromCode(48)).toBe('cloudy')
    expect(conditionFromCode(49)).toBe('rain')
    expect(conditionFromCode(67)).toBe('rain')
    expect(conditionFromCode(68)).toBe('cloudy')
    expect(conditionFromCode(71)).toBe('snow')
    expect(conditionFromCode(77)).toBe('snow')
    expect(conditionFromCode(78)).toBe('cloudy')
    expect(conditionFromCode(80)).toBe('rain')
    expect(conditionFromCode(82)).toBe('rain')
    expect(conditionFromCode(83)).toBe('cloudy')
    expect(conditionFromCode(85)).toBe('snow')
    expect(conditionFromCode(86)).toBe('snow')
    expect(conditionFromCode(87)).toBe('cloudy')
    expect(conditionFromCode(90)).toBe('cloudy')
    expect(conditionFromCode(95)).toBe('storm')
    expect(fallbackWeather(WEATHER_CITIES.find(city => city.id === 'new-york')!, NOW).hourly[0]?.time).toBe('08:00')
  })

  it('advances fallback dates by local calendar days across daylight-saving changes', () => {
    const beforeSpringTransition = Date.UTC(2026, 2, 8, 5)
    const dates = fallbackWeather(WEATHER_CITIES.find(city => city.id === 'new-york')!, beforeSpringTransition).daily
      .map(day => day.date)
    expect(dates).toEqual(['3/8', '3/9', '3/10', '3/11', '3/12'])
  })

  it('normalizes live current, next-hour, and five-day values', async () => {
    const request = vi.fn(async () => response(validPayload()))

    const snapshot = await fetchWeather(WEATHER_CITIES.find(city => city.id === 'new-york')!, request, NOW)
    expect(snapshot.source).toBe('live')
    expect(snapshot.current).toMatchObject({ temperature: 25, feelsLike: 26, visibility: 15 })
    expect(snapshot.hourly.map(point => point.time)).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'])
    expect(snapshot.daily.map(day => day.date)).toEqual(['7/1', '7/2', '7/3', '7/4', '7/5'])
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('falls back when the provider rejects or omits required fields', async () => {
    const city = WEATHER_CITIES[0]!
    const rejected = await fetchWeather(city, vi.fn(async () => { throw new Error('offline') }), NOW)
    const incomplete = await fetchWeather(city, vi.fn(async () => response({ current: {} })), NOW)
    const malformed = await fetchWeather(city, vi.fn(async () => response({
      current: { temperature_2m: Number.NaN },
      hourly: { time: [], temperature_2m: [], precipitation_probability: [], weather_code: [] },
      daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], weather_code: [] },
    })), NOW)
    expect(rejected.source).toBe('sample')
    expect(incomplete.source).toBe('sample')
    expect(malformed.source).toBe('sample')
    expect(incomplete.daily).toHaveLength(5)
  })

  it('falls back for non-ok, null, primitive, malformed, mismatched, and short provider responses', async () => {
    const city = WEATHER_CITIES[0]!
    const cases: unknown[] = [
      null,
      'offline',
      { current: null, hourly: {}, daily: {} },
      { current: {}, hourly: {}, daily: {} },
      { current: validPayload().current, hourly: { ...validPayload().hourly, temperature_2m: [1] }, daily: validPayload().daily },
      { current: validPayload().current, hourly: { time: validPayload().hourly.time }, daily: validPayload().daily },
      { current: validPayload().current, hourly: { ...validPayload().hourly, time: ['not-a-date'] }, daily: validPayload().daily },
      { current: validPayload().current, hourly: validPayload().hourly, daily: { time: validPayload().daily.time } },
      { current: validPayload().current, hourly: { ...validPayload().hourly, time: validPayload().hourly.time.slice(0, 3), temperature_2m: [1, 2, 3], precipitation_probability: [1, 2, 3], weather_code: [1, 2, 3] }, daily: validPayload().daily },
      { current: validPayload().current, hourly: validPayload().hourly, daily: { ...validPayload().daily, time: validPayload().daily.time.slice(0, 4), temperature_2m_max: [1, 2, 3, 4], temperature_2m_min: [1, 2, 3, 4], precipitation_probability_max: [1, 2, 3, 4], weather_code: [1, 2, 3, 4] } },
    ]
    for (const payload of cases) {
      await expect(fetchWeather(city, vi.fn(async () => response(payload)), NOW)).resolves.toMatchObject({ source: 'sample' })
    }
    await expect(fetchWeather(city, vi.fn(async () => response(validPayload(), false)), NOW)).resolves.toMatchObject({ source: 'sample' })
  })

  it('uses fallback hours when every provider hour is earlier than now', async () => {
    const payload = validPayload()
    payload.hourly.time = payload.hourly.time.map(time => time.replace('2026-07-01', '2026-06-30'))
    const snapshot = await fetchWeather(WEATHER_CITIES[0]!, vi.fn(async () => response(payload)), NOW)
    expect(snapshot.source).toBe('live')
    expect(snapshot.hourly).toHaveLength(8)
  })

  it('uses fallback hours when only one provider hour remains after the current time', async () => {
    const payload = validPayload()
    payload.hourly.time = ['2026-07-01T05:00', '2026-07-01T06:00', '2026-07-01T07:00', '2026-07-01T08:00']
    payload.hourly.temperature_2m = [20, 21, 22, 23]
    payload.hourly.precipitation_probability = [1, 2, 3, 4]
    payload.hourly.weather_code = [0, 1, 2, 3]
    const snapshot = await fetchWeather(WEATHER_CITIES.find(city => city.id === 'new-york')!, vi.fn(async () => response(payload)), NOW)
    expect(snapshot.source).toBe('live')
    expect(snapshot.hourly).toHaveLength(8)
  })

  it('falls back immediately for an already-aborted request and during an external abort', async () => {
    const city = WEATHER_CITIES[0]!
    const alreadyAborted = new AbortController()
    alreadyAborted.abort()
    const skippedRequest = vi.fn(async () => response(validPayload()))
    await expect(fetchWeather(city, skippedRequest, NOW, alreadyAborted.signal)).resolves.toMatchObject({ source: 'sample' })
    expect(skippedRequest).not.toHaveBeenCalled()

    const external = new AbortController()
    const pendingRequest = vi.fn(async () => new Promise<Response>(() => {}))
    const pending = fetchWeather(city, pendingRequest, NOW, external.signal)
    external.abort()
    await expect(pending).resolves.toMatchObject({ source: 'sample' })
  })

  it('settles a provider that ignores cancellation after the timeout', async () => {
    vi.useFakeTimers()
    const request = vi.fn(async () => new Promise<Response>(() => {}))
    const pending = fetchWeather(WEATHER_CITIES[0]!, request, NOW)
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(pending).resolves.toMatchObject({ source: 'sample' })
    expect(request).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })
})
