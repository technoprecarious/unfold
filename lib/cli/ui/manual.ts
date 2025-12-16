/**
 * Manual - Comprehensive CLI documentation (like man pages)
 */

import { Terminal } from 'xterm';

export class Manual {
  private terminal: Terminal;

  constructor(terminal: Terminal) {
    this.terminal = terminal;
  }

  /**
   * Show comprehensive manual (like man brew)
   */
  showManual(): void {
    // Mark the starting viewport position before writing
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const manual = [
      '',
      'UNFOLD(1)                  User Commands                  UNFOLD(1)',
      '',
      'NAME',
      '       unfold - Command-line interface for time management',
      '',
      'SYNOPSIS',
      '       unfold <verb> <entity> [target] [options]',
      '',
      'VERBS',
      '       list',
      '              List all items of a given entity type.',
      '              Example: unfold list tasks',
      '',
      '       create',
      '              Create a new item with the specified properties.',
      '              Aliases: install, add, new',
      '              Example: unfold create task "Fix bug"',
      '',
      '       info',
      '              Display detailed information about a specific item.',
      '              Aliases: show, view, display',
      '              Example: unfold info task abc123',
      '',
      '       remove',
      '              Delete an item from the database.',
      '              Aliases: delete, rm, del, uninstall',
      '              Example: unfold remove task abc123',
      '',
      '       update',
      '              Modify properties of an existing item.',
      '              Aliases: edit',
      '              Example: unfold update task abc123 status:completed',
      '',
      '       search',
      '              Search for items matching a query.',
      '              Aliases: find',
      '              Example: unfold search tasks "bug"',
      '',
      'ENTITIES',
      '       program (prg, programs)',
      '              Top organizational unit. Does not require a parent.',
      '              Contains: projects',
      '',
      '       project (prj, projects)',
      '              Mid-level organizational unit. Belongs to a program.',
      '              Required field: parent (program ID)',
      '              Contains: tasks',
      '',
      '       task (tsk, tasks)',
      '              Actionable work item. Belongs to a project.',
      '              Required field: parent (project ID)',
      '              Contains: subtasks',
      '',
      '       subtask (sub, subtasks)',
      '              Granular work item. Belongs to a task.',
      '              Required field: parent (task ID)',
      '',
      'OPTIONS',
      '       Options can be specified in two formats:',
      '         - Key-value style: priority:high',
      '         - Flag style: --priority=high',
      '',
      '       Common Options:',
      '',
      '       title:"text"',
      '              Item title (required for create)',
      '',
      '       parent:id',
      '              Parent item ID (required for project/task/subtask)',
      '',
      '       priority:level',
      '              Priority level: low, medium, high, critical',
      '',
      '       status:state',
      '              Status: planned, active, paused, due, completed',
      '',
      '       desc:"text"',
      '              Description or notes about the item',
      '',
      '       tags:"tag1,tag2"',
      '              Comma-separated list of tags',
      '',
      'SHORTCUTS',
      '       Quick List:',
      '         prg       Shortcut for "list programs"',
      '         prj       Shortcut for "list projects"',
      '         tsk       Shortcut for "list tasks"',
      '         sub       Shortcut for "list subtasks"',
      '',
      '       Plural Forms:',
      '         programs  Same as "list programs"',
      '         tasks     Same as "list tasks"',
      '',
      '       Status Shortcuts:',
      '         done task <id>   Mark task as completed',
      '         start task <id>  Mark task as active',
      '',
      'EXAMPLES',
      '       List all programs:',
      '         $ prg',
      '         $ list programs',
      '',
      '       Create a new program:',
      '         $ create program "Work Projects"',
      '         $ install program "Personal Goals" desc:"My goals"',
      '',
      '       Create a project under a program:',
      '         $ create project "Website Redesign" parent:abc123',
      '         $ create prj "Mobile App" parent:abc123 priority:high',
      '',
      '       Create a task:',
      '         $ create task "Fix login bug" parent:xyz789',
      '         $ create task "Deploy to prod" parent:xyz789 priority:critical',
      '',
      '       View details:',
      '         $ info program abc123',
      '         $ show task xyz789',
      '',
      '       Update a task:',
      '         $ update task xyz789 status:completed',
      '         $ done task xyz789',
      '',
      '       Remove an item:',
      '         $ remove task xyz789',
      '         $ rm subtask abc123',
      '',
      '       Search:',
      '         $ search tasks "bug"',
      '         $ find programs "work"',
      '',
      'HIERARCHY',
      '       UNFOLD follows a 4-level hierarchy:',
      '',
      '         Program (no parent required)',
      '           └── Project (requires program parent)',
      '                └── Task (requires project parent)',
      '                     └── Subtask (requires task parent)',
      '',
      'SEE ALSO',
      '       help       Quick reference guide',
      '',
      'UNFOLD                    December 2025                   UNFOLD(1)',
      '',
    ];

    manual.forEach(line => this.terminal.writeln(line));
    
    // Scroll back to where the output started (before the manual was written)
    // The viewport moved down by the number of lines written, so scroll back up
    const currentViewportY = this.terminal.buffer.active.viewportY;
    const linesToScrollUp = startViewportY - currentViewportY;
    this.terminal.scrollLines(linesToScrollUp);
  }

