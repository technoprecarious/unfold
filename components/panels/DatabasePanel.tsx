'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { Program, Project, Task, Subtask } from '@/lib/types/types';
import { getUserPreferences, subscribeToUserPreferences, ColumnKey } from '@/lib/firestore/preferences';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { logger } from '@/lib/utils/logger';

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
          logger.error('Error loading preferences', err);
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
      logger.error('Error saving cell', err);
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
            <col style={{ width: 'var(--spacing-px-20)' }} />
            <col style={{ width: isMobile ? 'var(--spacing-px-32)' : 'var(--spacing-px-28)' }} />
            <col style={{ width: isMobile ? 'auto' : 'var(--spacing-px-200)' }} />
            <col style={{ width: 'auto' }} />
            {displayColumns.map((columnKey) => {
              const columnWidths = {
                priority: 'var(--spacing-px-80)',
                time: isMobile ? 'var(--spacing-px-90)' : 'var(--spacing-px-120)',
                status: 'var(--spacing-px-90)',
                parent: 'var(--spacing-px-120)',
                tag: 'var(--spacing-px-100)',
                recurrence: 'var(--spacing-px-100)',
              } as const;
              return (
                <col key={columnKey} style={{ width: columnWidths[columnKey] || 'auto' }} />
              );
            })}
          </colgroup>
          <TableHeader>
            <DatabaseHeaderRow>
              <DatabaseHeaderCell
                $alignLeft
                $width={isMobile ? 'var(--spacing-px-20)' : 'var(--spacing-px-24)'}
                $padding={isMobile ? 'var(--spacing-02) 0' : 'var(--spacing-3) 0'}
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
                $width={isMobile ? 'var(--spacing-px-32)' : 'var(--spacing-px-28)'}
                $paddingRight="var(--spacing-px-4)"
                $paddingLeft="var(--spacing-px-4)"
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
                $paddingLeft={isMobile ? 'var(--spacing-px-4)' : 'var(--spacing-px-4)'}
                onClick={() => handleSort('title')}
                aria-sort={sortField === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                aria-label="Sort by name"
              >
                Name
              </DatabaseHeaderCell>
              <SpacerHeaderCell />
              {displayColumns.map((columnKey) => {
                const columnConfigs = {
                  priority: { label: 'Priority', sortField: 'priority', align: 'right' as const, minWidth: 'var(--spacing-px-80)' },
                  time: { label: 'Time', sortField: 'time', align: 'left' as const, minWidth: undefined },
                  status: { label: 'Status', sortField: 'status', align: 'left' as const, minWidth: 'var(--spacing-px-90)' },
                  parent: { label: 'Parent', sortField: 'parent', align: 'left' as const, minWidth: 'var(--spacing-px-120)' },
                  tag: { label: 'Tag', sortField: 'tag', align: 'left' as const, minWidth: 'var(--spacing-px-100)' },
                  recurrence: { label: 'Recurrence', sortField: 'recurrence', align: 'center' as const, minWidth: 'var(--spacing-px-100)' },
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
                    $paddingLeft={columnKey === 'priority' || columnKey === 'time' || columnKey === 'status' ? 'var(--spacing-px-12)' : undefined}
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
                    $width={isMobile ? 'var(--spacing-px-20)' : 'var(--spacing-px-24)'}
                    $padding={isMobile ? 'var(--spacing-02) 0' : 'var(--spacing-3) 0'}
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
                    $width={isMobile ? 'var(--spacing-px-32)' : 'var(--spacing-px-28)'}
                    $paddingRight="var(--spacing-px-4)"
                    $paddingLeft="var(--spacing-px-4)"
                  >
                    <IndexCellContent>
                      <ExpandSpacer />
                      {String(getPermanentIndex(item)).padStart(2, '0')}
                    </IndexCellContent>
                  </DataCell>
                  <DataCell $alignLeft $paddingLeft={isMobile ? 'var(--spacing-px-4)' : 'var(--spacing-px-4)'}>
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
                            $paddingLeft="var(--spacing-px-12)"
                            $minWidth="var(--spacing-px-80)"
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
                            $paddingLeft="var(--spacing-px-12)"
                            $paddingRight={isMobile ? 'var(--spacing-px-4)' : 'var(--spacing-px-10)'}
                          >
                            {timeRange}
                          </DataCell>
                        );
                      case 'status':
                        return (
                          <DataCell
                            key={columnKey}
                            $alignLeft
                            $paddingLeft="var(--spacing-px-12)"
                            $minWidth="var(--spacing-px-90)"
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
                          <DataCell key={columnKey} $alignLeft $minWidth="var(--spacing-px-120)">
                            {getParentDisplay(item)}
                          </DataCell>
                        );
                      }
                      case 'tag':
                        return (
                          <DataCell key={columnKey} $alignLeft $minWidth="var(--spacing-px-100)">
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
                            $minWidth="var(--spacing-px-100)"
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
  padding: var(--spacing-5) var(--spacing-7);
  padding-right: var(--spacing-8);
  padding-bottom: var(--spacing-5);
  box-sizing: border-box;
  max-width: var(--width-panel-mobile); /* Limit width on mobile */

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    width: 50%;
    height: 100%;
    padding: var(--spacing-10);
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
  margin-bottom: var(--spacing-5);
  padding: 0;
  width: 100%;
  max-width: 100%;
  position: sticky;
  top: 0;
  background: var(--bg-primary, #000000);
  z-index: var(--z-header);
  padding-top: var(--spacing-5);
  padding-bottom: var(--spacing-5);
  /* Offset Panel padding to align with top edge */
  margin-top: calc(-1 * var(--spacing-5));
  margin-left: calc(-1 * var(--spacing-7));
  margin-right: calc(-1 * var(--spacing-8));
  padding-left: var(--spacing-7);
  padding-right: var(--spacing-8);

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    margin-bottom: 2rem;
    max-width: var(--width-table-max);
    padding-top: 0;
    padding-bottom: 0;
    margin-top: calc(-1 * var(--spacing-10));
    margin-left: calc(-1 * var(--spacing-10));
    margin-right: calc(-1 * var(--spacing-10));
    padding-left: var(--spacing-10);
    padding-right: var(--spacing-10);
  }
`;

const ItemTypeSelector = styled.div`
  display: flex;
  gap: var(--spacing-5);
  justify-content: flex-start;
  align-items: flex-end;
`;

const TypeButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$active ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  padding: var(--spacing-2) var(--spacing-5);
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-tight);
  text-decoration: none;
  position: relative;

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding: var(--spacing-2) var(--spacing-7);
    font-size: var(--font-size-md);
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
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;

const DatabaseHeaderRight = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: var(--spacing-5);

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    gap: var(--spacing-8);
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
  padding: var(--spacing-2) var(--spacing-5);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-tight);
  text-decoration: none;

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    font-size: var(--font-size-md);
    padding: var(--spacing-2) var(--spacing-7);
  }

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;

const SelectButton = styled.button<{ $active?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$active ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
  padding: var(--spacing-2) var(--spacing-5);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: var(--line-height-tight);
  text-decoration: none;

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    font-size: var(--font-size-md);
    padding: var(--spacing-2) var(--spacing-7);
  }

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;

const AddButton = styled.button`
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-light);
  color: var(--text-primary, #DEDEE5);
  cursor: pointer;
  padding: 0;
  line-height: var(--line-height-tight);
  transition: color var(--transition-fast);
  font-family: var(--font-family-base);

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
    max-width: var(--width-table-max);
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
  z-index: var(--z-content);
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
  padding: ${props => props.$padding || 'var(--spacing-02) 0'};
  padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
  padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
  width: ${props => props.$width || 'auto'};
  min-width: ${props => props.$minWidth || 'auto'};
  text-align: ${props => props.$centerText ? 'center' : props.$alignRight ? 'right' : props.$alignLeft ? 'left' : 'left'};
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  color: ${props => props.$sorted ? 'var(--text-primary, #DEDEE5)' : 'var(--text-secondary, #8A8A95)'};
  font-family: var(--font-family-base);
  line-height: var(--line-height-tight);
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  transition: all var(--transition-fast);

  ${props => props.$alignLeft ? `
    padding-right: ${props.$paddingRight || 'var(--spacing-px-10)'};
    padding-left: ${props.$paddingLeft || '0'};
  ` : props.$alignRight ? `
    padding-left: ${props.$paddingLeft || 'var(--spacing-px-10)'};
    padding-right: ${props.$paddingRight || '0'};
    width: ${props.$width || '1%'};
  ` : ''}

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding-top: ${props => props.$padding ? props.$padding.split(' ')[0] : 'var(--spacing-3)'};
    padding-bottom: ${props => props.$padding ? props.$padding.split(' ')[0] : 'var(--spacing-3)'};
    padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
    padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
    font-size: var(--font-size-md);
  }

  &:first-child {
    padding-left: 0;
    padding-right: var(--spacing-px-4);
    width: var(--spacing-px-20);
    box-sizing: border-box;
    overflow: hidden;
  }

  &:last-child {
    padding-right: var(--spacing-8);
    padding-left: var(--spacing-px-20);
    min-width: calc(1% + var(--spacing-px-10));

    @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
      padding-right: var(--spacing-10);
    }
  }

  ${props => props.$sortable ? `
    &:hover {
      color: var(--text-primary, #ffffff) !important;
      text-decoration: underline !important;
      text-decoration-thickness: var(--underline-thickness) !important;
      text-underline-offset: var(--underline-offset) !important;
    }
  ` : ''}
`;

const TableBody = styled.tbody``;

const DataRow = styled.tr<{ $isSelected?: boolean }>`
  cursor: pointer;
  background: ${props => props.$isSelected ? 'var(--bg-selected, rgba(255, 255, 255, 0.05))' : 'transparent'};
  transition: all var(--transition-fast);
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
  padding: ${props => props.$padding || 'var(--spacing-02) 0'};
  padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
  padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
  width: ${props => props.$width || 'auto'};
  min-width: ${props => props.$minWidth || 'auto'};
  white-space: ${props => props.$whiteSpace || 'nowrap'};
  cursor: ${props => props.$cursor || 'default'};
  font-size: var(--font-size-base);
  color: var(--text-primary, #DEDEE5);
  font-family: var(--font-family-base);
  line-height: var(--line-height-tight);
  text-align: ${props => props.$centerText ? 'center' : props.$alignRight ? 'right' : props.$alignLeft ? 'left' : 'left'};
  vertical-align: top;

  ${props => props.$alignLeft ? `
    padding-right: ${props.$paddingRight || 'var(--spacing-px-20)'};
    padding-left: ${props.$paddingLeft || '0'};
  ` : props.$alignRight ? `
    padding-left: ${props.$paddingLeft || 'var(--spacing-px-10)'};
    padding-right: ${props.$paddingRight || '0'};
    width: ${props.$width || '1%'};
  ` : ''}

  @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
    padding-top: ${props => props.$padding ? props.$padding.split(' ')[0] : 'var(--spacing-3)'};
    padding-bottom: ${props => props.$padding ? props.$padding.split(' ')[0] : 'var(--spacing-3)'};
    padding-left: ${props => props.$paddingLeft || (props.$alignLeft ? '0' : 'auto')};
    padding-right: ${props => props.$paddingRight || (props.$alignRight ? '0' : 'auto')};
    font-size: var(--font-size-md);
  }

  &:first-child {
    padding-left: 0;
    padding-right: var(--spacing-px-4);
    width: var(--spacing-px-20);
    box-sizing: border-box;
    overflow: hidden;
  }

  &:last-child {
    padding-right: var(--spacing-8);
    padding-left: var(--spacing-px-20);
    min-width: calc(1% + var(--spacing-px-10));

    @media (min-width: ${MOBILE_BREAKPOINT_PX}) {
      padding-right: var(--spacing-10);
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
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  outline: none;
  line-height: var(--line-height-tight);
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
  padding: var(--spacing-8);
  text-align: center;
  font-size: var(--font-size-md);
  color: var(--text-secondary, #8A8A95);
  font-family: var(--font-family-base);
  line-height: var(--line-height-tight);
  pointer-events: none;
`;

const EmptyText = styled.span`
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-block;
  pointer-events: auto;

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;

const RowCheckbox = styled.div<{ $checked: boolean; $indeterminate?: boolean }>`
  width: var(--spacing-px-14);
  height: var(--spacing-px-14);
  border: var(--border-width) solid ${props => (props.$checked || props.$indeterminate) ? 'var(--checkbox-border-checked)' : 'var(--checkbox-border-unchecked)'};
  background: ${props => (props.$checked || props.$indeterminate) ? 'var(--checkbox-bg-checked)' : 'var(--checkbox-bg-unchecked)'};
  color: var(--checkbox-text);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  transition: all var(--transition-fast);
  line-height: var(--line-height-none);
  margin: 0 auto;
  cursor: pointer;
`;

const IndexCellContent = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0;
  width: 100%;
  height: var(--spacing-px-15);
`;

const ExpandSpacer = styled.div`
  width: 0;
`;

