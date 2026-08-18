/**
 * Weather dashboard browser plugin: one frame-wide overlay entry. The card
 * reads public forecast data directly from Open-Meteo and falls back to a
 * deterministic sample snapshot when the network is unavailable.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** The dashboard needs only the client slot registry. */
export declare const inject: string[];
/**
 * Register the persistent weather card into the additive frame overlay.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map