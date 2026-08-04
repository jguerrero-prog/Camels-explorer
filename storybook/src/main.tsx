import React from 'react';
import ReactDOM from 'react-dom/client';
import './tokens/primitives/color-ramps.css';
import './tokens/primitives/neutrals.css';
import './tokens/primitives/typography.css';
import './tokens/semantic/semantic.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
