import { WeatherDashboard } from "./WeatherDashboard.js";
/** The dashboard needs only the client slot registry. */
export const inject = ['slots'];
/**
 * Register the persistent weather card into the additive frame overlay.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'weather',
        order: 80,
        inject: () => ({ request: globalThis.fetch.bind(globalThis) }),
    }, WeatherDashboard));
}
//# sourceMappingURL=index.js.map