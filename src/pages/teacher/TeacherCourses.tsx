import { useNavigate } from "react-router-dom";
import { courses } from "@/data/mockData";
import { Users, Clock, BookOpen } from "lucide-react";

const TeacherCourses = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">My courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/profesor/alumnos?curso=${course.id}`)}
            className="text-left bg-card border border-border rounded-lg p-6 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <h3 className="font-serif text-lg group-hover:text-primary transition-colors">{course.name}</h3>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground font-body">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                {course.students} students
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Last activity: {course.lastActivity}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Next class: {course.nextClass}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TeacherCourses;
