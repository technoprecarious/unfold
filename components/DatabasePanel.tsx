'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Program, Project, Task, Subtask } from '@/lib/types/types';
import { timeToHours } from '@/utils/timetableUtils';
import { getUserPreferences, subscribeToUserPreferences, ColumnKey } from '@/lib/firestore/preferences';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';

interface DatabasePanelProps {
  items: (Program | Project | Task | Subtask)[];
  itemType: 'programs' | 'projects' | 'tasks' | 'subtasks';
  onSelect: (item: Program | Project | Task | Subtask) => void;
  onAdd: () => void;
  onUpdate: (itemId: string, field: string, value: string) => Promise<void>;
  selectedItemId?: string | null;
  multiSelectMode?: boolean;
  selectedItemIds?: Set<string>;
  onItemSelectMulti?: (itemId: string) => void;
  onMultiDelete?: () => void;
  onMultiSelectToggle?: () => void;
  onItemTypeChange?: (type: 'programs' | 'projects' | 'tasks' | 'subtasks') => void;
  // Hierarchical display props
  allPrograms?: Program[];
  allProjects?: Project[];
  allTasks?: Task[];
  allSubtasks?: Subtask[];
  expandedItems?: Set<string>;
  onToggleExpand?: (itemId: string) => void;
  // Scroll control
  scrollToTopTrigger?: number;
}

// Format time from ISO string to readable format (24-hour)
const formatTimeDisplay = (timeStr?: string): string => {
  if (!timeStr) return '-';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch {
    return timeStr;
  }
};

// Format date to readable format
const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  } catch {
    return dateStr;
  }
};

// Get time range display for an item
const getTimeRange = (item: Program | Project | Task | Subtask, itemType: 'programs' | 'projects' | 'tasks' | 'subtasks'): string => {
  if ('timeframe' in item && item.timeframe) {
    const start = item.timeframe.start;
    const end = ('deadline' in item.timeframe && item.timeframe.deadline) 
      ? item.timeframe.deadline 
      : item.timeframe.targetEnd || item.timeframe.actualEnd;
    
    if (start) {
      // For Programs and Projects, show month/date instead of hour/minute
      if (itemType === 'programs' || itemType === 'projects') {
        const startDate = formatDateDisplay(start);
        const endDate = end ? formatDateDisplay(end) : null;
        if (startDate !== '-' && endDate && endDate !== '-') {
          return `${startDate} - ${endDate}`;
        } else if (startDate !== '-') {
          return startDate;
        }
      } else {
        // For Tasks and Subtasks, show hour/minute
        const startTime = formatTimeDisplay(start);
        const endTime = end ? formatTimeDisplay(end) : null;
        if (startTime !== '-' && endTime && endTime !== '-') {
          return `${startTime} - ${endTime}`;
        } else if (startTime !== '-') {
          return startTime;
        }
      }
    }
  }
  return '-';
};

