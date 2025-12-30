'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { Program, Project, Task, Subtask } from '@/lib/types/types';
import { getUserPreferences, subscribeToUserPreferences, ColumnKey } from '@/lib/firestore/preferences';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';

// Constants
const MOBILE_BREAKPOINT = 780;
const MOBILE_BREAKPOINT_PX = '780px';
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ['priority', 'time', 'status'];
const EMPTY_VALUE = '-';
const PRIORITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 } as const;
const ITEM_TYPES = ['programs', 'projects', 'tasks', 'subtasks'] as const;

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

/**
 * Formats time from ISO string to readable 24-hour format (HH:MM)
 */
const formatTimeDisplay = (timeStr?: string): string => {
  if (!timeStr) return EMPTY_VALUE;
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return timeStr;
  }
};

/**
 * Formats date to readable format (M/D)
 */
const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return EMPTY_VALUE;
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

/**
 * Gets time range display for an item based on its type
 * Programs/Projects show dates, Tasks/Subtasks show times
 */
const getTimeRange = (
  item: Program | Project | Task | Subtask,
  itemType: 'programs' | 'projects' | 'tasks' | 'subtasks'
): string => {
  if (!('timeframe' in item) || !item.timeframe?.start) {
    return EMPTY_VALUE;
  }

  const { start } = item.timeframe;
  const end = ('deadline' in item.timeframe && item.timeframe.deadline)
    ? item.timeframe.deadline
    : item.timeframe.targetEnd || item.timeframe.actualEnd;

  const isDateRange = itemType === 'programs' || itemType === 'projects';

  if (isDateRange) {
    const startDate = formatDateDisplay(start);
    const endDate = end ? formatDateDisplay(end) : null;
    
    if (startDate !== EMPTY_VALUE && endDate && endDate !== EMPTY_VALUE) {
      return `${startDate} - ${endDate}`;
    }
    if (startDate !== EMPTY_VALUE) {
      return startDate;
    }
  } else {
    const startTime = formatTimeDisplay(start);
    const endTime = end ? formatTimeDisplay(end) : null;
    
    if (startTime !== EMPTY_VALUE && endTime && endTime !== EMPTY_VALUE) {
      return `${startTime} - ${endTime}`;
    }
    if (startTime !== EMPTY_VALUE) {
      return startTime;
    }
  }

  return EMPTY_VALUE;
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
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter columns for mobile - only show 'time'
  const displayColumns = useMemo(
    () => (isMobile ? (['time'] as ColumnKey[]) : columnOrder),
    [isMobile, columnOrder]
  );

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
        setColumnOrder(DEFAULT_COLUMN_ORDER);
      }
    };

    // Listen for auth state changes
    let unsubscribeAuth: (() => void) | null = null;
    if (isFirebaseInitialized() && auth) {
      unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      await setupSubscription(currentUser);
    });
    }

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubscribeAuth) {
      unsubscribeAuth();
      }
      if (unsubscribePrefs) {
        unsubscribePrefs();
      }
    };
  }, []);

  const handleCellClick = (itemId: string, column: string, currentValue: string | undefined) => {
    setEditingCell({ rowId: itemId, column });
    setEditValue(String(currentValue || ''));
  };

  const handleCellBlur = async () => {
    if (!editingCell || editValue === undefined || isSaving) {
      setEditingCell(null);
      setEditValue('');
      return;
    }

    setIsSaving(true);
    try {
      const fieldMap: Record<string, string> = {
        title: 'title',
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
          aValue = a.priority ? PRIORITY_ORDER[a.priority] || 0 : 0;
          bValue = b.priority ? PRIORITY_ORDER[b.priority] || 0 : 0;
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

  /**
   * Calculate permanent indices for all items based on creation order
   * Memoized for performance - O(1) lookup instead of O(n)
   */
  const permanentIndexMap = useMemo(() => {
    const sortedByCreation = [...items].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime; // oldest first
    });
    
    const indexMap = new Map<string, number>();
    sortedByCreation.forEach((item, index) => {
      indexMap.set(item.id, index + 1); // 1-based index
    });
    
    return indexMap;
  }, [items]);

  const getPermanentIndex = (item: Program | Project | Task | Subtask): number => {
    return permanentIndexMap.get(item.id) || 0;
  };

  // Scroll to top when scrollToTopTrigger changes
  useEffect(() => {
    if (scrollToTopTrigger !== undefined && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [scrollToTopTrigger]);
  
  // Selection state
  const allSelected = multiSelectMode && items.length > 0 && selectedItemIds.size === items.length;
  const someSelected = multiSelectMode && selectedItemIds.size > 0 && selectedItemIds.size < items.length;
  
  /**
   * Handle select all/deselect all
   * Since onItemSelectMulti toggles, we call it for items that need state changes
   */
  const handleSelectAll = () => {
    if (!multiSelectMode || !onItemSelectMulti) return;
    
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

  const getItemTypeLabel = (type: typeof ITEM_TYPES[number]): string => {
    return type.charAt(0).toUpperCase() + type.slice(1, -1);
  };

  return (
    <Panel role="complementary" aria-label={`${itemType} database panel`}>
      <DatabaseHeader>
        <ItemTypeSelector role="tablist" aria-label="Item type selector">
          {ITEM_TYPES.map((type) => (
            <TypeButton
              key={type}
              type="button"
              role="tab"
              aria-selected={itemType === type}
              aria-controls={`${type}-table`}
              $active={itemType === type}
              onClick={() => onItemTypeChange?.(type)}
            >
              {getItemTypeLabel(type)}
            </TypeButton>
          ))}
        </ItemTypeSelector>
        <DatabaseHeaderRight>
          {multiSelectMode && selectedCount > 0 && (
            <DeleteButton
              type="button"
              aria-label={`Delete ${selectedCount} selected items`}
              onClick={onMultiDelete}
            >
              Delete ({selectedCount})
            </DeleteButton>
          )}
          {!multiSelectMode ? (
            <SelectButton
              type="button"
              aria-label="Enable multi-select mode"
              onClick={onMultiSelectToggle}
            >
              Select
            </SelectButton>
          ) : (
            <SelectButton
              type="button"
              aria-label="Disable multi-select mode"
              $active
              onClick={onMultiSelectToggle}
            >
              Cancel
            </SelectButton>
          )}
          <AddButton
            type="button"
            aria-label={`Add new ${itemType.slice(0, -1)}`}
            onClick={onAdd}
          >
            ＋
          </AddButton>
        </DatabaseHeaderRight>
      </DatabaseHeader>

      <TableContainer ref={tableContainerRef}>
        <Table id={`${itemType}-table`} role="table" aria-label={`${itemType} data table`}>
          <colgroup>
            <col style={{ width: isMobile ? '20px' : '24px' }} />
            <col style={{ width: isMobile ? '28px' : '24px' }} />
            <col style={{ width: isMobile ? 'auto' : '200px' }} />
            <col style={{ width: 'auto' }} />
            {displayColumns.map((columnKey) => {
              const columnWidths = {
                priority: '80px',
                time: isMobile ? '90px' : '120px',
                status: '90px',
                parent: '120px',
                tag: '100px',
                recurrence: '100px',
              } as const;
              return (
                <col key={columnKey} style={{ width: columnWidths[columnKey] || 'auto' }} />
              );
            })}
          </colgroup>
          <TableHeader>
            <DatabaseHeaderRow>
              <DatabaseHeaderCell
                $width={isMobile ? '20px' : '24px'}
                $padding="0"
              >
                {multiSelectMode && (
                  <RowCheckbox
                    role="checkbox"
                    aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
                    aria-label={allSelected ? 'Deselect all items' : 'Select all items'}
                    $checked={allSelected}
                    $indeterminate={someSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll();
                    }}
                  >
                    {allSelected ? '✓' : someSelected ? '−' : ''}
                  </RowCheckbox>
                )}
              </DatabaseHeaderCell>
              <DatabaseHeaderCell
                $alignRight
                $sortable
                $sorted={sortField === 'createdAt'}
                $sortDirection={sortField === 'createdAt' ? sortDirection : null}
                $width={isMobile ? '28px' : '24px'}
                $paddingRight="4px"
                $paddingLeft="0"
                onClick={() => handleSort('createdAt')}
                aria-sort={sortField === 'createdAt' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                aria-label="Sort by creation date"
              >
                #
              </DatabaseHeaderCell>
              <DatabaseHeaderCell
                $alignLeft
                $sortable
                $sorted={sortField === 'title'}
                $sortDirection={sortField === 'title' ? sortDirection : null}
                $paddingLeft={isMobile ? '2px' : '4px'}
                onClick={() => handleSort('title')}
                aria-sort={sortField === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                aria-label="Sort by name"
              >
                Name
              </DatabaseHeaderCell>
              <SpacerHeaderCell />
              {displayColumns.map((columnKey) => {
                const columnConfigs = {
                  priority: { label: 'Priority', sortField: 'priority', align: 'right' as const, minWidth: '80px' },
                  time: { label: 'Time', sortField: 'time', align: 'left' as const, minWidth: undefined },
                  status: { label: 'Status', sortField: 'status', align: 'left' as const, minWidth: '90px' },
                  parent: { label: 'Parent', sortField: 'parent', align: 'left' as const, minWidth: '120px' },
                  tag: { label: 'Tag', sortField: 'tag', align: 'left' as const, minWidth: '100px' },
                  recurrence: { label: 'Recurrence', sortField: 'recurrence', align: 'center' as const, minWidth: '100px' },
                } as const;
                
                const config = columnConfigs[columnKey];
                if (!config) return null;
                
                const isSorted = sortField === config.sortField;
                const sortDir = isSorted ? sortDirection : null;
                
                return (
                  <DatabaseHeaderCell
                    key={columnKey}
                    $alignLeft={config.align === 'left'}
                    $alignRight={config.align === 'right'}
                    $centerText={config.align === 'center'}
                    $sortable
                    $sorted={isSorted}
                    $sortDirection={sortDir}
                    $minWidth={config.minWidth}
                    onClick={() => handleSort(config.sortField)}
                    aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    aria-label={`Sort by ${config.label.toLowerCase()}`}
                  >
                    {config.label}
                  </DatabaseHeaderCell>
                );
              })}
            </DatabaseHeaderRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              const isMultiSelected = multiSelectMode && selectedItemIds.has(item.id);
              const timeRange = getTimeRange(item, itemType);
              const isRowSelected = isSelected || isMultiSelected;
              
              return (
                <DataRow
                  key={item.id}
                  role="row"
                  aria-selected={isRowSelected}
                  onClick={() => {
                    if (multiSelectMode && onItemSelectMulti) {
                      onItemSelectMulti(item.id);
                    } else {
                      onSelect(item);
                    }
                  }}
                  $isSelected={isRowSelected}
                >
                  <DataCell
                    $alignLeft
                    $width={isMobile ? '20px' : '24px'}
                    $padding={isMobile ? '0.2rem 0' : '0.3rem 0'}
                    $cursor={multiSelectMode ? 'pointer' : 'default'}
                  >
                    {multiSelectMode && (
                      <RowCheckbox
                        role="checkbox"
                        aria-checked={isMultiSelected}
                        aria-label={`Select ${item.title || 'item'}`}
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
                    )}
                  </DataCell>
                  <DataCell
                    $alignLeft
                    $width={isMobile ? '28px' : '24px'}
                    $paddingRight="4px"
                    $paddingLeft="0"
                  >
                    <IndexCellContent>
                      <ExpandSpacer />
                      {String(getPermanentIndex(item)).padStart(2, '0')}
                    </IndexCellContent>
                  </DataCell>
                  <DataCell $alignLeft $paddingLeft={isMobile ? '2px' : '4px'}>
                    {editingCell?.rowId === item.id && editingCell?.column === 'title' ? (
                      <EditInputWrapper
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <EditInput
                          type="text"
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
                          aria-label="Edit item title"
                        />
                      </EditInputWrapper>
                    ) : (
                      <CellText
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(item.id, 'title', item.title);
                        }}
                      >
                        {item.title || EMPTY_VALUE}
                      </CellText>
                    )}
                  </DataCell>
                  <SpacerCell />
                  {displayColumns.map((columnKey) => {
                    switch (columnKey) {
                      case 'priority':
                        return (
                          <DataCell
                            key={columnKey}
                            $alignRight
                            $minWidth="80px"
                            $whiteSpace="nowrap"
                          >
                            {item.priority || EMPTY_VALUE}
                          </DataCell>
                        );
                      case 'time':
                        return (
                          <DataCell
                            key={columnKey}
                            $alignLeft
                            $paddingRight={isMobile ? '4px' : '10px'}
                          >
                            {timeRange}
                          </DataCell>
                        );
                      case 'status':
                        return (
                          <DataCell
                            key={columnKey}
                            $alignLeft
                            $minWidth="90px"
                            $whiteSpace="nowrap"
                          >
                            {'status' in item ? (item.status || EMPTY_VALUE) : EMPTY_VALUE}
                          </DataCell>
                        );
                      case 'parent': {
                        const getParentDisplay = (item: Program | Project | Task | Subtask): string => {
                          if (!('parentId' in item) || !item.parentId) return EMPTY_VALUE;
                          
                          if (itemType === 'projects') {
                            const parent = allPrograms.find(p => p.id === item.parentId);
                            return parent?.title || EMPTY_VALUE;
                          } else if (itemType === 'tasks') {
                            const parent = allProjects.find(p => p.id === item.parentId) ||
                                           allPrograms.find(p => p.id === item.parentId);
                            return parent?.title || EMPTY_VALUE;
                          } else if (itemType === 'subtasks') {
                            const parent = allTasks.find(t => t.id === item.parentId);
                            return parent?.title || EMPTY_VALUE;
                          }
                          return EMPTY_VALUE;
                        };
                        return (
                          <DataCell key={columnKey} $alignLeft $minWidth="120px">
                            {getParentDisplay(item)}
                          </DataCell>
                        );
                      }
                      case 'tag':
                        return (
                          <DataCell key={columnKey} $alignLeft $minWidth="100px">
                            {(item.tags && item.tags.length > 0) ? item.tags[0] : EMPTY_VALUE}
                          </DataCell>
                        );
                      case 'recurrence': {
                        const recurrenceType = ('recurrence' in item && item.recurrence)
                          ? item.recurrence.type
                          : 'none';
                        return (
                          <DataCell
                            key={columnKey}
                            $alignRight
                            $centerText
                            $minWidth="100px"
                            $whiteSpace="nowrap"
                          >
                            {recurrenceType !== 'none' ? recurrenceType : EMPTY_VALUE}
                          </DataCell>
                        );
                      }
                      default:
                        return null;
                    }
                  })}
                </DataRow>
              );
            })}
            <EmptyRow>
              <EmptyCell colSpan={4 + displayColumns.length}>
                <EmptyText
                  role="button"
                  tabIndex={0}
                  onClick={onAdd}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onAdd();
                    }
                  }}
                  aria-label={`Add new ${itemType.slice(0, -1)}`}
                >
                  Click here or ＋ to add new {itemType === 'programs' ? 'program' : itemType === 'projects' ? 'project' : itemType === 'tasks' ? 'task' : 'subtask'}
                </EmptyText>
              </EmptyCell>
            </EmptyRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Panel>
  );
};

