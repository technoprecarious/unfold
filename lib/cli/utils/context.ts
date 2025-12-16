/**
 * Context - Manages CLI state and context
 */

export interface CliContext {
  currentProject: string | null;
  currentProgram: string | null;
  lastFilter: Record<string, any> | null;
  history: string[];
}

let context: CliContext = {
  currentProject: null,
  currentProgram: null,
  lastFilter: null,
  history: [],
};

/**
 * Get current context
 */
export function getContext(): CliContext {
  return { ...context };
}

/**
 * Set current project context
 */
export function setCurrentProject(projectId: string | null) {
  context.currentProject = projectId;
}

/**
 * Set current program context
 */
export function setCurrentProgram(programId: string | null) {
  context.currentProgram = programId;
}

/**
 * Set last filter used
 */
export function setLastFilter(filter: Record<string, any> | null) {
  context.lastFilter = filter;
}

/**
 * Add command to history
 */
export function addToHistory(command: string) {
  context.history.push(command);
  // Keep last 100 commands
  if (context.history.length > 100) {
    context.history.shift();
  }
}

/**
 * Get command history
 */
export function getHistory(): string[] {
  return [...context.history];
}

/**
 * Clear context
 */
export function clearContext() {
  context = {
    currentProject: null,
    currentProgram: null,
    lastFilter: null,
    history: [],
  };
}

/**
 * Get smart default parent ID based on context
 */
export function getDefaultParent(entityType: string): string | null {
  if (entityType === 'project') {
    return context.currentProgram;
  }
  if (entityType === 'task' || entityType === 'subtask') {
    return context.currentProject;
  }
  return null;
}