const DatabasePanel: React.FC<DatabasePanelProps> = ({
  items,
  itemType,
  onSelect,
  onAdd,
  onUpdate,
  selectedItemId,
  multiSelectMode = false,
  selectedItemIds = new Set(),
  onItemSelectMulti,
  onMultiDelete,
  onMultiSelectToggle,
  onItemTypeChange,
  allPrograms = [],
  allProjects = [],
  allTasks = [],
  allSubtasks = [],
  expandedItems = new Set(),
  onToggleExpand,
  scrollToTopTrigger,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sortField, setSortField] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(['priority', 'time', 'status']);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 780);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter columns for mobile - only show 'time'
  const displayColumns = isMobile ? (['time'] as ColumnKey[]) : columnOrder;

  // Load preferences on mount and subscribe to real-time updates
  useEffect(() => {
    let unsubscribePrefs: (() => void) | null = null;

    const setupSubscription = async (currentUser: User | null) => {
      // Clean up existing subscription
      if (unsubscribePrefs) {
        unsubscribePrefs();
        unsubscribePrefs = null;
      }

      if (currentUser) {
        // Initial load
        try {
          const prefs = await getUserPreferences();
          setColumnOrder(prefs.columnOrder);
        } catch (err) {
          console.error('Error loading preferences:', err);
        }

        // Subscribe to real-time updates
        unsubscribePrefs = subscribeToUserPreferences((prefs) => {
          setColumnOrder(prefs.columnOrder);
        }) || null;
      } else {
        // No user, use default
        setColumnOrder(['priority', 'time', 'status']);
      }
    };

    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      await setupSubscription(currentUser);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeAuth();
      if (unsubscribePrefs) {
        unsubscribePrefs();
      }
    };
  }, []);

  const handleCellClick = (itemId: string, column: string, currentValue: string) => {
    setEditingCell({ rowId: itemId, column });
    setEditValue(String(currentValue || ''));
  };

  const handleCellBlur = async () => {
    if (editingCell && editValue !== undefined && !isSaving) {
      setIsSaving(true);
      try {
        // Map column names to actual field names
        const fieldMap: Record<string, string> = {
          'title': 'title',
        };
        
        const field = fieldMap[editingCell.column] || editingCell.column;
        await onUpdate(editingCell.rowId, field, editValue);
      } catch (err) {
        console.error('Error saving cell:', err);
      } finally {
        setIsSaving(false);
        setEditingCell(null);
        setEditValue('');
      }
    } else {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent, itemId: string, column: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  // Sort items based on sortField and sortDirection
  const sortedItems = React.useMemo(() => {
    if (!sortField) return items;

    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = a.priority ? priorityOrder[a.priority] || 0 : 0;
          bValue = b.priority ? priorityOrder[b.priority] || 0 : 0;
          break;
        case 'time':
          aValue = ('timeframe' in a && a.timeframe?.start) ? new Date(a.timeframe.start).getTime() : 0;
          bValue = ('timeframe' in b && b.timeframe?.start) ? new Date(b.timeframe.start).getTime() : 0;
          break;
        case 'status':
          aValue = ('status' in a) ? a.status || '' : '';
          bValue = ('status' in b) ? b.status || '' : '';
          break;
        case 'parent':
          // Get parent title for comparison
          const getParentTitle = (item: Program | Project | Task | Subtask): string => {
            if (!('parentId' in item) || !item.parentId) return '';
            
            // Find parent based on item type
            if (itemType === 'projects') {
              const parent = allPrograms.find(p => p.id === item.parentId);
              return parent?.title || '';
            } else if (itemType === 'tasks') {
              const parent = allProjects.find(p => p.id === item.parentId) || 
                             allPrograms.find(p => p.id === item.parentId);
              return parent?.title || '';
            } else if (itemType === 'subtasks') {
              const parent = allTasks.find(t => t.id === item.parentId);
              return parent?.title || '';
            }
            return '';
          };
          aValue = getParentTitle(a);
          bValue = getParentTitle(b);
          break;
        case 'tag':
          // Get first tag or empty string
          aValue = (a.tags && a.tags.length > 0) ? a.tags[0] : '';
          bValue = (b.tags && b.tags.length > 0) ? b.tags[0] : '';
          break;
        case 'recurrence':
          // Get recurrence type
          aValue = ('recurrence' in a && a.recurrence) ? a.recurrence.type || 'none' : 'none';
          bValue = ('recurrence' in b && b.recurrence) ? b.recurrence.type || 'none' : 'none';
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle number comparison
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [items, sortField, sortDirection, itemType, allPrograms, allProjects, allTasks]);

  // Use flat, sorted items for display – children are managed via the Drawer, not here
  const displayItems = sortedItems;

  const selectedCount = selectedItemIds.size;

  // Calculate permanent indices for all items (memoized for performance)
  const permanentIndexMap = React.useMemo(() => {
    // Sort all items by createdAt to get creation order
    const sortedByCreation = [...items].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime; // oldest first
    });
    
    // Create a map of item.id -> index for O(1) lookups
    const indexMap = new Map<string, number>();
    sortedByCreation.forEach((item, index) => {
      indexMap.set(item.id, index + 1); // 1-based index
    });
    
    return indexMap;
  }, [items]); // Only recalculate when items array changes

  // Fast lookup function - O(1) instead of O(n)
  const getPermanentIndex = (item: Program | Project | Task | Subtask): number => {
    return permanentIndexMap.get(item.id) || 0;
  };

  // Scroll to top when scrollToTopTrigger changes
  useEffect(() => {
    if (scrollToTopTrigger !== undefined && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [scrollToTopTrigger]);
  
  // Check if all items are selected
  const allSelected = multiSelectMode && items.length > 0 && selectedItemIds.size === items.length;
  const someSelected = multiSelectMode && selectedItemIds.size > 0 && selectedItemIds.size < items.length;
  
  // Handle select all/deselect all
  const handleSelectAll = () => {
    if (!multiSelectMode || !onItemSelectMulti) return;
    
    // Since onItemSelectMulti toggles, we need to call it for items that need to change state
    if (allSelected) {
      // Deselect all - toggle all currently selected items
      items.forEach(item => {
        if (selectedItemIds.has(item.id)) {
          onItemSelectMulti(item.id);
        }
      });
    } else {
      // Select all - toggle all unselected items
      items.forEach(item => {
        if (!selectedItemIds.has(item.id)) {
          onItemSelectMulti(item.id);
        }
      });
    }
  };

  return (
    <Panel>
      <Header>
        <ItemTypeSelector>
          {(['programs', 'projects', 'tasks', 'subtasks'] as const).map((type) => (
            <TypeButton
              key={type}
              $active={itemType === type}
              onClick={() => onItemTypeChange?.(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1, -1)}
            </TypeButton>
          ))}
        </ItemTypeSelector>
        <HeaderRight>
          {multiSelectMode && selectedCount > 0 && (
            <DeleteButton onClick={onMultiDelete}>
              Delete ({selectedCount})
            </DeleteButton>
          )}
          {!multiSelectMode ? (
            <SelectButton onClick={onMultiSelectToggle}>
              Select
            </SelectButton>
          ) : (
            <SelectButton onClick={onMultiSelectToggle} $active>
              Cancel
            </SelectButton>
          )}
          <AddButton onClick={onAdd}>＋</AddButton>
        </HeaderRight>
      </Header>

      <TableContainer ref={tableContainerRef}>
        <Table>
          <colgroup>
            <col style={{ width: isMobile ? '20px' : '24px' }} />
            <col style={{ width: isMobile ? '28px' : '24px' }} />
            <col style={{ width: isMobile ? 'auto' : '200px' }} />
            <col style={{ width: 'auto' }} />
            {displayColumns.map((columnKey) => {
              const columnConfig = {
                priority: { width: '80px' },
                time: { width: isMobile ? '90px' : '120px' },
                status: { width: '90px' },
                parent: { width: '120px' },
                tag: { width: '100px' },
                recurrence: { width: '100px' },
              }[columnKey];
              return <col key={columnKey} style={{ width: columnConfig?.width || 'auto' }} />;
            })}</colgroup>
          <TableHeader>
            <HeaderRow><HeaderCell style={{ width: isMobile ? '20px' : '24px', padding: '0' }}>
                {multiSelectMode ? (
                  <RowCheckbox 
                    $checked={allSelected}
                    $indeterminate={someSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll();
                    }}
                  >
                    {allSelected ? '✓' : someSelected ? '−' : ''}
                  </RowCheckbox>
                ) : ''}
              </HeaderCell>
              <HeaderCell 
                $alignRight
                $sortable
                $sorted={sortField === 'createdAt'}
                $sortDirection={sortField === 'createdAt' ? sortDirection : null}
                onClick={() => handleSort('createdAt')}
                style={{ width: isMobile ? '28px' : '24px', paddingRight: isMobile ? '2px' : '4px', paddingLeft: '0' }}
              >
                #
              </HeaderCell>
              <HeaderCell 
                $alignLeft 
                $sortable
                $sorted={sortField === 'title'}
                $sortDirection={sortField === 'title' ? sortDirection : null}
                onClick={() => handleSort('title')}
                style={{ paddingLeft: isMobile ? '2px' : '4px' }}
              >
                Name
              </HeaderCell>
              <SpacerHeaderCell /> {/* Empty spacer to push right columns to the right */}
              {/* Render customizable columns */}
              {displayColumns.map((columnKey) => {
                const columnConfig = {
                  priority: { label: 'Priority', sortField: 'priority', align: 'right' as 'center' | 'left' | 'right', minWidth: '80px' },
                  time: { label: 'Time', sortField: 'time', align: 'left' as 'center' | 'left' | 'right' },
                  status: { label: 'Status', sortField: 'status', align: 'left' as 'center' | 'left' | 'right', minWidth: '90px' },
                  parent: { label: 'Parent', sortField: 'parent', align: 'left' as 'center' | 'left' | 'right', minWidth: '120px' },
                  tag: { label: 'Tag', sortField: 'tag', align: 'left' as 'center' | 'left' | 'right', minWidth: '100px' },
                  recurrence: { label: 'Recurrence', sortField: 'recurrence', align: 'center' as 'center' | 'left' | 'right', minWidth: '100px' },
                }[columnKey];
                
                if (!columnConfig) return null;
                
                const isSorted = sortField === columnConfig.sortField;
                const sortDir = isSorted ? sortDirection : null;
                
                return (
                  <HeaderCell
                    key={columnKey}
                    $alignLeft={columnConfig.align === 'left'}
                    $alignRight={columnConfig.align === 'right'}
                    $centerText={columnConfig.align === 'center'}
                    $sortable
                    $sorted={isSorted}
                    $sortDirection={sortDir}
                    onClick={() => handleSort(columnConfig.sortField)}
                    style={{ minWidth: columnConfig.minWidth, whiteSpace: 'nowrap' }}
                  >
                    {columnConfig.label}
                  </HeaderCell>
                );
              })}</HeaderRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item, index) => {
                const level = 0;
                const isSelected = selectedItemId === item.id;
                const isMultiSelected = multiSelectMode && selectedItemIds.has(item.id);
                const timeRange = getTimeRange(item, itemType);
                
                return (
                  <DataRow
                    key={item.id}
                    onClick={() => {
                      if (multiSelectMode && onItemSelectMulti) {
                        onItemSelectMulti(item.id);
                      } else {
                        onSelect(item);
                      }
                    }}
                    $isSelected={isSelected || isMultiSelected}
                  ><DataCell 
                      $alignLeft 
                      style={{ width: isMobile ? '20px' : '24px', padding: isMobile ? '0.2rem 0' : '0.3rem 0', cursor: multiSelectMode ? 'pointer' : 'default' }}
                    >
                      {multiSelectMode ? (
                        <RowCheckbox 
                          $checked={isMultiSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onItemSelectMulti) {
                              onItemSelectMulti(item.id);
                            }
                          }}
                        >
                          {isMultiSelected && '✓'}
                        </RowCheckbox>
                      ) : null}
                    </DataCell>
                    <DataCell $alignLeft style={{ width: isMobile ? '28px' : '24px', paddingRight: isMobile ? '2px' : '4px', paddingLeft: '0' }}>
                      <IndexCellContent $level={level}>
                        <ExpandSpacer />
                        {String(getPermanentIndex(item)).padStart(2, '0')}
                      </IndexCellContent>
                    </DataCell>
                    <DataCell $alignLeft style={{ paddingLeft: isMobile ? '2px' : '4px' }}>
                      {editingCell?.rowId === item.id && editingCell?.column === 'title' ? (
                        <EditInputWrapper
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          <EditInput
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={(e) => handleKeyPress(e, item.id, 'title')}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.select();
                            }}
                            autoFocus
                          />
                        </EditInputWrapper>
                      ) : (
                        <CellText
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(item.id, 'title', item.title);
                          }}
                        >
                          {item.title || '-'}
                        </CellText>
                      )}
                    </DataCell>
                    <SpacerCell /> {/* Empty spacer to push right columns to the right */}
                    {/* Render customizable columns */}
                    {displayColumns.map((columnKey) => {
                      switch (columnKey) {
                        case 'priority':
                          return (
                            <DataCell key={columnKey} $alignRight style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>
                              {item.priority || '-'}
                            </DataCell>
                          );
                        case 'time':
                          return (
                            <DataCell key={columnKey} $alignLeft style={{ paddingRight: isMobile ? '4px' : '10px' }}>
                              {timeRange}
                            </DataCell>
                          );
                        case 'status':
                          return (
                            <DataCell key={columnKey} $alignLeft style={{ minWidth: '90px', whiteSpace: 'nowrap' }}>
                              {'status' in item ? (item.status || '-') : '-'}
                            </DataCell>
                          );
                        case 'parent':
                          const getParentDisplay = (item: Program | Project | Task | Subtask): string => {
                            if (!('parentId' in item) || !item.parentId) return '-';
                            
                            if (itemType === 'projects') {
                              const parent = allPrograms.find(p => p.id === item.parentId);
                              return parent?.title || '-';
                            } else if (itemType === 'tasks') {
                              const parent = allProjects.find(p => p.id === item.parentId) || 
                                             allPrograms.find(p => p.id === item.parentId);
                              return parent?.title || '-';
                            } else if (itemType === 'subtasks') {
                              const parent = allTasks.find(t => t.id === item.parentId);
                              return parent?.title || '-';
                            }
                            return '-';
                          };
                          return (
                            <DataCell key={columnKey} $alignLeft style={{ minWidth: '120px' }}>
                              {getParentDisplay(item)}
                            </DataCell>
                          );
                        case 'tag':
                          return (
                            <DataCell key={columnKey} $alignLeft style={{ minWidth: '100px' }}>
                              {(item.tags && item.tags.length > 0) ? item.tags[0] : '-'}
                            </DataCell>
                          );
                        case 'recurrence':
                          const recurrenceType = ('recurrence' in item && item.recurrence) 
                            ? item.recurrence.type 
                            : 'none';
                          return (
                            <DataCell key={columnKey} $alignRight $centerText style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
                              {recurrenceType !== 'none' ? recurrenceType : '-'}
                            </DataCell>
                          );
                        default:
                          return null;
                      }
                    })}</DataRow>
                );
              })}
            {/* Empty row for quick add */}
            <EmptyRow><EmptyCell colSpan={4 + displayColumns.length}>
                <EmptyText onClick={onAdd}>
                  Click here or ＋ to add new {itemType === 'programs' ? 'program' : itemType === 'projects' ? 'project' : itemType === 'tasks' ? 'task' : 'subtask'}
                </EmptyText>
              </EmptyCell></EmptyRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Panel>
  );
};

