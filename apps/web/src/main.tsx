import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const sections = ['Dashboard','Partners','Services','Contracts','Projects','Quotations','Reconciliation','Revenue','Invoices','AR','AP','Payments','Reports','System'];
function App(){return <div className="shell"><aside><h2>ERP Core</h2>{sections.map(x=><div className="nav" key={x}>{x}</div>)}</aside><main><header><h1>Dashboard</h1><span>v0.1 Foundation</span></header><section className="cards"><article><b>API</b><p>/api/v1/health</p></article><article><b>Database</b><p>PostgreSQL 16</p></article><article><b>Deployment</b><p>Vibehost ready</p></article></section><section className="panel"><h3>ERP Core Web</h3><p>Foundation shell is running. Business modules will be added incrementally from the frozen baseline.</p></section></main></div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
