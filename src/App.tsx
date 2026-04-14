import { Navigate, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import TeacherLayout from './pages/teacher/TeacherLayout';
import TeacherCourses from './pages/teacher/TeacherCourses';
import ClassPlanning from './pages/teacher/ClassPlanning';
import TeacherActivities from './pages/teacher/TeacherActivities';
import StudentPanel from './pages/teacher/StudentPanel';
import StudentProfile from './pages/teacher/StudentProfile';
import StudentLayout from './pages/student/StudentLayout';
import StudentHome from './pages/student/StudentHome';
import StudentActivities from './pages/student/StudentActivities';
import SocraticChat from './pages/student/SocraticChat';
import MyPath from './pages/student/MyPath';
import Conversations from './pages/student/Conversations';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />

      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<Navigate to="courses" replace />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="courses/:courseId/students" element={<StudentPanel />} />
        <Route path="class-planning" element={<ClassPlanning />} />
        <Route path="activities" element={<TeacherActivities />} />
        <Route path="students/:studentId" element={<StudentProfile />} />
      </Route>

      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudentHome />} />
        <Route path="activities" element={<StudentActivities />} />
        <Route path="sessions/:sessionId" element={<SocraticChat />} />
        <Route path="my-path" element={<MyPath />} />
        <Route path="conversations" element={<Conversations />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
