/**
 * List Handler - Handles listing entities
 */

import { Terminal } from 'xterm';
import { ParsedCommand } from '../parser/tokenizer';
import { getPrograms } from '@/lib/firestore/programs';
import { getProjects } from '@/lib/firestore/projects';
import { getTasks } from '@/lib/firestore/tasks';
import { getSubtasks } from '@/lib/firestore/subtasks';
import type { Program, Project, Task, Subtask } from '@/lib/types/types';

export class ListHandler {
  private terminal: Terminal;

  constructor(terminal: Terminal) {
    this.terminal = terminal;
  }

  async execute(cmd: ParsedCommand): Promise<void> {
    if (!cmd.entity) {
      this.terminal.writeln('Error: No entity specified');
      this.terminal.writeln('Usage: list <entity> (programs/projects/tasks/subtasks)');
      return;
    }

    try {
      // Normalize plural forms to singular
      const entity = cmd.entity.replace(/s$/, '');
      
      switch (entity) {
        case 'program':
          await this.listPrograms();
          break;
        case 'project':
          await this.listProjects();
          break;
        case 'task':
          await this.listTasks();
          break;
        case 'subtask':
          await this.listSubtasks();
          break;
        default:
          this.terminal.writeln(`Unknown entity: ${cmd.entity}`);
      }
    } catch (error: any) {
      this.terminal.writeln(`Error: ${error.message}`);
    }
  }

  private async listPrograms(): Promise<void> {
    const programs = await getPrograms();
    this.terminal.writeln(`\nPrograms (${programs.length}):`);
    if (programs.length === 0) {
      this.terminal.writeln('  No programs found.');
    } else {
      programs.forEach(p => {
        const status = p.status ? ` [${p.status}]` : '';
        const priority = p.priority ? ` (${p.priority})` : '';
        this.terminal.writeln(`  ${p.id.substring(0, 8)} - ${p.title}${status}${priority}`);
      });
    }
    this.terminal.writeln('');
  }

  private async listProjects(): Promise<void> {
    const projects = await getProjects();
    this.terminal.writeln(`\nProjects (${projects.length}):`);
    if (projects.length === 0) {
      this.terminal.writeln('  No projects found.');
    } else {
      projects.forEach(p => {
        const status = p.status ? ` [${p.status}]` : '';
        const priority = p.priority ? ` (${p.priority})` : '';
        this.terminal.writeln(`  ${p.id.substring(0, 8)} - ${p.title}${status}${priority}`);
      });
    }
    this.terminal.writeln('');
  }

  private async listTasks(): Promise<void> {
    const tasks = await getTasks();
    this.terminal.writeln(`\nTasks (${tasks.length}):`);
    if (tasks.length === 0) {
      this.terminal.writeln('  No tasks found.');
    } else {
      tasks.forEach(t => {
        const status = t.status ? ` [${t.status}]` : '';
        const priority = t.priority ? ` (${t.priority})` : '';
        this.terminal.writeln(`  ${t.id.substring(0, 8)} - ${t.title}${status}${priority}`);
      });
    }
    this.terminal.writeln('');
  }

  private async listSubtasks(): Promise<void> {
    const subtasks = await getSubtasks();
    this.terminal.writeln(`\nSubtasks (${subtasks.length}):`);
    if (subtasks.length === 0) {
      this.terminal.writeln('  No subtasks found.');
    } else {
      subtasks.forEach(s => {
        const status = s.status ? ` [${s.status}]` : '';
        const priority = s.priority ? ` (${s.priority})` : '';
        this.terminal.writeln(`  ${s.id.substring(0, 8)} - ${s.title}${status}${priority}`);
      });
    }
    this.terminal.writeln('');
  }
}
