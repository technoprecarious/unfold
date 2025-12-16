import { Terminal } from 'xterm';
import { 
  getPrograms, 
  getProgram, 
  createProgram, 
  updateProgram, 
  deleteProgram 
} from '@/lib/firestore/programs';
import { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject 
} from '@/lib/firestore/projects';
import { 
  getTasks, 
  getTask, 
  createTask, 
  updateTask, 
  deleteTask 
} from '@/lib/firestore/tasks';
import { 
  getSubtasks, 
  getSubtask, 
  createSubtask, 
  updateSubtask, 
  deleteSubtask 
} from '@/lib/firestore/subtasks';
import { Program, Project, Task, Subtask, Priority, StatusPrimary, StatusSecondary } from '@/lib/types/types';
import { timeToHours } from '@/lib/utils/timetable/timetableUtils';

export class CommandHandler {
  private terminal: Terminal;
  private onDataUpdate: () => void;
  private promptCallback: ((value: string) => void) | null = null;
  public isPromptMode: boolean = false;

  constructor(terminal: Terminal, onDataUpdate: () => void) {
    this.terminal = terminal;
    this.onDataUpdate = onDataUpdate;
  }

  // Method to check if we're in prompt mode and handle input
  handlePromptInput(input: string): boolean {
    if (this.isPromptMode && this.promptCallback) {
      this.promptCallback(input);
      return true; // Input was handled as prompt
    }
    return false; // Not in prompt mode
  }

  // Helper to prompt for input
  private async prompt(question: string, required: boolean = false): Promise<string> {
    return new Promise((resolve) => {
      const handlePrompt = (value: string) => {
        const trimmed = value.trim();
        if (required && !trimmed) {
          this.terminal.writeln('This field is required. Please try again.');
          this.terminal.write(`\r\n${question}: `);
          // Set up callback again for retry
          this.promptCallback = handlePrompt;
          this.isPromptMode = true;
        } else {
          this.isPromptMode = false;
          this.promptCallback = null;
          resolve(trimmed);
        }
      };
      
      // Write question on a new line
      this.terminal.write(`\r\n${question}: `);
      this.isPromptMode = true;
      this.promptCallback = handlePrompt;
      // Ensure terminal scrolls to show the prompt
      this.terminal.scrollToBottom();
    });
  }

  async handleCommand(command: string) {
    if (!command || !command.trim()) {
      this.terminal.writeln('Error: Empty command received');
      return;
    }

    const [cmd, ...args] = command.trim().split(/\s+/);
    const commandLower = cmd.toLowerCase();

    try {
      switch (commandLower) {
        case 'help':
          this.showHelp();
          break;
        case 'list':
          await this.handleList(args);
          break;
        case 'create':
          await this.handleCreate(args);
          break;
        case 'update':
          await this.handleUpdate(args);
          break;
        case 'delete':
        case 'remove':
          await this.handleDelete(args);
          break;
        case 'show':
          await this.handleShow(args);
          break;
        case 'fields':
          this.showFields(args);
          break;
        case 'init':
        case 'init-sample':
        case 'init-samples':
          await this.handleInitSamples();
          break;
        case 'whoami':
        case 'user':
          await this.handleWhoAmI();
          break;
        case 'verify':
        case 'check':
          await this.handleVerify();
          break;
        case 'man':
          await this.handleManUnfold();
          break;
        default:
          // Check if user is trying to use a flag as a command
          if (cmd.startsWith('--')) {
            this.terminal.writeln(`Error: "${cmd}" is a flag, not a command.`);
            this.terminal.writeln(`Usage: <command> <type> ${cmd}="value"`);
            this.terminal.writeln(`Example: create program ${cmd}="value"`);
            this.terminal.writeln(`Type "help" for available commands.`);
          } else {
            this.terminal.writeln(`Unknown command: ${cmd}. Type "help" for available commands.`);
          }
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'An unknown error occurred';
      this.terminal.writeln(`\nError executing command "${command}": ${errorMsg}`);
      console.error('Command handler error:', error);
    }
  }

  private showHelp() {
    try {
      // Force flush and ensure output is visible
      this.terminal.write('\r\n');
      const helpText = [
        'Quick Reference',
        '',
        'KEY COMMANDS:',
        '  list <type> [timeframe] List items (programs|projects|tasks|subtasks)',
        '                         Timeframes: daily|today, weekly|thisweek, monthly|thismonth, yearly|thisyear',
        '  create <type>           Create new item (use --guided for interactive)',
        '  show <type> <id>        Show item details',
        '  update <type> <id>      Update an item',
        '  delete <type> <id>      Delete an item',
        '  init                    Initialize sample data',
        '  whoami                  Show current user info',
        '  verify                  Verify Firestore data',
        '',
        'TYPES:',
        '  program, project, task, subtask',
        '',
        'EXAMPLES:',
        '  list programs',
        '  list tasks daily',
        '  list tasks thisweek',
        '  create program --title="My Program"',
        '  create task --guided',
        '  show program <id>',
        '',
        'For full documentation, use: man',
        ''
      ];
      
      // Write each line
      for (const line of helpText) {
        this.terminal.writeln(line);
      }
      
      // Try to force render refresh
      try {
        const core = (this.terminal as any)._core;
        if (core && core.renderer) {
          core.renderer.render();
        }
      } catch (e) {
        // Ignore render errors
        console.warn('Could not force render:', e);
      }
      
    } catch (error: any) {
      console.error('showHelp error:', error);
      // If writeln fails, try write as fallback
    }
  }

  private showFields(args: string[]) {
    const type = args[0]?.toLowerCase();
    
    if (!type || !['program', 'project', 'task', 'subtask'].includes(type)) {
      this.terminal.writeln('Usage: fields <type>');
      this.terminal.writeln('Types: program, project, task, subtask');
      return;
    }

    this.terminal.writeln(`\nAvailable fields for ${type.toUpperCase()}:`);
    this.terminal.writeln('');
    
    // BaseItem fields (all types)
    this.terminal.writeln('BASE FIELDS (all types):');
    this.terminal.writeln('  title*              string  - Item title (required)');
    this.terminal.writeln('  description         string  - Detailed description');
    this.terminal.writeln('  priority            enum    - low, medium, high, critical');
    this.terminal.writeln('  notes               string  - Additional notes');
    this.terminal.writeln('  tags                array   - Comma-separated tags');
    this.terminal.writeln('');

    switch (type) {
      case 'program':
        this.terminal.writeln('PROGRAM-SPECIFIC FIELDS:');
        this.terminal.writeln('  category            string  - Program category');
        this.terminal.writeln('  status              enum    - planned, active, paused, due, completed');
        this.terminal.writeln('  progress            number  - Progress percentage (0-100)');
        this.terminal.writeln('  objective           string  - Program objective');
        this.terminal.writeln('  resources           array   - Comma-separated resource URLs');
        this.terminal.writeln('');
        this.terminal.writeln('TIMEFRAME FIELDS:');
        this.terminal.writeln('  start               string  - Start date/time (ISO or YYYY-MM-DDTHH:MM)');
        this.terminal.writeln('  deadline            string  - Deadline date/time');
        this.terminal.writeln('  targetEnd           string  - Target end date/time');
        this.terminal.writeln('  actualEnd           string  - Actual end date/time');
        this.terminal.writeln('');
        this.terminal.writeln('RECURRENCE FIELDS:');
        this.terminal.writeln('  recurrenceType      enum    - none, daily, weekly, monthly, yearly');
        this.terminal.writeln('  daysOfWeek          array   - Comma-separated days (0=Sun, 6=Sat)');
        break;
        
      case 'project':
        this.terminal.writeln('PROJECT-SPECIFIC FIELDS:');
        this.terminal.writeln('  parentId*           string  - Program ID (required)');
        this.terminal.writeln('  phase               string  - Project phase');
        this.terminal.writeln('  status              enum    - planned, active, paused, due, completed');
        this.terminal.writeln('  progress            number  - Progress percentage (0-100)');
        this.terminal.writeln('  dependencies        array   - Comma-separated project IDs');
        this.terminal.writeln('  objective           string  - Project objective');
        this.terminal.writeln('  resources           array   - Comma-separated resource URLs');
        this.terminal.writeln('');
        this.terminal.writeln('TIMEFRAME FIELDS:');
        this.terminal.writeln('  start               string  - Start date/time (ISO or YYYY-MM-DDTHH:MM)');
        this.terminal.writeln('  deadline            string  - Deadline date/time');
        this.terminal.writeln('  targetEnd           string  - Target end date/time');
        this.terminal.writeln('  actualEnd           string  - Actual end date/time');
        this.terminal.writeln('');
        this.terminal.writeln('RECURRENCE FIELDS:');
        this.terminal.writeln('  recurrenceType      enum    - none, daily, weekly, monthly, yearly');
        this.terminal.writeln('  daysOfWeek          array   - Comma-separated days (0=Sun, 6=Sat)');
        break;
        
      case 'task':
        this.terminal.writeln('TASK-SPECIFIC FIELDS:');
        this.terminal.writeln('  parentId*           string  - Project or Program ID (required)');
        this.terminal.writeln('  status              enum    - planned, active, paused, due, completed');
        this.terminal.writeln('  dependencies        array   - Comma-separated project/task IDs');
        this.terminal.writeln('  subtasks            array   - Comma-separated subtask IDs');
        this.terminal.writeln('');
        this.terminal.writeln('TIMEFRAME FIELDS:');
        this.terminal.writeln('  start               string  - Start date/time (ISO or YYYY-MM-DDTHH:MM)');
        this.terminal.writeln('  targetEnd           string  - Target end date/time');
        this.terminal.writeln('  actualEnd           string  - Actual end date/time');
        this.terminal.writeln('');
        this.terminal.writeln('RECURRENCE FIELDS:');
        this.terminal.writeln('  recurrenceType      enum    - none, daily, weekly, monthly, yearly');
        this.terminal.writeln('  daysOfWeek          array   - Comma-separated days (0=Sun, 6=Sat)');
        break;
        
      case 'subtask':
        this.terminal.writeln('SUBTASK-SPECIFIC FIELDS:');
        this.terminal.writeln('  parentId*           string  - Task ID (required)');
        this.terminal.writeln('  status              enum    - planned, completed');
        this.terminal.writeln('');
        this.terminal.writeln('TIMEFRAME FIELDS:');
        this.terminal.writeln('  start               string  - Start date/time (ISO or YYYY-MM-DDTHH:MM)');
        this.terminal.writeln('  targetEnd           string  - Target end date/time');
        this.terminal.writeln('  actualEnd           string  - Actual end date/time');
        break;
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('EXAMPLES:');
    this.terminal.writeln(`  create ${type} --title="My ${type}" --priority="high"`);
    this.terminal.writeln(`  create ${type} --guided  # Interactive mode with all fields`);
    this.terminal.writeln(`  create ${type} --json    # JSON input mode`);
    this.terminal.writeln('');
  }

  private normalizeDateTime(input: string | undefined): string | undefined {
    if (!input) return undefined;
    
    // If it's already ISO format, return as is
    if (input.includes('T') || input.includes(' ')) {
      // Try to parse and reformat to ISO
      try {
        const date = new Date(input);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        // If parsing fails, return original
        return input;
      }
    }
    
    // If it's just a date (YYYY-MM-DD), add default time
    const dateMatch = input.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      return `${dateMatch[1]}T00:00:00`;
    }
    
    return input;
  }

  // Helper to filter items by timeframe
  private filterByTimeframe<T extends Program | Project | Task | Subtask>(
    items: T[],
    timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  ): T[] {
    if (!timeframe) return items;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (timeframe) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Sunday
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Saturday
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        return items;
    }

    return items.filter(item => {
      if (!item.timeframe || !item.timeframe.start) return false;

      const itemStart = new Date(item.timeframe.start);
      
      // Get end date - handle different timeframe types
      let itemEnd: Date;
      if ('deadline' in item.timeframe && item.timeframe.deadline) {
        itemEnd = new Date(item.timeframe.deadline);
      } else if (item.timeframe.targetEnd) {
        itemEnd = new Date(item.timeframe.targetEnd);
      } else if (item.timeframe.actualEnd) {
        itemEnd = new Date(item.timeframe.actualEnd);
      } else {
        itemEnd = itemStart;
      }

      // Check if item overlaps with the timeframe
      return itemStart <= endDate && itemEnd >= startDate;
    });
  }