export default DatabasePanel;

// Mobile breakpoint
const mobileBreakpoint = '780px';

const Panel = styled.aside`
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: var(--bg-primary, #000000);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0.75rem;
  padding-right: 1rem;
  padding-bottom: 0.5rem;
  box-sizing: border-box;
  max-width: 516px; /* Limit width on mobile */

  @media (min-width: ${mobileBreakpoint}) {
    width: 50%;
    height: 100%;
    padding: 1.25rem;
    justify-content: center;
    order: 1;
    overflow-y: auto;
    overflow-x: hidden;
    max-width: none; /* Remove max-width on desktop */
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 0;
  width: 100%;
  max-width: 100%;
  position: sticky;
  top: 0;
  background: var(--bg-primary, #000000);
  z-index: 6; /* above TableHeader */
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  /* Offset Panel padding to align with top edge */
  margin-top: -0.5rem;
  margin-left: -0.75rem;
  margin-right: -1rem;
  padding-left: 0.75rem;
  padding-right: 1rem;

  @media (min-width: ${mobileBreakpoint}) {
    margin-bottom: 2rem;
    max-width: 600px;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: -1.25rem;
    margin-left: -1.25rem;
    margin-right: -1.25rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
`;

const ItemTypeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;
  align-items: center;
`;

const TypeButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$active ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  padding: 0.25rem 0.5rem;
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
  text-decoration: none;
  position: relative;

  @media (min-width: ${mobileBreakpoint}) {
    padding: 0.25rem 0.75rem;
    font-size: 12px;
  }

  ${props => props.$active ? `
    &::before {
      content: '(';
      position: absolute;
      left: 0;
    }
    &::after {
      content: ')';
      position: absolute;
      right: 0;
    }
  ` : ''}

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;

  @media (min-width: ${mobileBreakpoint}) {
    gap: 1rem;
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
  text-decoration: none;

  @media (min-width: ${mobileBreakpoint}) {
    font-size: 12px;
    padding: 0.25rem 0.75rem;
  }

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
`;

