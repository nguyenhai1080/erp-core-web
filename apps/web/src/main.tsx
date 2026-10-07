import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const sections = ['Dashboard','Partners','Services','Contracts','Projects','Quotations','Reconciliation','Revenue','Invoices','AR','AP','Payments','Reports','System'];
document.title = 'ERP Core Web · v0.6.5';
function App() {
  const [health, setHealth] = useState<'checking' | 'connected' | 'error'>('checking');
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { setHealth('error'); controller.abort(); }, 15000);
    async function checkHealth() {
      try {
        const response = await fetch('/api/v1/health', { signal: controller.signal });
        if (!response.ok) throw new Error('Health check failed');
        const result = await response.json();
        if (result.status !== 'ok' || result.service !== 'erp-core-api' || result.database !== 'connected') {
          throw new Error('Unexpected health response');
        }
        setHealth('connected');
      } catch {
        if (!controller.signal.aborted) setHealth('error');
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void checkHealth();
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, []);
  const status = health === 'checking' ? 'Đang kiểm tra…' : health === 'connected' ? 'Đã kết nối' : 'Chưa kết nối';
  return <div className="shell"><aside><h2>ERP Core</h2>{sections.map(x => <div className="nav" key={x}>{x}</div>)}</aside><main><header><h1>Dashboard</h1><span>v0.6.5 · Staging</span></header><section className="cards"><article><b>API</b><p role="status">{status}</p><a href="/api/v1/health" target="_blank" rel="noreferrer">Kiểm tra API health</a></article><article><b>Database</b><p>{health === 'connected' ? 'PostgreSQL · Đã kết nối' : health === 'checking' ? 'Đang kiểm tra…' : 'Chưa xác nhận kết nối'}</p></article><article><b>Deployment</b><p>Staging</p></article></section><section className="panel"><h3>ERP Core Web</h3><p>Giao diện nền tảng ERP đang chạy. Các mục nghiệp vụ hiện là danh mục dự kiến và sẽ được bổ sung trong các bản tiếp theo.</p></section></main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