  private async handleList(args: string[]) {
    const type = args[0]?.toLowerCase();
    const timeframeArg = args[1]?.toLowerCase();

    if (!type) {
      this.terminal.writeln('Usage: list <type> [timeframe]');
      this.terminal.writeln('  Types: programs, projects, tasks, subtasks');
      this.terminal.writeln('  Timeframes: daily|today, weekly|thisweek, monthly|thismonth, yearly|thisyear');
      return;
    }

    // Parse timeframe
    let timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | null = null;
    let timeframeLabel = '';
    if (timeframeArg) {
      if (timeframeArg === 'daily' || timeframeArg === 'today') {
        timeframe = 'daily';
        timeframeLabel = timeframeArg === 'today' ? 'today' : 'daily';
      } else if (timeframeArg === 'weekly' || timeframeArg === 'thisweek') {
        timeframe = 'weekly';
        timeframeLabel = timeframeArg === 'thisweek' ? 'thisweek' : 'weekly';
      } else if (timeframeArg === 'monthly' || timeframeArg === 'thismonth') {
        timeframe = 'monthly';
        timeframeLabel = timeframeArg === 'thismonth' ? 'thismonth' : 'monthly';
      } else if (timeframeArg === 'yearly' || timeframeArg === 'thisyear') {
        timeframe = 'yearly';
        timeframeLabel = timeframeArg === 'thisyear' ? 'thisyear' : 'yearly';
      } else {
        this.terminal.writeln(`Unknown timeframe: ${timeframeArg}`);
        this.terminal.writeln('Available: daily|today, weekly|thisweek, monthly|thismonth, yearly|thisyear');
        return;
      }
    }

    try {
      switch (type) {
        case 'program':
        case 'programs':
          const programs = await getPrograms();
          const filteredPrograms = this.filterByTimeframe(programs, timeframe);
          const programTimeframeLabel = timeframe ? ` (${timeframeLabel})` : '';
          this.terminal.writeln(`\nPrograms${programTimeframeLabel} (${filteredPrograms.length}):`);
          if (filteredPrograms.length === 0) {
            this.terminal.writeln('  No programs found.');
          } else {
            filteredPrograms.forEach(p => {
              const timeInfo = p.timeframe?.start 
                ? ` - ${p.timeframe.start.split('T')[0]}` 
                : '';
              this.terminal.writeln(`  [${p.id}] ${p.title}${timeInfo} ${p.status ? `(${p.status})` : ''}`);
            });
          }
          break;
        case 'project':
        case 'projects':
          const projects = await getProjects();
          const filteredProjects = this.filterByTimeframe(projects, timeframe);
          const projectTimeframeLabel = timeframe ? ` (${timeframeLabel})` : '';
          this.terminal.writeln(`\nProjects${projectTimeframeLabel} (${filteredProjects.length}):`);
          if (filteredProjects.length === 0) {
            this.terminal.writeln('  No projects found.');
          } else {
            filteredProjects.forEach(p => {
              const timeInfo = p.timeframe?.start 
                ? ` - ${p.timeframe.start.split('T')[0]}` 
                : '';
              this.terminal.writeln(`  [${p.id}] ${p.title}${timeInfo} - Parent: ${p.parentId} ${p.status ? `(${p.status})` : ''}`);
            });
          }
          break;
        case 'task':
        case 'tasks':
          const tasks = await getTasks();
          const filteredTasks = this.filterByTimeframe(tasks, timeframe);
          const taskTimeframeLabel = timeframe ? ` (${timeframeLabel})` : '';
          this.terminal.writeln(`\nTasks${taskTimeframeLabel} (${filteredTasks.length}):`);
          if (filteredTasks.length === 0) {
            this.terminal.writeln('  No tasks found.');
          } else {
            filteredTasks.forEach(t => {
              const timeInfo = t.timeframe?.start 
                ? ` - ${t.timeframe.start.split('T')[0]} ${t.timeframe.start.split('T')[1]?.substring(0, 5) || ''}` 
                : '';
              this.terminal.writeln(`  [${t.id}] ${t.title}${timeInfo} - Parent: ${t.parentId} ${t.status ? `(${t.status})` : ''}`);
            });
          }
          break;
        case 'subtask':
        case 'subtasks':
          const subtasks = await getSubtasks();
          const filteredSubtasks = this.filterByTimeframe(subtasks, timeframe);
          const subtaskTimeframeLabel = timeframe ? ` (${timeframeLabel})` : '';
          this.terminal.writeln(`\nSubtasks${subtaskTimeframeLabel} (${filteredSubtasks.length}):`);
          if (filteredSubtasks.length === 0) {
            this.terminal.writeln('  No subtasks found.');
          } else {
            filteredSubtasks.forEach(s => {
              const timeInfo = s.timeframe?.start 
                ? ` - ${s.timeframe.start.split('T')[0]} ${s.timeframe.start.split('T')[1]?.substring(0, 5) || ''}` 
                : '';
              this.terminal.writeln(`  [${s.id}] ${s.title}${timeInfo} - Parent: ${s.parentId} ${s.status ? `(${s.status})` : ''}`);
            });
          }
          break;
        default:
          this.terminal.writeln(`Unknown type: ${type}. Available: programs, projects, tasks, subtasks`);
      }
      this.terminal.writeln('');
    } catch (error: any) {
      if (error.message?.includes('not authenticated') || error.message?.includes('configuration')) {
        this.terminal.writeln(`Error: Firebase not configured. Please set up your Firebase credentials in .env.local`);
        this.terminal.writeln(`CLI commands will work once Firebase is configured.`);
      } else {
        this.terminal.writeln(`Error listing ${type}: ${error.message}`);
      }
    }
  }

