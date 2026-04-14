import { NavLink as RouterNavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Props = {
  to: string;
  children: React.ReactNode;
};

export function NavLink({ to, children }: Props) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'px-3 py-2 text-sm rounded-md transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}
