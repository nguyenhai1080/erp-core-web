import React, {useEffect, useState} from 'react';

export function PayableCard({request}:{request:(path:string)=>Promise<any>}) {
 const [total,setTotal]=useState<string|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  void request('/revenues').then(result=>{if(active)setTotal(result.monthlyPayableUsd);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được tổng Payable.');});
  return()=>{active=false;};
 },[request]);
 return <article><b>Tổng Payable USD</b><p role="status">{error|| (total===null?'Đang tải…':new Intl.NumberFormat('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(total)))}</p><small>Tất cả kỳ · Đối soát đã chốt</small></article>;
}
