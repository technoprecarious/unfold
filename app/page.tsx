'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import CircularTimetable from '@/components/timetables/CircularTimetable';
import MonthlyTimetable from '@/components/timetables/MonthlyTimetable';
import WeeklyTimetable from '@/components/timetables/WeeklyTimetable';
import DatabasePanel from '@/components/panels/DatabasePanel';
import TerminalInterface from '@/components/terminal/TerminalInterface';
import Drawer from '@/components/drawers/Drawer';
import Clock from '@/components/ui/Clock';
import DatePicker from '@/components/pickers/DatePicker';
import { useDialog } from '@/components/dialogs/useDialog';
import { getPrograms, createProgram, deleteProgram, updateProgram } from '@/lib/firestore/programs';
import { getProjects, getProject, createProject, deleteProject, updateProject } from '@/lib/firestore/projects';
import { getTasks, getTask, createTask, deleteTask, updateTask } from '@/lib/firestore/tasks';
import { getSubtasks, getSubtask, createSubtask, deleteSubtask, updateSubtask } from '@/lib/firestore/subtasks';
import { itemsToTimetable } from '@/lib/utils/timetable/timetableUtils';
import { TimetableItem, Program, Project, Task, Subtask, Priority } from '@/lib/types/types';
import { auth, isFirebaseInitialized } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import AccountDrawer from '@/components/drawers/AccountDrawer';

type ItemType = 'programs' | 'projects' | 'tasks' | 'subtasks';
type ViewMode = 'd' | 'w' | 'm' | 'y';

