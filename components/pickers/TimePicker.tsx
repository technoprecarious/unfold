'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

interface TimePickerProps {
  value: string; // HH:MM format or ISO string (we'll extract time)
  onChange: (value: string) => void; // Returns HH:MM format
  placeholder?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  
  // Parse value to get hours and minutes
  const parseTime = (val: string): { hour: number; minute: number } => {
    if (!val || val === '') {
      const now = new Date();
      return { hour: now.getHours(), minute: now.getMinutes() };
    }
    
    // Try to parse as HH:MM format
    const timeMatch = val.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return {
        hour: parseInt(timeMatch[1], 10),
        minute: parseInt(timeMatch[2], 10),
      };
    }
    
    // Try to parse as ISO string and extract time
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return {
          hour: date.getHours(),
          minute: date.getMinutes(),
        };
      }
    } catch (e) {
      // Ignore
    }
    
    // Default to current time
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  };
  
  const { hour: initialHour, minute: initialMinute } = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [tempHour, setTempHour] = useState(initialHour);
  const [tempMinute, setTempMinute] = useState(initialMinute);
  const [hourInput, setHourInput] = useState(String(initialHour).padStart(2, '0'));
  const [minuteInput, setMinuteInput] = useState(String(initialMinute).padStart(2, '0'));
  const [isEditingHour, setIsEditingHour] = useState(false);
  const [isEditingMinute, setIsEditingMinute] = useState(false);
  
  // Update state when value prop changes
  useEffect(() => {
    const { hour, minute } = parseTime(value);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    if (!isOpen) {
      setTempHour(hour);
      setTempMinute(minute);
      setHourInput(String(hour).padStart(2, '0'));
      setMinuteInput(String(minute).padStart(2, '0'));
    }
  }, [value, isOpen]);

  // Update input values when temp values change (from scrolling)
  useEffect(() => {
    if (!isEditingHour) {
      setHourInput(String(tempHour).padStart(2, '0'));
    }
  }, [tempHour, isEditingHour]);

  useEffect(() => {
    if (!isEditingMinute) {
      setMinuteInput(String(tempMinute).padStart(2, '0'));
    }
  }, [tempMinute, isEditingMinute]);
  
  const formatDisplayValue = (): string => {
    if (isOpen) {
      return `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    } else {
      if (!value || value === '') return '';
      const { hour, minute } = parseTime(value);
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  };
  
  const handleTimeChange = (hour: number, minute: number) => {
    setTempHour(hour);
    setTempMinute(minute);
  };

  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHourInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num < 24) {
      setTempHour(num);
    }
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinuteInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num < 60) {
      setTempMinute(num);
    }
  };

  const handleHourBlur = () => {
    setIsEditingHour(false);
    const num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 0) {
      setTempHour(0);
      setHourInput('00');
    } else if (num >= 24) {
      setTempHour(23);
      setHourInput('23');
    } else {
      setTempHour(num);
      setHourInput(String(num).padStart(2, '0'));
    }
  };

  const handleMinuteBlur = () => {
    setIsEditingMinute(false);
    const num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) {
      setTempMinute(0);
      setMinuteInput('00');
    } else if (num >= 60) {
      setTempMinute(59);
      setMinuteInput('59');
    } else {
      setTempMinute(num);
      setMinuteInput(String(num).padStart(2, '0'));
    }
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };
  
  const handleSave = () => {
    const timeString = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    setSelectedHour(tempHour);
    setSelectedMinute(tempMinute);
    setIsOpen(false);
    onChange(timeString);
  };
  
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };
  
  const handleNow = () => {
    const now = new Date();
    setTempHour(now.getHours());
    setTempMinute(now.getMinutes());
  };

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
      
      // Only update if position changed significantly (more than 1px)
      const positionChanged = Math.abs(inputRect.top - lastInputTop) > 1 || 
                             Math.abs(inputRect.left - lastInputLeft) > 1;
      
      if (!positionChanged && lastInputTop !== 0) {
        return; // Skip update if position hasn't changed
      }
      
      lastInputTop = inputRect.top;
      lastInputLeft = inputRect.left;
      
      // Estimate popup height (will be refined after render)
      const estimatedPopupHeight = 300;
      
      // Position below if there's enough space, otherwise above
      const positionBelow = spaceBelow >= estimatedPopupHeight || spaceBelow > spaceAbove;
      
      setPopupStyle({
        top: positionBelow ? `${inputRect.bottom + 4}px` : 'auto',
        bottom: positionBelow ? 'auto' : `${viewportHeight - inputRect.top + 4}px`,
        left: `${inputRect.left}px`,
        width: `${inputRect.width}px`,
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
            left: `${inputRect2.left}px`,
            width: `${inputRect2.width}px`,
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
      const drawerContent = document.querySelector('[data-drawer-content]') as HTMLElement;
      if (drawerContent && popupRef.current) {
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

  // Reset temp values when opening
  useEffect(() => {
    if (isOpen) {
      const { hour, minute } = parseTime(value);
      setTempHour(hour);
      setTempMinute(minute);
      setHourInput(String(hour).padStart(2, '0'));
      setMinuteInput(String(minute).padStart(2, '0'));
      setIsEditingHour(false);
      setIsEditingMinute(false);
    }
  }, [isOpen, value]);
  
  const displayText = formatDisplayValue();
  
  return (
    <PickerContainer>
      <InputWrapper ref={inputRef} onClick={() => setIsOpen(!isOpen)}>
        <InputValue>{displayText || placeholder || 'Select time'}</InputValue>
      </InputWrapper>
      
      {isOpen && (
        <>
          <PickerOverlay onClick={() => setIsOpen(false)} />
          <PickerPopup ref={popupRef} style={popupStyle}>
            <PickerContent>
              <TimeSection>
                <TimeLabel>Time</TimeLabel>
                <TimeDisplay>
                  <TimeInput
                    type="text"
                    value={hourInput}
                    onChange={handleHourInputChange}
                    onFocus={() => setIsEditingHour(true)}
                    onBlur={handleHourBlur}
                    onKeyDown={handleHourKeyDown}
                    maxLength={2}
                  />
                  <TimeSeparator>:</TimeSeparator>
                  <TimeInput
                    type="text"
                    value={minuteInput}
                    onChange={handleMinuteInputChange}
                    onFocus={() => setIsEditingMinute(true)}
                    onBlur={handleMinuteBlur}
                    onKeyDown={handleMinuteKeyDown}
                    maxLength={2}
                  />
                </TimeDisplay>
                <TimeScrollers>
                  <TimeScroll>
                    {Array.from({ length: 24 }, (_, i) => {
                      const now = new Date();
                      const isCurrentHour = i === now.getHours() && i !== tempHour;
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
                        tempHour === now.getHours() &&
                        i !== tempMinute;
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
              <FooterButton onClick={handleNow}>Now</FooterButton>
              <FooterButton onClick={handleSave}>Save</FooterButton>
            </PickerFooter>
          </PickerPopup>
        </>
      )}
    </PickerContainer>
  );
};

export default TimePicker;

// Styled Components
const PickerContainer = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div`
  width: 100%;
  background: var(--bg-primary, #0a0a0a);
  border: 1px solid var(--bg-tertiary, #1a1a1a);
  color: var(--text-primary, #DEDEE5);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  padding: var(--spacing-5);
  outline: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all var(--transition-fast);

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

const PickerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--shadow-overlay-strong);
  z-index: var(--z-picker-overlay);
`;

const PickerPopup = styled.div`
  position: fixed;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-primary, #2a2a2a);
  box-shadow: var(--shadow-md);
  z-index: var(--z-picker-popup);
  min-width: 280px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
  padding: var(--spacing-8);
  box-sizing: border-box;
  overflow-y: auto;
`;

const PickerContent = styled.div`
  display: flex;
  gap: var(--spacing-8);
`;

const TimeSection = styled.div`
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
`;

const TimeLabel = styled.div`
  font-size: var(--font-size-base);
  color: var(--text-secondary, #8A8A95);
  font-family: var(--font-family-base);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-tight);
  margin-bottom: var(--spacing-2);
`;

const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.25rem;
  background: var(--bg-tertiary, #1a1a1a);
`;

const TimeInput = styled.input`
  background: transparent;
  border: none;
  color: var(--text-primary, #DEDEE5);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  padding: var(--spacing-1) var(--spacing-3);
  min-width: var(--spacing-px-32);
  text-align: center;
  outline: none;
  
  &:focus {
    background: var(--bg-hover, #2a2a2a);
  }
`;

const TimeSeparator = styled.span`
  color: var(--text-primary, #DEDEE5);
  font-size: var(--font-size-lg);
`;

const TimeScrollers = styled.div`
  display: flex;
  gap: var(--spacing-5);
`;

const TimeScroll = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
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
  padding: var(--spacing-5);
  text-align: center;
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  color: ${props => props.$active ? 'var(--text-primary, #ffffff)' : 'var(--text-primary, #DEDEE5)'};
  background: ${props => props.$isCurrent ? 'var(--bg-hover, #2a2a2a)' : 'transparent'};
  border: ${props => props.$active ? '1px solid var(--border-secondary, #8A8A95)' : '1px solid transparent'};
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--text-primary, #ffffff);
    background: ${props => props.$active ? 'transparent' : props.$isCurrent ? 'var(--bg-hover, #2a2a2a)' : 'var(--bg-hover, #2a2a2a)'};
    border-color: ${props => props.$active ? 'var(--border-secondary, #8A8A95)' : 'var(--border-tertiary, #3a3a3a)'};
  }
`;

const PickerFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-5);
  margin-top: var(--spacing-8);
  padding-top: var(--spacing-8);
`;

const FooterButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #8A8A95);
  font-size: var(--font-size-md);
  font-family: var(--font-family-base);
  padding: var(--spacing-5) var(--spacing-8);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;

  &:hover {
    color: var(--text-primary, #ffffff);
    text-decoration: underline;
    text-decoration-thickness: var(--underline-thickness);
    text-underline-offset: var(--underline-offset);
  }
`;
