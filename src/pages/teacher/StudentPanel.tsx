import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { courses, students } from "@/data/mockData";
import { AlertTriangle, TrendingUp } from "lucide-react";

const StudentPanel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCourse = searchParams.get("curso") || courses[0].id;
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const course = courses.find((c) => c.id === selectedCourse) || courses[0];

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Panel de alumnos</h2>

      <select
        value={selectedCourse}
        onChange={(e) => setSelectedCourse(e.target.value)}
        className="px-3 py-2 rounded-md border border-input bg-background text-sm font-body mb-6"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Course summary */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-serif text-lg mb-3">{course.name} — Resumen general</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-body">Comprensión promedio</p>
            <p className="text-2xl font-serif text-primary">74%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-body">Temas difíciles</p>
            <p className="text-sm font-body mt-1">Multicausalidad, fuentes primarias</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Necesitan atención
            </p>
            <p className="text-sm font-body mt-1">{students.filter((s) => s.status === "needs-attention").length} alumnos</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Evolución
            </p>
            <p className="text-sm font-body mt-1 text-success">+8% este mes</p>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="space-y-2">
        {students.map((student) => (
          <button
            key={student.id}
            onClick={() => navigate(`/profesor/alumnos/${student.id}`)}
            className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-body text-muted-foreground font-medium">
              {student.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-medium group-hover:text-primary transition-colors">{student.name}</p>
              <p className="text-xs text-muted-foreground font-body">Última: {student.lastActivity}</p>
            </div>
            <div className="flex items-center gap-3">
              {student.status === "needs-attention" && (
                <span className="text-xs text-warning font-body">Necesita atención</span>
              )}
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${student.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-body w-8 text-right">{student.progress}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentPanel;
