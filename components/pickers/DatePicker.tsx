'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

// Constants
const MONTHS_IN_YEAR = 12;
const DAYS_IN_WEEK = 7;
const CALENDAR_GRID_SIZE = 42; // 6 weeks × 7 days
const LAST_MONTH_INDEX = 11;
const FIRST_MONTH_INDEX = 0;
const SCROLL_THRESHOLD = 50; // Pixels of scroll before changing month

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(value.getMonth());
  const [currentYear, setCurrentYear] = useState(value.getFullYear());
  const [tempDate, setTempDate] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Update state when value prop changes
  useEffect(() => {
    setTempDate(value);
    setCurrentMonth(value.getMonth());
    setCurrentYear(value.getFullYear());
  }, [value]);

  // Ensure we only portal after mounting (document.body exists)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days = [];

  // Previous month days
  const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }

  // Next month days
  const remainingDays = CALENDAR_GRID_SIZE - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const navigateMonth = useCallback((direction: number) => {
    if (direction > 0) {
      if (currentMonth === LAST_MONTH_INDEX) {
        setCurrentMonth(FIRST_MONTH_INDEX);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === FIRST_MONTH_INDEX) {
        setCurrentMonth(LAST_MONTH_INDEX);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  }, [currentMonth, currentYear]);

  // Allow scrolling to navigate months even when mouse is over other elements (like drawer)
  useEffect(() => {
    let scrollAccumulator = 0;

    const handleWheel = (event: WheelEvent) => {
      if (pickerRef.current) {
        const rect = pickerRef.current.getBoundingClientRect();
        const isOverCalendar = (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );

        if (!isOverCalendar) {
          event.preventDefault();
          scrollAccumulator += event.deltaY;
          
          if (Math.abs(scrollAccumulator) >= SCROLL_THRESHOLD) {
            navigateMonth(scrollAccumulator > 0 ? 1 : -1);
            scrollAccumulator = 0;
          }
        }
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, [navigateMonth]);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setTempDate(newDate);
    onChange(newDate);
    onClose();
  };

  const handleToday = () => {
    const today = new Date();
    setTempDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    onChange(today);
    onClose();
  };

  const pickerContent = (
    <>
      <PickerOverlay onClick={onClose} />
      <PickerPopup ref={pickerRef}>
        <PickerHeader>
          <MonthNavButton onClick={() => navigateMonth(-1)}>‹</MonthNavButton>
          <MonthYear>
            <MonthSelect
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
            >
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx}>{month}</option>
              ))}
            </MonthSelect>
            <YearInput
              type="number"
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
            />
          </MonthYear>
          <MonthNavButton onClick={() => navigateMonth(1)}>›</MonthNavButton>
        </PickerHeader>

        <PickerContent ref={contentRef}>
          <CalendarSection>
            <DayNames>
              {dayNames.map((day, idx) => (
                <DayName key={idx}>{day}</DayName>
              ))}
            </DayNames>
            <CalendarGrid>
              {days.map(({ day, isCurrentMonth }, idx) => {
                const today = new Date();
                const isSelected = isCurrentMonth && 
                  day === tempDate.getDate() && 
                  currentMonth === tempDate.getMonth() &&
                  currentYear === tempDate.getFullYear();
                const isToday = isCurrentMonth && 
                  day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear() &&
                  !isSelected;
                
                return (
                  <CalendarDay
                    key={idx}
                    $isCurrentMonth={isCurrentMonth}
                    $isSelected={isSelected}
                    $isToday={isToday}
                    onClick={() => isCurrentMonth && handleDateSelect(day)}
                  >
                    {day}
                  </CalendarDay>
                );
              })}
            </CalendarGrid>
          </CalendarSection>
        </PickerContent>

        <PickerFooter>
          <FooterButton onClick={handleToday}>Today</FooterButton>
        </PickerFooter>
      </PickerPopup>
    </>
  );

  // Render via portal to document.body to escape stacking contexts
  if (!isMounted || typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(pickerContent, document.body);
};

export default DatePicker;

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 20000; /* sit above any headers/footers */
`;

const PickerPopup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-primary, #ffffff);
  border: var(--border-width) solid var(--border-primary, #d0d0d0);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary, #111111);
  z-index: 20001;
  min-width: 300px;
  padding: 1rem;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  box-sizing: border-box;
`;

const PickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const MonthNavButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-primary, #111111);
  font-size: 18px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--text-primary, #000000);
  }
`;

const MonthYear = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MonthSelect = styled.select`
  background: var(--bg-primary, #ffffff);
  border: var(--border-width) solid var(--border-primary, #d0d0d0);
  color: var(--text-primary, #111111);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  padding: 0.25rem 0.5rem;
  outline: none;
  cursor: pointer;
`;

const YearInput = styled.input`
  background: var(--bg-primary, #ffffff);
  border: var(--border-width) solid var(--border-primary, #d0d0d0);
  color: var(--text-primary, #111111);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  padding: 0.25rem 0.5rem;
  width: 80px;
  outline: none;
`;

const PickerContent = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const CalendarSection = styled.div`
  flex: 1;
`;

const DayNames = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
`;

const DayName = styled.div`
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--text-secondary, #666666);
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.25rem;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
`;

const CalendarDay = styled.div<{ $isCurrentMonth: boolean; $isSelected: boolean; $isToday: boolean }>`
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  cursor: ${props => props.$isCurrentMonth ? 'pointer' : 'default'};
  color: ${props => 
    props.$isSelected ? 'var(--text-primary, #000000)' : 
    props.$isCurrentMonth ? 'var(--text-primary, #111111)' : 'var(--text-tertiary, #777777)'};
  background: ${props => 
    props.$isToday ? 'var(--bg-tertiary, #f2f2f2)' : 'transparent'};
  border: ${props => 
    props.$isSelected ? '1px solid var(--border-secondary, #999999)' : '1px solid transparent'};
  transition: all var(--transition-fast);

  &:hover {
    ${props => props.$isCurrentMonth ? `
      background: ${props.$isSelected ? 'transparent' : props.$isToday ? 'var(--bg-tertiary, #f2f2f2)' : 'var(--bg-hover, #ededed)'};
      border-color: ${props.$isSelected ? 'var(--border-secondary, #999999)' : 'var(--border-tertiary, #c8c8c8)'};
    ` : ''}
  }
`;

const PickerFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: var(--border-width) solid var(--border-primary, #d0d0d0);
`;

const FooterButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #666666);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;

  &:hover {
    color: var(--text-primary, #111111);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;
