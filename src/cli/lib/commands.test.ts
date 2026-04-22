import { describe, expect, it } from '@jest/globals';
import {
  getCommandCatalog,
  getCommandSuggestions,
  parseSlashCommand,
} from './commands';

describe('commands', () => {
  it('returns the supported slash commands for help output', () => {
    expect(getCommandCatalog()).toEqual([
      { command: '/help', description: 'Show available slash commands.' },
      { command: '/login', description: 'Start interactive sign in.' },
      { command: '/logout', description: 'Clear the local CLI session.' },
      {
        command: '/wallets',
        description: 'Show your wallet list and tracked total balance.',
      },
    ]);
  });

  it('parses a supported slash command with arguments', () => {
    expect(parseSlashCommand('/wallets   this  is-ignored')).toEqual({
      type: 'known',
      command: '/wallets',
      args: ['this', 'is-ignored'],
    });
  });

  it('treats /wallet as an unknown command', () => {
    expect(parseSlashCommand('/wallet')).toEqual({
      type: 'unknown',
      command: '/wallet',
    });
  });

  it('rejects commands without the slash prefix', () => {
    expect(parseSlashCommand('wallets')).toEqual({
      type: 'invalid',
      message: 'Commands must start with /. Try /help.',
    });
  });

  it('flags an unknown slash command', () => {
    expect(parseSlashCommand('/budgets')).toEqual({
      type: 'unknown',
      command: '/budgets',
    });
  });

  it('returns slash command suggestions while typing', () => {
    expect(getCommandSuggestions('/lo')).toEqual(['/login', '/logout']);
    expect(getCommandSuggestions('')).toEqual([]);
    expect(getCommandSuggestions('/')).toEqual([
      '/help',
      '/login',
      '/logout',
      '/wallets',
    ]);
    expect(getCommandSuggestions('wallet')).toEqual([]);
  });
});
