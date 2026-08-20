//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-weather`.
* @module @deepseek-ai/dsh-client-ui-weather/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-ui-weather";
/** Cordis companion plugin name. */
const name = "client-ui-weather-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the dashboard is a read-only browser projection. Its
* slot registration and cleanup are covered by the client plugin's composition
* tests, and it emits no host events or durable state.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