export default DatabasePanel;

// Styled Components

const Panel = styled.aside`
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  background: var(--bg-primary, #000000);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0.75rem;
  padding-right: 1rem;
  padding-bottom: 0.5rem;
  box-sizing: border-box;
  max-width: 516px; /* Limit width on mobile */

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    width: 50%;
    height: 100%;
    padding: 1.25rem;
    justify-content: center;
    align-items: flex-end;
    order: 1;
    overflow-y: auto;
    overflow-x: hidden;
    max-width: none; /* Remove max-width on desktop */
  }
`;

const DatabaseHeader = styled.div`
  display: flex;
  align-items: flex-end;
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

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
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
  align-items: flex-end;
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

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
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

const DatabaseHeaderRight = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.5rem;

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
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

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
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

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
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

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
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

const DatabaseHeaderRow = styled.tr``;

const SpacerCell = styled.td`
  width: auto;
  padding: 0;
`;

const SpacerHeaderCell = styled.th`
  width: auto;
  padding: 0;
`;

interface DatabaseHeaderCellProps {
  $alignLeft?: boolean;
  $alignRight?: boolean;
  $centerText?: boolean;
  $sortable?: boolean;
  $sorted?: boolean;
  $sortDirection?: 'asc' | 'desc' | null;
  $width?: string;
  $padding?: string;
  $paddingLeft?: string;
  $paddingRight?: string;
  $minWidth?: string;
}

const DatabaseHeaderCell = styled.th<DatabaseHeaderCellProps>`
  padding: ${props => props.$padding || '0.2rem 0'};
  padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
  padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
  width: ${props => props.$width || 'auto'};
  min-width: ${props => props.$minWidth || 'auto'};
  text-align: ${props => props.$centerText ? 'center' : props.$alignRight ? 'right' : props.$alignLeft ? 'left' : 'left'};
  font-size: 11px;
  font-weight: 400;
  color: ${props => props.$sorted ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: all 0.2s;

  ${props => props.$alignLeft ? `
    padding-right: ${props.$paddingRight || '10px'};
    padding-left: ${props.$paddingLeft || '0'};
  ` : props.$alignRight ? `
    padding-left: ${props.$paddingLeft || '10px'};
    padding-right: ${props.$paddingRight || '0'};
    width: ${props.$width || '1%'};
  ` : ''}

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding-top: ${props => props.$padding ? props.$padding.split(' ')[0] : '0.3rem'};
    padding-bottom: ${props => props.$padding ? props.$padding.split(' ')[0] : '0.3rem'};
    padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
    padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
    font-size: 12px;
  }

  &:first-child {
    padding-left: 0;
    padding-right: 20px;
    width: 48px;
  }

  &:last-child {
    padding-right: 1rem;
    padding-left: 20px;
    min-width: calc(1% + 10px);

    @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
      padding-right: 1.25rem;
    }
  }

  ${props => props.$sortable ? `
    &:hover {
      color: var(--text-primary, #ffffff) !important;
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

interface DataCellProps {
  $alignLeft?: boolean;
  $alignRight?: boolean;
  $centerText?: boolean;
  $width?: string;
  $padding?: string;
  $paddingLeft?: string;
  $paddingRight?: string;
  $minWidth?: string;
  $whiteSpace?: string;
  $cursor?: string;
}

const DataCell = styled.td<DataCellProps>`
  padding: ${props => props.$padding || '0.2rem 0'};
  padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
  padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
  width: ${props => props.$width || 'auto'};
  min-width: ${props => props.$minWidth || 'auto'};
  white-space: ${props => props.$whiteSpace || 'nowrap'};
  cursor: ${props => props.$cursor || 'default'};
  font-size: 11px;
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  line-height: 1.2;
  text-align: ${props => props.$centerText ? 'center' : props.$alignRight ? 'right' : props.$alignLeft ? 'left' : 'left'};
  vertical-align: top;

  ${props => props.$alignLeft ? `
    padding-right: ${props.$paddingRight || '20px'};
    padding-left: ${props.$paddingLeft || '0'};
  ` : props.$alignRight ? `
    padding-left: ${props.$paddingLeft || '10px'};
    padding-right: ${props.$paddingRight || '0'};
    width: ${props.$width || '1%'};
  ` : ''}

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding-top: ${props => props.$padding ? props.$padding.split(' ')[0] : '0.3rem'};
    padding-bottom: ${props => props.$padding ? props.$padding.split(' ')[0] : '0.3rem'};
    padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
    padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
    font-size: 12px;
  }

  &:first-child {
    padding-left: 0;
    padding-right: 4px;
    width: 15px;
  }

  &:last-child {
    padding-right: 1rem;
    padding-left: 20px;
    min-width: calc(1% + 10px);

    @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
      padding-right: 1.25rem;
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
  align-items: flex-end;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  transition: all 0.2s;
  line-height: 1;
  margin: 0 auto;
  cursor: pointer;
`;

const IndexCellContent = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0;
  width: 100%;
  height: 15px;
`;

const ExpandSpacer = styled.div`
  width: 0;
`;

