# @hoard-engine/directors

Hook/dispatch framework for game-master-style directors: a director
identity contract, a cadence-agnostic event dispatcher over plain hook
maps, override resolution across hook groups, and id/alias registry
resolution. A dependency-free leaf of the HOARD engine — no game,
state, framework or runtime knowledge; the consumer declares the hook
signatures, owns the registry and decides when events fire.

## Pluggable, interoperable, standalone

HOARD engine packages share the same design goals:

- **Pluggable.** Adopt a package on its own, or swap it out, without
  touching the rest of the engine — there is no central engine object
  to install and no package that owns the others.
- **Interoperable.** Packages compose with each other and with consumer
  code through data: minimal shapes, callback seams and plain values —
  never through shared state or a common framework.
- **As standalone as possible.** Each package is usable as-is in any
  project, HOARD-based or not; the leaf packages carry no dependencies
  and import no siblings.

This package meets all three by construction.

## Install

```bash
npm install @hoard-engine/directors
```

Requires Node 18+ (ESM only).

## Usage

A director is your data-plus-hooks object; the registry resolves ids
and aliases, and your cadence emits events:

```ts
import {
  createDirectorRegistry,
  dispatchDirectorEvent,
  type Director,
} from '@hoard-engine/directors';

interface TurnHooks {
  onRoundStart?: (round: number, state: GameState) => void; // your types
  onPartyDefeat?: (state: GameState) => void;
}

type GameDirector = Director & TurnHooks;

// Your registry, your aliases, your default — resolution is the package's.
const registry = createDirectorRegistry<GameDirector>({
  directors: { tactician, brutalOverlord },
  aliases: { hard: 'brutalOverlord' },
  defaultId: 'tactician',
});

registry.isKnown('hard'); // true
const gm = registry.resolve('hard'); // brutalOverlord
registry.resolve('missing-id'); // falls back to tactician

// Turn-bound hooks here; a real-time game emits from its scheduler.
dispatchDirectorEvent(gm, 'onRoundStart', 3, state);
dispatchDirectorEvent(gm, 'onPartyDefeat', state);
```

Hooks may also live in override groups (`rules`, `events`, …);
`resolveDirectorHook` picks the first group that defines the event,
falling back through the caller-supplied groups to the base host:

```ts
import { resolveDirectorHook } from '@hoard-engine/directors';

const modifyDamage = resolveDirectorHook(gm, 'modifyMonsterDamage', gm.rules);
return modifyDamage?.(damage, attacker, defender);
```

The package never asks for your game state, a framework, a scheduler
or a base class: hook maps are plain objects you declare, directors
extend the two-field identity contract structurally, and the registry
reads the record you pass in — so registry, cadence and every hook
signature arrive as data rather than dependencies.

## API

| Export                                           | Description                                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Director<TState>`                               | The identity contract every director satisfies: an `id` plus an optional `initialState` factory the caller persists                |
| `createDirectorRegistry<DirectorT>(options)`     | Resolves ids and aliases against the caller's live record: alias, then id, then the default, then the first registered              |
| `DirectorRegistryOptions<DirectorT>`             | The registry options: `directors` (read live), `aliases`, `defaultId` — contents are consumer knowledge                              |
| `DirectorRegistry<DirectorT>`                    | The resolver interface: `register`, `isKnown`, `resolve` — never undefined unless the registry is empty                             |
| `DirectorHook`                                   | One optional hook: absent hooks never fire; `never[]` parameters keep every consumer signature assignable                           |
| `DirectorHooks`                                  | A host that is a pure hook map — every member an optional hook                                                                      |
| `DirectorEventNames<Host>`                       | The event names of a hook host: its function-typed members only; data members are never events                                       |
| `dispatchDirectorEvent<Host, EventName>(...)`    | Emits one event: calls the named hook with the emitted arguments, returns the hook's result or `undefined` when absent                |
| `resolveDirectorHook<Host, EventName>(...)`      | Resolves one hook across override groups and the base host: the first group defining the event wins, otherwise the base hook         |
| `DirectorEventHook<Host, EventName>`             | The hook of one event as declared by the host, `undefined` never — a resolved hook is callable without narrowing                     |
| `DirectorEventArgs<Host, EventName>`             | The arguments one event emits: the hook's declared parameters                                                                        |
| `DirectorEventReturn<Host, EventName>`          | What one event's hook returns                                                                                                      |

## Design notes

- Dispatch is total and untouched: return values are forwarded as-is —
  `null` means `null`, only absence means `undefined` — so hooks that
  cancel by return value (discard this card, skip this event) work
  without sentinel objects.
- Hosts may carry data members alongside hooks (stat blocks,
  thresholds, ids); only their function-typed members are events, and a
  non-function member can never fire.
- Alias resolution is exactly one lookup order: alias map, registry
  id, default id, first registered director. The registry reads the
  caller's record live, so folders scanned at build time and entries
  added later resolve identically; own-property checks ignore
  `Object.prototype` keys.
- The registry resolves through its fallback chain, so an unknown id
  never throws — consumers that must fail on unknown ids check
  `isKnown` first. An empty registry resolves `undefined`.
- The framework is cadence-agnostic by construction: it never schedules
  or debounces anything. Turn-based, tick-based and interval-based
  consumers differ only in where they emit.

## Development

```bash
npm test          # vitest
npm run check     # tsc --noEmit
npm run lint      # eslint over src
npm run prettier  # prettier --check (fix via prettier:format)
npm run build     # tsc declarations + esbuild ESM bundle to dist/
npm publish       # prepublishOnly runs check + build + test first
```
