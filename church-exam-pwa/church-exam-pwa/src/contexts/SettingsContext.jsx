import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const SettingsContext = createContext(null)

const FALLBACK = {
  id: 1,
  church_name: 'RCCG Chapel of Resurrection, Zone 9 HQs',
  church_address: 'Km. 38, Lekki-Epe Expressway, opp. Blenco Supermarket, Eputu, Lagos',
  department_name: 'Sunday School Department',
  welcome_message: 'Welcome! Sign in to take your quarterly review exam.',
  logo_url: '/logo.png'
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
    if (data) setSettings({ ...FALLBACK, ...data, logo_url: data.logo_url || FALLBACK.logo_url })
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SettingsContext.Provider value={{ settings, loaded, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
