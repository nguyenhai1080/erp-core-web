import React, { useState } from 'react';
type Props = { projectId:string; currency:string; detail:any; permissions:string[]; csrf:string;
  request:(path:string,body?:unknown,csrf?:string)=>Promise<any>; busy:boolean; setBusy:(value:boolean)=>void; refresh:()=>Promise<void> };
const status:Record<string,string> = { DRAFT:'Nháp', UNDER_REVIEW:'Đang duyệt', APPROVED:'Đã duyệt nội bộ', ACTIVE:'Hiệu lực', SIGNED:'Đã ký' };
const kind:Record<string,string> = { CONTRACT:'Hợp đồng', MILESTONE_EVIDENCE:'Hồ sơ nghiệm thu', OTHER:'Hồ sơ khác' };
const readPdf = (file:File) => new Promise<string>((resolve,reject)=>{
  const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1]);
  reader.onerror=()=>reject(new Error('Không đọc được tệp PDF.')); reader.readAsDataURL(file);
});
export function EvidenceWorkspace(p:Props) {
  const can=(name:string)=>p.permissions.includes(name); const base='/projects/'+p.projectId;
  const [message,setMessage]=useState(''); const [action,setAction]=useState<{row:any; name:string}|null>(null);
  const documents=p.detail.documents??[]; const contracts=p.detail.contracts??[];
  async function send(event:React.FormEvent<HTMLFormElement>,path:string,body:(form:FormData)=>Promise<unknown>|unknown) {
    event.preventDefault();if(p.busy)return;const form=event.currentTarget;p.setBusy(true);setMessage('');
    try { await p.request(path,await body(new FormData(form)),p.csrf);form.reset();setAction(null);await p.refresh();setMessage('Đã lưu hồ sơ.'); }
    catch(error){setMessage(error instanceof Error?error.message:'Không lưu được hồ sơ.');}finally{p.setBusy(false);}
  }
  const value=(form:FormData,name:string)=>String(form.get(name)??'').trim();
  const documentForm=can('PROJECT_EDIT')&&<form onSubmit={event=>void send(event,base+'/documents',async form=>{
    const file=form.get('pdf');if(!(file instanceof File)||!file.size||file.size>5*1024*1024||!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Chọn PDF tối đa 5 MB.');
    return {filename:file.name,documentType:value(form,'documentType'),documentNumber:value(form,'documentNumber')||undefined,base64:await readPdf(file)};
  })}><fieldset disabled={p.busy}><div className="form-grid">
    <label>Loại hồ sơ<select name="documentType" required>
      {can('CONTRACT_EDIT')&&can('CONTRACT_VIEW')&&<option value="CONTRACT">Hợp đồng</option>}
      {can('MILESTONE_EDIT')&&can('MILESTONE_VIEW')&&<option value="MILESTONE_EVIDENCE">Hồ sơ nghiệm thu</option>}
      <option value="OTHER">Hồ sơ khác</option>
    </select></label>
    <label>Số hồ sơ<input name="documentNumber" maxLength={500}/></label>
    <label>Tệp PDF (tối đa 5 MB)<input name="pdf" type="file" accept=".pdf,application/pdf" required/></label>
  </div><button className="action-primary" type="submit">{p.busy?'Đang lưu…':'Tải hồ sơ'}</button></fieldset></form>;
  return <>
    {message&&<p className="notice" role="alert">{message}</p>}
    <section className="panel"><h3>Hồ sơ dự án</h3><p className="muted">PDF được lưu riêng theo dự án; tải xuống cần đăng nhập và quyền xem loại hồ sơ. Tệp đã lưu được giữ để kiểm tra lịch sử.</p>
      {documentForm}
      {!documents.length?<p>Chưa có hồ sơ.</p>:<div className="table-scroll"><table><thead><tr><th>Mã / loại</th><th>Số hồ sơ</th><th>Tệp</th><th></th></tr></thead><tbody>{documents.map((d:any)=><tr key={d.id}>
        <td>{d.documentCode} · {kind[d.documentType]??d.documentType}</td><td>{d.documentNumber??'—'}</td><td>{d.attachment.originalFilename}</td>
        <td><a href={'/api/v1'+base+`/documents/${d.id}/download`} download>Tải PDF</a></td></tr>)}</tbody></table></div>}
    </section>
    {can('CONTRACT_CREATE')&&<section className="panel"><h3>Tạo hợp đồng chính nháp</h3><p className="muted">Một dự án có một hợp đồng chính. Nhập giá trị trước thuế; ký, kích hoạt và kế hoạch thu tiền sẽ được bổ sung ở bước tiếp theo.</p>
      <form onSubmit={event=>void send(event,base+'/contracts',form=>({contractName:value(form,'contractName'),contractNumber:value(form,'contractNumber')||undefined,
        currency:p.currency,baseContractValue:value(form,'amount')}))}><fieldset disabled={p.busy}><div className="form-grid">
        <label>Tên hợp đồng<input name="contractName" required maxLength={500}/></label>
        <label>Số hợp đồng<input name="contractNumber" maxLength={500}/></label>
        <label>Giá trị trước thuế ({p.currency})<input name="amount" required inputMode="decimal" pattern="(0|[1-9][0-9]{0,15})(\.[0-9]{1,4})?"/></label>
      </div><button className="action-primary" type="submit">Tạo hợp đồng nháp</button></fieldset></form>
    </section>}
    {can('CONTRACT_VIEW')&&<section className="panel"><h3>Hợp đồng của dự án</h3><p className="muted">Duyệt nội bộ không phải ký hợp đồng và chưa làm hợp đồng có hiệu lực. Các thao tác này không tạo doanh thu hay công nợ.</p>
      {!contracts.length?<p>Chưa có hợp đồng.</p>:<div className="table-scroll"><table><thead><tr><th>Mã / tên</th><th>Giá trị trước thuế</th><th>Trạng thái</th><th>Hồ sơ</th><th></th></tr></thead><tbody>{contracts.map((c:any)=><tr key={c.id}>
        <td>{c.contractCode} · {c.contractName}</td><td>{c.baseContractValue??'—'} {c.currency}</td><td>{status[c.status]??c.status}</td><td>{documents.find((d:any)=>d.id===c.officialDocumentId)?.documentCode??(c.officialDocumentId?'Hồ sơ ngoài danh sách':'Chưa gắn')}</td><td>
        {c.status==='DRAFT'&&can('CONTRACT_EDIT')&&<button disabled={p.busy} onClick={()=>setAction({row:c,name:'document'})}>Gắn hồ sơ</button>}
        {c.status==='DRAFT'&&can('CONTRACT_SUBMIT')&&<button disabled={p.busy} onClick={()=>setAction({row:c,name:'submit'})}>Gửi duyệt hợp đồng</button>}
        {c.status==='UNDER_REVIEW'&&can('CONTRACT_APPROVE')&&<><button disabled={p.busy} onClick={()=>setAction({row:c,name:'approve'})}>Duyệt nội bộ</button><button disabled={p.busy} onClick={()=>setAction({row:c,name:'return'})}>Trả lại hợp đồng</button></>}
      </td></tr>)}</tbody></table></div>}
    </section>}
    {action&&<section className="panel"><h3>{({document:'Gắn hồ sơ',submit:'Gửi duyệt',approve:'Duyệt nội bộ',return:'Trả lại'} as Record<string,string>)[action.name]} · {action.row.contractCode} · {action.row.baseContractValue} {action.row.currency}</h3>
      <form onSubmit={event=>void send(event,base+`/contracts/${action.row.id}/${action.name}`,form=>({expectedUpdatedAt:action.row.updatedAt,reason:value(form,'reason'),
        ...(action.name==='document'?{documentId:value(form,'documentId')}:{})}))}><fieldset disabled={p.busy}><div className="form-grid">
        {action.name==='document'&&<label>Chọn hồ sơ hợp đồng<select name="documentId" required defaultValue=""><option value="" disabled>Chọn PDF đã tải</option>
          {documents.filter((d:any)=>d.documentType==='CONTRACT').map((d:any)=><option key={d.id} value={d.id}>{d.documentCode} · {d.attachment.originalFilename}</option>)}</select></label>}
        <label>Lý do thao tác hợp đồng<input name="reason" required maxLength={500}/></label>
      </div><button className="action-primary" type="submit">Xác nhận thao tác hợp đồng</button><button type="button" onClick={()=>setAction(null)}>Đóng</button></fieldset></form>
    </section>}
  </>;
}
