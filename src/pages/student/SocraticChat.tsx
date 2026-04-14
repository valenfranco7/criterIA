import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socraticChat } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Pause, PanelRightOpen, PanelRightClose, ArrowLeft } from "lucide-react";

const builtIdeas = [
  "La exclusión política era permanente para los criollos — no podían cambiar dónde nacieron",
  "Cuando el sistema no tiene forma de incluir a los que excluye, la presión crece hasta que se rompe",
];

const SocraticChat = () => {
  const navigate = useNavigate();
  const [messages] = useState(socraticChat);
  const [input, setInput] = useState("");
  const [showIdeas, setShowIdeas] = useState(true);
  const [elapsed] = useState("12:34");

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/estudiante/actividades")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-body font-medium">La Revolución de Mayo desde tu mirada</p>
            <p className="text-xs text-muted-foreground font-body">Historia 3ro A</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground font-body">{elapsed}</span>
          <Button variant="outline" size="sm">
            <Pause className="h-3.5 w-3.5 mr-1.5" />
            Pausar
          </Button>
          <button onClick={() => setShowIdeas(!showIdeas)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showIdeas ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-4 py-3 rounded-lg text-sm font-body leading-relaxed ${
                  msg.role === "student"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu respuesta..."
                className="flex-1 px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button>Enviar</Button>
            </div>
            <div className="flex justify-center mt-3">
              <Button variant="outline" size="sm" className="text-xs">
                Cerrar actividad
              </Button>
            </div>
          </div>
        </div>

        {/* Ideas panel */}
        {showIdeas && (
          <div className="w-72 border-l border-border bg-card p-5 overflow-auto animate-fade-in">
            <h3 className="font-serif text-sm text-muted-foreground mb-4">Ideas que vas construyendo</h3>
            <div className="space-y-3">
              {builtIdeas.map((idea, i) => (
                <div key={i} className="p-3 rounded-md bg-muted text-sm font-body leading-relaxed">
                  {idea}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-body mt-6 italic">
              Estas son tus ideas, formuladas con tus palabras.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocraticChat;
