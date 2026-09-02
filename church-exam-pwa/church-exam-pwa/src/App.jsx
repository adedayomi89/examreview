import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'

import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminSignup from './pages/admin/AdminSignup.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminOverview from './pages/admin/AdminOverview.jsx'
import AdminStudents from './pages/admin/AdminStudents.jsx'
import AdminTeachers from './pages/admin/AdminTeachers.jsx'
import AdminExams from './pages/admin/AdminExams.jsx'
import AdminExamEditor from './pages/admin/AdminExamEditor.jsx'
import AdminAttempts from './pages/admin/AdminAttempts.jsx'
import AdminInsights from './pages/admin/AdminInsights.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'

import StudentLogin from './pages/student/StudentLogin.jsx'
import StudentLayout from './pages/student/StudentLayout.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import ExamTake from './pages/student/ExamTake.jsx'
import ExamResult from './pages/student/ExamResult.jsx'

import TeacherLogin from './pages/teacher/TeacherLogin.jsx'
import TeacherLayout from './pages/teacher/TeacherLayout.jsx'
import TeacherStudents from './pages/teacher/TeacherStudents.jsx'
import TeacherResults from './pages/teacher/TeacherResults.jsx'

import { RequireAdmin, RequireStudent, RequireTeacher } from './components/ProtectedRoute.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="exams" element={<AdminExams />} />
          <Route path="exams/:examId" element={<AdminExamEditor />} />
          <Route path="attempts" element={<AdminAttempts />} />
          <Route path="insights" element={<AdminInsights />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="/student/login" element={<StudentLogin />} />
      <Route element={<RequireStudent />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="exam/:examId" element={<ExamTake />} />
          <Route path="exam/:examId/result" element={<ExamResult />} />
        </Route>
      </Route>

      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route element={<RequireTeacher />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherStudents />} />
          <Route path="results" element={<TeacherResults />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
