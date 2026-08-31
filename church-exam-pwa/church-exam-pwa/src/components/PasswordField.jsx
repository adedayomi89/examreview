import { useState } from 'react'

export default function PasswordField({ className = 'field', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-indigo/40 hover:text-indigo/70 rounded-xl"
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  )
}
