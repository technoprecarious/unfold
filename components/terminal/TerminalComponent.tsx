'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { UnfoldCLI } from '@/lib/cli';
import { useTheme } from '@/lib/theme/ThemeContext';

interface TerminalComponentProps {
  onDataUpdate: () => void;
}

const TerminalComponent: React.FC<TerminalComponentProps> = ({ onDataUpdate }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalRefInternal = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const commandHandlerRef = useRef<UnfoldCLI | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [containerBg, setContainerBg] = useState('#000000');
  const isReadyRef = useRef(false);

  // Get theme colors from CSS variables
  const getThemeColors = () => {
    if (typeof window === 'undefined') {
      return {
        background: '#000000',
        foreground: '#DEDEE5',
        cursor: '#DEDEE5',
        selectionBackground: '#DEDEE5',
        selectionForeground: '#000000',
      };
    }
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const theme = root.getAttribute('data-theme') || 'dark';
    
    return {
      background: computedStyle.getPropertyValue('--bg-primary').trim() || '#000000',
      foreground: computedStyle.getPropertyValue('--text-primary').trim() || '#DEDEE5',
      cursor: computedStyle.getPropertyValue('--text-primary').trim() || '#DEDEE5',
      // Inverted selection colors based on theme
      selectionBackground: theme === 'dark' ? '#DEDEE5' : '#171717',
      selectionForeground: theme === 'dark' ? '#000000' : '#ffffff',
    };
  };

  // Update container background when theme changes
  useEffect(() => {
    const updateContainerBg = () => {
      if (typeof window !== 'undefined') {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#000000';
        setContainerBg(bg);
        // Also update the container div directly if it exists
        if (terminalRef.current) {
          terminalRef.current.style.backgroundColor = bg;
        }
      }
    };

    // Initial update
    updateContainerBg();

    // Watch for theme changes
    const observer = new MutationObserver(updateContainerBg);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Helper function to wrap long lines at terminal column width
  const wrapText = (text: string, maxCols?: number): string[] => {
    // Use current terminal cols if available, otherwise default to 70
    const cols = maxCols ?? terminalRefInternal.current?.cols ?? 70;
    if (typeof text !== 'string') return [text as any];
    
    const lines: string[] = [];
    const words = text.split(/(\s+)/); // Split but keep whitespace
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + word;
      
      // If adding this word would exceed the line length, start a new line
      if (testLine.length > cols && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
  };

  const prompt = (terminal: Terminal) => {
    terminal.write('\r\n> ');
    // Use xterm.js built-in scroll method with fallback
    terminal.scrollToBottom();
    // Also ensure viewport scrolls with a small delay to account for rendering
    requestAnimationFrame(() => {
      terminal.scrollToBottom();
      // Fallback: manually scroll viewport if needed
      try {
        const viewport = (terminal as any)._core?.viewportElement;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      } catch (e) {
        // Ignore
      }
    });
  };

  // Setup terminal input handler (separate function)
  const setupTerminalInput = (terminal: Terminal) => {
    let currentLine = '';
    let isProcessingCommand = false;
    
    terminal.onData((data) => {
      // Check if we're in prompt mode - allow input even during command processing
      const isInPromptMode = commandHandlerRef.current?.isPromptMode || false;
      
      // Check ref value directly each time
      // Allow input during prompt mode even if command is processing
      if (isProcessingCommand && !isInPromptMode) {
        return;
      }
      
      if (!isReadyRef.current) {
        console.log('[Terminal] Input blocked - terminal not ready yet. isReadyRef.current:', isReadyRef.current);
        return;
      }
      
      if (data === '\r') {
        // Enter pressed
        const input = currentLine.trim();
        currentLine = '';
        terminal.writeln(''); // Write newline
        
        // Check if we're in prompt mode first
        if (commandHandlerRef.current && commandHandlerRef.current.isPromptMode) {
          const handled = commandHandlerRef.current.handlePromptInput(input);
          if (handled) {
            // Input was handled as prompt, don't execute as command
            return;
          }
        }
        
        // Not in prompt mode, execute as command
        if (input) {
          
          // Execute as command
          const command = input;
          console.log('[Terminal] Executing command:', command);
          isProcessingCommand = true;
          
          // Handle command asynchronously
          (async () => {
            try {
              if (!commandHandlerRef.current) {
                terminal.writeln('Error: Command handler not initialized.');
                console.error('[Terminal] Command handler is null!');
                return;
              }
              
              // Execute command
              await commandHandlerRef.current.handleCommand(command);
              
            } catch (error: any) {
              const errorMsg = error?.message || 'An unknown error occurred';
              terminal.writeln(`\nError: ${errorMsg}`);
              console.error('[Terminal] Command execution error:', error);
            } finally {
              isProcessingCommand = false;
              // Only show prompt after command completes if NOT in prompt mode
              // Use a small delay to ensure prompt mode state is updated
              setTimeout(() => {
                if (commandHandlerRef.current && !commandHandlerRef.current.isPromptMode) {
                  prompt(terminal);
                }
                // If we're in prompt mode, don't show the > prompt
                // The guided mode will handle its own prompts
              }, 50);
              // Use xterm.js built-in scroll method
              terminal.scrollToBottom();
            }
          })();
        } else {
          // Empty input - check if in prompt mode
          if (commandHandlerRef.current) {
            const handled = commandHandlerRef.current.handlePromptInput('');
            if (handled) {
              // Input was handled as prompt, don't show > prompt
              return;
            }
          }
          // Only show prompt if not in prompt mode
          if (!commandHandlerRef.current || !commandHandlerRef.current.isPromptMode) {
            prompt(terminal);
          }
        }
      } else if (data === '\x7f') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.writeln('^C');
        currentLine = '';
        isProcessingCommand = false;
        prompt(terminal);
      } else if (data.charCodeAt(0) >= 32) {
        // Printable characters
        currentLine += data;
        terminal.write(data);
        // Use xterm.js built-in scroll method with immediate fallback
        terminal.scrollToBottom();
        // Immediate fallback scroll to ensure cursor is visible
        requestAnimationFrame(() => {
          terminal.scrollToBottom();
          try {
            const viewport = (terminal as any)._core?.viewportElement;
            if (viewport) {
              viewport.scrollTop = viewport.scrollHeight;
            }
          } catch (e) {
            // Ignore
          }
        });
      }
    });
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    if (isInitialized) return;
    if (!terminalRef.current) return;
    
    // Prevent double initialization
    if (terminalRefInternal.current) {
      console.log('[Terminal] Already initialized, skipping...');
      return;
    }
    
    // Mark as initializing immediately to prevent double runs
    setIsInitialized(true);

    const initTerminal = () => {
      // Prevent double initialization
      if (terminalRefInternal.current || isInitialized) {
        console.log('[Terminal] Already initialized, skipping...');
        return;
      }
      
      const container = terminalRef.current;
      if (!container) {
        console.error('[Terminal] Container not found');
        return;
      }

      try {
        // Get theme colors from CSS variables
        const themeColors = getThemeColors();
        
        // Create terminal - dimensions will be set by FitAddon
        const terminal = new Terminal({
          cursorBlink: true,
          theme: themeColors,
          fontSize: 12,
          fontFamily: 'Courier New, Courier, monospace',
          scrollback: 1000, // Allow scrolling back through history
          allowProposedApi: true, // Allow proposed API features
        });

        // Create and attach FitAddon for responsive sizing
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;

        // Open terminal
        terminal.open(container);
        terminalRefInternal.current = terminal;

        // Small delay to ensure terminal is ready, then fit and initialize
        setTimeout(() => {
          // Fit terminal to container
          try {
            fitAddon.fit();
          } catch (error) {
            console.warn('[Terminal] FitAddon fit failed:', error);
          }

          // Initialize command handler
          try {
            commandHandlerRef.current = new UnfoldCLI(terminal, onDataUpdate);
          } catch (error: any) {
            terminal.writeln(`Error initializing CLI: ${error.message}`);
            console.error('[Terminal] CLI init error:', error);
          }

          // Write welcome message
          terminal.writeln('UNFOLD CLI (Homebrew-style)');
          terminal.writeln('');
          terminal.writeln('Quick commands:');
          terminal.writeln('  list programs      or just: prg');
          terminal.writeln('  list tasks         or just: tsk');
          terminal.writeln('');
          terminal.writeln('  create task "Fix bug"');
          terminal.writeln('  info task <id>');
          terminal.writeln('');
          terminal.writeln('Type "help" for quick reference or "man" for full manual.');
          terminal.writeln('');

          // Mark as ready FIRST, before setting up input handler
          // This ensures the ref is set before the handler checks it
          isReadyRef.current = true;
          // Don't set isInitialized here - already set at start of effect

          // Setup input handler AFTER marking as ready
          setupTerminalInput(terminal);

          // Override writeln to wrap long lines and auto-scroll
          const originalWriteln = terminal.writeln.bind(terminal);
          terminal.writeln = (data?: string | Uint8Array, callback?: () => void) => {
            if (data !== undefined) {
              if (typeof data === 'string') {
                // Wrap long lines before writing (use current terminal cols)
                const wrappedLines = wrapText(data, terminal.cols);
                for (let i = 0; i < wrappedLines.length; i++) {
                  if (i === wrappedLines.length - 1) {
                    originalWriteln(wrappedLines[i], callback);
                  } else {
                    originalWriteln(wrappedLines[i]);
                  }
                }
              } else {
                originalWriteln(data, callback);
              }
            } else {
              originalWriteln('\n', callback);
            }
            // Use xterm.js built-in scroll method
            terminal.scrollToBottom();
            // Fallback scroll on next frame
            requestAnimationFrame(() => {
              terminal.scrollToBottom();
              try {
                const viewport = (terminal as any)._core?.viewportElement;
                if (viewport) {
                  viewport.scrollTop = viewport.scrollHeight;
                }
              } catch (e) {
                // Ignore
              }
            });
          };

          // Override write to auto-scroll (don't wrap here as it might break control sequences)
          const originalWrite = terminal.write.bind(terminal);
          terminal.write = (data: string | Uint8Array, callback?: () => void) => {
            originalWrite(data, callback);
            // Use xterm.js built-in scroll method
            terminal.scrollToBottom();
            // Fallback scroll on next frame
            requestAnimationFrame(() => {
              terminal.scrollToBottom();
              try {
                const viewport = (terminal as any)._core?.viewportElement;
                if (viewport) {
                  viewport.scrollTop = viewport.scrollHeight;
                }
              } catch (e) {
                // Ignore
              }
            });
          };

          // Show prompt and focus
          prompt(terminal);
          terminal.focus();

          console.log('[Terminal] Terminal fully initialized and ready. isReadyRef.current:', isReadyRef.current);

        }, 200);

      } catch (error) {
        console.error('[Terminal] Initialization error:', error);
        if (container) {
          container.innerHTML = `<div style="color: #DEDEE5; padding: 1rem; font-family: Helvetica, Arial, sans-serif; font-size: 12px;">
            Terminal initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}
            <br/>Check console for details.
          </div>`;
        }
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready, but don't check dimensions
    requestAnimationFrame(() => {
      initTerminal();
    });

    return () => {
      if (terminalRefInternal.current) {
        terminalRefInternal.current.dispose();
        terminalRefInternal.current = null;
      }
      if (fitAddonRef.current) {
        fitAddonRef.current.dispose();
        fitAddonRef.current = null;
      }
      isReadyRef.current = false;
    };
    // Empty dependency array - only run once on mount to prevent infinite loops
  }, []);

  // Handle window resize to refit terminal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!fitAddonRef.current || !terminalRefInternal.current) return;

    const handleResize = () => {
      try {
        if (fitAddonRef.current && terminalRefInternal.current) {
          fitAddonRef.current.fit();
          terminalRefInternal.current.scrollToBottom();
        }
      } catch (error) {
        console.warn('[Terminal] Resize fit failed:', error);
      }
    };

    // Use ResizeObserver to watch the container
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize
      clearTimeout((window as any).__terminalResizeTimeout);
      (window as any).__terminalResizeTimeout = setTimeout(handleResize, 100);
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout((window as any).__terminalResizeTimeout);
    };
  }, [isInitialized]);

  // Watch for theme changes and update terminal theme
  useEffect(() => {
    if (!terminalRefInternal.current) return;

    const updateTerminalTheme = () => {
      const themeColors = getThemeColors();
      const terminal = terminalRefInternal.current;
      if (terminal) {
        // Update terminal theme options
        terminal.options.theme = themeColors;
        
        // Refresh terminal to apply new colors
        terminal.refresh(0, terminal.rows - 1);
      }
      
      // Update container background (this triggers the CSS update)
      if (terminalRef.current) {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#000000';
        terminalRef.current.style.backgroundColor = bg;
        setContainerBg(bg);
      }
    };

    updateTerminalTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTerminalTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, [isInitialized]);

  const handleContainerClick = () => {
    if (terminalRefInternal.current && isReadyRef.current) {
      terminalRefInternal.current.focus();
    }
  };

  return (
    <>
      <style>{`
        .terminal-container .xterm,
        .terminal-container .xterm-viewport,
        .terminal-container .xterm-screen,
        .terminal-container canvas {
          background-color: ${containerBg} !important;
        }
      `}</style>
      <div 
        ref={terminalRef}
        className="terminal-container"
        tabIndex={0}
        role="presentation"
        aria-label="Planner CLI terminal"
        onClick={handleContainerClick}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: containerBg
        }} 
      />
    </>
  );
};

export default TerminalComponent;
