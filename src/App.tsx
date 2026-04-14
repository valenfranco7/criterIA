import { Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TeacherLayout from "./pages/teacher/TeacherLayout";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import ClassPlanning from "./pages/teacher/ClassPlanning";
import TeacherActivities from "./pages/teacher/TeacherActivities";
import StudentPanel from "./pages/teacher/StudentPanel";
import StudentProfile from "./pages/teacher/StudentProfile";
import StudentLayout from "./pages/student/StudentLayout";
import StudentHome from "./pages/student/StudentHome";
import StudentActivities from "./pages/student/StudentActivities";
import SocraticChat from "./pages/student/SocraticChat";
import MyPath from "./pages/student/MyPath";
import Conversations from "./pages/student/Conversations";

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<Index />} />

        <Route path="/profesor" element={<TeacherLayout />}>
          <Route index element={<TeacherCourses />} />
          <Route path="cursos" element={<TeacherCourses />} />
          <Route path="planificacion-clase" element={<ClassPlanning />} />
          <Route path="actividades" element={<TeacherActivities />} />
          <Route path="alumnos" element={<StudentPanel />} />
          <Route path="alumnos/:studentId" element={<StudentProfile />} />
        </Route>

        <Route path="/estudiante" element={<StudentLayout />}>
          <Route index element={<StudentHome />} />
          <Route path="actividades" element={<StudentActivities />} />
          <Route path="actividad/:activityId" element={<SocraticChat />} />
          <Route path="mi-camino" element={<MyPath />} />
          <Route path="conversaciones" element={<Conversations />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  );
}
