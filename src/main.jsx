import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SidebarProvider } from './SidebarContext';
import { ThemeProvider } from './ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
