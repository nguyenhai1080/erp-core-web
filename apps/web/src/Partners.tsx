import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
type Props = { permissions: string[]; csrf: string; request: (path:string, body?:unknown, csrf?:string)=>Promise<any> };
const types:Record<string,string>={SUPPLIER:'Input · Đầu vào',CUSTOMER:'Output · Đầu ra',BOTH:'Both · Cả hai',OTHER:'Other · Khác'};
const categories=['Telco','Content Provider','Aggregator','Vendor','Customer','Outsourcing','Other'];
const fields=[
  ['countryName','Quốc gia',100],['registrationNumber','Business Registration No.',100],['taxCode','Tax Registration',100],
  ['invoiceRecipient','Attn / Người nhận invoice',200],['invoiceEmail','Email invoice',254],['email','Email liên hệ',254],['phone','Điện thoại',100]
] as const;
export function PartnerEditor({permissions,csrf,request,item,onClose,onSaved}:Props&{item?:any;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [busy,setBusy]=useState(false); const [saved,setSaved]=useState(false); const [message,setMessage]=useState(''); const dialog=useRef<HTMLDialogElement>(null);
  const editable=permissions.includes(item?'PARTNER_EDIT':'PARTNER_CREATE');
  useEffect(()=>{const el=dialog.current;el?.showModal(); return()=>el?.close();},[]);
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy||saved||!editable)return;const data=new FormData(event.currentTarget);
    const s=(key:string)=>String(data.get(key)??'').trim();
    const body:any={legalName:s('legalName'),partnerType:s('partnerType'),partnerCategory:s('partnerCategory')||null,
      paymentTermDays:s('paymentTermDays')===''?null:Number(s('paymentTermDays')),
      ...Object.fromEntries([...fields.map(f=>f[0]),'registeredAddress','billingAddress'].map(k=>[k,s(k)||null]))};
    if(item){body.expectedUpdatedAt=item.updatedAt;body.reason=s('reason');}else if(s('partnerCode'))body.partnerCode=s('partnerCode');
    setBusy(true);setMessage('');
    try{await request(item?`/partners/${item.id}/update`:'/partners',body,csrf);setSaved(true);
      try{await onSaved();onClose();}catch{setMessage('Hồ sơ đã lưu. Đóng cửa sổ và tải lại danh sách để xem thông tin mới.');}}
    catch(e){setMessage(e instanceof Error?e.message:'Không thể lưu hồ sơ.');}finally{setBusy(false);}
  }
  return createPortal(<dialog ref={dialog} className="partner-dialog" aria-labelledby="partner-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
    <div className="partner-dialog-heading"><div><h2 id="partner-title">{item?(editable?'Cập nhật đối tác':'Hồ sơ đối tác'):'Thêm mới đối tác'}</h2><p className="muted">Khai báo đối tác đầu vào/đầu ra và thông tin xuất Invoice/SOA.</p></div><button type="button" disabled={busy} onClick={onClose}>Đóng</button></div>
    <form onSubmit={save}><div className="partner-dialog-body"><fieldset disabled={busy||saved||!editable}>
      <div className="partner-grid">
        <label>Mã đối tác<input name="partnerCode" defaultValue={item?.partnerCode??''} placeholder="Tự động nếu bỏ trống" maxLength={100} readOnly={!!item} pattern="[\p{L}\p{N}_.\-]+"/></label>
        <label>Loại đối tác<select name="partnerType" defaultValue={item?.partnerType??'SUPPLIER'}>{Object.entries(types).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className="partner-wide">Tên đối tác *<input name="legalName" defaultValue={item?.legalName??''} required maxLength={500}/></label>
        <label>Nhóm đối tác<select name="partnerCategory" defaultValue={item?.partnerCategory??''}><option value="">Chọn nhóm đối tác</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Quốc gia<input name="countryName" defaultValue={item?.countryName??item?.countryCode??''} maxLength={100} placeholder="Ví dụ: Việt Nam, Mozambique"/></label>
        <label>Payment term days<input name="paymentTermDays" type="number" min={0} max={3650} step={1} defaultValue={item?(item.paymentTermDays??''):45}/></label>
        {fields.filter(f=>f[0]!=='countryName').map(([name,label,max])=><label key={name}>{label}<input name={name} defaultValue={item?.[name]??''} maxLength={max} type={name.toLowerCase().includes('email')?'email':name==='phone'?'tel':'text'}/></label>)}
        <label className="partner-wide">Địa chỉ<textarea name="registeredAddress" rows={2} maxLength={2000} defaultValue={item?.registeredAddress??''}/></label>
        <label className="partner-wide">Địa chỉ xuất Invoice/SOA<textarea name="billingAddress" rows={2} maxLength={2000} defaultValue={item?.billingAddress??''}/></label>
        {item&&editable&&<label className="partner-wide">Lý do cập nhật *<input name="reason" required maxLength={500}/></label>}
      </div>
    </fieldset>{message&&<p className="notice" role="alert">{message}</p>}</div>
    <div className="partner-dialog-footer"><button type="button" disabled={busy} onClick={onClose}>{editable&&!saved?'Hủy':'Đóng hồ sơ'}</button>{editable&&!saved&&<button className="action-primary" disabled={busy} type="submit">{busy?'Đang lưu…':item?'Lưu thay đổi':'Lưu đối tác'}</button>}</div></form>
  </dialog>,document.body);
}
export function PartnerCreate({onSaved,...props}:Props&{onSaved:()=>Promise<void>}){
  const [open,setOpen]=useState(false);
  return <section className="panel"><div className="section-heading"><div><h3>Đối tác</h3><p className="muted">Thông tin pháp lý, liên hệ và xuất Invoice/SOA theo biểu mẫu DGC.</p></div><button onClick={()=>setOpen(true)}>Thêm mới đối tác</button></div>{open&&<PartnerEditor {...props} onSaved={onSaved} onClose={()=>setOpen(false)}/>}</section>;
}
export function Partners(props:Props){
  const [data,setData]=useState<any>(null);const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [query,setQuery]=useState('');
  const [message,setMessage]=useState('');const [editor,setEditor]=useState<any>(null);const [loading,setLoading]=useState(false);
  async function load(){setData(await props.request(`/partners?page=${page}&search=${encodeURIComponent(query)}`));}
  useEffect(()=>{let cancelled=false;setLoading(true);setMessage('');void props.request(`/partners?page=${page}&search=${encodeURIComponent(query)}`).then(d=>{if(!cancelled)setData(d);}).catch(e=>{if(!cancelled)setMessage(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[page,query]);
  async function open(id:string){setLoading(true);setMessage('');try{setEditor((await props.request('/partners/'+id)).item);}catch(e){setMessage(e instanceof Error?e.message:'Không thể mở hồ sơ.');}finally{setLoading(false);}}
  return <div className="execution"><section className="panel"><div className="section-heading"><div><h2>Danh sách đối tác</h2><p className="muted">Đối tác đang sử dụng và tiềm năng của công ty. Input: đầu vào; Output: đầu ra.</p></div>{props.permissions.includes('PARTNER_CREATE')&&<button disabled={loading} onClick={()=>setEditor({new:true})}>Thêm mới đối tác</button>}</div>
    <form className="partner-search" onSubmit={e=>{e.preventDefault();setPage(1);setQuery(search.trim());}}><label>Tìm theo mã, tên, mã số thuế hoặc email<input value={search} onChange={e=>setSearch(e.target.value)} maxLength={200}/></label><button disabled={loading}>Tìm kiếm</button><button type="button" disabled={loading} onClick={()=>void load().catch(e=>setMessage(e.message))}>Tải lại danh sách</button></form>
    {message&&<p className="notice" role="alert">{message}</p>}{loading?<p role="status">Đang tải đối tác…</p>:data&&<><div className="table-scroll"><table><thead><tr><th>Mã / tên đối tác</th><th>Loại</th><th>Nhóm</th><th>Quốc gia</th><th>Tax Registration</th><th>Email liên hệ</th><th></th></tr></thead><tbody>{data.items.map((p:any)=><tr key={p.id}><td><b>{p.partnerCode}</b><br/>{p.legalName}</td><td>{types[p.partnerType]}</td><td>{p.partnerCategory??'—'}</td><td>{p.countryName??p.countryCode??'—'}</td><td>{p.taxCode??'—'}</td><td>{p.email??'—'}</td><td><button onClick={()=>void open(p.id)}>Xem hồ sơ</button></td></tr>)}</tbody></table></div>{!data.items.length&&<p>Chưa có đối tác phù hợp.</p>}<div className="section-heading"><p>{data.total} đối tác · Trang {page}/{Math.max(1,Math.ceil(data.total/50))}</p><div><button disabled={page===1} onClick={()=>setPage(page-1)}>Trang trước</button> <button disabled={page*50>=data.total} onClick={()=>setPage(page+1)}>Trang sau</button></div></div></>}
  </section>{editor&&<PartnerEditor {...props} item={editor.new?undefined:editor} onSaved={load} onClose={()=>setEditor(null)}/>}</div>;
}
