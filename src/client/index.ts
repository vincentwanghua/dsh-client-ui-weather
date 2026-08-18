/**
 * Weather dashboard browser plugin: one frame-wide overlay entry. The card
 * reads public forecast data directly from Open-Meteo and falls back to a
 * deterministic sample snapshot when the network is unavailable.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the layout-owned shell.overlay SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { WeatherDashboard } from './WeatherDashboard.tsx'

/** The dashboard needs only the client slot registry. */
export const inject = ['slots']

/**
 * Register the persistent weather card into the additive frame overlay.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'weather',
    order: 80,
    inject: (): { request: typeof fetch } => ({ request: globalThis.fetch.bind(globalThis) }),
  }, WeatherDashboard))
}
