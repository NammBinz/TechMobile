import { useEffect, useRef, useState } from 'react'

export default function AdminNoteModal({ title, description, busy, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const modal = useRef(null)
  useEffect(() => {
    modal.current.querySelector('textarea').focus()
    const handleKey = event => {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key !== 'Tab') return
      const fields = [...modal.current.querySelectorAll('textarea,button')].filter(field => !field.disabled)
      const first = fields[0], last = fields.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const element = modal.current
    element.addEventListener('keydown', handleKey)
    return () => element.removeEventListener('keydown', handleKey)
  }, [busy, onClose])
  return <div className="review-modal-overlay admin-note-modal" role="dialog" aria-modal="true" aria-labelledby="admin-note-title" ref={modal}>
    <div className="review-modal-box">
      <h3 id="admin-note-title">{title}</h3><p className="text-muted">{description}</p>
      <form onSubmit={event => { event.preventDefault(); if (note.trim() && !busy) onConfirm(note.trim()) }}>
        <label htmlFor="admin-note-content" className="form-label">Nội dung <span className="admin-required">*</span></label>
        <textarea id="admin-note-content" required disabled={busy} rows="4" className="form-control" placeholder="Nhập lý do, kết quả kiểm tra hoặc nội dung xử lí…" value={note} onChange={event => setNote(event.target.value)} />
        <div className="admin-form-actions"><button type="submit" disabled={busy || !note.trim()} className="btn btn-primary">{busy ? 'Đang lưu…' : 'Xác nhận'}</button><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>Hủy</button></div>
      </form>
    </div>
  </div>
}
