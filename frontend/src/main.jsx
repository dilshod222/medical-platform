import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import {
  createTheme,
  MantineProvider,
} from '@mantine/core';

import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import './index.css';

import App from './App';


const theme = createTheme({
  primaryColor: 'blue',

  defaultRadius: 'md',

  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});


ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />

      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);