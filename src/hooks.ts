// The dispatch half of the director shell: hooks are plain
// string-keyed functions on a host object — a director or one of its
// groups (`rules`, `events`, ...). The consumer declares the hook
// signatures (its own argument and return types), decides when an event
// happens, and emits through the dispatcher. This framework is
// cadence-agnostic: a turn-based game emits from its turn flow, a
// real-time game would emit the same events from its scheduler.

/**
 * One optional hook: absent hooks never fire. `never[]` parameters keep
 * every concrete consumer signature assignable to the contract.
 */
export type DirectorHook = ((...args: never[]) => unknown) | undefined;

/**
 * A host that is a pure hook map — an object whose members are all
 * optional hooks. Hook groups are usually richer (they carry data too),
 * which is why the dispatcher works on any host and picks out its
 * function-typed members with `DirectorEventNames`.
 */
export type DirectorHooks = Record<string, DirectorHook>;

/**
 * The event names of a hook host: its function-typed members only.
 * Data members (`id`, `modifiers`, thresholds, ...) are not events.
 */
export type DirectorEventNames<Host extends object> = {
  [Event in keyof Host]-?: NonNullable<Host[Event]> extends (
    ...args: never[]
  ) => unknown
    ? Event & string
    : never;
}[keyof Host];

/**
 * The hook of one event as declared by the host — `undefined` never, so a
 * resolved hook is callable without further narrowing. A name the host
 * does not declare as a hook resolves to `never`.
 */
export type DirectorEventHook<
  Host extends object,
  EventName extends string,
> = EventName extends keyof Host
  ? NonNullable<Host[EventName]> extends (...args: never[]) => unknown
    ? NonNullable<Host[EventName]>
    : never
  : never;

/**
 * The arguments one event emits: the hook's declared parameters.
 */
export type DirectorEventArgs<
  Host extends object,
  EventName extends string,
> = EventName extends keyof Host
  ? NonNullable<Host[EventName]> extends (...args: infer Args) => unknown
    ? Args
    : never
  : never;

/**
 * What one event's hook returns.
 */
export type DirectorEventReturn<
  Host extends object,
  EventName extends string,
> = EventName extends keyof Host
  ? NonNullable<Host[EventName]> extends (...args: never[]) => infer Return
    ? Return
    : never
  : never;

/**
 * Emits one event to an optional hook host: calls the named hook with the
 * emitted arguments and returns whatever the hook returned — or
 * `undefined` when the hook is absent. When a hook fires is entirely the
 * consumer's cadence.
 */
export const dispatchDirectorEvent = <
  Host extends object,
  EventName extends string,
>(
  hooks: Host | Partial<Host> | undefined,
  event: EventName,
  ...args: DirectorEventArgs<Host, EventName>
): DirectorEventReturn<Host, EventName> | undefined => {
  const hook = (hooks as Record<string, unknown> | undefined)?.[event] as
    ((...args: unknown[]) => unknown) | undefined;
  if (typeof hook !== 'function') {
    return undefined;
  }
  return hook(...args) as DirectorEventReturn<Host, EventName>;
};

/**
 * Resolves one hook across override groups and the base host: the first
 * group that defines the event wins, otherwise the base hook fires,
 * otherwise the hook is absent. Groups let consumers write hooks nested
 * (e.g. under a `rules` key) while calling code resolves them uniformly.
 */
export const resolveDirectorHook = <
  Host extends object,
  EventName extends string,
  GroupHost extends object = Host,
>(
  hooks: Host | Partial<Host> | undefined,
  event: EventName,
  ...groups: (GroupHost | Partial<GroupHost> | undefined)[]
):
  | DirectorEventHook<Host, EventName>
  | DirectorEventHook<GroupHost, EventName>
  | undefined => {
  for (const group of groups) {
    const override = (group as Record<string, unknown> | undefined)?.[event] as
      ((...args: never[]) => unknown) | undefined;
    if (override) {
      return override as unknown as DirectorEventHook<GroupHost, EventName>;
    }
  }
  const hook = (hooks as Record<string, unknown> | undefined)?.[event] as
    ((...args: never[]) => unknown) | undefined;
  if (hook) {
    return hook as unknown as DirectorEventHook<Host, EventName>;
  }
  return undefined;
};
