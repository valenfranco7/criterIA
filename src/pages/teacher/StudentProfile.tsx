import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentProfile } from "@/data/mockData";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

const StudentProfile = () => {
  const navigate = useNavigate();
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "chat">("summary");
  const student = studentProfile;

  return (
    <div className="animate-fade-in max-w-3xl">
      <button
        onClick={() => navigate("/profesor/alumnos")}
        className="flex items-center gap-2 text-sm text-muted-foreground font-body hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al panel
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-body text-muted-foreground font-medium">
          SM
        </div>
        <h2 className="text-2xl font-serif">{student.name}</h2>
      </div>

      {/* AI Summary */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-serif text-sm text-muted-foreground mb-2">Resumen del alumno</h3>
        <p className="text-sm font-body leading-relaxed">{student.summary}</p>
      </div>

      {/* Activity history */}
      <h3 className="font-serif text-lg mb-4">Historial de actividades</h3>
      <div className="space-y-3">
        {student.activities.map((act) => (
          <div key={act.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedActivity(expandedActivity === act.id ? null : act.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-body font-medium">{act.title}</p>
                <p className="text-xs text-muted-foreground font-body">{act.date}</p>
              </div>
              {expandedActivity === act.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expandedActivity === act.id && (
              <div className="border-t border-border animate-fade-in">
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`px-4 py-2 text-sm font-body transition-colors ${activeTab === "summary" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
                  >
                    Resumen
                  </button>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`px-4 py-2 text-sm font-body transition-colors ${activeTab === "chat" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
                  >
                    Conversación completa
                  </button>
                </div>
                <div className="p-4">
                  {activeTab === "summary" ? (
                    <p className="text-sm font-body leading-relaxed text-muted-foreground">{act.summaryText}</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {act.conversation.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm font-body ${
                            msg.role === "student"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProfile;
