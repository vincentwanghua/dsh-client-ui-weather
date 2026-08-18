/**
 * ui-weather browser half over a real SlotRegistry: the overlay registration
 * appears after the shell declares it and is removed with the plugin fiber.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  const fiber = ctx.plugin({ inject, apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-weather browser half', () => {
  it('declares only the slot registry dependency', () => {
    expect(inject).toEqual(['slots'])
  })

  it('registers the overlay and removes it with plugin disposal', async () => {
    const { ctx, fiber } = await bench()
    const entry = ctx.slots.entries('shell.overlay').find(item => item.options.id === 'weather')
    expect(entry).toBeDefined()
    expect((entry!.inject as () => { request: typeof fetch })().request).toBeTypeOf('function')
    await fiber.dispose()
    expect(ctx.slots.entries('shell.overlay').map(entry => entry.options.id)).not.toContain('weather')
  })

  it('keeps an inert node half for the Loader roster', () => {
    expect(applyNode).not.toThrow()
  })
})
