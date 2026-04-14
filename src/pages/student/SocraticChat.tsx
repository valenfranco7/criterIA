import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SocraticChat() {
  const { sessionId } = useParams();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex flex-col h-[calc(100vh-10rem)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conversación</CardTitle>
            <Badge variant="outline">anchoring</Badge>
          </div>
          <CardDescription>Sesión: {sessionId}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          <ScrollArea className="flex-1 border rounded-md p-4">
            <div className="text-sm text-muted-foreground">
              Acá se renderiza la conversación del alumno con el tutor.
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea placeholder="Escribí tu respuesta…" className="flex-1" />
            <Button>Enviar</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Estado</CardTitle>
          <CardDescription>
            GET /api/student/sessions/:sessionId · POST /sessions/:id/messages · POST /sessions/:id/close
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Fase actual, avance y cierre de sesión.
        </CardContent>
      </Card>
    </div>
  );
}