  /**
   * Show help for a specific verb or entity
   */
  showSpecificHelp(topic: string): void {
    const topic_lower = topic.toLowerCase();

    switch (topic_lower) {
      case 'list':
        this.showListHelp();
        break;
      case 'create':
      case 'install':
        this.showCreateHelp();
        break;
      case 'info':
      case 'show':
        this.showInfoHelp();
        break;
      case 'remove':
      case 'delete':
        this.showRemoveHelp();
        break;
      case 'update':
        this.showUpdateHelp();
        break;
      case 'search':
        this.showSearchHelp();
        break;
      default:
        this.terminal.writeln(`No manual entry for "${topic}"`);
        this.terminal.writeln('Available topics: list, create, info, remove, update, search');
        this.terminal.writeln('Use "man" for full manual');
    }
  }

  private showListHelp(): void {
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const help = [
      '',
      'list - List all items of an entity type',
      '',
      'USAGE:',
      '  list <entity>',
      '',
      'EXAMPLES:',
      '  list programs',
      '  list tasks',
      '  prg              (shortcut)',
      '  tsk              (shortcut)',
      '',
    ];
    help.forEach(line => this.terminal.writeln(line));
    const currentViewportY = this.terminal.buffer.active.viewportY;
    this.terminal.scrollLines(startViewportY - currentViewportY);
  }

  private showCreateHelp(): void {
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const help = [
      '',
      'create - Create a new item',
      '',
      'USAGE:',
      '  create <entity> "title" [options]',
      '',
      'ALIASES:',
      '  install, add, new',
      '',
      'OPTIONS:',
      '  parent:id        Parent item ID (required for project/task/subtask)',
      '  priority:level   Priority (low/medium/high/critical)',
      '  status:state     Status (planned/active/paused/due/completed)',
      '  desc:"text"      Description',
      '',
      'EXAMPLES:',
      '  create program "Work"',
      '  create project "Website" parent:abc123',
      '  create task "Fix bug" parent:xyz789 priority:high',
      '  install task "Deploy" parent:xyz789',
      '',
    ];
    help.forEach(line => this.terminal.writeln(line));
    const currentViewportY = this.terminal.buffer.active.viewportY;
    this.terminal.scrollLines(startViewportY - currentViewportY);
  }

  private showInfoHelp(): void {
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const help = [
      '',
      'info - Show detailed information about an item',
      '',
      'USAGE:',
      '  info <entity> <id>',
      '',
      'ALIASES:',
      '  show, view, display',
      '',
      'EXAMPLES:',
      '  info program abc123',
      '  show task xyz789',
      '',
    ];
    help.forEach(line => this.terminal.writeln(line));
    const currentViewportY = this.terminal.buffer.active.viewportY;
    this.terminal.scrollLines(startViewportY - currentViewportY);
  }

  private showRemoveHelp(): void {
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const help = [
      '',
      'remove - Delete an item',
      '',
      'USAGE:',
      '  remove <entity> <id>',
      '',
      'ALIASES:',
      '  delete, rm, del, uninstall',
      '',
      'EXAMPLES:',
      '  remove task abc123',
      '  rm subtask xyz789',
      '  uninstall program abc123',
      '',
    ];
    help.forEach(line => this.terminal.writeln(line));
    const currentViewportY = this.terminal.buffer.active.viewportY;
    this.terminal.scrollLines(startViewportY - currentViewportY);
  }

  private showUpdateHelp(): void {
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const help = [
      '',
      'update - Modify an existing item',
      '',
      'USAGE:',
      '  update <entity> <id> [options]',
      '',
      'ALIASES:',
      '  edit',
      '',
      'OPTIONS:',
      '  priority:level   Change priority',
      '  status:state     Change status',
      '  title:"text"     Change title',
      '',
      'SHORTCUTS:',
      '  done task <id>   Mark as completed',
      '  start task <id>  Mark as active',
      '',
      'EXAMPLES:',
      '  update task abc123 status:completed',
      '  update task abc123 priority:high',
      '  done task abc123',
      '',
    ];
    help.forEach(line => this.terminal.writeln(line));
    const currentViewportY = this.terminal.buffer.active.viewportY;
    this.terminal.scrollLines(startViewportY - currentViewportY);
  }

  private showSearchHelp(): void {
    const startViewportY = this.terminal.buffer.active.viewportY;
    
    const help = [
      '',
      'search - Find items matching a query',
      '',
      'USAGE:',
      '  search <entity> "query"',
      '',
      'ALIASES:',
      '  find',
      '',
      'EXAMPLES:',
      '  search tasks "bug"',
      '  find programs "work"',
      '',
    ];
    help.forEach(line => this.terminal.writeln(line));
    const currentViewportY = this.terminal.buffer.active.viewportY;
    this.terminal.scrollLines(startViewportY - currentViewportY);
  }
}
