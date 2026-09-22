import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { BottomNav } from "../components/ui/BottomNav";
import { Header } from "../components/ui/Header";
import { SyncBadge } from "../components/ui/SyncBadge";
import { useAuth } from "../lib/auth/AuthProvider";
import { startSync, stopSync } from "../lib/data/syncService";
import { AddSheet } from "./AddSheet";

export function AppLayout() {
  const { session } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    void startSync(userId);
    return stopSync;
  }, [userId]);

  return (
    <div className="mx-auto min-h-dvh max-w-app">
      <Header />
      <main className="pb-[100px]">
        <Outlet />
      </main>
      <SyncBadge />
      <BottomNav onAdd={() => setAddOpen(true)} />
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
