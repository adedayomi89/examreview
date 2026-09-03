import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, usernameToEmail } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [teacherClassIds, setTeacherClassIds] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setTeacherClassIds([])
      return
    }
    let { data, error } = await supabase.from('profiles').select('*, classes!class_id(name)').eq('id', userId).single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Profile load (with class) failed, retrying without it:', error)
      const fallback = await supabase.from('profiles').select('*').eq('id', userId).single()
      data = fallback.data
      if (fallback.error) {
        // eslint-disable-next-line no-console
        console.error('Profile load fallback also failed:', fallback.error)
      }
    }
    setProfile(data || null)
    if (data?.role === 'teacher') {
      const { data: rows } = await supabase.from('teacher_classes').select('class_id, classes(name)').eq('teacher_id', userId)
      setTeacherClassIds((rows || []).map((r) => r.class_id))
    } else {
      setTeacherClassIds([])
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user?.id)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUpStudent = async ({ fullName, username, password, classId }) => {
    const email = usernameToEmail(username)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'student', full_name: fullName, username: username.trim(), class_id: classId || '' } }
    })
    if (error) throw error
    return data
  }

  const signInStudent = async ({ username, password }) => {
    const email = usernameToEmail(username)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpAdmin = async ({ fullName, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'admin', full_name: fullName, username: null } }
    })
    if (error) throw error
    return data
  }

  const signInAdmin = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value = {
    session,
    profile,
    teacherClassIds,
    loading,
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    isTeacher: profile?.role === 'teacher',
    signUpStudent,
    signInStudent,
    signUpAdmin,
    signInAdmin,
    signOut,
    refreshProfile: () => loadProfile(session?.user?.id)
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
