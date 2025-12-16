'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TimetableItem } from '@/lib/types/types';
import { useTheme } from '@/lib/theme/ThemeContext';

interface WeeklyTimetableProps {
  items: TimetableItem[];
  selectedDate: Date;
  onItemHover?: (item: TimetableItem | null) => void;
  onItemClick?: (item: TimetableItem) => void;
}

const WeeklyTimetable: React.FC<WeeklyTimetableProps> = ({ items, selectedDate, onItemHover, onItemClick }) => {
  const { theme } = useTheme();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState({
    bgPrimary: '#000000',
    textPrimary: '#DEDEE5',
    textSecondary: '#8A8A95',
    borderSecondary: 'rgba(222, 222, 229, 0.2)',
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
        borderSecondary: computedStyle.getPropertyValue('--border-secondary').trim() || 'rgba(222, 222, 229, 0.2)',
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
  
  // Calculate the week (Sunday to Saturday)
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }
  
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  const hasItems = items && items.length > 0;

  // Convert time to Y position (0-24 hours mapped to cell height)
  const timeToY = (time: number, cellHeight: number) => {
    // Map 0-24 hours to cell height
    return (time / 24) * cellHeight;
  };

  // Get day indices for an item that spans multiple days
  // Returns indices for all days in the current week that fall within the item's date range
  const getDayIndices = (startDate: string | undefined, endDate: string | undefined): number[] => {
    if (!startDate) return [];
    
    try {
      const startDateObj = new Date(startDate + 'T00:00:00');
      const endDateObj = endDate ? new Date(endDate + 'T00:00:00') : startDateObj;
      
      // Calculate the end of the current week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Check if item overlaps with current week at all
      if (endDateObj < startOfWeek || startDateObj > endOfWeek) {
        return []; // Item doesn't overlap with current week
      }
      
      // Determine the actual start and end dates within the current week
      const actualStart = startDateObj > startOfWeek ? startDateObj : startOfWeek;
      const actualEnd = endDateObj < endOfWeek ? endDateObj : endOfWeek;
      
      const indices: number[] = [];
      const currentDate = new Date(actualStart);
      currentDate.setHours(0, 0, 0, 0);
      
      while (currentDate <= actualEnd) {
        const dayDiff = Math.floor((currentDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
        
        // Should always be within 0-6 since we've already checked overlap
        if (dayDiff >= 0 && dayDiff < 7) {
          indices.push(dayDiff);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
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
    const dateNumberHeight = 20; // Space for date numbers
    const contentStartY = gridPadding + headerHeight + dateNumberHeight; // Start bars below dates
    const availableHeight = 500 - contentStartY - gridPadding;
    const cellHeight = availableHeight;
    const cellWidth = (500 - gridPadding * 2) / 7;

    const barThickness = 8; // Thicker bars
    const barSpacing = 2; // Space between stacked bars

    // Process items and calculate stack positions for overlapping items
    const processedItems = items.map((item) => {
      const dayIndices = getDayIndices(item.startDate, item.endDate);
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
      
      // Render a bar for each day the item spans
      dayIndices.forEach((dayIndex) => {
        const x = gridPadding + (dayIndex * cellWidth);
        const width = cellWidth;
        
        bars.push(
          <GanttLine
            key={`${item.id}-${dayIndex}`}
            $isHovered={isHovered}
            $fillPattern={fillPattern}
            $patternColor={themeColors.patternColor}
            $solidFillColor={themeColors.solidFillColor}
            style={{
              left: `${x}px`,
              top: `${contentStartY + startY + stackOffset}px`,
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

    return bars;
  };

  return (
    <WeeklyContainer>
      <CalendarGrid $isEmpty={!hasItems}>
        {/* Day headers */}
        {dayNames.map((day, index) => (
          <DayHeader key={index}>{day}</DayHeader>
        ))}
        
        {/* Week days */}
        {weekDays.map((day, index) => {
          const dayNumber = day.getDate();
          return (
            <DayCell key={index}>
              <DayNumber>{dayNumber.toString().padStart(2, '0')}</DayNumber>
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
    </WeeklyContainer>
  );
};

export default WeeklyTimetable;

const WeeklyContainer = styled.div`
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
  grid-template-rows: auto 1fr;
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
  border-bottom: 1px solid var(--border-secondary, rgba(222, 222, 229, 0.2));
`;

const DayCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0.25rem;
  font-size: 12px;
  color: var(--text-primary, #DEDEE5);
  font-family: Helvetica, Arial, sans-serif;
  font-weight: normal;
  border: none;
  position: relative;
  border-right: 1px solid var(--border-secondary, rgba(222, 222, 229, 0.2));
  
  &:last-child {
    border-right: none;
  }
`;

const DayNumber = styled.div`
  font-size: 12px;
  line-height: 1.2;
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

