import React from 'react';
import ReactDOM from 'react-dom/client';
import Docs from './Docs';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('missing #root');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Docs />
  </React.StrictMode>,
);
