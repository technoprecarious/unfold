/**
 * Tokenizer - Parses raw command strings into structured tokens
 * Homebrew-style: <verb> <entity> [target] [flags]
 * Examples: list tasks, create task "Title", remove task abc123
 */

export interface Token {
  type: 'verb' | 'entity' | 'target' | 'flag' | 'value';
  value: string;
  raw: string;
}

export interface ParsedCommand {
  verb: string | null;      // list, create, remove, info, search
  entity: string | null;     // program, project, task, subtask
  target: string | null;     // ID or search term
  flags: Record<string, string>;
  raw: string;
}

/**
 * Tokenize a command string into structured tokens
 * Homebrew-style: <verb> <entity> [target] [flags]
 */
export function tokenize(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      verb: null,
      entity: null,
      target: null,
      flags: {},
      raw: input,
    };
  }

  // Split input while respecting quotes
  const parts = parseCommandParts(trimmed);
  
  const flags: Record<string, string> = {};
  let verb: string | null = null;
  let entity: string | null = null;
  let target: string | null = null;
  let partIndex = 0;

  for (const part of parts) {
    // Check for flags (--key=value or --key)
    const flagMatch = part.match(/^--?([a-zA-Z0-9_-]+)(?:=(.*))?$/);
    if (flagMatch) {
      const [, key, value] = flagMatch;
      flags[key] = value !== undefined ? value : 'true';
      continue;
    }

    // Check for key:value shortcuts (priority:high)
    const shortcutMatch = part.match(/^([a-zA-Z0-9_-]+):(.+)$/);
    if (shortcutMatch) {
      const [, key, value] = shortcutMatch;
      flags[key] = value;
      continue;
    }

    // Assign positional arguments (Homebrew-style: verb entity target)
    if (partIndex === 0) {
      verb = part;
    } else if (partIndex === 1) {
      entity = part;
    } else if (partIndex === 2) {
      target = part;
    }
    partIndex++;
  }

  return {
    verb,
    entity,
    target,
    flags,
    raw: input,
  };
}

/**
 * Parse command string respecting quotes
 */
function parseCommandParts(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }
    
    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      continue;
    }
    
    if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    
    current += char;
  }
  
  if (current) {
    parts.push(current);
  }
  
  return parts;
}

/**
 * Check if a string is a valid entity type
 */
export function isValidEntity(entity: string | null): entity is string {
  if (!entity) return false;
  const validEntities = [
    'program', 'programs', 'prg',
    'project', 'projects', 'prj',
    'task', 'tasks', 'tsk',
    'subtask', 'subtasks', 'sub'
  ];
  return validEntities.includes(entity.toLowerCase());
}

/**
 * Normalize entity shortcuts to full names
 */
export function normalizeEntity(entity: string): string {
  const normalized = entity.toLowerCase();
  const map: Record<string, string> = {
    'prg': 'program',
    'programs': 'program',
    'prj': 'project',
    'projects': 'project',
    'tsk': 'task',
    'tasks': 'task',
    'sub': 'subtask',
    'subtasks': 'subtask',
  };
  return map[normalized] || normalized;
}

/**
 * Normalize verb shortcuts to full names (Homebrew-style)
 */
export function normalizeVerb(verb: string | null): string | null {
  if (!verb) return null;
  const normalized = verb.toLowerCase();
  const map: Record<string, string> = {
    'ls': 'list',
    'install': 'create',
    'add': 'create',
    'new': 'create',
    'uninstall': 'remove',
    'delete': 'remove',
    'del': 'remove',
    'rm': 'remove',
    'show': 'info',
    'view': 'info',
    'display': 'info',
    'find': 'search',
    'update': 'update',
    'edit': 'update',
  };
  return map[normalized] || normalized;
}
