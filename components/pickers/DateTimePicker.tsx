'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

interface DateTimePickerProps {
  value: string; // ISO string format
  onChange: (value: string) => void;
  placeholder?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  
  // Parse the value
  const dateValue = value ? new Date(value) : new Date();
  const [selectedDate, setSelectedDate] = useState(dateValue);
  const [selectedHour, setSelectedHour] = useState(dateValue.getHours());
  const [selectedMinute, setSelectedMinute] = useState(dateValue.getMinutes());
  const [currentMonth, setCurrentMonth] = useState(dateValue.getMonth());
  const [currentYear, setCurrentYear] = useState(dateValue.getFullYear());
  
  // Temporary state for unsaved changes
  const [tempDate, setTempDate] = useState(dateValue);
  const [tempHour, setTempHour] = useState(dateValue.getHours());
  const [tempMinute, setTempMinute] = useState(dateValue.getMinutes());
  
  // Position popup based on input field position
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;

    let rafId: number | null = null;
    let lastInputTop = 0;
    let lastInputLeft = 0;

    const updatePosition = () => {
      if (!inputRef.current) return;
      
      const inputRect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;
      const isMobile = window.innerWidth < 780;
      
      // Only update if position changed significantly (more than 1px)
      const positionChanged = Math.abs(inputRect.top - lastInputTop) > 1 || 
                             Math.abs(inputRect.left - lastInputLeft) > 1;
      
      if (!positionChanged && lastInputTop !== 0) {
        return; // Skip update if position hasn't changed
      }
      
      lastInputTop = inputRect.top;
      lastInputLeft = inputRect.left;
      
      // Estimate popup height (will be refined after render)
      const estimatedPopupHeight = 400;
      
      // Position below if there's enough space, otherwise above
      const positionBelow = spaceBelow >= estimatedPopupHeight || spaceBelow > spaceAbove;
      
      setPopupStyle({
        top: positionBelow ? `${inputRect.bottom + 4}px` : 'auto',
        bottom: positionBelow ? 'auto' : `${viewportHeight - inputRect.top + 4}px`,
        left: isMobile ? '50%' : `${inputRect.left}px`,
        transform: isMobile ? 'translateX(-50%)' : 'none',
        width: isMobile ? 'calc(100vw - 2rem)' : `${inputRect.width}px`,
        maxWidth: isMobile ? '420px' : undefined,
        minWidth: isMobile ? '0' : undefined,
      });
      
      // Refine position after popup is rendered
      requestAnimationFrame(() => {
        if (popupRef.current && inputRef.current) {
          const popupHeight = popupRef.current.offsetHeight;
          const inputRect2 = inputRef.current.getBoundingClientRect();
          const spaceBelow2 = viewportHeight - inputRect2.bottom;
          const spaceAbove2 = inputRect2.top;
          const positionBelow2 = spaceBelow2 >= popupHeight || spaceBelow2 > spaceAbove2;
          
          setPopupStyle({
            top: positionBelow2 ? `${inputRect2.bottom + 4}px` : 'auto',
            bottom: positionBelow2 ? 'auto' : `${viewportHeight - inputRect2.top + 4}px`,
            left: isMobile ? '50%' : `${inputRect2.left}px`,
            transform: isMobile ? 'translateX(-50%)' : 'none',
            width: isMobile ? 'calc(100vw - 2rem)' : `${inputRect2.width}px`,
            maxWidth: isMobile ? '420px' : undefined,
            minWidth: isMobile ? '0' : undefined,
          });
        }
      });
    };

    // Throttled update function
    const throttledUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    // Initial position
    updatePosition();
    
