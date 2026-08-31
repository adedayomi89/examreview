import { useEffect, useRef, useState } from 'react'
import { uploadMediaFile } from '../lib/uploadMedia'

const TOOLS = [
  { cmd: 'bold', label: 'B', title: 'Bold', style: 'font-bold' },
  { cmd: 'italic', label: 'I', title: 'Italic', style: 'italic' },
  { cmd: 'underline', label: 'U', title: 'Underline', style: 'underline' },
  { cmd: 'insertUnorderedList', label: '•', title: 'Bullet list', style: '' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Numbered list', style: '' }
]

export default function RichEditor({ value, onChange, placeholder, uploadFolder = 'questions', compact = false }) {
  const ref = useRef(null)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const lastValue = useRef(value)

  useEffect(() => {
    if (ref.current && value !== lastValue.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value || ''
    }
    lastValue.current = value
  }, [value])

  const exec = (cmd) => {
    ref.current?.focus()
    document.execCommand(cmd, false, null)
    emitChange()
  }

  const emitChange = () => {
    const html = ref.current?.innerHTML || ''
    lastValue.current = html
    onChange(html)
  }

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadMediaFile(file, uploadFolder)
      ref.current?.focus()
      document.execCommand('insertHTML', false, `<img src="${url}" alt="" />`)
      emitChange()
    } catch (err) {
      alert('Image upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={compact ? '' : 'rounded-2xl border border-indigo/15 bg-paper overflow-hidden focus-within:ring-2 focus-within:ring-gold/25 focus-within:border-gold'}>
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-indigo/10 bg-indigo/[0.03]">
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onClick={() => exec(t.cmd)}
            className={`w-7 h-7 rounded-lg text-sm text-indigo/70 hover:bg-indigo/10 ${t.style}`}
          >
            {t.label}
          </button>
        ))}
        <div className="w-px h-4 bg-indigo/10 mx-1" />
        <button
          type="button"
          title="Insert image"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-7 px-2 rounded-lg text-xs font-medium text-indigo/70 hover:bg-indigo/10 flex items-center gap-1"
        >
          {uploading ? 'Uploading…' : '🖼 Image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={`rich-editor !border-0 !rounded-none ${compact ? 'min-h-[60px]' : ''}`}
      />
    </div>
  )
}
