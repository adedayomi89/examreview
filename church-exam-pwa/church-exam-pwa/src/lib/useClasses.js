import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useClasses() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const { data } = await supabase.from('classes').select('*').order('name')
    setClasses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return { classes, loading, refresh }
}
