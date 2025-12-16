/**
 * UNFOLD CLI - Homebrew-style command-line interface
 * 
 * Pattern: <verb> <entity> [target] [flags]
 * Examples:
 *   list tasks
 *   create task "Title"
 *   remove task abc123
 *   info program xyz456
 * 
 * Features:
 * - Homebrew-style syntax (verb-first)
 * - Smart shortcuts (prg, prj, tsk, sub)
 * - Fuzzy matching for typos
 * - Context awareness
 * - Fast inline creation
 */

import { Terminal } from 'xterm';
import { tokenize, normalizeEntity, normalizeVerb } from './parser/tokenizer';
import { expandShortcut } from './parser/shortcuts';
import { validateCommand } from './parser/validator';
import { addToHistory } from './utils/context';
import { CreateHandler } from './handlers/create';
import { ListHandler } from './handlers/list';
import { Manual } from './ui/manual';

export class UnfoldCLI {
  private terminal: Terminal;
  private onDataUpdate: () => void;
  private createHandler: CreateHandler;
  private listHandler: ListHandler;
  private manual: Manual;
  public isPromptMode: boolean = false;

  constructor(terminal: Terminal, onDataUpdate: () => void) {
    this.terminal = terminal;
    this.onDataUpdate = onDataUpdate;
    this.createHandler = new CreateHandler(terminal, onDataUpdate);
    this.listHandler = new ListHandler(terminal);
    this.manual = new Manual(terminal);
  }

  /**
   * Handle prompt input (delegated to active handler)
   */
  handlePromptInput(input: string): boolean {
    if (this.createHandler.isPromptMode) {
      return this.createHandler.handlePromptInput(input);
    }
    return false;
  }

  /**
   * Main command handler (Homebrew-style)
   */
  async handleCommand(input: string): Promise<void> {
    if (!input || !input.trim()) {
      return;
    }

    try {
      // Add to history
      addToHistory(input);

      // Expand shortcuts
      const expanded = expandShortcut(input.trim());
      
      // Tokenize (Homebrew-style: verb entity target)
      const parsed = tokenize(expanded);

      // Normalize verb and entity
      if (parsed.verb) {
        parsed.verb = normalizeVerb(parsed.verb);
      }
      if (parsed.entity) {
        parsed.entity = normalizeEntity(parsed.entity);
      }

      // Handle special commands
      if (parsed.verb === 'help' || input.trim().toLowerCase() === 'help') {
        this.showHelp();
        return;
      }

      if (parsed.verb === 'man' || input.trim().toLowerCase() === 'man') {
        // Show full manual or specific topic
        if (parsed.entity) {
          this.manual.showSpecificHelp(parsed.entity);
        } else {
          this.manual.showManual();
        }
        return;
      }

      if (parsed.verb === 'init') {
        this.terminal.writeln('init command not yet implemented in new CLI');
        return;
      }

      // Validate command
      const validation = validateCommand(parsed);
      if (!validation.valid) {
        this.terminal.writeln(`Error: ${validation.error}`);
        if (validation.suggestions && validation.suggestions.length > 0) {
          this.terminal.writeln(`Suggestions: ${validation.suggestions.join(', ')}`);
        }
        return;
      }

      // Route to handlers based on verb (Homebrew-style)
      switch (parsed.verb) {
        case 'list':
          await this.listHandler.execute(parsed);
          break;

        case 'create':
          await this.createHandler.execute(parsed);
          break;

        case 'info':
        case 'remove':
        case 'update':
        case 'search':
          this.terminal.writeln(`"${parsed.verb}" command not yet implemented`);
          // For unimplemented verbs in this branch, an id is always expected
          this.terminal.writeln(`Usage: ${parsed.verb} ${parsed.entity || '<entity>'} <id>`);
          break;

        default:
          this.terminal.writeln(`Unknown command: ${parsed.verb || input.split(' ')[0]}`);
          this.terminal.writeln('Type "help" for available commands.');
      }
    } catch (error: any) {
      this.terminal.writeln(`Error: ${error.message}`);
      console.error('[CLI Error]', error);
    }
  }

  /**
   * Show help (Homebrew-style quick reference)
   */
  private showHelp(): void {
    const help = [
      '',
      'SYNTAX:',
      '  <verb> <entity> [target] [flags]',
      '',
      'QUICK SHORTCUTS:',
      '  prg              → list programs',
      '  prj              → list projects',
      '  tsk              → list tasks',
      '  sub              → list subtasks',
      '',
      'VERBS:',
      '  list             List all items',
      '  create           Create new item',
      '  info             Show item details',
      '  update           Update an item',
      '  remove           Delete an item',
      '  search           Search for items',
      '',
      'ENTITIES:',
      '  program (prg)    Top-level container',
      '  project (prj)    Belongs to a program',
      '  task (tsk)       Belongs to a project',
      '  subtask (sub)    Belongs to a task',
      '',
      'EXAMPLES:',
      '  list programs',
      '  create task "Fix bug" parent:xyz789 priority:high',
      '  info task xyz789',
      '  remove task xyz789',
      '',
      'MORE INFO:',
      '  man              Full manual (like man pages)',
      '  man list         Help for specific command',
      '  man create       Help for create command',
      '',
    ];

    help.forEach(line => this.terminal.writeln(line));
  }
}
