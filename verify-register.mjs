// Simulate the host's client-modules materialization to prove a freshly built
// bundle registers correctly AND its factory returns {apply, inject}. Run AFTER
// `node client-build.mjs`. Args: [path-to-bundle.js] (default ./out/client-registered.js)
import { readFileSync } from 'node:fs'

const file = process.argv[2] || './out/client-registered.js'
const src = readFileSync(file, 'utf8')

// Shim window.__ModuleLoader__ to capture the registration.
let registration = null
globalThis.window = { __ModuleLoader__: { load: (reg) => { registration = reg } } }

// Evaluate the bundle (it calls window.__ModuleLoader__.load(...)).
new Function(src)()

if (!registration || !registration.id) throw new Error('bundle did not register via ModuleLoader.load')
console.log('registered id     :', registration.id)
console.log('has factory       :', typeof registration.factory === 'function')

// External deps (react/@deepseek-*) are stubbed; that is enough to load the
// module structurally. The host provides a stricter bootstrap require at runtime.
const exports = registration.factory(() => ({ default: {} }))
const okApply  = typeof exports?.apply === 'function'
const okInject = JSON.stringify(exports?.inject) === JSON.stringify(['slots'])
console.log('exports.apply     :', typeof exports?.apply)
console.log('exports.inject    :', JSON.stringify(exports?.inject))
if (!okApply || !okInject) throw new Error(`EXPORT MISMATCH: apply=${typeof exports?.apply} inject=${JSON.stringify(exports?.inject)}`)
console.log('\nPASS: factory returns {apply, inject} exactly as the host expects.')
