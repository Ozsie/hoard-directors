import { describe, expect, it, vi } from 'vitest';
import { dispatchDirectorEvent, resolveDirectorHook } from './hooks';

// A consumer-declared hook group: the arguments and return values are the
// consumer's, the framework only dispatches them. Hosts may also carry
// data members — they are never events.
type TurnHooks = {
  onTick: (round: number, label: string) => string;
  onEnd: () => void;
  onDiscard: () => string | null;
  minMonsterSpawnDistance: number;
};

const partialMap = (): Partial<TurnHooks> => ({
  onTick: (round, label) => `ticked-${round}-${label}`,
  onEnd: vi.fn(),
  minMonsterSpawnDistance: 3,
});

describe('dispatchDirectorEvent', () => {
  it('calls the named hook with the emitted arguments and returns its value', () => {
    const hooks = partialMap();

    const result = dispatchDirectorEvent(hooks, 'onTick', 3, 'running');

    expect(result).toBe('ticked-3-running');
  });

  it('never treats data members as events', () => {
    const hooks = partialMap();

    // @ts-expect-error — minMonsterSpawnDistance is a data member, not a hook.
    const result = dispatchDirectorEvent(hooks, 'minMonsterSpawnDistance', 1);
    expect(result).toBeUndefined();
  });

  it('returns undefined for absent hooks, absent maps and partial maps', () => {
    const hooks = partialMap();
    // Runtime holes exist in late-declared maps (JSON round trips).
    hooks.onTick = undefined;

    expect(dispatchDirectorEvent(hooks, 'onTick', 1, 'x')).toBeUndefined();
    expect(dispatchDirectorEvent(hooks, 'onDiscard')).toBeUndefined();
    const absentHost = undefined as TurnHooks | undefined;
    expect(dispatchDirectorEvent(absentHost, 'onTick', 1, 'x')).toBeUndefined();
  });

  it('forwards falsy hook results untouched — null means null, not absence', () => {
    const hooks: Partial<TurnHooks> = { onDiscard: () => null };

    expect(dispatchDirectorEvent(hooks, 'onDiscard')).toBeNull();
  });

  it('fires once per emit — the consumer owns the cadence', () => {
    const onEnd = vi.fn();
    const hooks: Partial<TurnHooks> = { onEnd };

    dispatchDirectorEvent(hooks, 'onEnd');
    dispatchDirectorEvent(hooks, 'onEnd');
    dispatchDirectorEvent(hooks, 'onTick', 1, 'x');

    expect(onEnd).toHaveBeenCalledTimes(2);
  });
});

describe('resolveDirectorHook', () => {
  it('prefers the first group defining the event over later groups and the base host', () => {
    const base = partialMap();
    const groupA: Partial<TurnHooks> = { onTick: () => 'from-group-a' };
    const groupB: Partial<TurnHooks> = { onTick: () => 'from-group-b' };

    const resolved = resolveDirectorHook(base, 'onTick', groupA, groupB);

    expect(resolved?.(0, '')).toBe('from-group-a');
  });

  it('falls back to the base host when no group defines the event', () => {
    const base = partialMap();

    const resolved = resolveDirectorHook(base, 'onTick', {
      onEnd: () => undefined,
    });

    expect(resolved?.(2, 'x')).toBe('ticked-2-x');
  });

  it('skips undefined groups and base hosts', () => {
    const base = partialMap();

    const fromBase = resolveDirectorHook(base, 'onEnd', undefined, undefined);
    const withoutBase = resolveDirectorHook(undefined, 'onTick', base);

    expect(fromBase).toBe(base.onEnd);
    expect(withoutBase).toBe(base.onTick);
  });

  it('resolves undefined when the event is absent everywhere', () => {
    const base = partialMap();

    expect(resolveDirectorHook(base, 'onDiscard', base)).toBeUndefined();
    expect(resolveDirectorHook(undefined, 'onTick')).toBeUndefined();
  });
});
