/**
 * Shortcuts - Maps common shortcuts to full Homebrew-style commands
 * Pattern: <verb> <entity> [target] [flags]
 */

export interface Shortcut {
  pattern: RegExp;
  expand: (match: RegExpMatchArray) => string;
  description: string;
}

/**
 * Common shortcuts that expand to full Homebrew-style commands
 */
export const SHORTCUTS: Shortcut[] = [
  // Quick list shortcuts (just entity name -> list entity)
  {
    pattern: /^(prg|programs?)$/i,
    expand: () => 'list programs',
    description: 'List all programs',
  },
  {
    pattern: /^(prj|projects?)$/i,
    expand: () => 'list projects',
    description: 'List all projects',
  },
  {
    pattern: /^(tsk|tasks?)$/i,
    expand: () => 'list tasks',
    description: 'List all tasks',
  },
  {
    pattern: /^(sub|subtasks?)$/i,
    expand: () => 'list subtasks',
    description: 'List all subtasks',
  },
  
  // install/add as create (Homebrew-style)
  {
    pattern: /^(install|add)\s+(prg|program)\s+(.+)$/i,
    expand: (match) => `create program "${match[3]}"`,
    description: 'Create a new program',
  },
  {
    pattern: /^(install|add)\s+(prj|project)\s+(.+)$/i,
    expand: (match) => `create project "${match[3]}"`,
    description: 'Create a new project',
  },
  {
    pattern: /^(install|add)\s+(tsk|task)\s+(.+)$/i,
    expand: (match) => `create task "${match[3]}"`,
    description: 'Create a new task',
  },
  {
    pattern: /^(install|add)\s+(sub|subtask)\s+(.+)$/i,
    expand: (match) => `create subtask "${match[3]}"`,
    description: 'Create a new subtask',
  },
  
  // Status shortcuts (Homebrew-style: verb entity target)
  {
    pattern: /^done\s+(tsk|task)\s+(\S+)$/i,
    expand: (match) => `update task ${match[2]} status:completed`,
    description: 'Mark task as done',
  },
  {
    pattern: /^start\s+(tsk|task)\s+(\S+)$/i,
    expand: (match) => `update task ${match[2]} status:active`,
    description: 'Start a task',
  },
  
  // Help shortcuts (Homebrew-style: man command, brew help)
  {
    pattern: /^man\s+unfold$/i,
    expand: () => 'man',
    description: 'Show manual',
  },
  {
    pattern: /^help\s+(\w+)$/i,
    expand: (match) => `man ${match[1]}`,
    description: 'Show help for specific command',
  },
];

/**
 * Try to expand a command using shortcuts
 */
export function expandShortcut(input: string): string {
  for (const shortcut of SHORTCUTS) {
    const match = input.match(shortcut.pattern);
    if (match) {
      return shortcut.expand(match);
    }
  }
  return input;
}

/**
 * Get suggestions for a partial command
 */
export function getSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const lowerInput = input.toLowerCase();
  
  // Common commands (Homebrew-style)
  const commands = [
    'list programs',
    'list projects',
    'list tasks',
    'list subtasks',
    'create task',
    'create program',
    'info task',
    'remove task',
    'update task',
    'prg',
    'prj',
    'tsk',
    'sub',
    'help',
    'man',
    'man list',
    'man create',
  ];
  
  for (const cmd of commands) {
    if (cmd.startsWith(lowerInput)) {
      suggestions.push(cmd);
    }
  }
  
  return suggestions.slice(0, 5); // Return top 5
}