    // Update on resize (immediate)
    window.addEventListener('resize', updatePosition);
    // Update on scroll (throttled)
    window.addEventListener('scroll', throttledUpdate, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', throttledUpdate, true);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isOpen]);

  // Allow scrolling the Drawer content even when picker is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWheel = (event: WheelEvent) => {
      // Find the Drawer's content area
      const drawerContent = document.querySelector('[data-drawer-content]') as HTMLElement;
      if (drawerContent && popupRef.current) {
        // Check if mouse is over the picker popup
        const rect = popupRef.current.getBoundingClientRect();
        const isOverPicker = (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );

        // If not over picker, allow scrolling the drawer content
        if (!isOverPicker) {
          event.preventDefault();
          drawerContent.scrollTop += event.deltaY;
        }
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  // Update state when value prop changes
  useEffect(() => {
    if (value && value !== '') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setSelectedHour(date.getHours());
          setSelectedMinute(date.getMinutes());
          setCurrentMonth(date.getMonth());
          setCurrentYear(date.getFullYear());
          // Also update temp values if picker is closed
          if (!isOpen) {
            setTempDate(date);
            setTempHour(date.getHours());
            setTempMinute(date.getMinutes());
          }
        } else {
          console.error('Invalid date value (NaN):', value);
        }
      } catch (e) {
        console.error('Invalid date value:', value, e);
      }
    } else {
      // Reset to current date if value is cleared
      const now = new Date();
      setSelectedDate(now);
      setSelectedHour(now.getHours());
      setSelectedMinute(now.getMinutes());
      setCurrentMonth(now.getMonth());
      setCurrentYear(now.getFullYear());
      // Also update temp values if picker is closed
      if (!isOpen) {
        setTempDate(now);
        setTempHour(now.getHours());
        setTempMinute(now.getMinutes());
      }
    }
  }, [value, isOpen]);

  const formatDisplayValue = (): string => {
    // Show temp value while picker is open, otherwise show saved value from prop
    if (isOpen) {
      // While picker is open, show temp selection
      const day = String(tempDate.getDate()).padStart(2, '0');
      const month = String(tempDate.getMonth() + 1).padStart(2, '0');
      const year = tempDate.getFullYear();
      const hours = String(tempHour).padStart(2, '0');
      const minutes = String(tempMinute).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } else {
      // When picker is closed, always read directly from value prop (like other fields)
      if (!value || value === '') return '';
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return '';
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year}, ${hours}:${minutes}`;
      } catch (e) {
        return '';
      }
    }
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day, tempHour, tempMinute);
    setTempDate(newDate);
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setTempHour(hour);
    setTempMinute(minute);
    const newDate = new Date(tempDate);
    newDate.setHours(hour, minute);
    setTempDate(newDate);
  };
  
  const handleSave = () => {
    const finalDate = new Date(tempDate);
    finalDate.setHours(tempHour, tempMinute);
    const isoString = finalDate.toISOString();
    setIsOpen(false);
    // Just call onChange - the parent will update the state, and the value prop will update
    // The component will re-render with the new value prop, and formatDisplayValue will show it
    onChange(isoString);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    setTempDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setTempHour(today.getHours());
    setTempMinute(today.getMinutes());
  };
  
  // Reset temp values when opening
  useEffect(() => {
    if (isOpen) {
      const date = value ? new Date(value) : new Date();
      setTempDate(date);
      setTempHour(date.getHours());
      setTempMinute(date.getMinutes());
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [isOpen, value]);

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
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const navigateMonth = (direction: number) => {
    if (direction > 0) {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const displayText = formatDisplayValue();
  
  return (
    <PickerContainer>
      <InputWrapper ref={inputRef} onClick={() => setIsOpen(!isOpen)}>
        <InputValue>{displayText || placeholder || 'Select date and time'}</InputValue>
      </InputWrapper>
      
      {isOpen && (
        <>
          <PickerOverlay onClick={() => setIsOpen(false)} />
          <PickerPopup ref={popupRef} style={popupStyle}>
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

            <PickerContent>
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
                      !isSelected; // Only show today fill if not selected
                    
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

              <TimeSection>
                <TimeLabel>Time</TimeLabel>
                <TimeDisplay>
                  <TimeButton
                    $active={true}
                    onClick={() => {}}
                  >
                    {String(tempHour).padStart(2, '0')}
                  </TimeButton>
                  <TimeSeparator>:</TimeSeparator>
                  <TimeButton
                    $active={true}
                    onClick={() => {}}
                  >
                    {String(tempMinute).padStart(2, '0')}
                  </TimeButton>
                </TimeDisplay>
                <TimeScrollers>
                  <TimeScroll>
                    {Array.from({ length: 24 }, (_, i) => {
                      const now = new Date();
                      const isCurrentHour = i === now.getHours() && 
                        tempDate.getDate() === now.getDate() &&
                        tempDate.getMonth() === now.getMonth() &&
                        tempDate.getFullYear() === now.getFullYear() &&
                        i !== tempHour; // Only show current fill if not selected
                      return (
                        <TimeOption
                          key={i}
                          $active={i === tempHour}
                          $isCurrent={isCurrentHour}
                          onClick={() => handleTimeChange(i, tempMinute)}
                        >
                          {String(i).padStart(2, '0')}
                        </TimeOption>
                      );
                    })}
                  </TimeScroll>
                  <TimeScroll>
                    {Array.from({ length: 60 }, (_, i) => {
                      const now = new Date();
                      const isCurrentMinute = i === now.getMinutes() && 
                        tempDate.getDate() === now.getDate() &&
                        tempDate.getMonth() === now.getMonth() &&
                        tempDate.getFullYear() === now.getFullYear() &&
                        tempHour === now.getHours() &&
                        i !== tempMinute; // Only show current fill if not selected
                      return (
                        <TimeOption
                          key={i}
                          $active={i === tempMinute}
                          $isCurrent={isCurrentMinute}
                          onClick={() => handleTimeChange(tempHour, i)}
                        >
                          {String(i).padStart(2, '0')}
                        </TimeOption>
                      );
                    })}
                  </TimeScroll>
                </TimeScrollers>
              </TimeSection>
            </PickerContent>

            <PickerFooter>
              <FooterButton onClick={handleClear}>Clear</FooterButton>
              <FooterButton onClick={handleToday}>Today</FooterButton>
              <FooterButton onClick={handleSave}>Save</FooterButton>
            </PickerFooter>
          </PickerPopup>
        </>
      )}
    </PickerContainer>
  );
};

export default DateTimePicker;

const PickerContainer = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div`
  width: 100%;
  background: var(--bg-primary, #0a0a0a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.5rem;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary, #1a1a1a);
  }

  &:focus-within {
    background: var(--bg-tertiary, #1a1a1a);
    border-color: var(--border-secondary, #8A8A95);
  }
`;

const InputValue = styled.span`
  flex: 1;
  color: var(--text-primary, #DEDEE5);
`;

const CalendarIcon = styled.span`
  font-size: 14px;
  opacity: 0.7;
  margin-left: 0.5rem;
`;

const PickerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 20000;
`;

const PickerPopup = styled.div`
  position: fixed;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-primary, #2a2a2a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 20001;
  min-width: 360px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
  padding: 0.75rem;
  box-sizing: border-box;
  overflow-y: auto;

  @media (max-width: 779px) {
    min-width: 0;
    width: calc(100vw - 2rem);
    max-width: 420px;
  }
`;

const PickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const MonthNavButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-primary, #DEDEE5);
  font-size: 18px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--text-primary, #ffffff);
  }
`;

const MonthYear = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MonthSelect = styled.select`
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-primary, #2a2a2a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.25rem 0.5rem;
  outline: none;
  cursor: pointer;
`;

const YearInput = styled.input`
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-primary, #2a2a2a);
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.25rem 0.5rem;
  width: 80px;
  outline: none;
`;

const PickerContent = styled.div`
  display: flex;
  gap: 1rem;
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
  font-size: 11px;
  color: var(--text-secondary, #8A8A95);
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
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  cursor: ${props => props.$isCurrentMonth ? 'pointer' : 'default'};
  color: ${props => 
    props.$isSelected ? 'var(--text-primary, #ffffff)' : 
    props.$isCurrentMonth ? 'var(--text-primary, #DEDEE5)' : 'var(--text-tertiary, #5a5a5d)'};
  background: ${props => 
    props.$isToday ? 'var(--bg-hover, #2a2a2a)' : 'transparent'};
  border: ${props => 
    props.$isSelected ? '1px solid var(--border-secondary, #8A8A95)' : '1px solid transparent'};
  transition: all 0.2s;

  &:hover {
    ${props => props.$isCurrentMonth ? `
      background: ${props.$isSelected ? 'transparent' : props.$isToday ? 'var(--bg-hover, #2a2a2a)' : 'var(--bg-hover, #2a2a2a)'};
      border-color: ${props.$isSelected ? 'var(--border-secondary, #8A8A95)' : 'var(--border-tertiary, #3a3a3a)'};
    ` : ''}
  }
`;

const TimeSection = styled.div`
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const TimeLabel = styled.div`
  font-size: 11px;
  color: var(--text-secondary, #8A8A95);
  font-family: Helvetica, Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
`;

const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.25rem;
  background: var(--bg-tertiary, #1a1a1a);
`;

const TimeButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.15rem 0.3rem;
  cursor: pointer;
  min-width: 32px;
`;

const TimeSeparator = styled.span`
  color: var(--text-primary, #DEDEE5);
  font-size: 12px;
`;

const TimeScrollers = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const TimeScroll = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-height: 150px;
  overflow-y: auto;
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const TimeOption = styled.div<{ $active: boolean; $isCurrent?: boolean }>`
  padding: 0.25rem;
  text-align: center;
  font-size: 11px;
  font-family: Helvetica, Arial, sans-serif;
  color: ${props => props.$active ? 'var(--text-primary, #ffffff)' : 'var(--text-primary, #DEDEE5)'};
  background: ${props => props.$isCurrent ? 'var(--bg-hover, #2a2a2a)' : 'transparent'};
  border: ${props => props.$active ? '1px solid var(--border-secondary, #8A8A95)' : '1px solid transparent'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--text-primary, #ffffff);
    background: ${props => props.$active ? 'transparent' : props.$isCurrent ? 'var(--bg-hover, #2a2a2a)' : 'var(--bg-hover, #2a2a2a)'};
    border-color: ${props => props.$active ? 'var(--border-secondary, #8A8A95)' : 'var(--border-tertiary, #3a3a3a)'};
  }
`;

const PickerFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-primary, #2a2a2a);
`;

const FooterButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: 12px;
  font-family: Helvetica, Arial, sans-serif;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: 0.5px;
    text-underline-offset: 2px;
  }
`;

