import { type ReactElement } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { WeatherRequest } from './weather-data.ts';
/** The plain injected face used by the weather overlay. */
export interface WeatherDashboardInjected {
    /** Browser fetch narrowed to the public weather endpoint. */
    request: WeatherRequest;
}
/** Full props for the root-scoped shell overlay entry. */
export type WeatherDashboardProps = PropsRuntime<'shell.overlay'> & WeatherDashboardInjected;
/**
 * Floating weather dashboard. It starts open so the current conditions are
 * visible on the first paint, then can be reduced to a quiet pulse button.
 * @param props - injected browser request and root-slot runtime share.
 * @returns the weather pulse or expanded dashboard card.
 */
export declare function WeatherDashboard({ request }: WeatherDashboardProps): ReactElement;
//# sourceMappingURL=WeatherDashboard.d.ts.map