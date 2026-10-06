'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, subtitle, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="modal" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current) onClose();}} aria-label={title}><div className="modal-inner"><div className="modal-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20}/></button></div>{children}</div></dialog>;
}
