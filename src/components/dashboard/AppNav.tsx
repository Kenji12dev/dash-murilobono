import { BarChart3, PlusCircle, Database, Columns3, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface AppNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AppNav = ({ activeTab, onTabChange }: AppNavProps) => {
  const { role, signOut, user } = useAuth();

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "add-sale", label: "Adicionar Venda", icon: PlusCircle },
    { id: "database", label: "Banco de Dados", icon: Database },
    { id: "kanban", label: "Fluxo de Status", icon: Columns3 },
    ...(role === "admin"
      ? [{ id: "collaborators", label: "Colaboradores", icon: Users }]
      : []),
  ];

  return (
    <div className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm tracking-tight">Sales Performance</span>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          <div className="ml-3 pl-3 border-l border-border flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AppNav;
