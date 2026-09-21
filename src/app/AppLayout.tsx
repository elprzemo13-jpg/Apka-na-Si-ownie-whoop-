import { useState } from "react";
import { Outlet } from "react-router";
import { BottomNav } from "../components/ui/BottomNav";
import { Header } from "../components/ui/Header";
import { AddSheet } from "./AddSheet";

export function AppLayout() {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="mx-auto min-h-dvh max-w-app">
      <Header />
      <main className="pb-[100px]">
        <Outlet />
      </main>
      <BottomNav onAdd={() => setAddOpen(true)} />
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
