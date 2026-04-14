import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <span className="text-xl font-serif text-foreground">
          criteria
        </span>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Small label above tagline */}
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-body mb-8">
          Plataforma Educativa
        </p>

        {/* Large centered tagline */}
        <h1 className="text-center max-w-4xl">
          <span className="block text-5xl md:text-7xl lg:text-8xl font-serif font-light tracking-tight text-foreground leading-[1.1]">
            El conocimiento
          </span>
          <span className="block text-5xl md:text-7xl lg:text-8xl font-serif font-light tracking-tight text-foreground leading-[1.1]">
            no se transmite,
          </span>
          <span className="block text-5xl md:text-7xl lg:text-8xl font-serif italic text-primary leading-[1.1] mt-2">
            se descubre.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground font-body mt-12 mb-16 max-w-2xl text-center leading-relaxed">
          Una herramienta para profesores que planifican con intención y alumnos que piensan por sí mismos.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/profesor")}
            className="text-base px-10 py-6 font-body bg-foreground text-background hover:bg-foreground/90"
          >
            Entrar como profesor
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/estudiante")}
            className="text-base px-10 py-6 font-body border-border hover:bg-accent"
          >
            Entrar como estudiante
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 left-8 text-sm text-muted-foreground font-body">
        © 2026 criteria
      </p>
    </div>
  );
};

export default Index;