export default function Home() {
  const router = useRouter();
  const [itemType, setItemType] = useState<ItemType>('tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('d');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedItem, setSelectedItem] = useState<Program | Project | Task | Subtask | null>(null);
  const [hoveredItem, setHoveredItem] = useState<TimetableItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { alert, confirm, AlertComponent, ConfirmComponent } = useDialog();
  
  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Hierarchical display state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [scrollToTopTrigger, setScrollToTopTrigger] = useState(0);
  
  // Date picker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Lock body scroll when date picker is open
  useEffect(() => {
    if (isDatePickerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isDatePickerOpen]);
  
  // Panel mode state (database or cli)
  const [panelMode, setPanelMode] = useState<'database' | 'cli'>('database');
  
  // Disable CLI on mobile - force database mode
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 780;
      if (isMobile && panelMode === 'cli') {
        setPanelMode('database');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [panelMode]);

  // Account drawer state
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  
  // User authentication state
  const [user, setUser] = useState<User | null>(null);
  
  // Data state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  // Format time from decimal hour to HH:MM
  const formatTime = (decimalHour: number): string => {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour - hours) * 60);
    const displayHours = hours === 24 ? 0 : hours;
    const hoursStr = String(displayHours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    return `${hoursStr}:${minutesStr}`;
  };

  // Format date based on view mode
  const formatDate = (date: Date, mode: ViewMode): string => {
    if (mode === 'd') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } else if (mode === 'w') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startMonth = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const startDay = String(startOfWeek.getDate()).padStart(2, '0');
      const endMonth = String(endOfWeek.getMonth() + 1).padStart(2, '0');
      const endDay = String(endOfWeek.getDate()).padStart(2, '0');
      
      return `${startMonth}/${startDay} ~ ${endMonth}/${endDay}`;
    } else if (mode === 'm') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    } else {
      const year = date.getFullYear();
      return `${year}`;
    }
  };

  const goToPrevious = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'd') {
        newDate.setDate(newDate.getDate() - 1);
      } else if (viewMode === 'w') {
        newDate.setDate(newDate.getDate() - 7);
      } else if (viewMode === 'm') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (viewMode === 'y') {
        newDate.setFullYear(newDate.getFullYear() - 1);
      }
      return newDate;
    });
  };

  const goToNext = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'd') {
        newDate.setDate(newDate.getDate() + 1);
      } else if (viewMode === 'w') {
        newDate.setDate(newDate.getDate() + 7);
      } else if (viewMode === 'm') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (viewMode === 'y') {
        newDate.setFullYear(newDate.getFullYear() + 1);
      }
      return newDate;
    });
  };

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      const [programsData, projectsData, tasksData, subtasksData] = await Promise.all([
        getPrograms(),
        getProjects(),
        getTasks(),
        getSubtasks(),
      ]);
      
      setPrograms(programsData);
      setProjects(projectsData);
      setTasks(tasksData);
      setSubtasks(subtasksData);
      
      // Timetable items are now computed via useMemo
      
      setError(null);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data without showing loading state (for updates)
  const refreshData = async () => {
    try {
      const [programsData, projectsData, tasksData, subtasksData] = await Promise.all([
        getPrograms(),
        getProjects(),
        getTasks(),
        getSubtasks(),
      ]);
      
      setPrograms(programsData);
      setProjects(projectsData);
      setTasks(tasksData);
      setSubtasks(subtasksData);
      
      // Timetable items are now computed via useMemo
      
      // Return the data so callers can use it immediately
      return { programsData, projectsData, tasksData, subtasksData };
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      // Return empty arrays on error
      return { programsData: [], projectsData: [], tasksData: [], subtasksData: [] };
      // Don't set error state for background refreshes to avoid disrupting UX
    }
  };

  // Handle data update from CLI
  const handleDataUpdate = async () => {
    await loadData();
  };


  // Initialize auth and load data
  useEffect(() => {
    if (!isFirebaseInitialized() || !auth) {
      // Firebase not initialized (e.g., missing config in deploy preview)
      setLoading(false);
      setError(null);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadData();
      } else {
        // User not authenticated - show landing page
        setLoading(false);
        setError(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update timetable when date or view mode changes (memoized for performance)
  const timetableItems = React.useMemo(() => {
    return itemsToTimetable(
      programs,
      projects,
      tasks,
      subtasks,
      selectedDate,
      viewMode
    );
  }, [selectedDate, viewMode, programs, projects, tasks, subtasks]);

  // Get current items based on itemType
  const getCurrentItems = (): (Program | Project | Task | Subtask)[] => {
    switch (itemType) {
      case 'programs':
        return programs;
      case 'projects':
        return projects;
      case 'tasks':
        return tasks;
      case 'subtasks':
        return subtasks;
      default:
        return [];
    }
  };

  // Handle item selection
  const handleItemSelect = (item: Program | Project | Task | Subtask) => {
    setSelectedItem(item);
  };

  // Handle item save (after drawer edit)
  const handleItemSave = async (updatedItem: Program | Project | Task | Subtask) => {
    console.log('🔵 handleItemSave - updatedItem received:', JSON.stringify(updatedItem, null, 2));
    console.log('🔵 handleItemSave - timeframe in updatedItem:', updatedItem.timeframe);
    
    // Optimistically update local state immediately for instant timetable update
    switch (itemType) {
      case 'programs':
        setPrograms(prev => prev.map(p => p.id === updatedItem.id ? updatedItem as Program : p));
        break;
      case 'projects':
        setProjects(prev => prev.map(p => p.id === updatedItem.id ? updatedItem as Project : p));
        break;
      case 'tasks':
        setTasks(prev => prev.map(t => t.id === updatedItem.id ? updatedItem as Task : t));
        break;
      case 'subtasks':
        setSubtasks(prev => prev.map(s => s.id === updatedItem.id ? updatedItem as Subtask : s));
        break;
    }
    
    // Update selectedItem immediately
    setSelectedItem(updatedItem);
    
    // Then refresh from Firestore in the background to ensure consistency
    const { programsData, projectsData, tasksData, subtasksData } = await refreshData();
    
    // Find the updated item from the refreshed data to ensure we have the latest from Firestore
    let refreshedItem: Program | Project | Task | Subtask | null = null;
    switch (itemType) {
      case 'programs':
        refreshedItem = programsData.find(p => p.id === updatedItem.id) || null;
        break;
      case 'projects':
        refreshedItem = projectsData.find(p => p.id === updatedItem.id) || null;
        break;
      case 'tasks':
        refreshedItem = tasksData.find(t => t.id === updatedItem.id) || null;
        break;
      case 'subtasks':
        refreshedItem = subtasksData.find(s => s.id === updatedItem.id) || null;
        break;
    }
    
    console.log('🔵 handleItemSave - refreshedItem from Firestore:', JSON.stringify(refreshedItem, null, 2));
    console.log('🔵 handleItemSave - timeframe in refreshedItem:', refreshedItem?.timeframe);
    
    // Update selectedItem with refreshed data so drawer shows saved values
    // Keep drawer open so user can see the saved changes
    if (refreshedItem) {
      setSelectedItem(refreshedItem);
    }
  };

  // Handle item update (from database panel inline edit)
  const handleItemUpdate = async (itemId: string, field: string, value: string) => {
    try {
      const updates: any = { [field]: value };
      
      // Optimistically update local state immediately for instant timetable update
      switch (itemType) {
        case 'programs':
          setPrograms(prev => prev.map(p => p.id === itemId ? { ...p, [field]: value } as Program : p));
          await updateProgram(itemId, updates);
          break;
        case 'projects':
          setProjects(prev => prev.map(p => p.id === itemId ? { ...p, [field]: value } as Project : p));
          await updateProject(itemId, updates);
          break;
        case 'tasks':
          setTasks(prev => prev.map(t => t.id === itemId ? { ...t, [field]: value } as Task : t));
          await updateTask(itemId, updates);
          break;
        case 'subtasks':
          setSubtasks(prev => prev.map(s => s.id === itemId ? { ...s, [field]: value } as Subtask : s));
          await updateSubtask(itemId, updates);
          break;
      }
      
      // Refresh from Firestore in the background to ensure consistency
      refreshData();
    } catch (err: any) {
      console.error('Error updating item:', err);
      // Revert optimistic update on error by refreshing from Firestore
      await refreshData();
      await alert(`Failed to update: ${err.message}`, 'Error');
    }
  };

  // Handle item delete
  const handleItemDelete = async (itemId: string) => {
    try {
      console.log(`Deleting ${itemType} with ID: ${itemId}`);
      switch (itemType) {
        case 'programs':
          await deleteProgram(itemId);
          console.log(`Successfully deleted program: ${itemId}`);
          break;
        case 'projects':
          await deleteProject(itemId);
          console.log(`Successfully deleted project: ${itemId}`);
          break;
        case 'tasks':
          await deleteTask(itemId);
          console.log(`Successfully deleted task: ${itemId}`);
          break;
        case 'subtasks':
          await deleteSubtask(itemId);
          console.log(`Successfully deleted subtask: ${itemId}`);
          break;
      }
      // Use refreshData instead of loadData to avoid loading state blink
      await refreshData();
      console.log('Data refreshed after delete');
      setSelectedItem(null);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      await alert(`Failed to delete: ${err.message}`, 'Error');
      throw err; // Re-throw so Drawer can handle it
    }
  };

  // Handle multi-select toggle
  const handleMultiSelectToggle = () => {
    setMultiSelectMode(!multiSelectMode);
    setSelectedItemIds(new Set()); // Clear selections when toggling off
  };

  // Handle adding child items from drawer
  const handleAddChild = async (parentId: string, childType: 'projects' | 'tasks' | 'subtasks') => {
    try {
      let newItemId: string;
      let newItem: Program | Project | Task | Subtask | null = null;

      switch (childType) {
        case 'projects':
          newItemId = await createProject({
            title: 'New Project',
            parentId: parentId,
          });
          // Fetch the just-created project directly to ensure correct type
          newItem = await getProject(newItemId);
          break;
        case 'tasks':
          newItemId = await createTask({
            title: 'New Task',
            parentId: parentId,
          });
          // Fetch the just-created task directly to ensure correct type
          newItem = await getTask(newItemId);
          break;
        case 'subtasks':
          newItemId = await createSubtask({
            title: 'New Subtask',
            parentId: parentId,
          });
          // Fetch the just-created subtask directly to ensure correct type
          newItem = await getSubtask(newItemId);
          break;
      }

      // Fall back to using refreshed data if direct fetch failed for some reason
      if (!newItem) {
        const { projectsData, tasksData, subtasksData } = await refreshData();
        switch (childType) {
          case 'projects':
            newItem = projectsData.find(p => p.id === newItemId) || null;
            break;
          case 'tasks':
            newItem = tasksData.find(t => t.id === newItemId) || null;
            break;
          case 'subtasks':
            newItem = subtasksData.find(s => s.id === newItemId) || null;
            break;
        }
      } else {
        // Still refresh background state so lists/timetables update
        refreshData();
      }

      // Switch context to the child type and open its drawer, even if we only know the id
      if (newItem) {
        setSelectedItem(newItem);
      } else {
        // Minimal placeholder if something went wrong but we have an id
        setSelectedItem({
          id: newItemId,
          title: childType === 'projects' ? 'New Project' : childType === 'tasks' ? 'New Task' : 'New Subtask',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }
      setItemType(childType);
      
      // Scroll to top after data refresh and item selection to show the new child item
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        setScrollToTopTrigger(prev => prev + 1);
      }, 100);
    } catch (err: any) {
      console.error('Error creating child item:', err);
      await alert(`Failed to create ${childType.slice(0, -1)}: ${err.message}`, 'Error');
    }
  };
  
  // Handle item selection in multi-select mode
  const handleItemSelectMulti = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  // Handle expand/collapse for hierarchical display
  const handleToggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle multi-delete
  const handleMultiDelete = async () => {
    if (selectedItemIds.size === 0) return;

    const count = selectedItemIds.size;
    const itemTypeName = itemType.slice(0, -1); // Remove 's' from end
    const confirmed = await confirm(
      `Are you sure you want to delete ${count} ${itemTypeName}${count > 1 ? 's' : ''}? This action cannot be undone.`,
      'Delete Multiple Items',
      true
    );

    if (!confirmed) return;

    try {
      const deletePromises = Array.from(selectedItemIds).map(async (itemId) => {
        switch (itemType) {
          case 'programs':
            return deleteProgram(itemId);
          case 'projects':
            return deleteProject(itemId);
          case 'tasks':
            return deleteTask(itemId);
          case 'subtasks':
            return deleteSubtask(itemId);
        }
      });

      await Promise.all(deletePromises);
      await refreshData();
      setSelectedItemIds(new Set());
      setMultiSelectMode(false);
      setSelectedItem(null);
    } catch (err: any) {
      console.error('Error deleting items:', err);
      await alert(`Failed to delete items: ${err.message}`, 'Error');
    }
  };

  // Handle add new item (create new item and open drawer)
  const handleAddItem = async () => {
    try {
      let newItemId: string;
      const baseItem = {
        title: 'New ' + itemType.slice(0, -1),
        description: '',
        priority: undefined as Priority | undefined,
        tags: [],
        notes: '',
      };

      switch (itemType) {
        case 'programs':
          newItemId = await createProgram({
            ...baseItem,
            category: '',
            objective: '',
            progress: undefined,
            timeframe: undefined,
            recurrence: undefined,
          });
          break;
        case 'projects':
          newItemId = await createProject({
            ...baseItem,
            parentId: '',
            phase: undefined,
            status: 'planned',
            timeframe: undefined,
            recurrence: undefined,
          });
          break;
        case 'tasks':
          newItemId = await createTask({
            ...baseItem,
            parentId: '',
            status: 'planned',
            timeframe: undefined,
            recurrence: undefined,
          });
          break;
        case 'subtasks':
          newItemId = await createSubtask({
            ...baseItem,
            parentId: '',
            status: 'planned',
            timeframe: undefined,
          });
          break;
        default:
          return;
      }

      // Refresh data to get the new item with all fields
      await refreshData();
      
      // Find and select the newly created item
      const newItem = getCurrentItems().find(item => item.id === newItemId);
      if (newItem) {
        setSelectedItem(newItem);
      }
      
      // Scroll to top after data refresh and item selection to show the new item
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        setScrollToTopTrigger(prev => prev + 1);
      }, 100);
    } catch (err: any) {
      console.error('Error creating item:', err);
      await alert(`Failed to create item: ${err.message}`, 'Error');
    }
  };

  // Handle item hover from timetable
  const handleItemHover = (item: TimetableItem | null) => {
    setHoveredItem(item);
  };

  const currentItems = getCurrentItems();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!user) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading...</LoadingMessage>
      </Container>
    );
  }

  return (
    <Container>
      {error && <ErrorBox>{error}</ErrorBox>}
      
      {/* Top Bar */}
      <TopBar>
        <Logo>UNFOLD</Logo>
        <ClockWrapper>
          <Clock />
        </ClockWrapper>
        <TopBarAccount onClick={() => setIsAccountOpen(true)}>account</TopBarAccount>
      </TopBar>

      {/* Main Content */}
      <MainContent>
        {/* Timetable View */}
        <TimetableContainer>
          <TimetableContentWrapper>
            <DateNavigation>
              <DateArrow onClick={goToPrevious}>
                <ArrowIcon>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </ArrowIcon>
              </DateArrow>
              <DateDisplayContainer>
                <DateDisplay 
                  onClick={() => setIsDatePickerOpen(true)}
                  $clickable
                >
                  {formatDate(selectedDate, viewMode)}
                </DateDisplay>
                {isDatePickerOpen && (
                  <DatePicker
                    value={selectedDate}
                    onChange={(date) => {
                      setSelectedDate(date);
                      setIsDatePickerOpen(false);
                    }}
                    onClose={() => setIsDatePickerOpen(false)}
                  />
                )}
              </DateDisplayContainer>
              <DateArrow onClick={goToNext}>
                <ArrowIcon>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </ArrowIcon>
              </DateArrow>
            </DateNavigation>
            <TimetableWrapper>
              {viewMode === 'd' && (
                <CircularTimetable
                  items={timetableItems}
                  selectedDate={selectedDate}
                  onItemHover={handleItemHover}
                  onItemClick={(item) => {
                    // Find the actual item from the timetable item
                    const actualItem = [...programs, ...projects, ...tasks, ...subtasks].find(i => i.id === item.id);
                    if (actualItem) {
                      handleItemSelect(actualItem);
                    }
                  }}
                />
              )}
              {viewMode === 'w' && (
                <WeeklyTimetable
                  items={timetableItems}
                  selectedDate={selectedDate}
                  onItemHover={handleItemHover}
                  onItemClick={(item) => {
                    const actualItem = [...programs, ...projects, ...tasks, ...subtasks].find(i => i.id === item.id);
                    if (actualItem) {
                      handleItemSelect(actualItem);
                    }
                  }}
                />
              )}
              {viewMode === 'm' && (
                <MonthlyTimetable
                  items={timetableItems}
                  selectedDate={selectedDate}
                  onItemHover={handleItemHover}
                  onItemClick={(item) => {
                    const actualItem = [...programs, ...projects, ...tasks, ...subtasks].find(i => i.id === item.id);
                    if (actualItem) {
                      handleItemSelect(actualItem);
                    }
                  }}
                />
              )}
              {viewMode === 'y' && (
                <YearlyPlaceholder>
                  Yearly view coming soon
                </YearlyPlaceholder>
              )}
            </TimetableWrapper>
            <HoveredItemName>
              {hoveredItem && (
                <>
                  <div>{hoveredItem.title}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>
                    {formatTime(hoveredItem.startTime)} - {formatTime(hoveredItem.endTime)}
                  </div>
                </>
              )}
            </HoveredItemName>
            <ViewModeSelector>
              <ViewModeItem 
                $selected={viewMode === 'd'} 
                onClick={() => setViewMode('d')}
              >
                D
              </ViewModeItem>
              <ViewModeSpacer> </ViewModeSpacer>
              <ViewModeItem 
                $selected={viewMode === 'w'} 
                onClick={() => setViewMode('w')}
              >
                W
              </ViewModeItem>
              <ViewModeSpacer> </ViewModeSpacer>
              <ViewModeItem 
                $selected={viewMode === 'm'} 
                onClick={() => setViewMode('m')}
              >
                M
              </ViewModeItem>
              <ViewModeSpacer> </ViewModeSpacer>
              <ViewModeItem 
                $selected={viewMode === 'y'} 
                onClick={() => setViewMode('y')}
              >
                Y
              </ViewModeItem>
            </ViewModeSelector>
          </TimetableContentWrapper>
        </TimetableContainer>

        {/* Panel - Database or CLI */}
        {panelMode === 'database' ? (
          <DatabasePanel
            items={currentItems}
            itemType={itemType}
            onSelect={handleItemSelect}
            onAdd={handleAddItem}
            onUpdate={handleItemUpdate}
            selectedItemId={selectedItem?.id}
            multiSelectMode={multiSelectMode}
            selectedItemIds={selectedItemIds}
            onItemSelectMulti={handleItemSelectMulti}
            onMultiDelete={handleMultiDelete}
            onMultiSelectToggle={handleMultiSelectToggle}
            onItemTypeChange={(type) => {
              setItemType(type);
              setSelectedItem(null);
            }}
            allPrograms={programs}
            allProjects={projects}
            allTasks={tasks}
            allSubtasks={subtasks}
            expandedItems={expandedItems}
            onToggleExpand={handleToggleExpand}
            scrollToTopTrigger={scrollToTopTrigger}
          />
        ) : (
          <CLIPanelContainer>
            <TerminalInterface onDataUpdate={handleDataUpdate} />
          </CLIPanelContainer>
        )}
      </MainContent>

      {/* Footer Bar */}
      <FooterBar>
        <FooterModeWrapper>
          <ModeToggle>
            <ModeButton 
              $selected={panelMode === 'database'} 
              onClick={() => setPanelMode('database')}
            >
              Database
            </ModeButton>
            <ModeButton 
              $selected={panelMode === 'cli'} 
              onClick={() => setPanelMode('cli')}
              $hideOnMobile
            >
              CLI
            </ModeButton>
          </ModeToggle>
        </FooterModeWrapper>
      </FooterBar>

      {/* Account Drawer */}
      <AccountDrawer
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />

      {/* Drawer */}
      {selectedItem && (
        <Drawer
          item={selectedItem}
          itemType={itemType}
          onClose={() => setSelectedItem(null)}
          onSave={handleItemSave}
          onDelete={handleItemDelete}
          allPrograms={programs}
          allProjects={projects}
          allTasks={tasks}
          allSubtasks={subtasks}
          onAddChild={handleAddChild}
          onSelectChild={handleItemSelect}
        />
      )}

      {/* Alert Dialog */}
      <AlertComponent />
      <ConfirmComponent />
    </Container>
  );
}

