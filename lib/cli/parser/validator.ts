/**
 * Validator - Validates parsed Homebrew-style commands
 * Pattern: <verb> <entity> [target] [flags]
 */

import { ParsedCommand } from './tokenizer';
import { findClosestMatch } from './fuzzy';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

const VALID_VERBS = ['list', 'create', 'remove', 'info', 'search', 'update', 'help', 'man'];
const VALID_ENTITIES = ['program', 'project', 'task', 'subtask', 'programs', 'projects', 'tasks', 'subtasks'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['planned', 'active', 'paused', 'due', 'completed'];

/**
 * Validate a parsed Homebrew-style command
 */
export function validateCommand(cmd: ParsedCommand): ValidationResult {
  // Empty command
  if (!cmd.verb && !cmd.entity) {
    return { valid: false, error: 'No command provided. Type "help" for available commands.' };
  }

  // Validate verb
  if (cmd.verb && !VALID_VERBS.includes(cmd.verb)) {
    const closest = findClosestMatch(cmd.verb, VALID_VERBS);
    if (closest) {
      return {
        valid: false,
        error: `Unknown command: "${cmd.verb}". Did you mean "${closest}"?`,
        suggestions: [closest],
      };
    }
    return {
      valid: false,
      error: `Unknown command: "${cmd.verb}". Available: ${VALID_VERBS.join(', ')}`,
    };
  }

  // Validate entity
  if (cmd.entity && !VALID_ENTITIES.includes(cmd.entity)) {
    const closest = findClosestMatch(cmd.entity, VALID_ENTITIES);
    if (closest) {
      return {
        valid: false,
        error: `Unknown entity: "${cmd.entity}". Did you mean "${closest}"?`,
        suggestions: [closest],
      };
    }
    return {
      valid: false,
      error: `Unknown entity: "${cmd.entity}". Valid: program, project, task, subtask`,
    };
  }

  // Validate required fields for verbs
  if (cmd.verb === 'info' || cmd.verb === 'remove' || cmd.verb === 'update') {
    if (!cmd.target && !cmd.flags.id) {
      return {
        valid: false,
        error: `"${cmd.verb}" requires a target ID. Usage: ${cmd.verb} ${cmd.entity} <id>`,
      };
    }
  }

  // Validate flag values
  if (cmd.flags.priority) {
    const priority = cmd.flags.priority.toLowerCase();
    if (!VALID_PRIORITIES.includes(priority)) {
      const closest = findClosestMatch(priority, VALID_PRIORITIES);
      return {
        valid: false,
        error: `Invalid priority: "${cmd.flags.priority}". ${closest ? `Did you mean "${closest}"?` : `Valid: ${VALID_PRIORITIES.join(', ')}`}`,
        suggestions: closest ? [closest] : [],
      };
    }
  }

  if (cmd.flags.status) {
    const status = cmd.flags.status.toLowerCase();
    if (!VALID_STATUSES.includes(status)) {
      const closest = findClosestMatch(status, VALID_STATUSES);
      return {
        valid: false,
        error: `Invalid status: "${cmd.flags.status}". ${closest ? `Did you mean "${closest}"?` : `Valid: ${VALID_STATUSES.join(', ')}`}`,
        suggestions: closest ? [closest] : [],
      };
    }
  }

  return { valid: true };
}

/**
 * Validate that required parent exists for child entities
 */
export function requiresParent(entity: string): boolean {
  return ['project', 'task', 'subtask'].includes(entity);
}

/**
 * Get validation requirements for an entity
 */
export function getRequiredFields(entity: string, verb: string): string[] {
  if (verb === 'create') {
    const required = ['title'];
    if (requiresParent(entity)) {
      required.push('parentId');
    }
    return required;
  }
  return [];
}
