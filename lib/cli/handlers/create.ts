/**
 * Create Handler - Handles creation of new entities
 */

import { Terminal } from 'xterm';
import { ParsedCommand } from '../parser/tokenizer';
import { getRequiredFields, requiresParent } from '../parser/validator';
import { getDefaultParent } from '../utils/context';
import { createProgram } from '@/lib/firestore/programs';
import { createProject } from '@/lib/firestore/projects';
import { createTask } from '@/lib/firestore/tasks';
import { createSubtask } from '@/lib/firestore/subtasks';
import type { Program, Project, Task, Subtask, Priority, StatusPrimary, StatusSecondary } from '@/lib/types/types';

export class CreateHandler {
  private terminal: Terminal;
  private onDataUpdate: () => void;
  private promptCallback: ((value: string) => void) | null = null;
  public isPromptMode: boolean = false;

  constructor(terminal: Terminal, onDataUpdate: () => void) {
    this.terminal = terminal;
    this.onDataUpdate = onDataUpdate;
  }

  /**
   * Handle prompt input
   */
  handlePromptInput(input: string): boolean {
    if (this.isPromptMode && this.promptCallback) {
      this.promptCallback(input);
      return true;
    }
    return false;
  }

  /**
   * Prompt for input
   */
  private async prompt(question: string, required: boolean = false): Promise<string> {
    return new Promise((resolve) => {
      const handlePrompt = (value: string) => {
        const trimmed = value.trim();
        if (required && !trimmed) {
          this.terminal.writeln('This field is required. Please try again.');
          this.terminal.write(`\r\n${question}: `);
          this.promptCallback = handlePrompt;
          this.isPromptMode = true;
        } else {
          this.isPromptMode = false;
          this.promptCallback = null;
          resolve(trimmed);
        }
      };

      this.terminal.write(`\r\n${question}: `);
      this.isPromptMode = true;
      this.promptCallback = handlePrompt;
      this.terminal.scrollToBottom();
    });
  }

  /**
   * Main create handler (Homebrew-style: create entity "title")
   */
  async execute(cmd: ParsedCommand): Promise<void> {
    if (!cmd.entity) {
      this.terminal.writeln('Error: No entity specified');
      this.terminal.writeln('Usage: create <entity> "title" [flags]');
      return;
    }

    try {
      // Check if we have minimal required fields
      // Target becomes the title in Homebrew-style: create task "Title"
      const hasTitle = cmd.flags.title || cmd.target;
      const needsParent = requiresParent(cmd.entity);
      const hasParent = cmd.flags.parentId || cmd.flags.parent;
      const defaultParent = getDefaultParent(cmd.entity);

      // If we have all required fields, do quick create
      if (hasTitle && (!needsParent || hasParent || defaultParent)) {
        await this.quickCreate(cmd);
      } else {
        // Fall back to interactive mode
        await this.interactiveCreate(cmd);
      }

      this.onDataUpdate();
    } catch (error: any) {
      this.terminal.writeln(`Error: ${error.message}`);
    } finally {
      this.isPromptMode = false;
      this.promptCallback = null;
    }
  }

  /**
   * Quick create with inline flags
   */
  private async quickCreate(cmd: ParsedCommand): Promise<void> {
    const title = cmd.flags.title || cmd.target;
    if (!title) {
      this.terminal.writeln('Error: title is required');
      return;
    }

    const parentId = cmd.flags.parentId || cmd.flags.parent || getDefaultParent(cmd.entity!);

    switch (cmd.entity) {
      case 'program':
        await this.createProgram(title, cmd.flags);
        break;
      case 'project':
        if (!parentId) {
          this.terminal.writeln('Error: parentId is required for projects');
          return;
        }
        await this.createProject(title, parentId, cmd.flags);
        break;
      case 'task':
        if (!parentId) {
          this.terminal.writeln('Error: parentId is required for tasks');
          return;
        }
        await this.createTask(title, parentId, cmd.flags);
        break;
      case 'subtask':
        if (!parentId) {
          this.terminal.writeln('Error: parentId is required for subtasks');
          return;
        }
        await this.createSubtask(title, parentId, cmd.flags);
        break;
    }
  }