// Mobile breakpoint
const mobileBreakpoint = '780px';

const Container = styled.div`
  width: 100vw;
  min-width: 375px;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary, #000000);
  font-family: Helvetica, Arial, sans-serif;
  font-size: 12px;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--bg-primary, #000000);
  position: relative;

  @media (min-width: ${mobileBreakpoint}) {
    padding: 0 1.5rem;
  }
`;

const Logo = styled.div`
  font-size: 12px;
  color: var(--text-primary, #DEDEE5);
  letter-spacing: 0.1em;
  font-weight: normal;
  line-height: 1.2;
`;

const TopBarAccount = styled.div`
  font-size: 12px;
  color: var(--text-secondary, #8A8A95);
  font-family: Helvetica, Arial, sans-serif;
  text-transform: lowercase;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--text-primary, #dedee5);
  }
`;

const FooterBar = styled.div`
  height: calc(3rem + 12px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 1rem;
  background: var(--bg-primary, #000000);

  @media (max-width: ${mobileBreakpoint}) {
    display: none;
  }

  @media (min-width: ${mobileBreakpoint}) {
    padding: 0 1.5rem;
  }
`;

const FooterModeWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.25rem;
`;

const ClockWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModeButton = styled.button<{ $selected: boolean; $hideOnMobile?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$selected ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #8A8A95)'};
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  font-weight: normal;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: color 0.2s;
  position: relative;
  
  ${props => props.$selected ? `
    &::before {
      content: '(';
      position: absolute;
      left: -0.2rem;
    }
    &::after {
      content: ')';
      position: absolute;
      right: -0.2rem;
    }
  ` : ''}
  
  &:hover {
    color: var(--text-primary, #FFFFFF);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
  
  ${props => props.$hideOnMobile ? `
    @media (max-width: ${mobileBreakpoint}) {
      display: none;
    }
  ` : ''}
`;

