import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { useSettings } from '../../contexts/SettingsContext.jsx'
import { uploadMediaFile } from '../../lib/uploadMedia.js'

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
    </div>
  )
}
