import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3200,
            style: {
              background: 'rgba(11,18,39,.92)',
              border: '1px solid rgba(255,255,255,.14)',
              color: '#F8FAFC',
              boxShadow: '0 10px 40px rgba(0,0,0,.45)',
              backdropFilter: 'blur(18px)',
            },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
