import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Execution } from './Execution';
import { Partners } from './Partners';

type Identity = { userId: string; companyId: string; companyCode: string; fullName: string; email: string; permissions: string[] };
type Session = { user: Identity; csrfToken: string };
const version = '0.6.11';
document.title = `ERP Core Web · v${version}`;
async function api(path: string, body?: unknown, csrf?: string) {
  const response = await fetch('/api/v1' + path, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(path.endsWith('/documents') ? 60000 : 15000)
  });
  if (response.status === 401 && path === '/auth/me') return null;
  if (response.status === 401) window.dispatchEvent(new Event('erp-session-expired'));
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Không thể xử lý yêu cầu.');
  return result;
}
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState('Đang kiểm tra dịch vụ…');
  const [message, setMessage] = useState('');
  const [setup, setSetup] = useState(window.location.hash === '#setup');
  const [page, setPage] = useState('dashboard');
  useEffect(() => {
    let cancelled = false;
    const expired = () => { setSession(null); setPage('dashboard'); };
    window.addEventListener('erp-session-expired', expired);
    void api('/auth/me').then(result => { if (!cancelled) setSession(result); })
      .catch(() => { if (!cancelled) setMessage('Không kết nối được dịch vụ. Vui lòng thử lại.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    void api('/health').then(result => {
      if (!cancelled) setHealth(result.status === 'ok' && result.database === 'connected' ? 'Dịch vụ đang hoạt động' : 'Chưa xác nhận kết nối');
    }).catch(() => { if (!cancelled) setHealth('Chưa kết nối được dịch vụ'); });
    return () => { cancelled = true; window.removeEventListener('erp-session-expired', expired); };
  }, []);
  function changeMode(value: boolean) { setSetup(value); window.location.hash = value ? 'setup' : ''; setMessage(''); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    if (setup && password !== data.get('confirmation')) { setMessage('Hai mật khẩu chưa khớp.'); return; }
    setBusy(true); setMessage('');
    try {
      const body = { companyCode: data.get('companyCode'), email: data.get('email'), password };
      if (setup) {
        await api('/auth/bootstrap', { ...body, fullName: data.get('fullName'), setupToken: data.get('setupToken') });
        form.reset(); changeMode(false); setMessage('Đã tạo tài khoản quản trị. Bạn có thể đăng nhập.');
      } else {
        await api('/auth/login', body); setSession(await api('/auth/me')); form.reset();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không kết nối được dịch vụ.'); }
    finally { const input = form.elements.namedItem('password'); if (input instanceof HTMLInputElement) input.value = ''; setBusy(false); }
  }
  async function logout() {
    if (!session) return; setBusy(true); setMessage('');
    try { await api('/auth/logout', {}, session.csrfToken); setSession(null); setPage('dashboard'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không đăng xuất được.'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="auth-screen"><p role="status">Đang kiểm tra phiên đăng nhập…</p></main>;
  if (!session) return <main className="auth-screen"><section className="auth-card">
    <div className="brand">ERP Core</div><p className="muted">Không gian quản lý công việc và tài chính</p>
    <h1>{setup ? 'Thiết lập quản trị' : 'Đăng nhập'}</h1>
    {setup && <p>Chỉ dùng cho tài khoản quản trị đầu tiên, khi bạn đã được cấp mã thiết lập.</p>}
    <form method="post" onSubmit={submit}><fieldset disabled={busy}>
      <label>Mã công ty<input name="companyCode" defaultValue="GST" required maxLength={50} autoComplete="organization" /></label>
      {setup && <label>Họ và tên<input name="fullName" required maxLength={120} autoComplete="name" /></label>}
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="username" /></label>
      <label>Mật khẩu<input name="password" type="password" required minLength={setup ? 15 : 1} maxLength={128} autoComplete={setup ? 'new-password' : 'current-password'} /></label>
      {setup && <><p className="hint">Dùng mật khẩu từ 15 ký tự.</p><label>Nhập lại mật khẩu<input name="confirmation" type="password" required minLength={15} maxLength={128} autoComplete="new-password" /></label><label>Mã thiết lập<input name="setupToken" type="password" required minLength={32} maxLength={512} autoComplete="off" /></label></>}
      <button className="primary" type="submit">{busy ? 'Đang xử lý…' : setup ? 'Tạo tài khoản quản trị' : 'Đăng nhập'}</button>
    </fieldset></form>
    {message && <p className="notice" role="alert">{message}</p>}
    <button className="text-button" onClick={() => changeMode(!setup)} disabled={busy}>{setup ? 'Quay lại đăng nhập' : 'Thiết lập quản trị lần đầu'}</button>
    <footer><span role="status">{health}</span><span>v{version} · Staging</span></footer>
  </section></main>;
  return <div className="shell"><aside><h2>ERP Core</h2>
    <button className={'nav ' + (page === 'dashboard' ? 'active' : '')} onClick={() => { setPage('dashboard'); setMessage(''); }}>Tổng quan</button>
    {session.user.permissions.includes('PROJECT_VIEW') && <button className={'nav ' + (page === 'projects' ? 'active' : '')} onClick={() => setPage('projects')}>Dự án</button>}
    {session.user.permissions.includes('PARTNER_VIEW') && <button className={'nav ' + (page === 'partners' ? 'active' : '')} onClick={() => setPage('partners')}>Đối tác</button>}
    <div className="nav muted">Các chức năng khác sẽ được bổ sung</div>
  </aside><main><header><div><h1>{page === 'projects' ? 'Dự án' : page === 'partners' ? 'Đối tác' : 'Tổng quan'}</h1><p className="muted">{session.user.companyCode} · {session.user.fullName}</p></div><button onClick={logout} disabled={busy}>Đăng xuất</button></header>
    {message && <p className="notice" role="alert">{message}</p>}
    {page === 'dashboard' ? <><section className="cards"><article><b>Dịch vụ</b><p>{health}</p><a href="/api/v1/health" target="_blank" rel="noreferrer">Kiểm tra kết nối</a></article><article><b>Công ty</b><p>{session.user.companyCode}</p></article><article><b>Môi trường</b><p>v{version} · Staging</p></article></section><section className="panel"><h3>Chào {session.user.fullName}</h3><p>Mở Dự án để quản lý đối tác, mốc tiến độ, ngân sách và chi phí.</p></section></> : page === 'partners' ? <Partners permissions={session.user.permissions} csrf={session.csrfToken} request={api}/> : <Execution permissions={session.user.permissions} csrf={session.csrfToken} request={api}/>}
  </main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
