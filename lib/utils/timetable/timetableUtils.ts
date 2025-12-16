import { Program, Project, Task, Subtask } from '@/lib/types/types';
import { TimetableItem } from '@/lib/types/types';

// Convert time string (ISO or HH:MM) to decimal hours (0-23.99)
export const timeToHours = (timeStr: string | undefined): number | null => {
  if (!timeStr) return null;
  
  // Try to parse ISO string
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.getHours() + date.getMinutes() / 60;
    }
  } catch (e) {
    // Not a valid ISO string
  }
  
  // Try to parse HH:MM format
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours + minutes / 60;
    }
  }
  
  // Try to parse decimal hours directly
  const decimal = parseFloat(timeStr);
  if (!isNaN(decimal) && decimal >= 0 && decimal < 24) {
    return decimal;
  }
  
  return null;
};

// Extract date from ISO string (YYYY-MM-DD) or return null for time-only format
const extractDate = (isoString: string | undefined): string | null => {
  if (!isoString) return null;
  
  // Check if it's time-only format (HH:MM)
  if (isoString.match(/^\d{1,2}:\d{2}$/)) {
    return null; // Time-only format, no date
  }
  
  try {
    // Try to extract date directly from ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
    // This avoids timezone issues when parsing with new Date()
    const isoMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    
    // Fallback: parse as Date and use UTC methods to avoid timezone shifts
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return null;
  }
};

// Check if item should be displayed on a given date based on recurrence
const shouldDisplayOnDate = (
  itemDate: string | null,
  selectedDate: Date,
  recurrence?: { type: string; daysOfWeek?: number[]; dayOfMonth?: number }
): boolean => {
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  // If no recurrence, only show on exact date match (if date exists)
  if (!recurrence || recurrence.type === 'none' || !recurrence.type) {
    if (!itemDate) return false;
    return itemDate === selectedDateStr;
  }
  
  // For time-only items (itemDate is null), use selected date as base
  const baseDate = itemDate || selectedDateStr;
  
  // Check if selected date matches the item's date (always show on original date if date exists)
  if (itemDate && itemDate === selectedDateStr) {
    return true;
  }
  
  // For recurring items, check if selected date matches recurrence pattern
  const itemDateObj = itemDate ? new Date(itemDate + 'T00:00:00') : selectedDate;
  const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
  
  // For items with dates, selected date must be on or after the item's date
  if (itemDate && selectedDateObj < itemDateObj) {
    return false;
  }
  
  if (recurrence.type === 'daily') {
    // Daily recurrence - show every day (for time-only items, always show)
    return true;
  } else if (recurrence.type === 'weekly') {
    // Weekly recurrence - check if day of week matches
    if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      const selectedDay = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
      return recurrence.daysOfWeek.includes(selectedDay);
    }
    // If no daysOfWeek specified, show on same day of week as item date (or any day if no date)
    if (!itemDate) return true; // Time-only weekly, show on any day
    return itemDateObj.getDay() === selectedDateObj.getDay();
  } else if (recurrence.type === 'monthly') {
    // Monthly recurrence - show on same day of month
    if (recurrence.dayOfMonth !== undefined) {
      return selectedDateObj.getDate() === recurrence.dayOfMonth;
    }
    // If no dayOfMonth specified, use item date's day of month
    if (!itemDate) return true; // Time-only monthly, show on any day
    return itemDateObj.getDate() === selectedDateObj.getDate();
  } else if (recurrence.type === 'yearly') {
    // Yearly recurrence - show on same month and day
    if (!itemDate) return false; // Yearly requires a date
    return itemDateObj.getMonth() === selectedDateObj.getMonth() && 
           itemDateObj.getDate() === selectedDateObj.getDate();
  }
  
  return false;
};

// Check if two timeframes overlap
const timeframesOverlap = (
  start1: number, end1: number,
  start2: number, end2: number
): boolean => {
  // Handle wrap-around (e.g., 22:00 to 02:00)
  const normalize = (time: number) => time >= 24 ? time - 24 : time < 0 ? time + 24 : time;
  const s1 = normalize(start1);
  const e1 = normalize(end1);
  const s2 = normalize(start2);
  const e2 = normalize(end2);
  
  // Check if they overlap (considering wrap-around)
  if (e1 < s1) {
    // Item 1 wraps around
    return (s2 >= s1 || s2 <= e1) || (e2 >= s1 || e2 <= e1) || (s2 <= e1 && e2 >= s1);
  }
  if (e2 < s2) {
    // Item 2 wraps around
    return (s1 >= s2 || s1 <= e2) || (e1 >= s2 || e1 <= e2) || (s1 <= e2 && e1 >= s2);
  }
  
  // Normal case: no wrap-around
  return s1 < e2 && s2 < e1;
};

