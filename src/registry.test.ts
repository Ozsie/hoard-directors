import { describe, expect, it } from 'vitest';
import { createDirectorRegistry } from './registry';
import type { Director } from './director';

interface TestDirector extends Director<{ threat: number }> {
  modifiers: { attack: number };
}

const director = (id: string, attack = 0): TestDirector => ({
  id,
  modifiers: { attack },
  initialState: () => ({ threat: attack }),
});

describe('createDirectorRegistry', () => {
  it('resolves registered directors, aliases and unknown ids', () => {
    const registry = createDirectorRegistry<TestDirector>({
      directors: {
        storyTeller: director('storyTeller', 1),
        tactician: director('tactician'),
      },
      aliases: { easy: 'storyTeller', normal: 'tactician' },
      defaultId: 'tactician',
    });

    expect(registry.resolve('storyTeller')).toBeDefined();
    expect(registry.resolve('storyTeller')?.modifiers.attack).toBe(1);
    expect(registry.resolve('easy')?.id).toBe('storyTeller');
    expect(registry.resolve('normal')?.id).toBe('tactician');
    // Unknown ids fall back to the default.
    expect(registry.resolve('nightmare')?.id).toBe('tactician');
  });

  it('aliases take precedence over same-named ids', () => {
    const storyTeller = director('storyTeller', 1);
    const renamed = director('renamed', 9);
    const registry = createDirectorRegistry<TestDirector>({
      directors: { storyTeller, renamed },
      aliases: { storyTeller: 'renamed' },
    });

    expect(registry.resolve('storyTeller')?.id).toBe('renamed');
  });

  it('falls back to the first registered director when the default is missing', () => {
    const first = director('first', 7);
    const registry = createDirectorRegistry<TestDirector>({
      directors: { first, second: director('second', 8) },
      defaultId: 'nonexistent',
    });

    expect(registry.resolve('unknown')?.id).toBe('first');
    expect(registry.resolve(undefined)?.id).toBe('first');
  });

  it('resolves undefined only against an empty registry', () => {
    const registry = createDirectorRegistry<TestDirector>({
      directors: {},
      defaultId: 'missing',
    });

    expect(registry.resolve()).toBeUndefined();
    expect(registry.resolve('anything')).toBeUndefined();
  });

  it('reads the directors record live', () => {
    const directors: Record<string, TestDirector> = {
      tactician: director('tactician'),
    };
    const registry = createDirectorRegistry<TestDirector>({
      directors,
      defaultId: 'tactician',
    });

    const lateArrival = director('brutalOverlord', 3);
    directors['brutalOverlord'] = lateArrival;

    expect(registry.resolve('brutalOverlord')).toBe(lateArrival);
    expect(registry.isKnown('brutalOverlord')).toBe(true);
  });

  it('register adds and replaces entries in the live record', () => {
    const directors: Record<string, TestDirector> = {
      tactician: director('tactician'),
    };
    const registry = createDirectorRegistry<TestDirector>({
      directors,
    });

    const replacement = director('tactician', 5);
    registry.register(replacement);
    registry.register(director('storyTeller', 1));

    expect(registry.resolve('tactician')).toBe(replacement);
    expect(registry.resolve('storyTeller')?.modifiers.attack).toBe(1);
    expect(Object.keys(directors).sort()).toEqual(['storyTeller', 'tactician']);
  });

  it('isKnown accepts ids and aliases but not unknown or dangling ones', () => {
    const registry = createDirectorRegistry<TestDirector>({
      directors: { tactician: director('tactician') },
      aliases: { medium: 'tactician', hard: 'brutalOverlord' },
    });

    expect(registry.isKnown('tactician')).toBe(true);
    expect(registry.isKnown('medium')).toBe(true);
    expect(registry.isKnown('unknown')).toBe(false);
    // 'hard' maps to an unregistered id.
    expect(registry.isKnown('hard')).toBe(false);
  });

  it('ignores unknown ids shadowing Object.prototype keys', () => {
    const registry = createDirectorRegistry<TestDirector>({
      directors: { tactician: director('tactician') },
    });

    expect(registry.isKnown('constructor')).toBe(false);
    expect(registry.resolve('toString')?.id).toBe('tactician');
  });
});
