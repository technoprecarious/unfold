'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { Program, Project, Task, Subtask, Priority, StatusPrimary, StatusSecondary } from '@/lib/types/types';
import { updateProgram } from '@/lib/firestore/programs';
import { updateProject } from '@/lib/firestore/projects';
import { updateTask } from '@/lib/firestore/tasks';
import { updateSubtask } from '@/lib/firestore/subtasks';
import { useDialog } from '../dialogs/useDialog';
import DateTimePicker from '../pickers/DateTimePicker';
import TimePicker from '../pickers/TimePicker';

interface DrawerProps {
  item: Program | Project | Task | Subtask | null;
  itemType: 'programs' | 'projects' | 'tasks' | 'subtasks' | null;
  onClose: () => void;
  onSave: (updatedItem: Program | Project | Task | Subtask) => void;
  onDelete?: (id: string) => void;
  // For parent dropdown and children display
  allPrograms?: Program[];
  allProjects?: Project[];
  allTasks?: Task[];
  allSubtasks?: Subtask[];
  onAddChild?: (parentId: string, childType: 'projects' | 'tasks' | 'subtasks') => void;
  onSelectChild?: (item: Program | Project | Task | Subtask) => void;
}

const Drawer: React.FC<DrawerProps> = ({ 
  item, 
  itemType, 
  onClose, 
  onSave, 
  onDelete,
  allPrograms = [],
  allProjects = [],
  allTasks = [],
  allSubtasks = [],
  onAddChild,
  onSelectChild,
}) => {
  const [editedItem, setEditedItem] = useState<Program | Project | Task | Subtask | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { alert, confirm, AlertComponent, ConfirmComponent } = useDialog();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item) {
      // Deep copy the item for editing
      setEditedItem(JSON.parse(JSON.stringify(item)));
    }
  }, [item]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (item) {
      // Save the original overflow style
      const originalOverflow = document.body.style.overflow;
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      
      // Cleanup: restore original overflow when drawer closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [item]);

  // Scroll to top when item changes (e.g., when transitioning to a new child object)
  useEffect(() => {
    if (item && contentRef.current) {
      // Use requestAnimationFrame to ensure scroll happens after DOM updates
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      });
    }
  }, [item?.id, itemType]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!item || !editedItem) return false;
    return JSON.stringify(item) !== JSON.stringify(editedItem);
  }, [item, editedItem]);

  if (!item || !editedItem || !itemType) return null;

  // Handle close with unsaved changes check
  const handleClose = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm(
        'You have unsaved changes. Do you want to discard them?',
        'Unsaved Changes',
        false
      );
      if (!confirmed) {
        return; // User cancelled, don't close
      }
    }
    onClose();
  };

  // Handle add child with unsaved changes check
  const handleAddChild = async (parentId: string, childType: 'projects' | 'tasks' | 'subtasks') => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm(
        'You have unsaved changes. Do you want to save them before adding a child?',
        'Unsaved Changes',
        false
      );
      if (confirmed) {
        // Save first, then add child
        try {
          await handleSave();
          onAddChild?.(parentId, childType);
        } catch (error) {
          // Save failed, don't proceed with adding child
          console.error('Failed to save before adding child:', error);
        }
      } else {
        // User chose to discard, proceed with adding child
        onAddChild?.(parentId, childType);
      }
    } else {
      onAddChild?.(parentId, childType);
    }
  };

  // Handle select child with unsaved changes check
  const handleSelectChild = async (childItem: Program | Project | Task | Subtask) => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm(
        'You have unsaved changes. Do you want to save them before viewing this item?',
        'Unsaved Changes',
        false
      );
      if (confirmed) {
        // Save first, then select child
        try {
          await handleSave();
          onSelectChild?.(childItem);
        } catch (error) {
          // Save failed, don't proceed with selecting child
          console.error('Failed to save before selecting child:', error);
        }
      } else {
        // User chose to discard, proceed with selecting child
        onSelectChild?.(childItem);
      }
    } else {
      onSelectChild?.(childItem);
    }
  };

  const handleSave = async () => {
    if (!editedItem) return;
    
    setIsSaving(true);
    try {
      // Update functions take Partial updates (excluding id and createdAt)
      const { id, createdAt, ...updates } = editedItem;
      
      switch (itemType) {
        case 'programs':
          await updateProgram(editedItem.id, updates as Partial<Omit<Program, 'id' | 'createdAt'>>);
          break;
        case 'projects':
          await updateProject(editedItem.id, updates as Partial<Omit<Project, 'id' | 'createdAt'>>);
          break;
        case 'tasks':
          await updateTask(editedItem.id, updates as Partial<Omit<Task, 'id' | 'createdAt'>>);
          break;
        case 'subtasks':
          await updateSubtask(editedItem.id, updates as Partial<Omit<Subtask, 'id' | 'createdAt'>>);
          break;
        default:
          return;
      }
      
      console.log('🟢 Drawer handleSave - Firestore update completed successfully');
      
      // Pass the edited item as the updated item
      await onSave(editedItem);
      // Don't close automatically - let user see the saved changes
      // The parent will refresh data and update selectedItem
      // onClose(); // Commented out - let user close manually
    } catch (error) {
      console.error('🔴 Drawer handleSave - Error saving item:', error);
      await alert('Failed to save. Please try again.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !onDelete) return;
    const confirmed = await confirm(
      `Are you sure you want to delete "${item.title}"?`,
      'Delete Item',
      true
    );
    if (confirmed) {
      try {
        await onDelete(item.id);
        onClose();
      } catch (error) {
        console.error('Error deleting item:', error);
        await alert('Failed to delete item. Please try again.', 'Error');
      }
    }
  };

  const updateField = (field: string, value: any) => {
    if (!editedItem) return;
    setEditedItem({ ...editedItem, [field]: value });
  };

  // Handle Enter key to blur input field
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const updateTimeframeField = (field: string, value: string) => {
    if (!editedItem) return;
    
    // CRITICAL FIX: Don't check if timeframe exists - CREATE it if it doesn't!
    // The original check `!('timeframe' in editedItem)` was preventing creation of timeframe
    console.log('🟡 updateTimeframeField called:', { field, value, currentTimeframe: editedItem.timeframe, hasTimeframe: 'timeframe' in editedItem });
    
    // Update directly like other fields - create new object reference for React
    // If timeframe doesn't exist, create it. If it does, merge with existing
    const newTimeframe = {
      ...(editedItem.timeframe || {}),
      [field]: value || undefined,
    };
    
    const newEditedItem = {
      ...editedItem,
      timeframe: newTimeframe,
    };
    
    console.log('🟡 updateTimeframeField - newEditedItem.timeframe:', newEditedItem.timeframe);
    
    setEditedItem(newEditedItem);
  };

  const updateRecurrenceField = (field: string, value: any) => {
    if (!editedItem) return;
    // Only allow recurrence on items that support it (Program, Project, Task - not Subtask)
    if (itemType === 'subtasks') return;
    
    // CRITICAL FIX: Don't check if recurrence exists - CREATE it if it doesn't!
    // The property exists in the type definition, it just might be undefined
    console.log('🟡 updateRecurrenceField called:', { field, value, currentRecurrence: (editedItem as any).recurrence, hasRecurrence: 'recurrence' in editedItem });
    setEditedItem({
      ...editedItem,
      recurrence: {
        ...((editedItem as any).recurrence || { type: 'none' }),
        [field]: value,
      },
    } as typeof editedItem);
  };

  const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];
  const statusPrimary: StatusPrimary[] = ['planned', 'active', 'paused', 'due', 'completed'];
  const statusSecondary: StatusSecondary[] = ['planned', 'completed'];
  const recurrenceTypes = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Helper functions for time handling
  const getRecurrenceType = (): string => {
    if (itemType === 'subtasks') return 'none';
    return ('recurrence' in editedItem && editedItem.recurrence?.type) || 'none';
  };
  
  const isTimeOnlyMode = (): boolean => {
    const recurrenceType = getRecurrenceType();
    return recurrenceType === 'daily' || recurrenceType === 'weekly' || recurrenceType === 'monthly';
  };
  
  // Convert time string (HH:MM or ISO) to HH:MM format
  const extractTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    // Check if it's already HH:MM format
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
    // Try to parse as ISO and extract time
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
    } catch (e) {
      // Ignore
    }
    return '';
  };
  
  // Convert HH:MM to ISO datetime (using today's date as base)
  const timeToISO = (timeStr: string): string => {
    if (!timeStr) return '';
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return '';
    
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);
    return today.toISOString();
  };
  
  // Handle time field update (for time-only mode)
  const updateTimeField = (field: string, value: string) => {
    if (!editedItem) return;
    const recurrenceType = getRecurrenceType();
    
    // For time-only modes, store as HH:MM format
    // For other modes, convert to ISO if needed
    let finalValue: string;
    if (isTimeOnlyMode()) {
      finalValue = value; // Store as HH:MM
    } else {
      // If it's already ISO, keep it; otherwise convert
      if (value.match(/^\d{1,2}:\d{2}$/)) {
        finalValue = timeToISO(value);
      } else {
        finalValue = value;
      }
    }
    
    updateTimeframeField(field, finalValue);
  };
  
  // Get time value for display (extract time from ISO or return HH:MM)
  const getTimeValue = (field: 'start' | 'targetEnd' | 'deadline'): string => {
    if (!editedItem || !('timeframe' in editedItem) || !editedItem.timeframe) return '';
    const value = field === 'deadline' 
      ? ('deadline' in editedItem.timeframe ? editedItem.timeframe.deadline : '')
      : editedItem.timeframe[field];
    return extractTime(value);
  };

  const getItemStatus = (): StatusPrimary | StatusSecondary | undefined => {
    if ('status' in editedItem) return editedItem.status;
    return undefined;
  };

  const itemStatus = getItemStatus();
  const isSecondaryStatus = itemType === 'subtasks';

  // Format date/time for display
  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return 'no_value';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <DrawerOverlay onClick={handleClose}>
      <DrawerPanel onClick={(e) => e.stopPropagation()}>
      <DrawerHeader>
        <DrawerHeaderTop>
          <ActionButton onClick={handleClose}>close</ActionButton>
          <DrawerHeaderTopRight>
            <ActionButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'saving...' : 'save'}
            </ActionButton>
            {onDelete && (
              <ActionButton onClick={handleDelete} $danger>
                delete
              </ActionButton>
            )}
          </DrawerHeaderTopRight>
        </DrawerHeaderTop>
        <DrawerHeaderBottom>
          <ItemInfo>
            <DrawerHeaderTitleRow>
              <ItemTypeLabel>{itemType.toUpperCase()}</ItemTypeLabel>
              <ColonSeparator> : </ColonSeparator>
              <ItemTitle>{editedItem.title || 'Untitled'}</ItemTitle>
            </DrawerHeaderTitleRow>
            <ItemId>#{editedItem.id}</ItemId>
          </ItemInfo>
          <TimeInfo>
            <TimeRow>time created : {formatDateTime(editedItem.createdAt)}</TimeRow>
            <TimeRow>time updated : {formatDateTime(editedItem.updatedAt)}</TimeRow>
          </TimeInfo>
        </DrawerHeaderBottom>
      </DrawerHeader>

      <Content ref={contentRef} data-drawer-content>
        <PropertiesGrid>
          {/* Base Fields */}
          <PropertyRow>
            <PropertyLabel>Title *</PropertyLabel>
            <PropertyValue>
              <Input
                value={editedItem.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Enter title"
              />
            </PropertyValue>
          </PropertyRow>

          <PropertyRow>
            <PropertyLabel>Description</PropertyLabel>
            <PropertyValue>
              <Textarea
                value={editedItem.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </PropertyValue>
          </PropertyRow>

          <PropertyRow>
            <PropertyLabel>Priority</PropertyLabel>
            <PropertyValue>
              <Select
                value={editedItem.priority || ''}
                onChange={(e) => updateField('priority', e.target.value || undefined)}
              >
                <option value="">-</option>
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </PropertyValue>
          </PropertyRow>

          <PropertyRow>
            <PropertyLabel>Status</PropertyLabel>
            <PropertyValue>
              <Select
                value={itemStatus || ''}
                onChange={(e) => updateField('status', e.target.value || undefined)}
              >
                <option value="">-</option>
                {(isSecondaryStatus ? statusSecondary : statusPrimary).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </PropertyValue>
          </PropertyRow>

          {/* Recurrence - Moved above Timeframe */}
          {(itemType === 'programs' || itemType === 'projects' || itemType === 'tasks') && (
            <>
              <PropertySection>Recurrence</PropertySection>
              <PropertyRow>
                <PropertyLabel>Type</PropertyLabel>
                <PropertyValue>
                  <Select
                    value={getRecurrenceType()}
                    onChange={(e) => updateRecurrenceField('type', e.target.value)}
                  >
                    {recurrenceTypes.map(rt => (
                      <option key={rt} value={rt}>{rt}</option>
                    ))}
                  </Select>
                </PropertyValue>
              </PropertyRow>
              
              {/* Days of Week selector for weekly recurrence */}
              {getRecurrenceType() === 'weekly' && (
                <PropertyRow>
                  <PropertyLabel>Days of Week</PropertyLabel>
                  <PropertyValue>
                    <DaysOfWeekContainer>
                      {dayNames.map((dayName, index) => {
                        const daysOfWeek = ('recurrence' in editedItem && editedItem.recurrence?.daysOfWeek) || [];
                        const isSelected = daysOfWeek.includes(index);
                        return (
                          <DayCheckbox
                            key={index}
                            $selected={isSelected}
                            onClick={() => {
                              const currentDays = daysOfWeek || [];
                              const newDays = isSelected
                                ? currentDays.filter(d => d !== index)
                                : [...currentDays, index].sort();
                              updateRecurrenceField('daysOfWeek', newDays.length > 0 ? newDays : undefined);
                            }}
                          >
                            {dayName.substring(0, 3)}
                          </DayCheckbox>
                        );
                      })}
                    </DaysOfWeekContainer>
                  </PropertyValue>
                </PropertyRow>
              )}
              
              {/* Day of Month selector for monthly recurrence */}
              {getRecurrenceType() === 'monthly' && (
                <PropertyRow>
                  <PropertyLabel>Day of Month</PropertyLabel>
                  <PropertyValue>
                    <Select
                      value={('recurrence' in editedItem && editedItem.recurrence?.dayOfMonth) || ''}
                      onChange={(e) => updateRecurrenceField('dayOfMonth', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    >
                      <option value="">-</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </Select>
                  </PropertyValue>
                </PropertyRow>
              )}
            </>
          )}

          {/* Timeframe */}
          <PropertySection>Timeframe</PropertySection>

          {/* Start Time - Always shown */}
          <PropertyRow>
            <PropertyLabel>Start Time</PropertyLabel>
            <PropertyValue>
              {isTimeOnlyMode() ? (
                <TimePicker
                  value={getTimeValue('start')}
                  onChange={(value) => updateTimeField('start', value)}
                  placeholder="Select start time"
                />
              ) : (
                <DateTimePicker
                  value={('timeframe' in editedItem && editedItem.timeframe?.start) ? editedItem.timeframe.start : ''}
                  onChange={(value) => updateTimeframeField('start', value)}
                />
              )}
            </PropertyValue>
          </PropertyRow>

          {/* End Time - Always shown */}
          <PropertyRow>
            <PropertyLabel>End Time</PropertyLabel>
            <PropertyValue>
              {isTimeOnlyMode() ? (
                <TimePicker
                  value={getTimeValue('targetEnd')}
                  onChange={(value) => updateTimeField('targetEnd', value)}
                  placeholder="Select end time"
                />
              ) : (
                <DateTimePicker
                  value={('timeframe' in editedItem && editedItem.timeframe?.targetEnd) ? editedItem.timeframe.targetEnd : ''}
                  onChange={(value) => updateTimeframeField('targetEnd', value)}
                />
              )}
            </PropertyValue>
          </PropertyRow>

          {/* Date fields - Conditional based on recurrence type */}
          {getRecurrenceType() === 'none' && (
            <>
              {(itemType === 'programs' || itemType === 'projects') && (
                <PropertyRow>
                  <PropertyLabel>Deadline</PropertyLabel>
                  <PropertyValue>
                    <DateTimePicker
                      key={`deadline-${(itemType === 'programs' || itemType === 'projects') && editedItem.timeframe && 'deadline' in editedItem.timeframe ? editedItem.timeframe.deadline || 'empty' : 'empty'}`}
                      value={(itemType === 'programs' || itemType === 'projects') && editedItem.timeframe && 'deadline' in editedItem.timeframe && editedItem.timeframe.deadline ? editedItem.timeframe.deadline : ''}
                      onChange={(value) => updateTimeframeField('deadline', value)}
                    />
                  </PropertyValue>
                </PropertyRow>
              )}
            </>
          )}
          
          {/* For yearly recurrence, show date picker */}
          {getRecurrenceType() === 'yearly' && (
            <PropertyRow>
              <PropertyLabel>Date</PropertyLabel>
              <PropertyValue>
                <DateTimePicker
                  value={('timeframe' in editedItem && editedItem.timeframe?.start) ? editedItem.timeframe.start : ''}
                  onChange={(value) => updateTimeframeField('start', value)}
                />
              </PropertyValue>
            </PropertyRow>
          )}

          {/* Program-specific */}
          {itemType === 'programs' && (
            <>
              <PropertySection>Program Fields</PropertySection>
              <PropertyRow>
                <PropertyLabel>Category</PropertyLabel>
                <PropertyValue>
                  <Input
                    value={('category' in editedItem && editedItem.category) || ''}
                    onChange={(e) => updateField('category', e.target.value || undefined)}
                    onKeyDown={handleInputKeyDown}
                  />
                </PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Objective</PropertyLabel>
                <PropertyValue>
                  <Textarea
                    value={('objective' in editedItem && editedItem.objective) || ''}
                    onChange={(e) => updateField('objective', e.target.value || undefined)}
                    rows={2}
                  />
                </PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Progress (%)</PropertyLabel>
                <PropertyValue>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={('progress' in editedItem && editedItem.progress !== undefined) ? editedItem.progress : ''}
                    onChange={(e) => updateField('progress', e.target.value ? parseInt(e.target.value) : undefined)}
                    onKeyDown={handleInputKeyDown}
                  />
                </PropertyValue>
              </PropertyRow>
            </>
          )}

          {/* Project-specific */}
          {itemType === 'projects' && (
            <>
              <PropertySection>Project Fields</PropertySection>
              <PropertyRow>
                <PropertyLabel>Parent Program</PropertyLabel>
                <PropertyValue>
                  <Select
                    value={('parentId' in editedItem && editedItem.parentId) || ''}
                    onChange={(e) => updateField('parentId', e.target.value || undefined)}
                  >
                    <option value="">None</option>
                    {allPrograms.map(program => (
                      <option key={program.id} value={program.id}>
                        {program.title}
                      </option>
                    ))}
                  </Select>
                </PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Phase</PropertyLabel>
                <PropertyValue>
                  <Input
                    value={('phase' in editedItem && editedItem.phase) || ''}
                    onChange={(e) => updateField('phase', e.target.value || undefined)}
                    onKeyDown={handleInputKeyDown}
                  />
                </PropertyValue>
              </PropertyRow>
            </>
          )}

          {/* Task-specific */}
          {itemType === 'tasks' && (
            <>
              <PropertySection>Hierarchy</PropertySection>
              <PropertyRow>
                <PropertyLabel>Parent</PropertyLabel>
                <PropertyValue>
                  <Select
                    value={('parentId' in editedItem && editedItem.parentId) || ''}
                    onChange={(e) => updateField('parentId', e.target.value || undefined)}
                  >
                    <option value="">None</option>
                    {allPrograms.map(program => (
                      <option key={program.id} value={program.id}>
                        Program: {program.title}
                      </option>
                    ))}
                    {allProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        Project: {project.title}
                      </option>
                    ))}
                  </Select>
                </PropertyValue>
              </PropertyRow>
            </>
          )}

          {/* Subtask-specific */}
          {itemType === 'subtasks' && (
            <>
              <PropertySection>Subtask Fields</PropertySection>
              <PropertyRow>
                <PropertyLabel>Parent Task</PropertyLabel>
                <PropertyValue>
                  <Select
                    value={('parentId' in editedItem && editedItem.parentId) || ''}
                    onChange={(e) => updateField('parentId', e.target.value || undefined)}
                  >
                    <option value="">None</option>
                    {allTasks.map(task => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </Select>
                </PropertyValue>
              </PropertyRow>
            </>
          )}

          {/* Children Section */}
          {item && editedItem && (
            <>
              <PropertySection>Children</PropertySection>
              {itemType === 'programs' && (
                <PropertyRow>
                  <PropertyLabel>Projects</PropertyLabel>
                  <PropertyValue>
                    <ChildrenList>
                      {allProjects
                        .filter(project => project.parentId === editedItem.id)
                        .map(project => (
                          <ChildItem
                            key={project.id}
                            onClick={() => handleSelectChild(project)}
                          >
                            {project.title}
                          </ChildItem>
                        ))}
                      {allProjects.filter(project => project.parentId === editedItem.id).length === 0 && (
                        <EmptyChildren>No projects yet</EmptyChildren>
                      )}
                      <AddChildButton
                        onClick={() => handleAddChild(editedItem.id, 'projects')}
                      >
                        + Add Project
                      </AddChildButton>
                    </ChildrenList>
                  </PropertyValue>
                </PropertyRow>
              )}
              {itemType === 'projects' && (
                <PropertyRow>
                  <PropertyLabel>Tasks</PropertyLabel>
                  <PropertyValue>
                    <ChildrenList>
                      {allTasks
                        .filter(task => task.parentId === editedItem.id)
                        .map(task => (
                          <ChildItem
                            key={task.id}
                            onClick={() => handleSelectChild(task)}
                          >
                            {task.title}
                          </ChildItem>
                        ))}
                      {allTasks.filter(task => task.parentId === editedItem.id).length === 0 && (
                        <EmptyChildren>No tasks yet</EmptyChildren>
                      )}
                      <AddChildButton
                        onClick={() => handleAddChild(editedItem.id, 'tasks')}
                      >
                        + Add Task
                      </AddChildButton>
                    </ChildrenList>
                  </PropertyValue>
                </PropertyRow>
              )}
              {itemType === 'tasks' && (
                <PropertyRow>
                  <PropertyLabel>Subtasks</PropertyLabel>
                  <PropertyValue>
                    <ChildrenList>
                      {allSubtasks
                        .filter(subtask => subtask.parentId === editedItem.id)
                        .map(subtask => (
                          <ChildItem
                            key={subtask.id}
                            onClick={() => handleSelectChild(subtask)}
                          >
                            {subtask.title}
                          </ChildItem>
                        ))}
                      {allSubtasks.filter(subtask => subtask.parentId === editedItem.id).length === 0 && (
                        <EmptyChildren>No subtasks yet</EmptyChildren>
                      )}
                      <AddChildButton
                        onClick={() => onAddChild?.(editedItem.id, 'subtasks')}
                      >
                        + Add Subtask
                      </AddChildButton>
                    </ChildrenList>
                  </PropertyValue>
                </PropertyRow>
              )}
            </>
          )}

          {/* Common Fields */}
          <PropertySection>Additional</PropertySection>
          <PropertyRow>
            <PropertyLabel>Tags</PropertyLabel>
            <PropertyValue>
              <Input
                value={editedItem.tags?.join(', ') || ''}
                onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                onKeyDown={handleInputKeyDown}
                placeholder="tag1, tag2, tag3"
              />
            </PropertyValue>
          </PropertyRow>

          <PropertyRow>
            <PropertyLabel>Notes</PropertyLabel>
            <PropertyValue>
              <Textarea
                value={editedItem.notes || ''}
                onChange={(e) => updateField('notes', e.target.value || undefined)}
                rows={4}
                placeholder="Additional notes..."
              />
            </PropertyValue>
          </PropertyRow>
        </PropertiesGrid>
      </Content>
    </DrawerPanel>
    </DrawerOverlay>
    <AlertComponent />
    <ConfirmComponent />
    </>
  );
};

export default Drawer;

const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 90;
  animation: fadeIn 0.2s ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (min-width: 780px) {
    justify-content: flex-end;
    align-items: stretch;
  }
`;

const DrawerPanel = styled.div`
  width: 100%;
  max-height: 85vh;
  background: var(--bg-secondary, #0e0e0e);
  border-top: 1px solid var(--border-primary, #0a0a0a);
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
  border-radius: 12px 12px 0 0;
  
  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes slideRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @media (min-width: 780px) {
    width: 36%;
    max-width: 700px;
    min-width: 480px;
    height: 100vh;
    max-height: 100vh;
    border-top: none;
    border-left: 1px solid var(--border-primary, #0a0a0a);
    border-radius: 0;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
    animation: slideRight 0.3s ease-out;
  }
`;

const DrawerHeader = styled.header`
  padding-top: 0.5rem;
  padding-left: 1.5rem;
  padding-right: max(1.5rem, 10px);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-primary, #0a0a0a);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DrawerHeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const DrawerHeaderTopRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DrawerHeaderBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;

  @media (max-width: 779px) {
    flex-direction: column;
    width: 100%;
    gap: 0.25rem;
  }
`;

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  @media (max-width: 779px) {
    width: 100%;
  }
`;

const DrawerHeaderTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0;
  margin-bottom: 0.5rem;
`;

const ItemTypeLabel = styled.span`
  font-size: 16px;
  font-weight: 400;
  color: var(--text-secondary, #8A8A95);
  letter-spacing: 0.08em;
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
`;

const ColonSeparator = styled.span`
  font-size: 16px;
  color: var(--text-secondary, #8A8A95);
  font-family: Helvetica, Arial, sans-serif;
  margin: 0 0.25rem;
  line-height: 1.2;
`;

const ItemTitle = styled.h3`
  margin: 0;
  padding: 0;
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;

  @media (max-width: 779px) {
    width: 100%;
  }
`;

const ItemId = styled.div`
  margin-top: 0;
  font-size: 10px;
  font-weight: normal;
  color: var(--text-secondary, #8A8A95);
  font-family: Helvetica, Arial, sans-serif;
  opacity: 0.7;
  line-height: 1.2;

  @media (max-width: 779px) {
    width: 100%;
  }
`;

const TimeInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;

  @media (max-width: 779px) {
    width: 100%;
    align-items: flex-start;
    margin-top: 0.25rem;
  }
`;

const TimeRow = styled.div`
  font-size: 10px;
  color: var(--text-secondary, #8A8A95);
  font-family: Helvetica, Arial, sans-serif;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$danger ? '#ff8888' : 'var(--text-primary, #DEDEE5)'};
  padding: 0.5rem 1rem;
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    color: ${props => props.$danger ? '#ff8888' : 'var(--text-primary, #ffffff)'};
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  padding-right: max(1.5rem, 10px);

  /* Hide scrollbar on mobile */
  @media (max-width: 779px) {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
    &::-webkit-scrollbar {
      display: none;  /* Chrome, Safari, Opera */
    }
  }
`;

const PropertiesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PropertySection = styled.div`
  font-size: 14px;
  color: var(--text-secondary, #8A8A95);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 0.5rem;
  margin-bottom: -0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-primary, #0a0a0a);
  font-family: Helvetica, Arial, sans-serif;
`;

const PropertyRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const PropertyLabel = styled.label`
  font-size: 11px;
  color: var(--text-secondary, #8A8A95);
  letter-spacing: 0.06em;
  font-family: Helvetica, Arial, sans-serif;
  flex: 1;
  text-align: left;
`;

const PropertyValue = styled.div`
  width: 80%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding-right: 10px;
`;

const Input = styled.input`
  width: 100%;
  background: var(--bg-primary, #0a0a0a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.5rem;
  outline: none;
  transition: all 0.2s;
  cursor: text;

  &:hover {
    background: var(--bg-tertiary, #1a1a1a);
  }

  &:focus {
    background: var(--bg-tertiary, #1a1a1a);
    border-color: var(--border-secondary, #8A8A95);
    color: var(--text-primary, #ffffff);
  }

  &::placeholder {
    color: var(--text-tertiary, #5a5a5d);
  }

  /* Style datetime-local calendar picker */
  &[type="datetime-local"] {
    &::-webkit-calendar-picker-indicator {
      filter: invert(0.8);
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      
      &:hover {
        opacity: 1;
      }
    }

    &::-webkit-datetime-edit {
      color: var(--text-primary, #DEDEE5);
    }

    &::-webkit-datetime-edit-fields-wrapper {
      color: var(--text-primary, #DEDEE5);
    }

    &::-webkit-datetime-edit-text {
      color: var(--text-secondary, #8A8A95);
    }

    &::-webkit-datetime-edit-month-field,
    &::-webkit-datetime-edit-day-field,
    &::-webkit-datetime-edit-year-field,
    &::-webkit-datetime-edit-hour-field,
    &::-webkit-datetime-edit-minute-field {
      color: var(--text-primary, #DEDEE5);
    }

    &::-webkit-datetime-edit-month-field:focus,
    &::-webkit-datetime-edit-day-field:focus,
    &::-webkit-datetime-edit-year-field:focus,
    &::-webkit-datetime-edit-hour-field:focus,
    &::-webkit-datetime-edit-minute-field:focus {
      background: var(--bg-tertiary, #1a1a1a);
      color: var(--text-primary, #DEDEE5);
    }
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  background: var(--bg-primary, #0a0a0a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.5rem;
  outline: none;
  resize: vertical;
  transition: all 0.2s;
  cursor: text;

  &:hover {
    background: var(--bg-tertiary, #1a1a1a);
  }

  &:focus {
    background: var(--bg-tertiary, #1a1a1a);
    border-color: var(--border-secondary, #8A8A95);
    color: var(--text-primary, #ffffff);
  }

  &::placeholder {
    color: var(--text-tertiary, #5a5a5d);
  }
`;

const ChildrenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const ChildItem = styled.div`
  padding: 0.5rem;
  background: var(--bg-primary, #0a0a0a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: var(--bg-tertiary, #1a1a1a);
    color: var(--text-primary, #ffffff);
  }
`;

const EmptyChildren = styled.div`
  padding: 0.5rem;
  color: var(--text-secondary, #8A8A95);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  font-style: italic;
`;

const AddChildButton = styled.button`
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed var(--border-tertiary, #333333);
  color: var(--text-secondary, #8A8A95);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-secondary, #8A8A95);
    color: var(--text-primary, #DEDEE5);
    background: var(--bg-primary, #0a0a0a);
  }
`;

const Select = styled.select`
  width: 100%;
  background-color: var(--bg-primary, #0a0a0a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.5rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
  
  /* Remove native arrow */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  
  /* Add custom arrow positioned at right edge */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%238A8A95' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 8px;

  &:hover {
    background-color: var(--bg-tertiary, #1a1a1a);
    color: var(--text-primary, #ffffff);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%23DEDEE5' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E");
    background-position: right 0.5rem center;
  }

  &:focus {
    background-color: var(--bg-tertiary, #1a1a1a);
    border-color: var(--border-secondary, #8A8A95);
    color: var(--text-primary, #ffffff);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%23DEDEE5' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E");
    background-position: right 0.5rem center;
  }

  option {
    background: var(--bg-primary, #0a0a0a);
    color: var(--text-primary, #DEDEE5);
  }
`;

const DaysOfWeekContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const DayCheckbox = styled.button<{ $selected: boolean }>`
  background: ${props => props.$selected ? 'var(--text-secondary, #8A8A95)' : 'var(--bg-primary, #0a0a0a)'};
  border: 1px solid ${props => props.$selected ? 'var(--text-secondary, #8A8A95)' : 'var(--bg-tertiary, #1a1a1a)'};
  color: ${props => props.$selected ? 'var(--bg-primary, #000000)' : 'var(--text-primary, #DEDEE5)'};
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 40px;
  text-align: center;

  &:hover {
    background: ${props => props.$selected ? 'var(--text-secondary, #9A9AA5)' : 'var(--bg-tertiary, #1a1a1a)'};
    color: ${props => props.$selected ? 'var(--bg-primary, #000000)' : 'var(--text-primary, #ffffff)'};
  }
`;

