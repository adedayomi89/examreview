import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { uploadMediaFile } from '../../lib/uploadMedia.js'
import { useClasses } from '../../lib/useClasses.js'

export default function AdminSettings() {
  const { settings, refresh } = useSettings()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => setForm(settings), [settings])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('site_settings')
      .update({
        church_name: form.church_name,
        church_address: form.church_address,
        department_name: form.department_name,
        welcome_message: form.welcome_message,
        logo_url: form.logo_url
      })
      .eq('id', 1)
    setSaving(false)
    if (error) return alert(error.message)
    await refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingLogo(true)
    try {
      const url = await uploadMediaFile(file, 'branding')
      setForm((f) => ({ ...f, logo_url: url }))
    } catch (err) {
      alert(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-indigo">Site settings</h1>
        <p className="text-ink/55 text-sm mt-1">What students see across the portal.</p>
      </div>

      <form onSubmit={save} className="card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <img src={form.logo_url} alt="" className="w-16 h-16 rounded-full object-cover shadow-card" />
          <div>
            <label className="btn-outline !py-2 text-sm cursor-pointer">
              {uploadingLogo ? 'Uploading…' : 'Change logo'}
              <input type="file" accept="image/*" hidden onChange={handleLogo} />
            </label>
          </div>
        </div>

        <div>
          <label className="label">Church name</label>
          <input className="field" value={form.church_name} onChange={(e) => setForm({ ...form, church_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Department name</label>
          <input className="field" value={form.department_name} onChange={(e) => setForm({ ...form, department_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="field" value={form.church_address} onChange={(e) => setForm({ ...form, church_address: e.target.value })} />
        </div>
        <div>
          <label className="label">Welcome message</label>
          <textarea
            className="field"
            rows={2}
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          {saved && <span className="text-sm text-forest">Saved ✓</span>}
        </div>
      </form>

      <ClassesManager />
    </div>
  )
}

function ClassesManager() {
  const { classes, refresh } = useClasses()
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const addClass = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    setAdding(true)
    const { error } = await supabase.from('classes').insert({ name: newName.trim() })
    setAdding(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'That class already exists.' : error.message)
      return
    }
    setNewName('')
    refresh()
  }

  const removeClass = async (cls) => {
    if (!confirm(`Delete "${cls.name}"? Students in this class will just show as unassigned — nothing else is deleted.`)) return
    const { error } = await supabase.from('classes').delete().eq('id', cls.id)
    if (error) return alert(error.message)
    refresh()
  }

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-indigo">Classes</h2>
        <p className="text-ink/55 text-sm mt-1">
          What students choose from when they sign up (e.g. Righteousness, Holiness, Peace, Joy, YAYA).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {classes.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-indigo/8 text-indigo text-sm font-medium px-3 py-1.5">
            {c.name}
            <button onClick={() => removeClass(c)} className="text-indigo/40 hover:text-rose" title="Delete class">✕</button>
          </span>
        ))}
        {classes.length === 0 && <p className="text-sm text-ink/45">No classes yet — add your first one below.</p>}
      </div>

      <form onSubmit={addClass} className="flex gap-2">
        <input
          className="field flex-1"
          placeholder="New class name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn-outline shrink-0" disabled={adding}>{adding ? 'Adding…' : '+ Add'}</button>
      </form>
      {error && <p className="text-sm text-rose">{error}</p>}
    </div>
  )
}