  /**
   * Interactive create with prompts
   */
  private async interactiveCreate(cmd: ParsedCommand): Promise<void> {
    this.terminal.writeln(`\nCreating new ${cmd.entity}...`);
    this.terminal.writeln('(Press Enter to skip optional fields)\n');

    try {
      const title = cmd.flags.title || await this.prompt('Title*', true);
      
      let parentId: string | undefined;
      if (requiresParent(cmd.entity!)) {
        const defaultParent = getDefaultParent(cmd.entity!);
        const parentPrompt = defaultParent 
          ? `Parent ID* (default: ${defaultParent})`
          : 'Parent ID*';
        parentId = await this.prompt(parentPrompt, !defaultParent);
        if (!parentId && defaultParent) {
          parentId = defaultParent;
        }
      }

      const description = await this.prompt('Description');
      const priority = await this.prompt('Priority (low/medium/high/critical)');
      const status = await this.prompt('Status');

      const flags = {
        ...cmd.flags,
        title,
        parentId,
        description,
        priority,
        status,
      };

      // Create based on entity type
      switch (cmd.entity) {
        case 'program':
          await this.createProgram(title, flags);
          break;
        case 'project':
          if (!parentId) throw new Error('Parent ID is required');
          await this.createProject(title, parentId, flags);
          break;
        case 'task':
          if (!parentId) throw new Error('Parent ID is required');
          await this.createTask(title, parentId, flags);
          break;
        case 'subtask':
          if (!parentId) throw new Error('Parent ID is required');
          await this.createSubtask(title, parentId, flags);
          break;
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Create program
   */
  private async createProgram(title: string, flags: Record<string, string>): Promise<void> {
    const data: Omit<Program, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      description: flags.description,
      priority: flags.priority as Priority,
      status: flags.status as StatusPrimary,
      category: flags.category,
      objective: flags.objective,
      notes: flags.notes,
      tags: flags.tags ? flags.tags.split(',').map(t => t.trim()) : undefined,
      resources: flags.resources ? flags.resources.split(',').map(r => r.trim()) : undefined,
      progress: flags.progress ? parseFloat(flags.progress) : undefined,
    };

    // Remove undefined values
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Omit<Program, 'id' | 'createdAt' | 'updatedAt'>;

    const id = await createProgram(cleaned);
    this.terminal.writeln(`\n✓ Created program: ${id}`);
    this.terminal.writeln(`  Title: ${title}`);
  }

  /**
   * Create project
   */
  private async createProject(title: string, parentId: string, flags: Record<string, string>): Promise<void> {
    const data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      parentId,
      description: flags.description,
      priority: flags.priority as Priority,
      status: flags.status as StatusPrimary,
      phase: flags.phase,
      objective: flags.objective,
      notes: flags.notes,
      tags: flags.tags ? flags.tags.split(',').map(t => t.trim()) : undefined,
      resources: flags.resources ? flags.resources.split(',').map(r => r.trim()) : undefined,
      dependencies: flags.dependencies ? flags.dependencies.split(',').map(d => d.trim()) : undefined,
      progress: flags.progress ? parseFloat(flags.progress) : undefined,
    };

    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

    const id = await createProject(cleaned);
    this.terminal.writeln(`\n✓ Created project: ${id}`);
    this.terminal.writeln(`  Title: ${title}`);
    this.terminal.writeln(`  Parent: ${parentId}`);
  }

  /**
   * Create task
   */
  private async createTask(title: string, parentId: string, flags: Record<string, string>): Promise<void> {
    const data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      parentId,
      description: flags.description,
      priority: flags.priority as Priority,
      status: flags.status as StatusPrimary,
      notes: flags.notes,
      tags: flags.tags ? flags.tags.split(',').map(t => t.trim()) : undefined,
      dependencies: flags.dependencies ? flags.dependencies.split(',').map(d => d.trim()) : undefined,
      subtasks: flags.subtasks ? flags.subtasks.split(',').map(s => s.trim()) : undefined,
    };

    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

    const id = await createTask(cleaned);
    this.terminal.writeln(`\n✓ Created task: ${id}`);
    this.terminal.writeln(`  Title: ${title}`);
    this.terminal.writeln(`  Parent: ${parentId}`);
  }

  /**
   * Create subtask
   */
  private async createSubtask(title: string, parentId: string, flags: Record<string, string>): Promise<void> {
    const data: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      parentId,
      description: flags.description,
      priority: flags.priority as Priority,
      status: flags.status as StatusSecondary,
      notes: flags.notes,
      tags: flags.tags ? flags.tags.split(',').map(t => t.trim()) : undefined,
    };

    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>;

    const id = await createSubtask(cleaned);
    this.terminal.writeln(`\n✓ Created subtask: ${id}`);
    this.terminal.writeln(`  Title: ${title}`);
    this.terminal.writeln(`  Parent: ${parentId}`);
  }
}
