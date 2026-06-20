import { describe, expect, it } from 'vitest';
import { normalize, stripInvisible, tokenize, tracesTo } from '../text.js';

describe('stripInvisible', () => {
  it('removes zero-width and soft-hyphen characters', () => {
    const dirty = `Ac${String.fromCharCode(0x200b)}me${String.fromCharCode(0x00ad)}`;
    expect(stripInvisible(dirty)).toBe('Acme');
  });
});

describe('normalize', () => {
  it('lowercases, de-accents, and collapses whitespace', () => {
    expect(normalize('  Café   Münchën ')).toBe('cafe munchen');
  });
});

describe('tokenize', () => {
  it('splits into alphanumeric tokens >= 2 chars', () => {
    expect(tokenize('Acme Store #1 a')).toEqual(['acme', 'store']);
  });
});

describe('tracesTo', () => {
  it('matches a substring', () => {
    expect(tracesTo('Acme Store', 'buy from acme store today')).toBe(true);
  });
  it('matches by majority token overlap', () => {
    expect(tracesTo('Acme Wireless Store', 'acme store')).toBe(true);
  });
  it('does not match an attacker account against the user prompt', () => {
    expect(tracesTo('acct_attacker_x9f3', 'buy the acme mouse from acme store')).toBe(false);
  });
  it('returns false for undefined needle', () => {
    expect(tracesTo(undefined, 'anything')).toBe(false);
  });
});
