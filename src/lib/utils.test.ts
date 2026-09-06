import { cn } from './utils';

describe('cn', () => {
  it('should join class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('should skip falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('should apply conditional object classes', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('should dedupe conflicting tailwind classes via tailwind-merge', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });
});