const CLIPanelContainer = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #000000);
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: ${mobileBreakpoint}) {
    display: none;
  }

  @media (min-width: ${mobileBreakpoint}) {
    width: 50%;
    height: 100%;
    order: 1;
    overflow: hidden;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center; /* Center DatabasePanel horizontally on mobile */
  overflow: hidden;
  height: calc(100vh - 3rem); /* Only subtract TopBar on mobile */

  @media (min-width: ${mobileBreakpoint}) {
    flex-direction: row;
    align-items: stretch; /* Reset to stretch on desktop */
    height: calc(100vh - (3rem + (3rem + 12px))); /* Subtract TopBar and FooterBar on desktop */
  }
`;

const TimetableContainer = styled.div`
  width: 100%;
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  padding: 0.5rem 1rem;
  min-height: fit-content;
  overflow: visible;
  background: var(--bg-primary, #000000);
  box-sizing: border-box;

  @media (min-width: ${mobileBreakpoint}) {
    width: 50%;
    height: 100%;
    align-items: center;
    padding: 4rem;
    order: 2;
    justify-content: center;
  }
`;

const TimetableContentWrapper = styled.div`
  width: 100%;
  max-width: calc(100vw - 2rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0; /* mobile: remove gap between DateNav and ItemDisplay */
  position: relative;
  flex-shrink: 0;
  min-height: fit-content;

  @media (min-width: ${mobileBreakpoint}) {
    max-width: 500px;
    gap: clamp(0.75rem, 2vw, 1rem);
  }
`;

const DateNavigation = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
  white-space: nowrap;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  min-height: clamp(2rem, 5vw, 2.5rem);
  position: relative;
  z-index: 2; /* ensure taps go to the date controls above chart */
`;

const DateArrow = styled.button`
  background: transparent;
  border: none;
  color: var(--text-primary, #DEDEE5);
  cursor: pointer;
  padding: clamp(0.25rem, 0.75vw, 0.5rem) clamp(0.25rem, 1vw, 0.5rem);
  transition: color 0.2s;
  min-width: clamp(24px, 6vw, 32px);
  min-height: clamp(24px, 6vw, 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: var(--text-primary, #ffffff);
  }

  &:active {
    opacity: 0.7;
  }

  @media (min-width: ${mobileBreakpoint}) {
    padding: 0 0.25rem;
    min-width: auto;
    min-height: auto;
  }
`;

const ArrowIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(10px, 2.5vw, 12px);
  height: clamp(10px, 2.5vw, 12px);
  pointer-events: none;
  
  svg {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
`;

const DateDisplayContainer = styled.div`
  position: relative;
  z-index: 3; /* lift the clickable date text */
`;

const DateDisplay = styled.div<{ $clickable?: boolean }>`
  font-size: clamp(10px, 2.4vw, 12px);
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  min-width: clamp(100px, 30vw, 134px);
  text-align: center;
  ${props => props.$clickable ? `
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      color: var(--text-primary, #ffffff);
      text-decoration: underline;
      text-decoration-thickness: 0.5px;
      text-underline-offset: 2px;
    }
  ` : ''}
`;

const TimetableWrapper = styled.div`
  width: 100%;
  max-width: calc((100vw - 2rem) * 0.7); /* 30% smaller on mobile */
  aspect-ratio: 1;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  @media (min-width: ${mobileBreakpoint}) {
    width: 500px;
    height: 500px;
    max-width: 500px;
    max-height: 500px;
  }
`;

const HoveredItemName = styled.div`
  font-size: clamp(10px, 2.4vw, 12px);
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  text-align: center;
  opacity: 0.8;
  pointer-events: none;
  line-height: 1.2;
  max-width: 100%;
  word-wrap: break-word;
  flex-shrink: 0;
  min-height: clamp(1.5rem, 4vw, 2rem);
  padding: 0 clamp(0.5rem, 1.5vw, 1rem);

  div {
    white-space: nowrap;
    line-height: 1.2;
  }
`;

const ViewModeSelector = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.25rem, 0.75vw, 0.5rem);
  white-space: nowrap;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  min-height: clamp(1.5rem, 4vw, 2rem);

  /* mobile: restore spacing below ItemDisplay when wrapper gap is 0 */
  margin-top: clamp(0.5rem, 1.5vw, 0.75rem);

  @media (min-width: ${mobileBreakpoint}) {
    margin-top: -0.5rem; /* Reduce gap with timetable on desktop */
  }
`;

const ViewModeItem = styled.button<{ $selected: boolean }>`
  background: transparent;
  border: none;
  color: var(--text-primary, #DEDEE5);
  font-size: clamp(9px, 2.2vw, 12px);
  font-family: Helvetica, Arial, sans-serif;
  font-weight: normal;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
  user-select: none;
  width: clamp(1.25rem, 3.5vw, 1.5rem);
  text-align: center;
  position: relative;
  line-height: 1.2;
  
  ${props => props.$selected ? `
    &::before {
      content: '(';
      position: absolute;
      left: clamp(-0.3rem, -0.75vw, -0.25rem);
    }
    &::after {
      content: ')';
      position: absolute;
      right: clamp(-0.3rem, -0.75vw, -0.25rem);
    }
  ` : ''}
  
  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
`;

const ViewModeSpacer = styled.span`
  font-size: clamp(10px, 2.4vw, 12px);
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  width: clamp(0.375rem, 1vw, 0.5rem);
  text-align: center;
  line-height: 1.2;
`;


const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
`;

const ErrorBox = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: #1a0000;
  border: 1px solid #3a0000;
  color: #ff8888;
  padding: 1rem;
  font-size: 12px;
  z-index: 1000;
  max-width: 400px;
  
  [data-theme="light"] & {
    background: #ffe8e8;
    border-color: #ffaaaa;
    color: #cc0000;
  }
`;

const YearlyPlaceholder = styled.div`
  width: 100%;
  max-width: calc(100vw - 2rem);
  aspect-ratio: 1;
  max-height: calc(50vh - 6rem);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #8A8A95);
  font-size: 11px;

  @media (min-width: ${mobileBreakpoint}) {
    width: 500px;
    height: 500px;
    max-width: 500px;
    max-height: 500px;
    font-size: 12px;
  }
`;

