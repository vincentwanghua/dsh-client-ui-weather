// @vitest-environment jsdom
/** Weather dashboard behavior: fallback-first rendering, live response adoption,
 * city switching, explicit refresh, and compact pulse reopen. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WeatherDashboard } from '../src/client/WeatherDashboard.tsx'
import { fallbackWeather, WEATHER_CITIES, type WeatherRequest } from '../src/client/weather-data.ts'

const NOW = 1_720_000_000_000

function props(request: WeatherRequest) {
  return { request } as unknown as Parameters<typeof WeatherDashboard>[0]
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('WeatherDashboard', () => {
  it('paints the selected city and fallback forecast before the network settles', () => {
    const request = vi.fn<WeatherRequest>(() => new Promise(() => {}))
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
    render(<WeatherDashboard {...props(request)} />)

    expect(screen.getByRole('region', { name: '天气看板' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '上海' })).toBeTruthy()
    expect(screen.getByText('示例数据')).toBeTruthy()
    expect(screen.getByText('未来预报')).toBeTruthy()
  })

  it('adopts live data and switches city with a new request', async () => {
    const live = fallbackWeather(WEATHER_CITIES[1]!, NOW)
    const response = {
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: live.current.temperature + 4,
          apparent_temperature: live.current.feelsLike + 4,
          relative_humidity_2m: 48,
          wind_speed_10m: 9,
          wind_direction_10m: 90,
          pressure_msl: 1008,
          visibility: 12_000,
          weather_code: 0,
        },
        hourly: {
          time: Array.from({ length: 8 }, (_, i) => `2026-07-01T${String(12 + i).padStart(2, '0')}:00`),
          temperature_2m: [27, 28, 29, 30, 29, 28, 27, 26],
          precipitation_probability: [0, 0, 2, 4, 5, 7, 9, 12],
          weather_code: [0, 0, 1, 1, 2, 2, 3, 3],
        },
        daily: {
          time: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'],
          temperature_2m_max: [30, 31, 32, 30, 29],
          temperature_2m_min: [24, 24, 25, 23, 22],
          precipitation_probability_max: [2, 12, 34, 18, 8],
          weather_code: [0, 1, 61, 3, 2],
        },
      }),
    } as Response
    const request = vi.fn<WeatherRequest>(async () => response)
    render(<WeatherDashboard {...props(request)} />)

    await waitFor(() => { expect(screen.getByText('实时')).toBeTruthy() })
    expect(request).toHaveBeenCalledTimes(1)
    expect(screen.getAllByText('晴').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByRole('combobox', { name: '选择城市' }), { target: { value: 'beijing' } })
    expect(screen.getByRole('heading', { name: '北京' })).toBeTruthy()
    expect(screen.getByText('示例数据')).toBeTruthy()
    await waitFor(() => { expect(screen.getByRole('heading', { name: '北京' })).toBeTruthy() })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('refreshes the selected city on demand', async () => {
    const request = vi.fn<WeatherRequest>(async () => ({ ok: false } as Response))
    render(<WeatherDashboard {...props(request)} />)
    await waitFor(() => { expect(request).toHaveBeenCalledTimes(1) })
    fireEvent.click(screen.getByRole('button', { name: '刷新天气' }))
    await waitFor(() => { expect(request).toHaveBeenCalledTimes(2) })
  })

  it('collapses into a pulse and reopens the full dashboard', () => {
    const request = vi.fn<WeatherRequest>(() => new Promise(() => {}))
    render(<WeatherDashboard {...props(request)} />)

    fireEvent.click(screen.getByRole('button', { name: '收起天气看板' }))
    expect(screen.queryByRole('region', { name: '天气看板' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '打开天气看板' }))
    expect(screen.getByRole('region', { name: '天气看板' })).toBeTruthy()
  })
})
