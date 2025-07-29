'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { BackgroundTheme } from '@/components/ui/BackgroundSwitcher'

interface ThemeContextType {
  theme: BackgroundTheme
  setTheme: (theme: BackgroundTheme) => void
  getTextColor: () => string
  getBgColor: () => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, initialTheme = 'space' }: { children: ReactNode, initialTheme?: BackgroundTheme }) {
  const [theme, setTheme] = useState<BackgroundTheme>(initialTheme)

  const getTextColor = () => {
    switch (theme) {
      case 'white':
        return 'text-black'
      default:
        return 'text-white'
    }
  }

  const getBgColor = () => {
    switch (theme) {
      case 'white':
        return 'bg-gray-100'
      case 'black':
        return 'bg-black'
      case 'bright':
        return 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'
      case 'space':
      default:
        return 'bg-black'
    }
  }

  // Add data-theme attribute to the provider for CSS targeting
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Direct style override for White mode
    if (theme === 'white') {
      // Create or update the style element
      let styleEl = document.getElementById('theme-override-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'theme-override-styles';
        document.head.appendChild(styleEl);
      }
      
      // Force text color for all elements in White mode with maximum specificity
      styleEl.innerHTML = `
        /* Maximum specificity selectors to override any other styles */
        html[data-theme="white"] body,
        html[data-theme="white"] body *,
        html[data-theme="white"] .conversation-bubble,
        html[data-theme="white"] .conversation-bubble *,
        html[data-theme="white"] .conversation-bubble p,
        html[data-theme="white"] .conversation-bubble span,
        html[data-theme="white"] .conversation-bubble div,
        html[data-theme="white"] .conversation-text,
        html[data-theme="white"] .conversation-text *,
        html[data-theme="white"] input,
        html[data-theme="white"] input::placeholder,
        html[data-theme="white"] textarea,
        html[data-theme="white"] textarea::placeholder,
        html[data-theme="white"] .TypewriterText,
        html[data-theme="white"] .TypewriterText *,
        html[data-theme="white"] .TypewriterText span,
        html[data-theme="white"] .text-white,
        html[data-theme="white"] .text-gray-300,
        html[data-theme="white"] .text-gray-400,
        html[data-theme="white"] .text-purple-300,
        html[data-theme="white"] .message-text,
        html[data-theme="white"] .message-text *,
        html[data-theme="white"] p,
        html[data-theme="white"] span,
        html[data-theme="white"] div {
          color: #000000 !important;
          opacity: 1 !important;
        }
        
        /* Target specific Tailwind text classes */
        html[data-theme="white"] .text-sm,
        html[data-theme="white"] .text-base,
        html[data-theme="white"] .text-md,
        html[data-theme="white"] .text-lg,
        html[data-theme="white"] .text-xl,
        html[data-theme="white"] .text-2xl {
          color: #000000 !important;
        }
        
        /* Ensure input fields are visible */
        html[data-theme="white"] input[type="text"],
        html[data-theme="white"] textarea {
          color: #000000 !important;
          background-color: rgba(243, 244, 246, 0.8) !important;
        }
        
        /* Placeholder text */
        html[data-theme="white"] input::placeholder,
        html[data-theme="white"] textarea::placeholder {
          color: #6b7280 !important;
          opacity: 0.7 !important;
        }
        
        /* Force visibility for any remaining white text */
        html[data-theme="white"] [style*="color: #ffffff"],
        html[data-theme="white"] [style*="color: white"],
        html[data-theme="white"] [style*="color: rgb(255, 255, 255)"] {
          color: #000000 !important;
        }
      `;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, getTextColor, getBgColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}
