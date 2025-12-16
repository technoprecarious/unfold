'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TimetableItem } from '@/lib/types/types';
import { useTheme } from '@/lib/theme/ThemeContext';

interface MonthlyTimetableProps {
  items: TimetableItem[];
  selectedDate: Date;
  onItemHover?: (item: TimetableItem | null) => void;
  onItemClick?: (item: TimetableItem) => void;
}

const MonthlyTimetable: React.FC<MonthlyTimetableProps> = ({ items, selectedDate, onItemHover, onItemClick }) => {
  const { theme } = useTheme();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState({
    bgPrimary: '#000000',
    textPrimary: '#DEDEE5',
    textSecondary: '#8A8A95',
    patternColor: '#676767',
    solidFillColor: '#161616',
  });

  // Get theme colors from CSS variables and watch for theme changes
  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const theme = root.getAttribute('data-theme') || 'dark';
      // Use specific colors based on theme (matching CircularTimetable)
      const patternColor = theme === 'light' ? '#959595' : '#676767';
      const solidFill = theme === 'light' ? '#F1F1F1' : '#161616';
      setThemeColors({
        bgPrimary: computedStyle.getPropertyValue('--bg-primary').trim() || '#000000',
        textPrimary: computedStyle.getPropertyValue('--text-primary').trim() || '#DEDEE5',
        textSecondary: computedStyle.getPropertyValue('--text-secondary').trim() || '#8A8A95',
        patternColor: patternColor, // Theme-specific pattern colors
        solidFillColor: solidFill, // Theme-specific solid fill colors
      });
    };

    updateColors();
    
    // Watch for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Get fill pattern type based on duration (matching CircularTimetable)
  const getFillPattern = (item: TimetableItem): 'solid' | 'hatched' | 'dotted' => {
    let duration = item.endTime - item.startTime;
    if (duration <= 0) {
      duration += 24; // handle wrap-around
    }
    if (duration <= 1) return 'dotted';
    if (duration <= 3) return 'hatched';
    return 'solid';
  };
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Get previous month's last days
  const prevMonth = new Date(year, month, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Month abbreviations
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  // Build calendar grid
  const calendarDays: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean; isPrevMonth: boolean; isNextMonth: boolean }> = [];
  
  // Previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      month,
      year,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
    });
  }
  
  // Next month days to fill the grid (6 rows = 42 cells)
  const remainingCells = 42 - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.push({
      day,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
    });
  }
  
  // Check if a day is the first of the month
  const isFirstOfMonth = (day: number, isCurrentMonth: boolean, isPrevMonth: boolean, isNextMonth: boolean) => {
    if (isCurrentMonth && day === 1) return true;
    if (isNextMonth && day === 1) return true;
    return false;
  };
  
  // Get month abbreviation for first day
  const getMonthAbbr = (day: number, isCurrentMonth: boolean, isPrevMonth: boolean, isNextMonth: boolean, monthIndex: number) => {
    if (isFirstOfMonth(day, isCurrentMonth, isPrevMonth, isNextMonth)) {
      if (isCurrentMonth) return monthNames[month];
      if (isNextMonth) return monthNames[month === 11 ? 0 : month + 1];
    }
    return null;
  };

  const hasItems = items && items.length > 0;

  // Convert time to Y position (0-24 hours mapped to cell height)
  const timeToY = (time: number, cellHeight: number) => {
    return (time / 24) * cellHeight;
  };


  // Get calendar day indices for an item that spans multiple days
  const getCalendarDayIndices = (startDate: string | undefined, endDate: string | undefined): number[] => {
    if (!startDate) return [];
    
    try {
      const startDateObj = new Date(startDate + 'T00:00:00');
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = endDate ? new Date(endDate + 'T00:00:00') : startDateObj;
      endDateObj.setHours(23, 59, 59, 999);
      
      const indices: number[] = [];
      const currentDate = new Date(startDateObj);
      
      // Iterate through all dates from start to end (inclusive)
      while (currentDate <= endDateObj) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();
        
        // Find the index in calendarDays array
        const index = calendarDays.findIndex(calDay => 
          calDay.year === year && 
          calDay.month === month && 
          calDay.day === day
        );
        
        if (index >= 0) {
          indices.push(index);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Safety check to prevent infinite loops (max 100 days)
        if (indices.length >= 100) break;
      }
      
      return indices;
    } catch (e) {
      // Invalid date
    }
    
    return [];
  };

  // Check if two time ranges overlap
  const timeRangesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return start1 < end2 && start2 < end1;
  };

  // Render Gantt bars for items
  const renderGanttLines = () => {
    if (!hasItems) return null;

    const gridPadding = 16; // 1rem = 16px
    const headerHeight = 40; // Approximate header height
    const dateNumberHeight = 24; // Space for date numbers within each cell
    const contentStartY = gridPadding + headerHeight; // Start of calendar grid
    const availableHeight = 500 - contentStartY - gridPadding;
    const cellHeight = availableHeight / 6; // 6 rows
    const cellWidth = (500 - gridPadding * 2) / 7;

    const barThickness = 2; // Thinner bars for monthly view
    const barSpacing = 1; // Space between stacked bars

    // Process items and calculate stack positions for overlapping items
    const processedItems = items.map((item) => {
      const dayIndices = getCalendarDayIndices(item.startDate, item.endDate);
      return { item, dayIndices };
    }).filter(({ dayIndices }) => dayIndices.length > 0);

    // Calculate stack level for each item based on overlaps
    const stackLevels = new Map<string, number>();
    
    processedItems.forEach(({ item: item1, dayIndices: dayIndices1 }, index1) => {
      let maxStackLevel = 0;
      
      // Check against all previously processed items
      processedItems.slice(0, index1).forEach(({ item: item2, dayIndices: dayIndices2 }) => {
        // Check if items overlap in time and share any days
        const shareDays = dayIndices1.some(day => dayIndices2.includes(day));
        
        if (shareDays && timeRangesOverlap(item1.startTime, item1.endTime, item2.startTime, item2.endTime)) {
          const otherStackLevel = stackLevels.get(item2.id) || 0;
          maxStackLevel = Math.max(maxStackLevel, otherStackLevel + 1);
        }
      });
      
      stackLevels.set(item1.id, maxStackLevel);
    });

    const bars: React.ReactElement[] = [];

    processedItems.forEach(({ item, dayIndices }) => {
      const isHovered = hoveredItem === item.id;
      const stackLevel = stackLevels.get(item.id) || 0;
      const fillPattern = getFillPattern(item);
      
      // Calculate Y position based on time (use start time for bar position)
      const startY = timeToY(item.startTime, cellHeight);
      // Calculate height based on duration (endTime - startTime)
      const duration = item.endTime - item.startTime;
      const height = Math.max(barThickness, timeToY(duration, cellHeight));
      
      // Stack bars vertically if they overlap
      const stackOffset = stackLevel * (barThickness + barSpacing);
      
      // Group consecutive days - handle wrapping across rows
      const dayGroups: number[][] = [];
      let currentGroup: number[] = [];
      
      dayIndices.sort((a, b) => a - b).forEach((dayIndex, idx) => {
        if (idx === 0 || dayIndex === dayIndices[idx - 1] + 1) {
          // Consecutive in array (might be same row or next row)
          currentGroup.push(dayIndex);
        } else {
          // Not consecutive - start new group
          if (currentGroup.length > 0) {
            dayGroups.push(currentGroup);
          }
          currentGroup = [dayIndex];
        }
      });
      if (currentGroup.length > 0) {
        dayGroups.push(currentGroup);
      }
      
      // Render bars for each group of consecutive days
      dayGroups.forEach((dayGroup) => {
        // Render a bar for each day in the group (each grid cell gets its own bar segment)
        dayGroup.forEach((dayIndex) => {
          const row = Math.floor(dayIndex / 7);
          const col = dayIndex % 7;
          
          // Calculate X position and width for this single day
          const startX = gridPadding + (col * cellWidth);
          const width = cellWidth;
          // Position bars below date numbers within each cell
          const y = contentStartY + (row * cellHeight) + dateNumberHeight + startY + stackOffset;
          
          bars.push(
            <GanttLine
              key={`${item.id}-${dayIndex}`}
              $isHovered={isHovered}
              $fillPattern={fillPattern}
              $patternColor={themeColors.patternColor}
              $solidFillColor={themeColors.solidFillColor}
              style={{
                left: `${startX}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                cursor: 'pointer'
              }}
              onMouseEnter={() => {
                setHoveredItem(item.id);
                if (onItemHover) onItemHover(item);
              }}
              onMouseLeave={() => {
                setHoveredItem(null);
                if (onItemHover) onItemHover(null);
              }}
              onClick={() => {
                if (onItemClick) onItemClick(item);
              }}
            />
          );
        });
      });
    });

    return bars;
  };

  return (
    <MonthlyContainer>
      <CalendarGrid $isEmpty={!hasItems}>
        {/* Day headers */}
        {dayNames.map((day, index) => (
          <DayHeader key={index}>{day}</DayHeader>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((calDay, index) => {
          const monthAbbr = getMonthAbbr(calDay.day, calDay.isCurrentMonth, calDay.isPrevMonth, calDay.isNextMonth, calDay.month);
          const isFirst = isFirstOfMonth(calDay.day, calDay.isCurrentMonth, calDay.isPrevMonth, calDay.isNextMonth);
          
          return (
            <DayCell
              key={index}
              $isCurrentMonth={calDay.isCurrentMonth}
              $isPrevMonth={calDay.isPrevMonth}
              $isNextMonth={calDay.isNextMonth}
            >
              <DayNumber>{calDay.day.toString().padStart(2, '0')}</DayNumber>
              {isFirst && monthAbbr && (
                <MonthLabel>{monthAbbr}</MonthLabel>
              )}
            </DayCell>
          );
        })}
      </CalendarGrid>
      {/* Gantt lines overlay */}
      <GanttOverlay>
        {renderGanttLines()}
      </GanttOverlay>
      {!hasItems && (
        <EmptyState>empty</EmptyState>
      )}
    </MonthlyContainer>
  );
};

export default MonthlyTimetable;

const MonthlyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 500px;
  height: 500px;
  max-width: 100%;
  max-height: 100%;
  background: var(--bg-primary, #000000);
  box-sizing: border-box;
  position: relative;
`;

const CalendarGrid = styled.div<{ $isEmpty?: boolean }>`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: auto repeat(6, 1fr);
  width: 100%;
  height: 100%;
  gap: 0;
  padding: 1rem;
  box-sizing: border-box;
  opacity: ${props => props.$isEmpty ? '0.8' : '1'};
  transition: opacity 0.2s ease;
`;

const DayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  font-weight: normal;
  padding: 0.5rem 0;
  text-align: center;
`;

const DayCell = styled.div<{ $isCurrentMonth: boolean; $isPrevMonth: boolean; $isNextMonth: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0.25rem;
  font-size: 12px;
  color: ${props => 
    props.$isCurrentMonth 
      ? 'var(--text-primary, #DEDEE5)' 
      : props.$isPrevMonth || props.$isNextMonth 
        ? 'var(--text-tertiary, rgba(222, 222, 229, 0.4))' 
        : 'var(--text-primary, #DEDEE5)'
  };
  font-family: Helvetica, Arial, sans-serif;
  font-weight: normal;
  border: none;
  position: relative;
`;

const DayNumber = styled.div`
  font-size: 12px;
  line-height: 1.2;
`;

const MonthLabel = styled.div`
  font-size: 10px;
  line-height: 1;
  margin-top: 0.1rem;
  opacity: 0.8;
`;

const GanttOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
`;

const GanttLine = styled.div<{ 
  $isHovered: boolean; 
  $fillPattern: 'solid' | 'hatched' | 'dotted';
  $patternColor: string;
  $solidFillColor: string;
}>`
  position: absolute;
  pointer-events: all;
  transition: all 0.2s ease-out;
  box-shadow: ${props => props.$isHovered ? '0 0 4px rgba(255, 255, 255, 0.3)' : 'none'};
  
  /* Base background color - use solid fill for solid pattern, transparent for patterns */
  background-color: ${props => {
    if (props.$isHovered) {
      return 'var(--text-primary, #FFFFFF)';
    }
    if (props.$fillPattern === 'solid') {
      return props.$solidFillColor;
    }
    return 'transparent';
  }};
  
  /* Hatched pattern - diagonal lines */
  ${props => props.$fillPattern === 'hatched' && !props.$isHovered ? `
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 8px,
      ${props.$patternColor} 8px,
      ${props.$patternColor} 9px
    );
  ` : ''}
  
  /* Dotted pattern */
  ${props => props.$fillPattern === 'dotted' && !props.$isHovered ? `
    background-image: radial-gradient(
      circle,
      ${props.$patternColor} 1.2px,
      transparent 1.2px
    );
    background-size: 12px 12px;
  ` : ''}
`;

const EmptyState = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  font-weight: normal;
  opacity: 0.6;
  pointer-events: none;
  z-index: 10;
`;

