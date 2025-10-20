import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Utensils, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Relatórios", path: "/dashboard/reports", icon: FileText },
    { name: "Diário de Refeições", path: "/dashboard/meals", icon: Utensils },
    { name: "Meu Perfil", path: "/dashboard/profile", icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 border-r border-border bg-card">
          <div className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-6 border-b border-border">
              <Logo />
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navigation.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-background">
            <nav className="p-4 space-y-1">
              {navigation.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-64 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
