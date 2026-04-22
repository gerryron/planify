export type SupportedSlashCommand = '/help' | '/login' | '/logout' | '/wallets';

export type ParsedCommand =
  | { type: 'empty' }
  | { type: 'invalid'; message: string }
  | { type: 'unknown'; command: string }
  | { type: 'known'; command: SupportedSlashCommand; args: string[] };

type CommandDefinition = {
  command: SupportedSlashCommand;
  description: string;
};

const COMMANDS: CommandDefinition[] = [
  { command: '/help', description: 'Show available slash commands.' },
  { command: '/login', description: 'Start interactive sign in.' },
  { command: '/logout', description: 'Clear the local CLI session.' },
  {
    command: '/wallets',
    description: 'Show your wallet list and tracked total balance.',
  },
];

const COMMAND_LOOKUP = new Set(COMMANDS.map((item) => item.command));

export function getCommandCatalog() {
  return COMMANDS;
}

export function getCommandSuggestions(input: string) {
  const allCommands = COMMANDS.map((item) => item.command);
  const draft = input.trim().toLowerCase();

  if (!draft) {
    return [];
  }

  if (draft === '/') {
    return allCommands;
  }

  if (!draft.startsWith('/')) {
    return [];
  }

  return allCommands.filter((command) => command.startsWith(draft));
}

export function parseSlashCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { type: 'empty' };
  }

  if (!trimmed.startsWith('/')) {
    return {
      type: 'invalid',
      message: 'Commands must start with /. Try /help.',
    };
  }

  const [command, ...args] = trimmed.split(/\s+/);

  if (!COMMAND_LOOKUP.has(command as SupportedSlashCommand)) {
    return {
      type: 'unknown',
      command,
    };
  }

  return {
    type: 'known',
    command: command as SupportedSlashCommand,
    args,
  };
}
