import React from 'react';
import ReactDOM from 'react-dom/client';
import './dev-mock';
import App from './App';
import { SidebarProvider } from './SidebarContext';
import { ThemeProvider } from './ThemeContext';
import { MusicPlayerProvider } from './contexts/MusicPlayerContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SidebarProvider>
        {/* El provider renderiza el único <audio> de la app: acá sobrevive la
            navegación entre módulos. */}
        <MusicPlayerProvider>
          <App />
        </MusicPlayerProvider>
      </SidebarProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
