import { useState } from "react";
import { Button } from "@/components/ui/button";
import { courses } from "@/data/mockData";
import { ChevronRight, Upload, FileText, File, RefreshCw, Pencil, Check } from "lucide-react";

const steps = ["Temas", "Material", "Estructura", "Actividad IA"];

const ClassPlanning = () => {
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState("");
  const [aiActivity, setAiActivity] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courses[0].id);

  return (
    <div className="animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-serif mb-6">Planificación de clase</h2>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`px-3 py-1.5 rounded-md text-sm font-body transition-colors ${
                i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-body">¿Qué temas querés dar en esta clase?</p>
          <textarea
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="Ej: La Semana de Mayo — causas inmediatas, protagonistas, el rol del Cabildo"
            className="w-full h-32 px-4 py-3 rounded-md border border-input bg-background text-sm font-body resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-body">Subí material propio para esta clase (opcional).</p>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-body">Arrastrá archivos acá o hacé click para seleccionar</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-border">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-body">Semana_de_Mayo_fuentes.pdf</span>
              <span className="text-xs text-muted-foreground ml-auto font-body">2.4 MB</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-card border border-border">
              <File className="h-4 w-4 text-primary" />
              <span className="text-sm font-body">Cronologia_1810.docx</span>
              <span className="text-xs text-muted-foreground ml-auto font-body">340 KB</span>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>Atrás</Button>
            <Button onClick={() => setStep(2)}>Generar estructura</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {[
              { phase: "Inicio", time: "15 min", content: "Pregunta disparadora: '¿Qué harían ustedes si las decisiones sobre su vida las tomara alguien que vive a 10.000 km?' — Breve contextualización del estado de ánimo en Buenos Aires en mayo de 1810.", objectives: "Activar conocimientos previos. Generar empatía con el contexto." },
              { phase: "Desarrollo", time: "45 min", content: "Lectura guiada de fuentes primarias (fragmentos de actas del Cabildo). Trabajo en grupos: cada grupo analiza la posición de un actor (Cisneros, Saavedra, Moreno, Castelli). Puesta en común: ¿por qué no todos querían lo mismo?", objectives: "Comprender la multicausalidad. Distinguir intereses de distintos actores." },
              { phase: "Cierre", time: "20 min", content: "Síntesis colectiva: ¿fue inevitable la revolución? ¿Había alternativas? Registro escrito individual: 'Lo que más me sorprendió de esta clase'.", objectives: "Consolidar ideas. Ejercitar el pensamiento contrafáctico." },
            ].map((block) => (
              <div key={block.phase} className="p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="font-serif text-sm">{block.phase}</h4>
                  <span className="text-xs text-muted-foreground font-body">{block.time}</span>
                </div>
                <p className="text-sm text-foreground font-body mb-2">{block.content}</p>
                <p className="text-xs text-muted-foreground font-body italic">Objetivos: {block.objectives}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
            <Button onClick={() => setStep(3)}>Siguiente</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-card border border-border rounded-lg p-5">
            <div>
              <h4 className="font-serif text-sm">¿Actividad con IA para los alumnos?</h4>
              <p className="text-xs text-muted-foreground font-body mt-1">
                Generá una actividad socrática que los alumnos harán con el agente de IA
              </p>
            </div>
            <button
              onClick={() => setAiActivity(!aiActivity)}
              className={`w-12 h-6 rounded-full transition-colors relative ${aiActivity ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${aiActivity ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          {aiActivity && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-sm font-body text-muted-foreground mb-1 block">Curso destino</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-body"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                <h4 className="font-serif text-sm">La Revolución de Mayo desde tu mirada</h4>
                <div className="space-y-2 text-sm font-body">
                  <p><span className="text-muted-foreground">Objetivo pedagógico:</span> Que los alumnos reconstruyan las motivaciones de los criollos en 1810 a partir de preguntas guiadas.</p>
                  <p><span className="text-muted-foreground">Duración estimada:</span> 30 minutos</p>
                  <p><span className="text-muted-foreground">Qué trabajarán:</span> El agente socrático guiará al alumno a conectar la exclusión política colonial con experiencias personales, para llegar por sí mismo a comprender por qué las revoluciones ocurren.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Regenerar
                </Button>
                <Button variant="outline" size="sm">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
                <Button size="sm">
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Aprobar y guardar
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassPlanning;
