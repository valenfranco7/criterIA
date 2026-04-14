import { useEffect, useState } from 'react';
import { getUserId, setUserId } from '@/lib/api';

// Lista fija alineada con seed.ts
const DEMO_USERS = [
  { id: 'yairp', label: 'Yair Perez (docente)' },
  { id: 'rosariom', label: 'Rosario Morales (docente)' },
  { id: 'sofiam', label: 'Sofía Martínez (alumna)' },
  { id: 'mateol', label: 'Mateo López (alumno)' },
  { id: 'valentinag', label: 'Valentina García (alumna)' },
  { id: 'thiagor', label: 'Thiago Rodríguez (alumno)' },
  { id: 'camilaf', label: 'Camila Fernández (alumna)' },
  { id: 'benjamind', label: 'Benjamín Díaz (alumno)' },
];

export function UserSwitcher() {
  const [current, setCurrent] = useState<string>('');

  useEffect(() => {
    setCurrent(getUserId() ?? '');
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setUserId(id);
    setCurrent(id);
    window.location.reload();
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="h-9 px-3 text-sm rounded-md border border-input bg-background"
    >
      <option value="">— elegir usuario —</option>
      {DEMO_USERS.map((u) => (
        <option key={u.id} value={u.id}>
          {u.label}
        </option>
      ))}
    </select>
  );
}
