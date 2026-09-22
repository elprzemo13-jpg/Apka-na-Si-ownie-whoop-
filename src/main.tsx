import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { t } from "./lib/i18n/pl";
import { isSupabaseConfigured } from "./lib/supabase";
import "./index.css";

function ConfigMissing() {
  return (
    <div className="mx-auto max-w-app px-[30px] py-[70px] text-center">
      <div className="mb-2 font-head text-2xl font-bold uppercase">{t.config.missingTitle}</div>
      <div className="text-sm leading-relaxed text-dim">{t.config.missingBody}</div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    ) : (
      <ConfigMissing />
    )}
  </StrictMode>,
);