const SelectButton = styled.button<{ $active?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$active ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
  text-decoration: none;

  @media (min-width: ${mobileBreakpoint}) {
    font-size: 12px;
    padding: 0.25rem 0.75rem;
  }

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
`;

const AddButton = styled.button`
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 300;
  color: var(--text-primary, #DEDEE5);
  cursor: pointer;
  padding: 0;
  line-height: 1.2;
  transition: color 0.2s;
  font-family: Helvetica, Arial, sans-serif;

  &:hover {
    color: var(--text-primary, #ffffff);
  }
`;

const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  flex: 0 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: fit-content;

  @media (min-width: ${mobileBreakpoint}) {
    max-width: 600px;
    overflow-y: visible;
  }
`;

const Table = styled.table`
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  box-sizing: border-box;
  display: table; /* Ensure proper table display */
`;

const TableHeader = styled.thead`
  position: sticky;
  top: 0; /* Stick at top of TableContainer when scrolling */
  background: var(--bg-primary, #000000);
  z-index: 5; /* below Header (z-index: 6) and global overlays */
`;

const HeaderRow = styled.tr``;

const SpacerCell = styled.td`
  width: auto;
  padding: 0;
`;

const SpacerHeaderCell = styled.th`
  width: auto;
  padding: 0;
`;

const HeaderCell = styled.th<{ $alignLeft?: boolean; $alignRight?: boolean; $centerText?: boolean; $sortable?: boolean; $sorted?: boolean; $sortDirection?: 'asc' | 'desc' | null }>`
  padding: 0.2rem 0;
  text-align: ${props => props.$centerText ? 'center' : props.$alignRight ? 'right' : props.$alignLeft ? 'left' : 'left'};
  font-size: 11px;
  font-weight: 400;
  color: ${props => props.$sorted ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: all 0.2s;

  @media (min-width: ${mobileBreakpoint}) {
    padding: 0.3rem 0;
    font-size: 12px;
  }

  ${props => props.$alignLeft ? `
    padding-right: 10px;
    padding-left: 0;
  ` : props.$alignRight ? `
    padding-left: 10px;
    padding-right: 0;
    width: 1%;
  ` : ''}

  &:first-child {
    padding-left: 0;
    padding-right: 20px;
    width: 48px;
  }

  &:last-child {
    padding-right: 1rem; /* Match Header padding on mobile */
    padding-left: 20px;
    min-width: calc(1% + 10px);

    @media (min-width: ${mobileBreakpoint}) {
      padding-right: 1.25rem; /* Match Header padding on desktop */
    }
  }

  ${props => props.$sortable ? `
    &:hover {
      color: #ffffff !important;
      text-decoration: underline !important;
      text-decoration-thickness: 0.5px !important;
      text-underline-offset: 2px !important;
    }
  ` : ''}
`;

const TableBody = styled.tbody``;

const DataRow = styled.tr<{ $isSelected?: boolean }>`
  cursor: pointer;
  background: ${props => props.$isSelected ? 'var(--bg-selected, rgba(255, 255, 255, 0.05))' : 'transparent'};
  transition: all 0.2s;
  display: table-row;

  &:hover {
    background: var(--bg-hover, #1a1a1a);
    
    td {
      color: var(--text-primary, #ffffff);
    }
  }
`;

const DataCell = styled.td<{ $alignLeft?: boolean; $alignRight?: boolean; $centerText?: boolean }>`
  padding: 0.2rem 0;
  font-size: 11px;
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
  text-align: ${props => props.$centerText ? 'center' : props.$alignRight ? 'right' : props.$alignLeft ? 'left' : 'left'};
  vertical-align: top;
  white-space: nowrap;

  @media (min-width: ${mobileBreakpoint}) {
    padding: 0.3rem 0;
    font-size: 12px;
  }

  ${props => props.$alignLeft ? `
    padding-right: 20px;
    padding-left: 0;
  ` : props.$alignRight ? `
    padding-left: 10px;
    padding-right: 0;
    width: 1%;
  ` : ''}

  &:first-child {
    padding-left: 0;
    padding-right: 4px;
    width: 15px;
  }

  &:last-child {
    padding-right: 1rem; /* Match Header padding on mobile */
    padding-left: 20px;
    min-width: calc(1% + 10px);

    @media (min-width: ${mobileBreakpoint}) {
      padding-right: 1.25rem; /* Match Header padding on desktop */
    }
  }
`;

const CellText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EditInputWrapper = styled.div`
  width: 60%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const EditInput = styled.input`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  background: var(--bg-tertiary, #1a1a1a);
  border: none;
  color: var(--text-primary, #ffffff);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  outline: none;
  line-height: 1.2;
  box-sizing: border-box;
  transition: none;
  cursor: text;

  &:focus {
    background: var(--bg-tertiary, #1a1a1a);
    color: var(--text-primary, #ffffff);
  }
`;

const EmptyRow = styled.tr`
  pointer-events: none;
`;

const EmptyCell = styled.td`
  padding: 1rem;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary, #8A8A95);
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
  pointer-events: none;
`;

const EmptyText = styled.span`
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
  pointer-events: auto;

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
`;

const RowCheckbox = styled.div<{ $checked: boolean; $indeterminate?: boolean }>`
  width: 14px;
  height: 14px;
  border: 1px solid ${props => (props.$checked || props.$indeterminate) ? '#8A8A95' : '#5a5a5d'};
  background: ${props => (props.$checked || props.$indeterminate) ? '#8A8A95' : 'transparent'};
  color: #161619;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  transition: all 0.2s;
  line-height: 1;
  margin: 0 auto;
  cursor: pointer;
`;

const IndexCellContent = styled.div<{ $level: number }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  width: 100%;
  height: 15px;
`;

const ExpandButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: 8px;
  cursor: pointer;
  padding: 0;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  
  &:hover {
    color: var(--text-primary, #DEDEE5);
  }
`;

const ExpandSpacer = styled.div`
  width: 0;
`;

