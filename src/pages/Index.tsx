import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AppNav from "@/components/dashboard/AppNav";
import Dashboard from "@/pages/Dashboard";
import AddSale from "@/pages/AddSale";
import SalesDatabase from "@/pages/SalesDatabase";
import KanbanBoard from "@/pages/KanbanBoard";
import Collaborators from "@/pages/Collaborators";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppNav activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "add-sale" && <AddSale />}
      {activeTab === "database" && <SalesDatabase />}
      {activeTab === "kanban" && <KanbanBoard />}
      {activeTab === "collaborators" && role === "admin" && <Collaborators />}
    </div>
  );
};

export default Index;
