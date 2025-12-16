// /users/{uid}/programs/{programId}
// /users/{uid}/projects/{projectId}
// /users/{uid}/tasks/{taskId}
// /users/{uid}/subtasks/{subtaskId}

export type Priority = "low" | "medium" | "high" | "critical";
export type StatusPrimary = "planned" | "active" | "paused" | "due" | "completed";
export type StatusSecondary = "planned" | "completed";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly"| "yearly";

export interface Recurrence {
    type: RecurrenceType;
    daysOfWeek?: number[]; // For weekly: 0 = Sunday, 6 = Saturday
    dayOfMonth?: number; // For monthly: 1-31
}

export interface TimeframePr {
    start?: string;
    deadline?: string;
    targetEnd?: string;
    actualEnd?: string;
}

export interface TimeframeTa {
    start?: string;
    targetEnd?: string;
    actualEnd?: string;
}

export interface BaseItem {
    id: string; // title box
    title: string; // title box
    createdAt: string; // auto-set
    updatedAt: string; // auto-set
    description?: string;
    priority?: Priority;
    notes?: string;
    tags?: string[];
}

export interface Program extends BaseItem {
    category?: string;
    status?: StatusPrimary;
    timeframe?: TimeframePr;
    recurrence?: Recurrence;
    progress?: number;      // derived from Projects
    objective?: string;
    resources?: string[];
}

export interface Project extends BaseItem {
    parentId: string;       // Program ID
    phase?: string;
    status?: StatusPrimary;
    timeframe?: TimeframePr;
    recurrence?: Recurrence;
    progress?: number;      // derived from Tasks
    dependencies?: string[]; // Project IDs
    objective?: string;
    resources?: string[];
}

export interface Task extends BaseItem {
    parentId: string;// Project ID or Program ID
    status?: StatusPrimary;
    timeframe?: TimeframeTa;
    recurrence?: Recurrence;
    dependencies?: string[];// Project IDs or Task IDs
    subtasks?: string[];// Subtask IDs
}

export interface Subtask extends BaseItem {
    parentId: string;// Task ID
    status?: StatusSecondary;
    timeframe?: TimeframeTa;
}

// Helper type for items that can be displayed on the timetable
export interface TimetableItem {
    id: string;
    title: string;
    startTime: number; // hour (0-23) or decimal hour
    endTime: number; // hour (0-23) or decimal hour
    startDate?: string; // YYYY-MM-DD format
    endDate?: string; // YYYY-MM-DD format
    type: 'program' | 'project' | 'task' | 'subtask';
    priority?: Priority;
    status?: StatusPrimary | StatusSecondary;
    color?: string;
    parentId?: string; // Parent item ID for hierarchy
    level?: number; // 0 = Program (bottom), 1 = Project, 2 = Task, 3 = Subtask (top)
}


