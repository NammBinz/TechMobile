import { useState } from 'react'

export default function AdminFormSection({ title, description, number, children }) {
  return <fieldset className="admin-form-section">
    <legend>{number && <span className="admin-section-number">{number}</span>}{title}</legend>
    {description && <p className="admin-section-description">{description}</p>}
    {children}
  </fieldset>
}

export function AdminFields({ fields, values, onChange, idPrefix = 'admin' }) {
  return <div className="row g-3">{fields.map(field => <AdminField key={field.name} {...field} id={`${idPrefix}-${field.name}`} value={values[field.name] ?? ''} onChange={onChange} />)}</div>
}

export function AdminField({ label, name, id = `admin-${name}`, type = 'text', value, onChange, options, hint, width = 'col-md-6', ariaLabel, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const controlProps = { ...inputProps, id, name, value, onChange, 'aria-label': ariaLabel, 'aria-describedby': hint ? `${id}-hint` : undefined }
  return <div className={`admin-field ${width}`}>
    <label className="form-label" htmlFor={id}>{label}{inputProps.required && <span className="admin-required" aria-hidden="true"> *</span>}</label>
    {type === 'select' ? <select {...controlProps} className="form-select">{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
      : type === 'textarea' ? <textarea {...controlProps} className="form-control" rows={inputProps.rows || 3} />
        : type === 'password' ? <div className="admin-password-control"><input {...controlProps} type={visible ? 'text' : 'password'} className="form-control" autoComplete="new-password" /><button className="btn btn-outline-secondary" type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ẩn' : 'Hiện'}</button></div>
          : <input {...controlProps} type={type} className="form-control" />}
    {hint && <small id={`${id}-hint`} className="admin-field-hint">{hint}</small>}
  </div>
}
