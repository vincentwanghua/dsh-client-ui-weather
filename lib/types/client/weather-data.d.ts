/** Browser-safe weather data used by the dashboard view. */
export interface WeatherSnapshot {
    readonly city: string;
    readonly country: string;
    readonly source: 'live' | 'sample';
    readonly updatedAt: number;
    readonly current: {
        readonly temperature: number;
        readonly feelsLike: number;
        readonly condition: WeatherCondition;
        readonly humidity: number;
        readonly wind: number;
        readonly windDirection: number;
        readonly pressure: number;
        readonly visibility: number;
    };
    readonly hourly: readonly HourPoint[];
    readonly daily: readonly DayForecast[];
}
/** One point in the city's eight-hour temperature trend. */
export interface HourPoint {
    readonly time: string;
    readonly temperature: number;
    readonly precipitation: number;
    readonly condition: WeatherCondition;
}
/** One row in the five-day forecast. */
export interface DayForecast {
    readonly day: string;
    readonly date: string;
    readonly condition: WeatherCondition;
    readonly high: number;
    readonly low: number;
    readonly precipitation: number;
}
/** Compact condition vocabulary rendered by the dashboard. */
export type WeatherCondition = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow';
/** Supported city coordinates and the timezone used by Open-Meteo. */
export interface WeatherCity {
    readonly id: string;
    readonly name: string;
    readonly country: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly timezone: string;
}
/** Cities offered by the dashboard selector. */
export declare const WEATHER_CITIES: readonly WeatherCity[];
/** Default city shown on the first render. */
export declare const DEFAULT_CITY: WeatherCity;
/** Narrow request face injected by the browser plugin for deterministic tests. */
export type WeatherRequest = typeof fetch;
/** Demo-quality fallback keeps the dashboard useful when an API is offline.
 * @param city - selected city metadata.
 * @param now - timestamp used to seed the sample values.
 * @returns deterministic sample weather for the selected city.
 */
export declare function fallbackWeather(city: WeatherCity, now?: number): WeatherSnapshot;
/** Open-Meteo weather codes mapped to the small condition vocabulary.
 * @param code - Open-Meteo numeric weather code.
 * @returns the dashboard condition corresponding to the code.
 */
export declare function conditionFromCode(code: number): WeatherCondition;
/**
 * Fetch and normalize one city from Open-Meteo. The injected request function
 * keeps the component testable and lets the browser use its native fetch.
 * @param city - selected city coordinates and timezone.
 * @param request - browser request function.
 * @param now - timestamp used for stable test and fallback values.
 * @param signal - optional cancellation signal for a superseded request.
 * @returns normalized dashboard data.
 */
export declare function fetchWeather(city: WeatherCity, request?: typeof fetch, now?: number, signal?: AbortSignal): Promise<WeatherSnapshot>;
//# sourceMappingURL=weather-data.d.ts.map