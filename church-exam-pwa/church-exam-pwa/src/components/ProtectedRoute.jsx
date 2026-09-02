import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingScreen from './LoadingScreen'

export function RequireAdmin() {
  const { loading, session, isAdmin } = useAuth()
  if (loading) return <LoadingScreen label="Checking your session…" />
  if (!session) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireStudent() {
  const { loading, session, isStudent } = useAuth()
  if (loading) return <LoadingScreen label="Checking your session…" />
  if (!session) return <Navigate to="/student/login" replace />
  if (!isStudent) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireTeacher() {
  const { loading, session, isTeacher } = useAuth()
  if (loading) return <LoadingScreen label="Checking your session…" />
  if (!session) return <Navigate to="/teacher/login" replace />
  if (!isTeacher) return <Navigate to="/" replace />
  return <Outlet />
}
