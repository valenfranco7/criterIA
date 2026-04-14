import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Check } from "lucide-react";
import type { ListCoursesResponse, Activity } from "@contracts";

const ClassPlanning = () => {
  const navigate = useNavigate();

  const { data: coursesData } = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: () => apiFetch<ListCoursesResponse>("/api/teacher/courses"),
  });

  const courses = coursesData?.courses ?? [];

  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [referenceMaterial, setReferenceMaterial] = useState("");
  const [duration, setDuration] = useState(30);

  // File upload
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? ""}/api/teacher/upload`,
        {
          method: "POST",
          headers: { "x-user-id": localStorage.getItem("criteria:user_id") ?? "" },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setUploadedFileId(data.file_id);
      setUploadedFileName(data.filename);
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const activity = await apiFetch<Activity>("/api/teacher/activities", {
        method: "POST",
        body: {
          course_id: courseId,
          title,
          objective,
          topic,
          estimated_duration_minutes: duration,
          config: {
            initial_question: initialQuestion || undefined,
            success_criteria: successCriteria || undefined,
            reference_material: referenceMaterial || undefined,
          },
          anthropic_file_id: uploadedFileId,
        },
      });
      return activity;
    },
    onSuccess: () => {
      navigate("/profesor/actividades");
    },
  });

  const canSubmit =
    courseId && title.trim() && topic.trim() && objective.trim() && !createMutation.isPending;

  return (
    <div className="animate-fade-in max-w-2xl">
      <h2 className="text-2xl font-serif mb-2">Create activity</h2>
      <p className="text-sm text-muted-foreground font-body mb-8">
        Create a Socratic activity for your students to work on before class.
      </p>

      <div className="space-y-6">
        {/* Course */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">Course</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body"
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.year_or_level}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Activity title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g.: The May Revolution from your perspective"
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Topic */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="E.g.: May Week — causes, key figures, role of the Cabildo"
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Objective */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Learning objective
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="E.g.: The student builds their own criteria about what makes a revolution inevitable."
            rows={2}
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Initial question */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Initial question <span className="text-xs">(optional)</span>
          </label>
          <input
            value={initialQuestion}
            onChange={(e) => setInitialQuestion(e.target.value)}
            placeholder="E.g.: Why do you think not everyone agreed in 1810?"
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground font-body mt-1">
            If left blank, Socrates will generate the first question based on the student's profile.
          </p>
        </div>

        {/* Success criteria */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Success criteria <span className="text-xs">(optional)</span>
          </label>
          <input
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            placeholder="E.g.: The student identifies at least two conflicting interests."
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Reference material text */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Reference material <span className="text-xs">(optional, text)</span>
          </label>
          <textarea
            value={referenceMaterial}
            onChange={(e) => setReferenceMaterial(e.target.value)}
            placeholder="Additional context that Socrates can use during the conversation..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Reference file <span className="text-xs">(optional, PDF/DOC)</span>
          </label>
          {uploadedFileName ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-border">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-sm font-body flex-1">{uploadedFileName}</span>
              <button
                onClick={() => {
                  setUploadedFileId(null);
                  setUploadedFileName(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/30 transition-colors">
              {uploading ? (
                <Loader2 className="h-5 w-5 mx-auto text-muted-foreground animate-spin mb-1" />
              ) : (
                <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              )}
              <p className="text-sm text-muted-foreground font-body">
                {uploading ? "Uploading..." : "Click to select a file"}
              </p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-body text-muted-foreground mb-1.5 block">
            Estimated duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={5}
            max={120}
            className="w-24 px-3 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            className="px-8"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {createMutation.isPending ? "Creating..." : "Create and activate"}
          </Button>
          {createMutation.isError && (
            <p className="text-sm text-destructive font-body self-center">
              Error creating the activity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassPlanning;
