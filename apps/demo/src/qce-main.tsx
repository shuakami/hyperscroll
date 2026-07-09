import React from 'react';
import ReactDOM from 'react-dom/client';
import Qce from './Qce';
import './index.css';
import './chat.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Qce />
  </React.StrictMode>,
);
