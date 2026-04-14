import { useState } from "react";
import { studentConversations, socraticChat } from "@/data/mockData";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

const Conversations = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-serif mb-6">Conversaciones</h2>

      <div className="space-y-3">
        {studentConversations.map((conv) => (
          <div key={conv.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-body font-medium">{conv.title}</p>
                <p className="text-xs text-muted-foreground font-body">{conv.course} · {conv.date} · {conv.messages} mensajes</p>
              </div>
              {expanded === conv.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expanded === conv.id && (
              <div className="border-t border-border p-4 animate-fade-in">
                <div className="space-y-3 max-h-96 overflow-auto">
                  {socraticChat.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"} group`}>
                      <div className={`relative max-w-[80%] px-4 py-2.5 rounded-lg text-sm font-body ${
                        msg.role === "student"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {msg.text}
                        <button className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent">
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Conversations;