  private async handleShow(args: string[]) {
    const type = args[0]?.toLowerCase();
    const id = args[1];

    if (!type || !id) {
      this.terminal.writeln('Usage: show <type> <id>');
      return;
    }

    try {
      let item: Program | Project | Task | Subtask | null = null;
      switch (type) {
        case 'program':
          item = await getProgram(id);
          break;
        case 'project':
          item = await getProject(id);
          break;
        case 'task':
          item = await getTask(id);
          break;
        case 'subtask':
          item = await getSubtask(id);
          break;
        default:
          this.terminal.writeln(`Unknown type: ${type}`);
          return;
      }

      if (!item) {
        this.terminal.writeln(`Item not found: ${id}`);
        return;
      }

      // Helper function to format time from decimal hours
      const formatTimeFromHours = (hours: number | null): string => {
        if (hours === null) return '(empty)';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const displayH = h === 24 ? 0 : h;
        return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      this.terminal.writeln(`\n${type.toUpperCase()}: ${item.title}`);
      
      // BaseItem fields (all types)
      this.terminal.writeln(`  ID: ${item.id}`);
      this.terminal.writeln(`  Title: ${item.title}`);
      this.terminal.writeln(`  Created: ${item.createdAt}`);
      this.terminal.writeln(`  Updated: ${item.updatedAt}`);
      this.terminal.writeln(`  Description: ${item.description || '(empty)'}`);
      this.terminal.writeln(`  Priority: ${item.priority || '(empty)'}`);
      this.terminal.writeln(`  Notes: ${item.notes || '(empty)'}`);
      this.terminal.writeln(`  Tags: ${item.tags && item.tags.length > 0 ? item.tags.join(', ') : '(empty)'}`);
      
      // Time slot (duration) - calculated from timeframe
      if ('timeframe' in item && item.timeframe) {
        let startTime: number | null = null;
        let endTime: number | null = null;
        
        if (type === 'program' || type === 'project') {
          const pr = item as Program | Project;
          startTime = timeToHours(pr.timeframe?.start);
          endTime = timeToHours(pr.timeframe?.deadline || pr.timeframe?.targetEnd || pr.timeframe?.actualEnd);
        } else if (type === 'task' || type === 'subtask') {
          const ta = item as Task | Subtask;
          startTime = timeToHours(ta.timeframe?.start);
          endTime = timeToHours(ta.timeframe?.targetEnd || ta.timeframe?.actualEnd);
        }
        
        if (startTime !== null && endTime !== null) {
          this.terminal.writeln(`  Time Slot: ${formatTimeFromHours(startTime)} - ${formatTimeFromHours(endTime)}`);
        } else {
          this.terminal.writeln(`  Time Slot: (empty)`);
        }
      } else {
        this.terminal.writeln(`  Time Slot: (empty)`);
      }
      
      // Program-specific fields
      if (type === 'program') {
        const program = item as Program;
        this.terminal.writeln(`  Category: ${program.category || '(empty)'}`);
        this.terminal.writeln(`  Status: ${program.status || '(empty)'}`);
        this.terminal.writeln(`  Progress: ${program.progress !== undefined ? program.progress : '(empty)'}`);
        this.terminal.writeln(`  Objective: ${program.objective || '(empty)'}`);
        this.terminal.writeln(`  Resources: ${program.resources && program.resources.length > 0 ? program.resources.join(', ') : '(empty)'}`);
        
        // TimeframePr (start, deadline, targetEnd, actualEnd)
        if (program.timeframe) {
          this.terminal.writeln(`  Start: ${program.timeframe.start || '(empty)'}`);
          this.terminal.writeln(`  Deadline: ${program.timeframe.deadline || '(empty)'}`);
          this.terminal.writeln(`  Target End: ${program.timeframe.targetEnd || '(empty)'}`);
          this.terminal.writeln(`  Actual End: ${program.timeframe.actualEnd || '(empty)'}`);
        } else {
          this.terminal.writeln(`  Start: (empty)`);
          this.terminal.writeln(`  Deadline: (empty)`);
          this.terminal.writeln(`  Target End: (empty)`);
          this.terminal.writeln(`  Actual End: (empty)`);
        }
        
        // Recurrence
        if (program.recurrence) {
          this.terminal.writeln(`  Recurrence Type: ${program.recurrence.type || '(empty)'}`);
          this.terminal.writeln(`  Days of Week: ${program.recurrence.daysOfWeek && program.recurrence.daysOfWeek.length > 0 ? program.recurrence.daysOfWeek.join(', ') : '(empty)'}`);
        } else {
          this.terminal.writeln(`  Recurrence Type: (empty)`);
          this.terminal.writeln(`  Days of Week: (empty)`);
        }
      }
      
      // Project-specific fields
      if (type === 'project') {
        const project = item as Project;
        this.terminal.writeln(`  Parent ID: ${project.parentId || '(empty)'}`);
        this.terminal.writeln(`  Phase: ${project.phase || '(empty)'}`);
        this.terminal.writeln(`  Status: ${project.status || '(empty)'}`);
        this.terminal.writeln(`  Progress: ${project.progress !== undefined ? project.progress : '(empty)'}`);
        this.terminal.writeln(`  Dependencies: ${project.dependencies && project.dependencies.length > 0 ? project.dependencies.join(', ') : '(empty)'}`);
        this.terminal.writeln(`  Objective: ${project.objective || '(empty)'}`);
        this.terminal.writeln(`  Resources: ${project.resources && project.resources.length > 0 ? project.resources.join(', ') : '(empty)'}`);
        
        // TimeframePr (start, deadline, targetEnd, actualEnd)
        if (project.timeframe) {
          this.terminal.writeln(`  Start: ${project.timeframe.start || '(empty)'}`);
          this.terminal.writeln(`  Deadline: ${project.timeframe.deadline || '(empty)'}`);
          this.terminal.writeln(`  Target End: ${project.timeframe.targetEnd || '(empty)'}`);
          this.terminal.writeln(`  Actual End: ${project.timeframe.actualEnd || '(empty)'}`);
        } else {
          this.terminal.writeln(`  Start: (empty)`);
          this.terminal.writeln(`  Deadline: (empty)`);
          this.terminal.writeln(`  Target End: (empty)`);
          this.terminal.writeln(`  Actual End: (empty)`);
        }
        
        // Recurrence
        if (project.recurrence) {
          this.terminal.writeln(`  Recurrence Type: ${project.recurrence.type || '(empty)'}`);
          this.terminal.writeln(`  Days of Week: ${project.recurrence.daysOfWeek && project.recurrence.daysOfWeek.length > 0 ? project.recurrence.daysOfWeek.join(', ') : '(empty)'}`);
        } else {
          this.terminal.writeln(`  Recurrence Type: (empty)`);
          this.terminal.writeln(`  Days of Week: (empty)`);
        }
      }
      
      // Task-specific fields
      if (type === 'task') {
        const task = item as Task;
        this.terminal.writeln(`  Parent ID: ${task.parentId || '(empty)'}`);
        this.terminal.writeln(`  Status: ${task.status || '(empty)'}`);
        this.terminal.writeln(`  Dependencies: ${task.dependencies && task.dependencies.length > 0 ? task.dependencies.join(', ') : '(empty)'}`);
        this.terminal.writeln(`  Subtasks: ${task.subtasks && task.subtasks.length > 0 ? task.subtasks.join(', ') : '(empty)'}`);
        
        // TimeframeTa (start, targetEnd, actualEnd) - no deadline
        if (task.timeframe) {
          this.terminal.writeln(`  Start: ${task.timeframe.start || '(empty)'}`);
          this.terminal.writeln(`  Target End: ${task.timeframe.targetEnd || '(empty)'}`);
          this.terminal.writeln(`  Actual End: ${task.timeframe.actualEnd || '(empty)'}`);
        } else {
          this.terminal.writeln(`  Start: (empty)`);
          this.terminal.writeln(`  Target End: (empty)`);
          this.terminal.writeln(`  Actual End: (empty)`);
        }
        
        // Recurrence
        if (task.recurrence) {
          this.terminal.writeln(`  Recurrence Type: ${task.recurrence.type || '(empty)'}`);
          this.terminal.writeln(`  Days of Week: ${task.recurrence.daysOfWeek && task.recurrence.daysOfWeek.length > 0 ? task.recurrence.daysOfWeek.join(', ') : '(empty)'}`);
        } else {
          this.terminal.writeln(`  Recurrence Type: (empty)`);
          this.terminal.writeln(`  Days of Week: (empty)`);
        }
      }
      
      // Subtask-specific fields
      if (type === 'subtask') {
        const subtask = item as Subtask;
        this.terminal.writeln(`  Parent ID: ${subtask.parentId || '(empty)'}`);
        this.terminal.writeln(`  Status: ${subtask.status || '(empty)'}`);
        
        // TimeframeTa (start, targetEnd, actualEnd) - no deadline
        if (subtask.timeframe) {
          this.terminal.writeln(`  Start: ${subtask.timeframe.start || '(empty)'}`);
          this.terminal.writeln(`  Target End: ${subtask.timeframe.targetEnd || '(empty)'}`);
          this.terminal.writeln(`  Actual End: ${subtask.timeframe.actualEnd || '(empty)'}`);
        } else {
          this.terminal.writeln(`  Start: (empty)`);
          this.terminal.writeln(`  Target End: (empty)`);
          this.terminal.writeln(`  Actual End: (empty)`);
        }
      }
      
      this.terminal.writeln('');
    } catch (error: any) {
      this.terminal.writeln(`Error showing ${type}: ${error.message}`);
    }
  }

  private async handleCreate(args: string[]) {
    const type = args[0]?.toLowerCase();
    if (!type) {
      this.terminal.writeln('Usage: create <type> (program|project|task|subtask)');
      this.terminal.writeln('  Options: --guided (interactive mode), --json (JSON input mode)');
      return;
    }

    // Check for mode flags
    const remainingArgs = args.slice(1);
    const isGuided = remainingArgs.includes('--guided');
    const isJson = remainingArgs.includes('--json');
    
    // Remove mode flags from args
    const cleanArgs = remainingArgs.filter(arg => arg !== '--guided' && arg !== '--json');
    const parsed = this.parseArgs(cleanArgs);

    try {
      if (isJson) {
        // JSON mode
        await this.handleCreateJson(type);
      } else if (isGuided || Object.keys(parsed).length === 0) {
        // Guided mode (if --guided flag or no args provided)
        // Note: isProcessingCommand will be reset after this async function completes
        // But we allow input during prompt mode in the terminal component
        await this.handleCreateGuided(type);
        } else {
          // Quick mode (current behavior)
          this.terminal.writeln(`\nCreating new ${type}...`);
          this.terminal.writeln('Tip: Use --guided for interactive mode or --json for JSON input');
          this.terminal.writeln('');
          switch (type) {
            case 'program':
              await this.createProgramInteractive(parsed);
              break;
            case 'project':
              await this.createProjectInteractive(parsed);
              break;
            case 'task':
              await this.createTaskInteractive(parsed);
              break;
            case 'subtask':
              await this.createSubtaskInteractive(parsed);
              break;
            default:
              this.terminal.writeln(`Unknown type: ${type}`);
          }
        }
    } catch (error: any) {
      this.terminal.writeln(`Error creating ${type}: ${error.message}`);
    }
  }

  private parseArgs(args: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const arg of args) {
      const match = arg.match(/^--(\w+)=(.*)$/);
      if (match) {
        result[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
    return result;
  }

  // Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
  private removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  private async createProgramInteractive(parsed: Record<string, string>) {
    const title = parsed.title;
    if (!title) {
      this.terminal.writeln('Error: title is required. Use --title="Title"');
      return;
    }

    const programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      description: parsed.description,
      priority: parsed.priority as Priority,
      status: parsed.status as StatusPrimary,
      category: parsed.category,
      objective: parsed.objective,
      notes: parsed.notes,
      tags: parsed.tags ? parsed.tags.split(',').map(t => t.trim()) : undefined,
      resources: parsed.resources ? parsed.resources.split(',').map(r => r.trim()) : undefined,
      progress: parsed.progress ? parseFloat(parsed.progress) : undefined,
      timeframe: (parsed.start || parsed.deadline || parsed.targetEnd || parsed.actualEnd) ? this.removeUndefined({
        start: this.normalizeDateTime(parsed.start),
        deadline: this.normalizeDateTime(parsed.deadline),
        targetEnd: this.normalizeDateTime(parsed.targetEnd),
        actualEnd: this.normalizeDateTime(parsed.actualEnd),
      }) : undefined,
      recurrence: (parsed.recurrenceType && parsed.recurrenceType !== 'none') ? {
        type: parsed.recurrenceType as any,
        ...(parsed.daysOfWeek ? { daysOfWeek: parsed.daysOfWeek.split(',').map(d => parseInt(d.trim(), 10)) } : {}),
      } : undefined,
    };

    // Remove undefined values before sending to Firestore
    const cleanedData = this.removeUndefined(programData);
    const id = await createProgram(cleanedData as Omit<Program, 'id' | 'createdAt' | 'updatedAt'>);
    this.terminal.writeln(`Program created with ID: ${id}`);
    this.onDataUpdate();
  }

  private async createProjectInteractive(parsed: Record<string, string>) {
    const title = parsed.title;
    const parentId = parsed.parentId;
    
    if (!title || !parentId) {
      this.terminal.writeln('Error: title and parentId are required. Use --title="Title" --parentId="id"');
      return;
    }

    const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      parentId,
      description: parsed.description,
      priority: parsed.priority as Priority,
      status: parsed.status as StatusPrimary,
      phase: parsed.phase,
      objective: parsed.objective,
      notes: parsed.notes,
      tags: parsed.tags ? parsed.tags.split(',').map(t => t.trim()) : undefined,
      resources: parsed.resources ? parsed.resources.split(',').map(r => r.trim()) : undefined,
      dependencies: parsed.dependencies ? parsed.dependencies.split(',').map(d => d.trim()) : undefined,
      progress: parsed.progress ? parseFloat(parsed.progress) : undefined,
      timeframe: (parsed.start || parsed.deadline || parsed.targetEnd || parsed.actualEnd) ? this.removeUndefined({
        start: this.normalizeDateTime(parsed.start),
        deadline: this.normalizeDateTime(parsed.deadline),
        targetEnd: this.normalizeDateTime(parsed.targetEnd),
        actualEnd: this.normalizeDateTime(parsed.actualEnd),
      }) : undefined,
      recurrence: (parsed.recurrenceType && parsed.recurrenceType !== 'none') ? {
        type: parsed.recurrenceType as any,
        ...(parsed.daysOfWeek ? { daysOfWeek: parsed.daysOfWeek.split(',').map(d => parseInt(d.trim(), 10)) } : {}),
      } : undefined,
    };

    // Remove undefined values before sending to Firestore
    const cleanedData = this.removeUndefined(projectData);
    const id = await createProject(cleanedData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
    this.terminal.writeln(`Project created with ID: ${id}`);
    this.onDataUpdate();
  }

  private async createTaskInteractive(parsed: Record<string, string>) {
    const title = parsed.title;
    const parentId = parsed.parentId;
    
    if (!title || !parentId) {
      this.terminal.writeln('Error: title and parentId are required. Use --title="Title" --parentId="id"');
      return;
    }

    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      parentId,
      description: parsed.description,
      priority: parsed.priority as Priority,
      status: parsed.status as StatusPrimary,
      notes: parsed.notes,
      tags: parsed.tags ? parsed.tags.split(',').map(t => t.trim()) : undefined,
      dependencies: parsed.dependencies ? parsed.dependencies.split(',').map(d => d.trim()) : undefined,
      subtasks: parsed.subtasks ? parsed.subtasks.split(',').map(s => s.trim()) : undefined,
      timeframe: (parsed.start || parsed.targetEnd || parsed.actualEnd) ? this.removeUndefined({
        start: this.normalizeDateTime(parsed.start),
        targetEnd: this.normalizeDateTime(parsed.targetEnd),
        actualEnd: this.normalizeDateTime(parsed.actualEnd),
      }) : undefined,
      recurrence: (parsed.recurrenceType && parsed.recurrenceType !== 'none') ? {
        type: parsed.recurrenceType as any,
        ...(parsed.daysOfWeek ? { daysOfWeek: parsed.daysOfWeek.split(',').map(d => parseInt(d.trim(), 10)) } : {}),
      } : undefined,
    };

    // Remove undefined values before sending to Firestore
    const cleanedData = this.removeUndefined(taskData);
    const id = await createTask(cleanedData as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
    this.terminal.writeln(`Task created with ID: ${id}`);
    this.onDataUpdate();
  }

  private async createSubtaskInteractive(parsed: Record<string, string>) {
    const title = parsed.title;
    const parentId = parsed.parentId;
    
    if (!title || !parentId) {
      this.terminal.writeln('Error: title and parentId are required. Use --title="Title" --parentId="id"');
      return;
    }

    const subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      parentId,
      description: parsed.description,
      priority: parsed.priority as Priority,
      status: parsed.status as StatusSecondary,
      notes: parsed.notes,
      tags: parsed.tags ? parsed.tags.split(',').map(t => t.trim()) : undefined,
      timeframe: (parsed.start || parsed.targetEnd || parsed.actualEnd) ? this.removeUndefined({
        start: this.normalizeDateTime(parsed.start),
        targetEnd: this.normalizeDateTime(parsed.targetEnd),
        actualEnd: this.normalizeDateTime(parsed.actualEnd),
      }) : undefined,
    };

    // Remove undefined values before sending to Firestore
    const cleanedData = this.removeUndefined(subtaskData);
    const id = await createSubtask(cleanedData as Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>);
    this.terminal.writeln(`Subtask created with ID: ${id}`);
    this.onDataUpdate();
  }

  private async handleUpdate(args: string[]) {
    const type = args[0]?.toLowerCase();
    const id = args[1];

    if (!type || !id) {
      this.terminal.writeln('Usage: update <type> <id> --field="value" [--field2="value2"]');
      this.terminal.writeln('Example: update task task123 --status="active" --priority="high"');
      return;
    }

    const parsed = this.parseArgs(args.slice(2));
    
    if (Object.keys(parsed).length === 0) {
      this.terminal.writeln('No fields specified for update');
      return;
    }

    try {
      const updates: any = {};
      
      // Build update object
      if (parsed.title) updates.title = parsed.title;
      if (parsed.description) updates.description = parsed.description;
      if (parsed.priority) updates.priority = parsed.priority as Priority;
      if (parsed.status) updates.status = parsed.status;
      if (parsed.notes) updates.notes = parsed.notes;
      if (parsed.tags) updates.tags = parsed.tags.split(',');
      
      switch (type) {
        case 'program':
          if (parsed.category) updates.category = parsed.category;
          if (parsed.objective) updates.objective = parsed.objective;
          if (parsed.resources) updates.resources = parsed.resources.split(',');
          if (parsed.start || parsed.deadline || parsed.targetEnd) {
            updates.timeframe = this.removeUndefined({
              start: parsed.start,
              deadline: parsed.deadline,
              targetEnd: parsed.targetEnd,
              actualEnd: parsed.actualEnd,
            });
          }
          await updateProgram(id, this.removeUndefined(updates));
          break;
        case 'project':
          if (parsed.phase) updates.phase = parsed.phase;
          if (parsed.objective) updates.objective = parsed.objective;
          if (parsed.resources) updates.resources = parsed.resources.split(',');
          if (parsed.dependencies) updates.dependencies = parsed.dependencies.split(',');
          if (parsed.start || parsed.deadline || parsed.targetEnd) {
            updates.timeframe = this.removeUndefined({
              start: parsed.start,
              deadline: parsed.deadline,
              targetEnd: parsed.targetEnd,
              actualEnd: parsed.actualEnd,
            });
          }
          await updateProject(id, this.removeUndefined(updates));
          break;
        case 'task':
          if (parsed.dependencies) updates.dependencies = parsed.dependencies.split(',');
          if (parsed.subtasks) updates.subtasks = parsed.subtasks.split(',');
          if (parsed.start || parsed.targetEnd) {
            updates.timeframe = this.removeUndefined({
              start: parsed.start,
              targetEnd: parsed.targetEnd,
              actualEnd: parsed.actualEnd,
            });
          }
          await updateTask(id, this.removeUndefined(updates));
          break;
        case 'subtask':
          if (parsed.start || parsed.targetEnd) {
            updates.timeframe = this.removeUndefined({
              start: parsed.start,
              targetEnd: parsed.targetEnd,
              actualEnd: parsed.actualEnd,
            });
          }
          await updateSubtask(id, this.removeUndefined(updates));
          break;
        default:
          this.terminal.writeln(`Unknown type: ${type}`);
          return;
      }
      
      this.terminal.writeln(`${type} ${id} updated successfully`);
      this.onDataUpdate();
    } catch (error: any) {
      this.terminal.writeln(`Error updating ${type}: ${error.message}`);
    }
  }

  private async handleDelete(args: string[]) {
    const type = args[0]?.toLowerCase();
    const id = args[1];

    if (!type || !id) {
      this.terminal.writeln('Usage: delete <type> <id>');
      return;
    }

    try {
      switch (type) {
        case 'program':
          await deleteProgram(id);
          break;
        case 'project':
          await deleteProject(id);
          break;
        case 'task':
          await deleteTask(id);
          break;
        case 'subtask':
          await deleteSubtask(id);
          break;
        default:
          this.terminal.writeln(`Unknown type: ${type}`);
          return;
      }
      this.terminal.writeln(`${type} ${id} deleted successfully`);
      this.onDataUpdate();
    } catch (error: any) {
      this.terminal.writeln(`Error deleting ${type}: ${error.message}`);
    }
  }

  // Guided mode - interactive prompts
  private async handleCreateGuided(type: string) {
    this.terminal.writeln(`\nCreating New ${type.charAt(0).toUpperCase() + type.slice(1)} (Guided Mode)`);
    this.terminal.writeln('Press Enter to skip optional fields');
    this.terminal.writeln('Date/Time format: YYYY-MM-DD or YYYY-MM-DDTHH:MM (e.g., 2025-01-15T09:00)\n');

    const fields: Record<string, string> = {};

    try {
      switch (type) {
        case 'program':
          fields.title = await this.prompt('Title*', true);
          fields.description = await this.prompt('Description');
          fields.priority = await this.prompt('Priority (low/medium/high/critical)');
          fields.status = await this.prompt('Status (planned/active/paused/due/completed)');
          fields.category = await this.prompt('Category');
          fields.objective = await this.prompt('Objective');
          fields.notes = await this.prompt('Notes');
          fields.tags = await this.prompt('Tags (comma-separated)');
          fields.resources = await this.prompt('Resources (comma-separated URLs)');
          fields.progress = await this.prompt('Progress (0-100)');
          
          this.terminal.writeln('\n--- Timeframe ---');
          fields.start = await this.prompt('Start date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM)');
          fields.deadline = await this.prompt('Deadline date/time');
          fields.targetEnd = await this.prompt('Target end date/time');
          fields.actualEnd = await this.prompt('Actual end date/time');
          
          this.terminal.writeln('\n--- Recurrence ---');
          fields.recurrenceType = await this.prompt('Recurrence type (none/daily/weekly/monthly/yearly)');
          if (fields.recurrenceType && fields.recurrenceType !== 'none') {
            fields.daysOfWeek = await this.prompt('Days of week (0=Sun, 1=Mon, ..., 6=Sat, comma-separated)');
          }
          await this.createProgramInteractive(fields);
          break;
          
        case 'project':
          fields.title = await this.prompt('Title*', true);
          fields.parentId = await this.prompt('Parent ID (Program ID)*', true);
          fields.description = await this.prompt('Description');
          fields.priority = await this.prompt('Priority (low/medium/high/critical)');
          fields.status = await this.prompt('Status (planned/active/paused/due/completed)');
          fields.phase = await this.prompt('Phase');
          fields.objective = await this.prompt('Objective');
          fields.notes = await this.prompt('Notes');
          fields.tags = await this.prompt('Tags (comma-separated)');
          fields.resources = await this.prompt('Resources (comma-separated URLs)');
          fields.dependencies = await this.prompt('Dependencies (comma-separated project IDs)');
          fields.progress = await this.prompt('Progress (0-100)');
          
          this.terminal.writeln('\n--- Timeframe ---');
          fields.start = await this.prompt('Start date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM)');
          fields.deadline = await this.prompt('Deadline date/time');
          fields.targetEnd = await this.prompt('Target end date/time');
          fields.actualEnd = await this.prompt('Actual end date/time');
          
          this.terminal.writeln('\n--- Recurrence ---');
          fields.recurrenceType = await this.prompt('Recurrence type (none/daily/weekly/monthly/yearly)');
          if (fields.recurrenceType && fields.recurrenceType !== 'none') {
            fields.daysOfWeek = await this.prompt('Days of week (0=Sun, 1=Mon, ..., 6=Sat, comma-separated)');
          }
          await this.createProjectInteractive(fields);
          break;
          
        case 'task':
          fields.title = await this.prompt('Title*', true);
          fields.parentId = await this.prompt('Parent ID (Project/Program ID)*', true);
          fields.description = await this.prompt('Description');
          fields.priority = await this.prompt('Priority (low/medium/high/critical)');
          fields.status = await this.prompt('Status (planned/active/paused/due/completed)');
          fields.notes = await this.prompt('Notes');
          fields.tags = await this.prompt('Tags (comma-separated)');
          fields.dependencies = await this.prompt('Dependencies (comma-separated project/task IDs)');
          fields.subtasks = await this.prompt('Subtasks (comma-separated subtask IDs)');
          
          this.terminal.writeln('\n--- Timeframe ---');
          fields.start = await this.prompt('Start date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM)');
          fields.targetEnd = await this.prompt('Target end date/time');
          fields.actualEnd = await this.prompt('Actual end date/time');
          
          this.terminal.writeln('\n--- Recurrence ---');
          fields.recurrenceType = await this.prompt('Recurrence type (none/daily/weekly/monthly/yearly)');
          if (fields.recurrenceType && fields.recurrenceType !== 'none') {
            fields.daysOfWeek = await this.prompt('Days of week (0=Sun, 1=Mon, ..., 6=Sat, comma-separated)');
          }
          await this.createTaskInteractive(fields);
          break;
          
        case 'subtask':
          fields.title = await this.prompt('Title*', true);
          fields.parentId = await this.prompt('Parent ID (Task ID)*', true);
          fields.description = await this.prompt('Description');
          fields.priority = await this.prompt('Priority (low/medium/high/critical)');
          fields.status = await this.prompt('Status (planned/completed)');
          fields.notes = await this.prompt('Notes');
          fields.tags = await this.prompt('Tags (comma-separated)');
          
          this.terminal.writeln('\n--- Timeframe ---');
          fields.start = await this.prompt('Start date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM)');
          fields.targetEnd = await this.prompt('Target end date/time');
          fields.actualEnd = await this.prompt('Actual end date/time');
          await this.createSubtaskInteractive(fields);
          break;
          
        default:
          this.terminal.writeln(`Unknown type: ${type}`);
      }
      this.terminal.writeln('');
      // Ensure prompt mode is cleared after completion
      this.isPromptMode = false;
      this.promptCallback = null;
    } catch (error: any) {
      this.terminal.writeln(`\nError in guided mode: ${error.message}`);
      this.isPromptMode = false;
      this.promptCallback = null;
    }
  }

  // JSON mode - accept JSON input
  private async handleCreateJson(type: string) {
    this.terminal.writeln(`\nCreating New ${type.charAt(0).toUpperCase() + type.slice(1)} (JSON Mode)`);
    this.terminal.writeln('Please enter JSON data. Press Enter on an empty line to finish.');
    this.terminal.writeln('Example: {"title": "My Program", "priority": "high", "description": "..."}');
    this.terminal.writeln('');

    try {
      // For JSON mode, we'll collect multi-line input
      // Since we can't easily do multi-line in current setup, we'll prompt for single-line JSON
      const jsonInput = await this.prompt('JSON data', true);
      
      let parsedData: Record<string, any>;
      try {
        parsedData = JSON.parse(jsonInput);
      } catch (e) {
        this.terminal.writeln('Error: Invalid JSON format. Please try again.');
        return;
      }

      // Convert JSON to the format expected by create functions
      const fields: Record<string, string> = {};
      
      // Map JSON fields to our format
      if (parsedData.title) fields.title = String(parsedData.title);
      if (parsedData.parentId) fields.parentId = String(parsedData.parentId);
      if (parsedData.description) fields.description = String(parsedData.description);
      if (parsedData.priority) fields.priority = String(parsedData.priority);
      if (parsedData.status) fields.status = String(parsedData.status);
      if (parsedData.category) fields.category = String(parsedData.category);
      if (parsedData.phase) fields.phase = String(parsedData.phase);
      if (parsedData.objective) fields.objective = String(parsedData.objective);
      if (parsedData.notes) fields.notes = String(parsedData.notes);
      if (parsedData.tags) fields.tags = Array.isArray(parsedData.tags) ? parsedData.tags.join(',') : String(parsedData.tags);
      if (parsedData.resources) fields.resources = Array.isArray(parsedData.resources) ? parsedData.resources.join(',') : String(parsedData.resources);
      if (parsedData.dependencies) fields.dependencies = Array.isArray(parsedData.dependencies) ? parsedData.dependencies.join(',') : String(parsedData.dependencies);
      if (parsedData.subtasks) fields.subtasks = Array.isArray(parsedData.subtasks) ? parsedData.subtasks.join(',') : String(parsedData.subtasks);
      
      // Handle timeframe
      if (parsedData.timeframe) {
        if (parsedData.timeframe.start) fields.start = String(parsedData.timeframe.start);
        if (parsedData.timeframe.deadline) fields.deadline = String(parsedData.timeframe.deadline);
        if (parsedData.timeframe.targetEnd) fields.targetEnd = String(parsedData.timeframe.targetEnd);
        if (parsedData.timeframe.actualEnd) fields.actualEnd = String(parsedData.timeframe.actualEnd);
      }

      // Create based on type
      switch (type) {
        case 'program':
          await this.createProgramInteractive(fields);
          break;
        case 'project':
          await this.createProjectInteractive(fields);
          break;
        case 'task':
          await this.createTaskInteractive(fields);
          break;
        case 'subtask':
          await this.createSubtaskInteractive(fields);
          break;
        default:
          this.terminal.writeln(`Unknown type: ${type}`);
      }
      this.terminal.writeln('');
    } catch (error: any) {
      this.terminal.writeln(`\nError in JSON mode: ${error.message}`);
      this.isPromptMode = false;
      this.promptCallback = null;
    }
  }

  private async handleInitSamples() {
    try {
      this.terminal.writeln('\nInitializing sample data...');
      
      // Check if data already exists
      const [existingPrograms, existingProjects, existingTasks, existingSubtasks] = await Promise.all([
        getPrograms(),
        getProjects(),
        getTasks(),
        getSubtasks(),
      ]);

      if (existingPrograms.length > 0 || existingProjects.length > 0 || existingTasks.length > 0 || existingSubtasks.length > 0) {
        this.terminal.writeln(`Warning: Found existing data:`);
        this.terminal.writeln(`  - ${existingPrograms.length} programs`);
        this.terminal.writeln(`  - ${existingProjects.length} projects`);
        this.terminal.writeln(`  - ${existingTasks.length} tasks`);
        this.terminal.writeln(`  - ${existingSubtasks.length} subtasks`);
        this.terminal.writeln(`Sample data will be created in addition to existing data.`);
        this.terminal.writeln('');
      }

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      // Create a program
      this.terminal.writeln('Creating sample program...');
      const programId = await createProgram({
        title: 'Work Projects',
        description: 'All work-related initiatives and projects',
        priority: 'high',
        status: 'active',
        category: 'Business',
        objective: 'Improve productivity and deliver quality work',
        notes: 'Main program for work-related activities',
        tags: ['work', 'business', 'productivity'],
        resources: ['https://example.com/resources'],
        progress: 25,
        timeframe: {
          start: `${todayStr}T00:00:00`,
          deadline: `${year}-12-31T23:59:59`,
          targetEnd: `${year}-12-31T23:59:59`,
        },
      });
      this.terminal.writeln(`  ✓ Created program: ${programId}`);

      // Create a project under the program
      this.terminal.writeln('Creating sample project...');
      const projectId = await createProject({
        title: 'Website Redesign',
        parentId: programId,
        description: 'Complete redesign of company website',
        priority: 'high',
        status: 'active',
        phase: 'Design',
        objective: 'Modernize website with better UX',
        notes: 'Focus on mobile-first design',
        tags: ['web', 'design', 'frontend'],
        resources: ['https://example.com/design-system'],
        dependencies: [],
        progress: 40,
        timeframe: {
          start: `${todayStr}T09:00:00`,
          deadline: `${todayStr}T17:00:00`,
          targetEnd: `${todayStr}T17:00:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created project: ${projectId}`);

      // Create tasks with dates and times
      this.terminal.writeln('Creating sample tasks...');
      
      await createTask({
        title: 'Morning Meeting',
        parentId: projectId,
        description: 'Daily standup meeting with team',
        priority: 'high',
        status: 'active',
        notes: 'Discuss progress and blockers',
        tags: ['meeting', 'standup'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T09:00:00`,
          targetEnd: `${todayStr}T10:30:00`,
        },
        recurrence: {
          type: 'daily',
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        },
      });
      this.terminal.writeln(`  ✓ Created task: Morning Meeting`);

      await createTask({
        title: 'Work on Project',
        parentId: projectId,
        description: 'Focused work session on main project',
        priority: 'medium',
        status: 'active',
        notes: 'Deep work time',
        tags: ['coding', 'development'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T10:30:00`,
          targetEnd: `${todayStr}T12:00:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created task: Work on Project`);

      await createTask({
        title: 'Lunch Break',
        parentId: projectId,
        description: 'Lunch break',
        priority: 'low',
        status: 'active',
        notes: 'Take a break',
        tags: ['break', 'lunch'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T12:00:00`,
          targetEnd: `${todayStr}T13:00:00`,
        },
        recurrence: {
          type: 'daily',
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        },
      });
      this.terminal.writeln(`  ✓ Created task: Lunch Break`);

      // Create additional tasks (non-overlapping times for all items)
      this.terminal.writeln('Creating additional sample tasks...');
      
      const task2Id = await createTask({
        title: 'Design Review',
        parentId: projectId,
        description: 'Review design mockups',
        priority: 'high',
        status: 'active',
        notes: 'Review UI/UX designs',
        tags: ['design', 'review'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T13:00:00`,
          targetEnd: `${todayStr}T13:30:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created task: Design Review`);

      await createSubtask({
        title: 'Review Color Scheme',
        parentId: task2Id,
        description: 'Review color palette choices',
        priority: 'low',
        status: 'planned',
        notes: 'Ensure accessibility compliance',
        tags: ['design', 'colors'],
        timeframe: {
          start: `${todayStr}T13:30:00`,
          targetEnd: `${todayStr}T14:00:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created subtask: Review Color Scheme`);

      await createSubtask({
        title: 'Review Typography',
        parentId: task2Id,
        description: 'Review font choices and sizing',
        priority: 'medium',
        status: 'planned',
        notes: 'Check readability',
        tags: ['design', 'typography'],
        timeframe: {
          start: `${todayStr}T14:00:00`,
          targetEnd: `${todayStr}T14:30:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created subtask: Review Typography`);

      await createTask({
        title: 'Afternoon Session',
        parentId: projectId,
        description: 'Afternoon work session',
        priority: 'high',
        status: 'active',
        notes: 'Continue project work',
        tags: ['coding', 'development'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T14:30:00`,
          targetEnd: `${todayStr}T16:30:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created task: Afternoon Session`);

      // Create a task with weekly recurrence
      await createTask({
        title: 'Team Review',
        parentId: projectId,
        description: 'Weekly team review meeting',
        priority: 'medium',
        status: 'planned',
        notes: 'Review week progress',
        tags: ['meeting', 'review'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T18:00:00`,
          targetEnd: `${todayStr}T19:00:00`,
        },
        recurrence: {
          type: 'weekly',
          daysOfWeek: [1], // Monday
        },
      });
      this.terminal.writeln(`  ✓ Created task: Team Review`);

      const task3Id = await createTask({
        title: 'Testing Session',
        parentId: projectId,
        description: 'Run test suite and fix bugs',
        priority: 'high',
        status: 'active',
        notes: 'Comprehensive testing',
        tags: ['testing', 'qa'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T19:00:00`,
          targetEnd: `${todayStr}T20:00:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created task: Testing Session`);

      await createSubtask({
        title: 'Unit Tests',
        parentId: task3Id,
        description: 'Run unit test suite',
        priority: 'high',
        status: 'planned',
        notes: 'Fix failing tests',
        tags: ['testing', 'unit'],
        timeframe: {
          start: `${todayStr}T20:00:00`,
          targetEnd: `${todayStr}T20:30:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created subtask: Unit Tests`);

      await createSubtask({
        title: 'Integration Tests',
        parentId: task3Id,
        description: 'Run integration test suite',
        priority: 'medium',
        status: 'planned',
        notes: 'Test API integrations',
        tags: ['testing', 'integration'],
        timeframe: {
          start: `${todayStr}T20:30:00`,
          targetEnd: `${todayStr}T21:00:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created subtask: Integration Tests`);

      // Create a subtask
      this.terminal.writeln('Creating sample subtask...');
      const taskId = await createTask({
        title: 'Code Review',
        parentId: projectId,
        description: 'Review code changes',
        priority: 'high',
        status: 'active',
        notes: 'Review PRs',
        tags: ['review', 'code'],
        dependencies: [],
        subtasks: [],
        timeframe: {
          start: `${todayStr}T21:00:00`,
          targetEnd: `${todayStr}T22:00:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created task: Code Review`);

      await createSubtask({
        title: 'Review API Changes',
        parentId: taskId,
        description: 'Review API endpoint changes',
        priority: 'medium',
        status: 'planned',
        notes: 'Check API documentation',
        tags: ['api', 'review'],
        timeframe: {
          start: `${todayStr}T22:00:00`,
          targetEnd: `${todayStr}T22:30:00`,
        },
      });
      this.terminal.writeln(`  ✓ Created subtask: Review API Changes`);

      this.terminal.writeln('\n✓ Sample data initialization completed successfully!');
      this.terminal.writeln('You can now use "list programs", "list projects", "list tasks", or "list subtasks" to view the data.');
      this.terminal.writeln('');
    } catch (error: any) {
      this.terminal.writeln(`\n✗ Error initializing sample data: ${error.message}`);
      if (error.stack) {
        this.terminal.writeln(`Details: ${error.stack}`);
      }
      this.terminal.writeln('');
    }
  }

  private async handleWhoAmI() {
    try {
      const { auth } = await import('@/lib/firebase/config');
      const user = auth?.currentUser || null;
      
      if (!user) {
        this.terminal.writeln('\nNot authenticated. Please wait for authentication to complete.');
        this.terminal.writeln('');
        return;
      }

      this.terminal.writeln('\nCurrent User Information:');
      this.terminal.writeln(`  User ID (UID): ${user.uid}`);
      this.terminal.writeln(`  Is Anonymous: ${user.isAnonymous ? 'Yes' : 'No'}`);
      this.terminal.writeln('');
      this.terminal.writeln('Firestore Collection Paths:');
      this.terminal.writeln(`  Programs: users/${user.uid}/programs`);
      this.terminal.writeln(`  Projects: users/${user.uid}/projects`);
      this.terminal.writeln(`  Tasks: users/${user.uid}/tasks`);
      this.terminal.writeln(`  Subtasks: users/${user.uid}/subtasks`);
      this.terminal.writeln('');
      this.terminal.writeln('To view this data in Firebase Console:');
      this.terminal.writeln('  1. Go to Firebase Console > Firestore Database');
      this.terminal.writeln(`  2. Navigate to: users > ${user.uid} > programs (or projects/tasks/subtasks)`);
      this.terminal.writeln('');
    } catch (error: any) {
      this.terminal.writeln(`\nError: ${error.message}`);
      this.terminal.writeln('');
    }
  }

  private async handleVerify() {
    try {
      const { auth } = await import('@/lib/firebase/config');
      const user = auth?.currentUser || null;
      
      if (!user) {
        this.terminal.writeln('\nNot authenticated. Please wait for authentication to complete.');
        this.terminal.writeln('');
        return;
      }

      this.terminal.writeln('\nVerifying Firestore data...');
      this.terminal.writeln(`User UID: ${user.uid}`);
      this.terminal.writeln('');

      // Check each collection
      const [programs, projects, tasks, subtasks] = await Promise.all([
        getPrograms(),
        getProjects(),
        getTasks(),
        getSubtasks(),
      ]);

      this.terminal.writeln('Data in Firestore:');
      this.terminal.writeln(`  Programs: ${programs.length} found`);
      if (programs.length > 0) {
        programs.forEach(p => {
          this.terminal.writeln(`    - [${p.id}] ${p.title}`);
        });
      }
      
      this.terminal.writeln(`  Projects: ${projects.length} found`);
      if (projects.length > 0) {
        projects.forEach(p => {
          this.terminal.writeln(`    - [${p.id}] ${p.title} (parent: ${p.parentId})`);
        });
      }
      
      this.terminal.writeln(`  Tasks: ${tasks.length} found`);
      if (tasks.length > 0) {
        tasks.forEach(t => {
          this.terminal.writeln(`    - [${t.id}] ${t.title} (parent: ${t.parentId})`);
        });
      }
      
      this.terminal.writeln(`  Subtasks: ${subtasks.length} found`);
      if (subtasks.length > 0) {
        subtasks.forEach(s => {
          this.terminal.writeln(`    - [${s.id}] ${s.title} (parent: ${s.parentId})`);
        });
      }

      this.terminal.writeln('');
      this.terminal.writeln('Firestore Path:');
      this.terminal.writeln(`  users/${user.uid}/`);
      this.terminal.writeln('');
      
      if (programs.length === 0 && projects.length === 0 && tasks.length === 0 && subtasks.length === 0) {
        this.terminal.writeln('⚠ No data found. This could mean:');
        this.terminal.writeln('  1. Data hasn\'t been created yet (run "init" to create sample data)');
        this.terminal.writeln('  2. Firestore security rules are blocking read access');
        this.terminal.writeln('  3. Data was created under a different user session');
        this.terminal.writeln('');
      } else {
        this.terminal.writeln('✓ Data is accessible from the application.');
        this.terminal.writeln('If you don\'t see it in Firebase Console, check:');
        this.terminal.writeln('  1. You\'re looking at the correct path: users/' + user.uid);
        this.terminal.writeln('  2. Firestore security rules allow read access');
        this.terminal.writeln('');
      }
    } catch (error: any) {
      this.terminal.writeln(`\n✗ Error verifying data: ${error.message}`);
      if (error.code) {
        this.terminal.writeln(`  Error code: ${error.code}`);
      }
      this.terminal.writeln('');
    }
  }

  private async handleManUnfold() {
    try {
      // Read the TERMINAL_GUIDE.md file
      const response = await fetch('/TERMINAL_GUIDE.md');
      if (!response.ok) {
        // If file not found, show a comprehensive guide inline
        this.showInlineGuide();
        return;
      }
      const guideText = await response.text();
      
      // Split into pages (80 lines per page for terminal)
      const lines = guideText.split('\n');
      const pageSize = 80;
      const totalPages = Math.ceil(lines.length / pageSize);
      
      const showPage = (page: number) => {
        this.terminal.writeln('\n--- Unfold CLI Manual (Page ' + (page + 1) + ' of ' + totalPages + ') ---\n');
        const start = page * pageSize;
        const end = Math.min(start + pageSize, lines.length);
        const pageLines = lines.slice(start, end);
        pageLines.forEach(line => {
          this.terminal.writeln(line);
        });
        this.terminal.writeln('\n--- Press Enter to continue, or type "q" to quit ---');
      };
      
      showPage(0);
      
      // Note: For full pagination, we'd need to implement a prompt system
      // For now, just show the first page and mention the rest
      if (totalPages > 1) {
        this.terminal.writeln(`\n(Showing page 1 of ${totalPages}. Full guide available in TERMINAL_GUIDE.md)`);
      }
      this.terminal.writeln('');
    } catch (error: any) {
      // Fallback to inline guide
      this.showInlineGuide();
    }
  }

  private showInlineGuide() {
    // Comprehensive inline guide
    const guide = [
      'UNFOLD CLI - Complete Guide',
      '',
      'OVERVIEW:',
      '  Unfold is a command-line interface for managing programs, projects, tasks, and subtasks.',
      '  All data is stored in Firebase Firestore.',
      '',
      'COMMANDS:',
      '  help                    Show quick reference',
      '  man                     Show this full guide',
        '  list <type> [timeframe] List all items of a type (optionally filtered by timeframe)',
        '                         Timeframes: daily|today, weekly|thisweek, monthly|thismonth, yearly|thisyear',
      '  show <type> <id>       Display detailed information about an item',
      '  create <type>          Create a new item',
      '  update <type> <id>     Update an existing item',
      '  delete <type> <id>     Delete an item',
      '  fields <type>          Show all available fields for a type',
      '  init                   Initialize sample data in Firebase',
      '  whoami                 Show current user and Firestore paths',
      '  verify                 Verify data exists in Firestore',
      '',
      'TYPES:',
      '  program    - Top-level container (no parent required)',
      '  project    - Belongs to a program (requires parentId)',
      '  task       - Belongs to a project (requires parentId)',
      '  subtask    - Belongs to a task (requires parentId)',
      '',
      'CREATE MODES:',
      '  Quick Mode:',
      '    create <type> --title="Title" [--field="value"]',
      '    Example: create program --title="Work" --priority="high"',
      '',
      '  Guided Mode:',
      '    create <type> --guided',
      '    Interactive prompts for all fields with descriptions',
      '',
      '  JSON Mode:',
      '    create <type> --json',
      '    Enter JSON data interactively',
      '',
      'FIELD REFERENCE:',
      '  Common fields:',
      '    --title              Title of the item (required)',
      '    --description        Detailed description',
      '    --priority           high|medium|low',
      '    --status             active|planned|completed|on-hold|cancelled',
      '    --tags               Comma-separated tags',
      '    --notes              Additional notes',
      '',
      '  Timeframe fields:',
      '    --start              Start date/time (ISO format or YYYY-MM-DDTHH:MM)',
      '    --targetEnd          Target end date/time',
      '    --deadline           Deadline (for programs/projects)',
      '    --actualEnd          Actual end date/time',
      '',
      '  Recurrence fields:',
      '    --recurrenceType     none|daily|weekly|monthly|yearly',
      '    --daysOfWeek         Comma-separated: 0=Sun, 1=Mon, ..., 6=Sat',
      '',
      '  Type-specific fields:',
      '    --parentId            Required for projects, tasks, subtasks',
      '    --category            For programs',
      '    --phase               For projects',
      '    --dependencies        Comma-separated IDs',
      '    --subtasks            Comma-separated subtask IDs',
      '    --progress            Number (0-100)',
      '',
      'EXAMPLES:',
      '  # List all programs',
      '  list programs',
      '',
      '  # Create a program',
      '  create program --title="Work Projects" --priority="high"',
      '',
      '  # Create a project (requires program ID)',
      '  create project --title="Website" --parentId="ABC123"',
      '',
      '  # Create with guided mode',
      '  create task --guided',
      '',
      '  # Show item details',
      '  show program ABC123',
      '',
      '  # Update an item',
      '  update task XYZ789 --title="New Title" --priority="high"',
      '',
      '  # Delete an item',
      '  delete task XYZ789',
      '',
      '  # View all fields for a type',
      '  fields task',
      '',
      'NOTES:',
      '  - Programs do NOT require parentId',
      '  - Projects, tasks, and subtasks DO require parentId',
      '  - Use --title="Title" format for flags with values',
      '  - Dates can be in ISO format or YYYY-MM-DDTHH:MM format',
      '  - Arrays (tags, dependencies) use comma-separated values',
      '',
      'For more details, see TERMINAL_GUIDE.md',
      ''
    ];
    
    guide.forEach(line => {
      this.terminal.writeln(line);
    });
  }
}
