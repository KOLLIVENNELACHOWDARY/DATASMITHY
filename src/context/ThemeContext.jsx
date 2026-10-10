// src/context/ThemeContext.jsx — Light mode only
import React, { createContext, useContext } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children, uid }) => {
  // Force light mode always
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('light');
  }
  return (
    <ThemeContext.Provider value={{ theme:'light', toggle:()=>{}, isDark:false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