// Convert items to timetable items with date filtering and recurrence
export const itemsToTimetable = (
  programs: Program[],
  projects: Project[],
  tasks: Task[],
  subtasks: Subtask[],
  selectedDate?: Date,
  viewMode?: 'd' | 'w' | 'm' | 'y'
): TimetableItem[] => {
  const timetableItems: TimetableItem[] = [];
  const filterDate = selectedDate || new Date();
  const mode = viewMode || 'd';

  // Pre-compute parent-child maps for O(1) lookups instead of O(n) filters
  const projectsByParent = new Map<string, Project[]>();
  const tasksByParent = new Map<string, Task[]>();
  const subtasksByParent = new Map<string, Subtask[]>();
  
  projects.forEach(project => {
    if (project.parentId) {
      const list = projectsByParent.get(project.parentId) || [];
      list.push(project);
      projectsByParent.set(project.parentId, list);
    }
  });
  
  tasks.forEach(task => {
    if (task.parentId) {
      const list = tasksByParent.get(task.parentId) || [];
      list.push(task);
      tasksByParent.set(task.parentId, list);
    }
  });
  
  subtasks.forEach(subtask => {
    if (subtask.parentId) {
      const list = subtasksByParent.get(subtask.parentId) || [];
      list.push(subtask);
      subtasksByParent.set(subtask.parentId, list);
    }
  });
  
  // Pre-compute time values for all items to avoid repeated parsing
  const timeCache = new Map<string, { startTime: number | null; endTime: number | null; startDate: string | null }>();
  
  const getTimeValues = (item: Program | Project | Task | Subtask) => {
    const cached = timeCache.get(item.id);
    if (cached) return cached;
    
    const timeframe = item.timeframe;
    if (!timeframe) return { startTime: null, endTime: null, startDate: null };
    
    const startField = timeframe.start;
    const endField = ('deadline' in timeframe && timeframe.deadline) 
      ? timeframe.deadline 
      : timeframe.targetEnd || timeframe.actualEnd;
    
    const values = {
      startTime: timeToHours(startField),
      endTime: timeToHours(endField),
      startDate: extractDate(startField)
    };
    
    timeCache.set(item.id, values);
    return values;
  };

  // Helper to process an item
  const processItem = (
    item: Program | Project | Task | Subtask,
    type: 'program' | 'project' | 'task' | 'subtask',
    startField: string | undefined,
    endField: string | undefined,
    level: number,
    parentId?: string
  ) => {
    if (!item.timeframe || !startField || !endField) return;
    
    // View mode filtering:
    // Daily: Task + Subtask
    // Weekly: Task + Project
    // Monthly: Project + Program
    if (mode === 'd' && (type === 'program' || type === 'project')) {
      return;
    }
    if (mode === 'w' && (type === 'program' || type === 'subtask')) {
      return;
    }
    if (mode === 'm' && (type === 'task' || type === 'subtask')) {
      return;
    }
    
    // Extract date and time from start field
    const startDate = extractDate(startField);
    const startTime = timeToHours(startField);
    const endTime = timeToHours(endField);
    
    // For time-only items (daily/weekly/monthly recurring), use selected date as base
    // For items with dates, require both date and time
    const recurrence = 'recurrence' in item ? item.recurrence : undefined;
    const isTimeOnly = recurrence && (recurrence.type === 'daily' || recurrence.type === 'weekly' || recurrence.type === 'monthly');
    
    if (isTimeOnly) {
      // Time-only items: require time but not date
      if (startTime === null || endTime === null) return;
    } else {
      // Items with dates: require both date and time
      if (!startDate || startTime === null || endTime === null) return;
    }
    
    // Check if item should be displayed based on recurrence and selected date
    // For time-only items, use selected date as the base date
    const baseDateForCheck = isTimeOnly ? null : startDate;
    
    if (mode === 'd') {
      // Daily view: only show items for the selected date (with recurrence applied)
      if (!shouldDisplayOnDate(baseDateForCheck, filterDate, recurrence)) {
        return;
      }
    } else if (mode === 'w') {
      // Weekly view: show items that overlap with the selected week
      if (isTimeOnly) {
        // Time-only items: check recurrence pattern
        if (!shouldDisplayOnDate(null, filterDate, recurrence)) {
          return;
        }
      } else {
        const startOfWeek = new Date(filterDate);
        startOfWeek.setDate(filterDate.getDate() - filterDate.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        endOfWeek.setHours(23, 59, 59, 999);
        
        const itemStartDateObj = new Date(startDate! + 'T00:00:00');
        const itemEndDate = extractDate(endField);
        const itemEndDateObj = itemEndDate ? new Date(itemEndDate + 'T00:00:00') : itemStartDateObj;
        
        // Check if item overlaps with the week (starts before week ends and ends after week starts)
        const overlapsWeek = itemStartDateObj <= endOfWeek && itemEndDateObj >= startOfWeek;
        const matchesRecurrence = recurrence && recurrence.type !== 'none' && 
          shouldDisplayOnDate(startDate, filterDate, recurrence);
        
        if (!overlapsWeek && !matchesRecurrence) {
          return;
        }
      }
    } else if (mode === 'm') {
      // Monthly view: show items that overlap with the selected month
      if (isTimeOnly) {
        // Time-only items: check recurrence pattern
        if (!shouldDisplayOnDate(null, filterDate, recurrence)) {
          return;
        }
      } else {
        const startOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        const itemStartDateObj = new Date(startDate! + 'T00:00:00');
        const itemEndDate = extractDate(endField);
        const itemEndDateObj = itemEndDate ? new Date(itemEndDate + 'T00:00:00') : itemStartDateObj;
        
        // Check if item overlaps with the month (starts before month ends and ends after month starts)
        const overlapsMonth = itemStartDateObj <= endOfMonth && itemEndDateObj >= startOfMonth;
        const matchesRecurrence = recurrence && recurrence.type !== 'none' && 
          shouldDisplayOnDate(startDate, filterDate, recurrence);
        
        if (!overlapsMonth && !matchesRecurrence) {
          return;
        }
      }
    } else if (mode === 'y') {
      // Yearly view: show items in the selected year
      if (isTimeOnly) {
        // Time-only items don't make sense for yearly view
        return;
      } else {
        const itemDateObj = new Date(startDate! + 'T00:00:00');
        const isInYear = itemDateObj.getFullYear() === filterDate.getFullYear();
        const matchesRecurrence = recurrence && recurrence.type !== 'none' && 
          shouldDisplayOnDate(startDate, filterDate, recurrence);
        
        if (!isInYear && !matchesRecurrence) {
          return;
        }
      }
    }
    
    // Extract end date if available (for non-time-only items)
    const endDate = isTimeOnly ? null : extractDate(endField);
    
    // For time-only items, use the selected date as the display date
    const finalStartDate = isTimeOnly ? `${filterDate.getFullYear()}-${String(filterDate.getMonth() + 1).padStart(2, '0')}-${String(filterDate.getDate()).padStart(2, '0')}` : (startDate || null);
    const finalEndDate = isTimeOnly ? finalStartDate : (endDate || startDate);
    
    timetableItems.push({
      id: item.id,
      title: item.title,
      startTime,
      endTime,
      startDate: finalStartDate || undefined,
      endDate: finalEndDate || undefined,
      type,
      priority: item.priority,
      status: item.status,
      parentId,
      level,
    });
  };

  // Helper to check if child timeframe overlaps with parent timeframe
  const childOverlapsParent = (
    childStartTime: number,
    childEndTime: number,
    parentStartTime: number,
    parentEndTime: number
  ): boolean => {
    return timeframesOverlap(childStartTime, childEndTime, parentStartTime, parentEndTime);
  };

  // Process items hierarchically based on view mode
  if (mode === 'd') {
    // Daily: Task (level 2) + Subtask (level 3)
    tasks.forEach(task => {
      const { startTime: taskStartTime, endTime: taskEndTime } = getTimeValues(task);
      if (taskStartTime === null || taskEndTime === null) return;
      
      processItem(
        task,
        'task',
        task.timeframe?.start,
        task.timeframe?.targetEnd || task.timeframe?.actualEnd,
        2, // Level 2
        task.parentId
      );
      
      // Add subtasks that overlap with parent task (use Map lookup instead of filter)
      const childSubtasks = subtasksByParent.get(task.id) || [];
      childSubtasks.forEach(subtask => {
        const { startTime: subtaskStartTime, endTime: subtaskEndTime } = getTimeValues(subtask);
        if (subtaskStartTime === null || subtaskEndTime === null) return;
        
        // Only include if subtask overlaps with parent task timeframe
        if (childOverlapsParent(subtaskStartTime, subtaskEndTime, taskStartTime, taskEndTime)) {
          processItem(
            subtask,
            'subtask',
            subtask.timeframe?.start,
            subtask.timeframe?.targetEnd || subtask.timeframe?.actualEnd,
            3, // Level 3
            task.id
          );
        }
      });
    });
    
    // Also include standalone subtasks (without parent task in this view)
    subtasks
      .filter(subtask => {
        const parentTask = tasks.find(t => t.id === subtask.parentId);
        return !parentTask || !parentTask.timeframe?.start;
      })
      .forEach(subtask => {
    processItem(
          subtask,
          'subtask',
          subtask.timeframe?.start,
          subtask.timeframe?.targetEnd || subtask.timeframe?.actualEnd,
          3,
          subtask.parentId
    );
  });

  } else if (mode === 'w') {
    // Weekly: Task (level 2) + Project (level 1)
    projects.forEach(project => {
      const { startTime: projectStartTime, endTime: projectEndTime } = getTimeValues(project);
      if (projectStartTime === null || projectEndTime === null) return;
      
      processItem(
        project,
        'project',
        project.timeframe?.start,
        project.timeframe?.deadline || project.timeframe?.targetEnd || project.timeframe?.actualEnd,
        1, // Level 1
        project.parentId
      );
      
      // Add tasks that overlap with parent project (use Map lookup instead of filter)
      const childTasks = tasksByParent.get(project.id) || [];
      childTasks.forEach(task => {
        const { startTime: taskStartTime, endTime: taskEndTime } = getTimeValues(task);
        if (taskStartTime === null || taskEndTime === null) return;
        
        // Only include if task overlaps with parent project timeframe
        if (childOverlapsParent(taskStartTime, taskEndTime, projectStartTime, projectEndTime)) {
          processItem(
            task,
            'task',
            task.timeframe?.start,
            task.timeframe?.targetEnd || task.timeframe?.actualEnd,
            2, // Level 2
            project.id
          );
        }
      });
    });
    
    // Also include standalone tasks (without parent project in this view)
    tasks
      .filter(task => {
        const parentProject = projects.find(p => p.id === task.parentId);
        return !parentProject || !parentProject.timeframe?.start;
      })
      .forEach(task => {
    processItem(
          task,
          'task',
          task.timeframe?.start,
          task.timeframe?.targetEnd || task.timeframe?.actualEnd,
          2,
          task.parentId
    );
  });
      
  } else if (mode === 'm') {
    // Monthly: Project (level 1) + Program (level 0)
    programs.forEach(program => {
      const { startTime: programStartTime, endTime: programEndTime } = getTimeValues(program);
      if (programStartTime === null || programEndTime === null) return;
      
      processItem(
        program,
        'program',
        program.timeframe?.start,
        program.timeframe?.deadline || program.timeframe?.targetEnd || program.timeframe?.actualEnd,
        0, // Level 0 (bottom)
        undefined
      );
      
      // Add projects that overlap with parent program (use Map lookup instead of filter)
      const childProjects = projectsByParent.get(program.id) || [];
      childProjects.forEach(project => {
        const { startTime: projectStartTime, endTime: projectEndTime } = getTimeValues(project);
        if (projectStartTime === null || projectEndTime === null) return;
        
        // Only include if project overlaps with parent program timeframe
        if (childOverlapsParent(projectStartTime, projectEndTime, programStartTime, programEndTime)) {
          processItem(
            project,
            'project',
            project.timeframe?.start,
            project.timeframe?.deadline || project.timeframe?.targetEnd || project.timeframe?.actualEnd,
            1, // Level 1
            program.id
          );
        }
      });
    });
    
    // Also include standalone projects (without parent program)
    projects
      .filter(project => !project.parentId || !programs.find(p => p.id === project.parentId))
      .forEach(project => {
        processItem(
          project,
          'project',
          project.timeframe?.start,
          project.timeframe?.deadline || project.timeframe?.targetEnd || project.timeframe?.actualEnd,
          1,
          project.parentId
        );
      });
  } else if (mode === 'y') {
    // Yearly: same as monthly for now
    programs.forEach(program => {
      const { startTime: programStartTime, endTime: programEndTime } = getTimeValues(program);
      if (programStartTime === null || programEndTime === null) return;
      
      processItem(
        program,
        'program',
        program.timeframe?.start,
        program.timeframe?.deadline || program.timeframe?.targetEnd || program.timeframe?.actualEnd,
        0,
        undefined
      );
      
      // Use Map lookup instead of filter
      const childProjects = projectsByParent.get(program.id) || [];
      childProjects.forEach(project => {
        const { startTime: projectStartTime, endTime: projectEndTime } = getTimeValues(project);
        if (projectStartTime === null || projectEndTime === null) return;
        
        if (childOverlapsParent(projectStartTime, projectEndTime, programStartTime, programEndTime)) {
          processItem(
            project,
            'project',
            project.timeframe?.start,
            project.timeframe?.deadline || project.timeframe?.targetEnd || project.timeframe?.actualEnd,
            1,
            program.id
          );
        }
      });
    });
    
    projects
      .filter(project => !project.parentId || !programs.find(p => p.id === project.parentId))
      .forEach(project => {
        processItem(
          project,
          'project',
          project.timeframe?.start,
          project.timeframe?.deadline || project.timeframe?.targetEnd || project.timeframe?.actualEnd,
          1,
          project.parentId
        );
      });
  }

  return timetableItems;
};

