'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { TimetableItem } from '@/lib/types/types';
import { useTheme } from '@/lib/theme/ThemeContext';

interface CircularTimetableProps {
  items: TimetableItem[];
  selectedDate: Date;
  onItemHover?: (item: TimetableItem | null) => void;
  onItemClick?: (item: TimetableItem) => void;
}

const CircularTimetable: React.FC<CircularTimetableProps> = ({ items, selectedDate, onItemHover, onItemClick }) => {
  const radius = 200;
  const centerX = 250;
  const centerY = 250;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [touchedItem, setTouchedItem] = useState<string | null>(null);
  const [lastTouchTime, setLastTouchTime] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });
  const [themeColors, setThemeColors] = useState({
    bgPrimary: '#000000',
    textPrimary: '#DEDEE5',
    textSecondary: '#8A8A95',
    textTertiary: '#5a5a5a',
    patternColor: '#676767', // Dark mode default, will be updated from theme
    solidFillColor: '#161616', // Dark mode default, will be updated from theme
    needleColor: '#8A8A95', // Dark mode default, will be updated from theme
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 780 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      // Cleanup timeout on unmount
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  // Update current time continuously for real-time needle movement
  useEffect(() => {
    // Update immediately
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentTime(now.getHours() + now.getMinutes() / 60);
    };
    
    updateCurrentTime();
    
    // Update every second for smooth movement
    const interval = setInterval(updateCurrentTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get CSS variables for theming
  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const textTertiary = computedStyle.getPropertyValue('--text-tertiary').trim() || '#5a5a5a';
      const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || '#8A8A95';
      // Get theme to determine fill pattern and solid fill colors
      const theme = root.getAttribute('data-theme') || 'dark';
      // Use specific colors based on theme
      const patternColor = theme === 'light' ? '#959595' : '#676767';
      const solidFill = theme === 'light' ? '#F1F1F1' : '#161616';
      const needleColor = theme === 'light' ? '#000000' : textSecondary; // Absolute black in light mode
      setThemeColors({
        bgPrimary: computedStyle.getPropertyValue('--bg-primary').trim() || '#000000',
        textPrimary: computedStyle.getPropertyValue('--text-primary').trim() || '#DEDEE5',
        textSecondary: textSecondary,
        textTertiary: textTertiary,
        patternColor: patternColor, // Theme-specific pattern colors
        solidFillColor: solidFill, // Theme-specific solid fill colors
        needleColor: needleColor, // Theme-specific needle color
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

  // Solid colors for patterns and lines (no opacity)
  const patternColor = themeColors.patternColor; // Color for hatched and dotted patterns
  const solidFillColor = themeColors.solidFillColor; // Color for solid fills
  const lineColorDefault = themeColors.textSecondary;

  // Get fill pattern type based on duration
  const getFillPattern = (item: TimetableItem): 'solid' | 'hatched' | 'dotted' => {
    let duration = item.endTime - item.startTime;
    if (duration <= 0) {
      duration += 24; // handle wrap-around
    }
    if (duration <= 1) return 'dotted';
    if (duration <= 3) return 'hatched';
    return 'solid';
  };

  // Convert hour to angle (24 at top = 0°, clockwise)
  // Hour 24 = 0°, Hour 6 = 90°, Hour 12 = 180°, Hour 18 = 270°
  const hourToAngle = (hour: number) => {
    // Convert hour (0-23) to angle where 24/0 is at top
    // For display: 24 at top, so hour 0 = 0°, hour 6 = 90°, etc.
    const displayHour = hour === 0 ? 24 : hour;
    return ((displayHour / 24) * 360 - 90) * (Math.PI / 180); // -90 to start at top
  };

  // Convert decimal hour (with minutes) to angle
  const decimalHourToAngle = (decimalHour: number) => {
    // Handle hour 0 as 24 for display
    const normalizedHour = decimalHour === 0 ? 24 : decimalHour >= 24 ? decimalHour - 24 : decimalHour;
    return ((normalizedHour / 24) * 360 - 90) * (Math.PI / 180);
  };

  // Check if selected date is today
  const isToday = (): boolean => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  // Render hour markers and labels for all 24 hours
  const renderHourMarkers = () => {
    const markers: React.ReactElement[] = [];
    // Render all hours (01–24)
    const hoursArray = Array.from({ length: 24 }, (_, i) => (i === 0 ? 24 : i));
    
    hoursArray.forEach((hour) => {
      const displayHour = hour === 24 ? 0 : hour; // Use 0 for calculations, 24 for display
      const angle = hourToAngle(displayHour);
      
      // Hour labels (01-24) around the perimeter
      const labelRadius = radius + 25;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);
      
      markers.push(
        <text
          key={`label-${hour}`}
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill={themeColors.textSecondary}
          fontFamily="Helvetica, Arial, sans-serif"
          fontWeight="500"
        >
          {hour.toString().padStart(2, '0')}
        </text>
      );
    });
    return markers;
  };

  // Helper function to check if two time ranges overlap
  const timeRangesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    // Normalize times (handle wrap-around)
    let normalizedEnd1 = end1;
    let normalizedEnd2 = end2;
    
    if (end1 < start1) {
      normalizedEnd1 = end1 + 24;
    }
    if (end2 < start2) {
      normalizedEnd2 = end2 + 24;
    }
    
    // Check overlap
    return start1 < normalizedEnd2 && start2 < normalizedEnd1;
  };

  // Get radius range based on level and whether item has children in the same timeslot
  const getRadiusRange = (item: TimetableItem): { inner: number; outer: number } => {
    const itemLevel = item.level ?? 2;
    
    // For daily view: tasks (level 2) behavior
    if (itemLevel === 2) {
      // Check if there are subtasks (level 3) that overlap with this task's timeslot
      const hasOverlappingSubtasks = items.some(otherItem => 
        otherItem.level === 3 && 
        otherItem.parentId === item.id &&
        timeRangesOverlap(item.startTime, item.endTime, otherItem.startTime, otherItem.endTime)
      );
      
      if (!hasOverlappingSubtasks) {
        // Task without overlapping subtasks: fill entire radius (0-100%)
        return { inner: 0, outer: radius };
      } else {
        // Task with overlapping subtasks: fill from center to 60% (0-60%)
        return { inner: 0, outer: radius * 0.6 };
      }
    }
    
    // Level 0 (Program): 0% to 25% of radius
    // Level 1 (Project): 25% to 50% of radius
    // Level 3 (Subtask): 60% to 100% of radius
    const levelRanges = [
      { inner: 0, outer: radius * 0.25 },           // Level 0
      { inner: radius * 0.25, outer: radius * 0.5 }, // Level 1
      { inner: radius * 0.6, outer: radius },         // Level 3
    ];
    
    const clampedLevel = Math.max(0, Math.min(3, itemLevel));
    // Level 2 is handled above, so skip it in the array (use index 0, 1, or 2 for levels 0, 1, 3)
    if (clampedLevel === 2) {
      // This shouldn't happen for level 2, but fallback
      return { inner: 0, outer: radius * 0.6 };
    }
    // Map level 3 to index 2
    const index = clampedLevel === 3 ? 2 : clampedLevel;
    return levelRanges[index];
  };

  // Calculate arc path for hover area
  const getArcPath = (startHour: number, endHour: number, innerRadius: number, outerRadius: number) => {
    const startAngle = hourToAngle(startHour);
    const endAngle = hourToAngle(endHour);
    
    const x1 = centerX + innerRadius * Math.cos(startAngle);
    const y1 = centerY + innerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(startAngle);
    const y2 = centerY + outerRadius * Math.sin(startAngle);
    const x3 = centerX + outerRadius * Math.cos(endAngle);
    const y3 = centerY + outerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(endAngle);
    const y4 = centerY + innerRadius * Math.sin(endAngle);
    
    // Calculate span for large arc flag
    let normalizedEnd = endHour;
    if (endHour < startHour) {
      normalizedEnd = endHour + 24;
    }
    const span = normalizedEnd - startHour;
    const largeArc = span > 12 ? 1 : 0;
    
    return `M ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1} Z`;
  };

  // Render items as simple lines with hover areas
  const renderItems = () => {
    return items.map((item) => {
      const isHovered = hoveredItem === item.id;
      // Use consistent color for all lines
      const lineColor = themeColors.textSecondary;
      
      // Get radius range based on item level and children
      const { inner: innerRadius, outer: outerRadius } = getRadiusRange(item);
      
      // Draw line at start time (using outer radius for visibility)
      const startAngle = hourToAngle(item.startTime);
      const startX = centerX + outerRadius * Math.cos(startAngle);
      const startY = centerY + outerRadius * Math.sin(startAngle);
      
      // Draw line at end time (using outer radius for visibility)
      const endAngle = hourToAngle(item.endTime);
      const endX = centerX + outerRadius * Math.cos(endAngle);
      const endY = centerY + outerRadius * Math.sin(endAngle);
      
      // Create hover area using the item's radius range
      const hoverInnerRadius = innerRadius;
      const hoverOuterRadius = outerRadius;
      
      // Handle touch events for mobile
      const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        
        e.preventDefault();
        e.stopPropagation(); // Prevent background touch handler from firing
        
        // Clear any pending timeout
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }
        
        const currentTime = Date.now();
        const timeSinceLastTouch = currentTime - lastTouchTime;
        
        // If same item touched within 400ms, treat as double-tap and open drawer
        if (touchedItem === item.id && timeSinceLastTouch < 400) {
          setTouchedItem(null);
          setHoveredItem(null);
          if (onItemHover) onItemHover(null);
          if (onItemClick) onItemClick(item);
          setLastTouchTime(0);
        } else {
          // Different item or first touch - show hover effect immediately and keep it permanent
          setTouchedItem(item.id);
          setHoveredItem(item.id);
          if (onItemHover) onItemHover(item);
          setLastTouchTime(currentTime);
        }
      };

      return (
        <g 
          key={item.id}
          data-item={item.id}
          onMouseEnter={() => {
            if (!isMobile) {
              setHoveredItem(item.id);
              if (onItemHover) onItemHover(item);
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              setHoveredItem(null);
              if (onItemHover) onItemHover(null);
            }
          }}
          onClick={() => {
            if (!isMobile && onItemClick) {
              onItemClick(item);
            }
          }}
          onTouchStart={handleTouchStart}
          style={{ cursor: 'pointer', touchAction: 'manipulation' }}
        >
          {/* Fill area - solid, hatched, or dotted based on item */}
          {(() => {
            const fillPattern = getFillPattern(item);
            return (
              <path
                d={getArcPath(item.startTime, item.endTime, hoverInnerRadius, hoverOuterRadius)}
                fill={
                  fillPattern === 'solid' 
                    ? solidFillColor 
                    : fillPattern === 'hatched' 
                      ? 'url(#hatchPattern)' 
                      : 'url(#dotPattern)'
                }
                fillOpacity={1}
                stroke="none"
                style={{ pointerEvents: 'all' }}
              />
            );
          })()}
          
          {/* Hover area with highlight effect */}
          {isHovered && (
            <path
              d={getArcPath(item.startTime, item.endTime, hoverInnerRadius, hoverOuterRadius)}
              fill={themeColors.textPrimary}
              fillOpacity={0.2}
              stroke="none"
              style={{ pointerEvents: 'all', transition: 'fill-opacity 0.15s' }}
            />
          )}
          
          {/* Visible radial lines - from inner to outer radius */}
          <line
            x1={centerX + innerRadius * Math.cos(startAngle)}
            y1={centerY + innerRadius * Math.sin(startAngle)}
            x2={startX}
            y2={startY}
            stroke={lineColor}
            strokeWidth="0.5"
          />
          <line
            x1={centerX + innerRadius * Math.cos(endAngle)}
            y1={centerY + innerRadius * Math.sin(endAngle)}
            x2={endX}
            y2={endY}
            stroke={lineColor}
            strokeWidth="0.5"
          />
          
          {/* Arc lines along inner and outer edges */}
          {(() => {
            const startAngleRad = hourToAngle(item.startTime);
            const endAngleRad = hourToAngle(item.endTime);
            const normalizedEnd = item.endTime < item.startTime ? item.endTime + 24 : item.endTime;
            const span = normalizedEnd - item.startTime;
            const largeArc = span > 12 ? 1 : 0;
            
            // Outer arc
            const outerStartX = centerX + outerRadius * Math.cos(startAngleRad);
            const outerStartY = centerY + outerRadius * Math.sin(startAngleRad);
            const outerEndX = centerX + outerRadius * Math.cos(endAngleRad);
            const outerEndY = centerY + outerRadius * Math.sin(endAngleRad);
            
            // Inner arc
            const innerStartX = centerX + innerRadius * Math.cos(startAngleRad);
            const innerStartY = centerY + innerRadius * Math.sin(startAngleRad);
            const innerEndX = centerX + innerRadius * Math.cos(endAngleRad);
            const innerEndY = centerY + innerRadius * Math.sin(endAngleRad);
            
            return (
              <>
                {/* Outer arc */}
                <path
                  d={`M ${outerStartX} ${outerStartY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="0.5"
                />
                {/* Inner arc */}
                <path
                  d={`M ${innerStartX} ${innerStartY} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerEndX} ${innerEndY}`}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="0.5"
                />
              </>
            );
          })()}
        </g>
      );
    });
  };

  // Check if there are any items
  const hasItems = items && items.length > 0;

  // Handle touch on empty area (background) to clear hover
  const handleBackgroundTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isMobile) return;
    
    const target = e.target as Element;
    // Check if touch is on an item (g element with data-item attribute or its children)
    const isItemElement = target.closest('g[data-item]') !== null;
    
    // Only clear if touch is NOT on an item (empty space)
    if (!isItemElement) {
      setTouchedItem(null);
      setHoveredItem(null);
      if (onItemHover) onItemHover(null);
      setLastTouchTime(0);
    }
  };

  return (
    <CircularContainer>
      <svg 
        width="500" 
        height="500" 
        viewBox="0 0 500 500"
        onTouchStart={handleBackgroundTouch}
        style={{ touchAction: 'manipulation' }}
      >
        {/* Define fill patterns */}
        <defs>
          {/* Hatched pattern - dense, 45 degree tilt */}
          <pattern
            id="hatchPattern"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45 4 4)"
          >
            <line
              x1="0"
              y1="4"
              x2="8"
              y2="4"
              stroke={patternColor}
              strokeWidth="0.5"
            />
          </pattern>
          {/* Dotted pattern - dense */}
          <pattern
            id="dotPattern"
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="3"
              cy="3"
              r="1"
              fill={patternColor}
            />
          </pattern>
        </defs>
        
        {/* Dark background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 30}
          fill={themeColors.bgPrimary}
        />
        
        {/* Outer circle border - always show */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={themeColors.textSecondary}
          strokeWidth="0.5"
        />
        
        {/* Always show all 24 hour markers */}
        {renderHourMarkers()}
        
        {hasItems ? (
          <>
            {/* Items as lines */}
            {renderItems()}
          </>
        ) : (
          /* Empty state message - just circle and text */
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill={themeColors.textPrimary}
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="normal"
            opacity="0.6"
          >
            empty
          </text>
        )}
        
        {/* Current time indicator line - rendered last to appear on top, only show for today */}
        {isToday() && (() => {
          const currentAngle = decimalHourToAngle(currentTime);
          // Start at 90% of radius, end at 100% (edge)
          const startRadius = radius * 0.9;
          const endRadius = radius;
          const x1 = centerX + startRadius * Math.cos(currentAngle);
          const y1 = centerY + startRadius * Math.sin(currentAngle);
          const x2 = centerX + endRadius * Math.cos(currentAngle);
          const y2 = centerY + endRadius * Math.sin(currentAngle);
          
          return (
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={themeColors.needleColor}
              strokeWidth="1.5"
            />
          );
        })()}
      </svg>
    </CircularContainer>
  );
};

export default CircularTimetable;

const CircularContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 500px;
  height: 500px;
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
`;
