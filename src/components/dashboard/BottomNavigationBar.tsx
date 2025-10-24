import { NavLink } from "react-router-dom";
import { LayoutDashboard, Utensils, CalendarDays, User, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export const BottomNavigationBar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background border-t border-border flex items-center justify-around md:hidden z-50">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center text-xs text-muted-foreground p-2 rounded-md hover:bg-accent/50",
            isActive && "text-primary font-medium"
          )
        }
      >
        <LayoutDashboard className="h-5 w-5 mb-1" />
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/dashboard/meals"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center text-xs text-muted-foreground p-2 rounded-md hover:bg-accent/50",
            isActive && "text-primary font-medium"
          )
        }
      >
        <Utensils className="h-5 w-5 mb-1" />
        <span>Refeições</span>
      </NavLink>

      <NavLink
        to="/dashboard/reports"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center text-xs text-muted-foreground p-2 rounded-md hover:bg-accent/50",
            isActive && "text-primary font-medium"
          )
        }
      >
        <CalendarDays className="h-5 w-5 mb-1" />
        <span>Relatórios</span>
      </NavLink>

      <NavLink
        to="/dashboard/workouts"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center text-xs text-muted-foreground p-2 rounded-md hover:bg-accent/50",
            isActive && "text-primary font-medium"
          )
        }
      >
        <Dumbbell className="h-5 w-5 mb-1" />
        <span>Treinos</span>
      </NavLink>

      <NavLink
        to="/dashboard/profile"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center text-xs text-muted-foreground p-2 rounded-md hover:bg-accent/50",
            isActive && "text-primary font-medium"
          )
        }
      >
        <User className="h-5 w-5 mb-1" />
        <span>Perfil</span>
      </NavLink>
    </nav>
  );
};

export default BottomNavigationBar;