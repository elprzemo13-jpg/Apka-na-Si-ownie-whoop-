import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import { GuestOnly, RequireAuth, RequireProfile } from "./guards";
import { AuthCallbackPage } from "../routes/auth/AuthCallbackPage";
import { LoginPage } from "../routes/auth/LoginPage";
import { RegisterPage } from "../routes/auth/RegisterPage";
import { ResetPasswordPage } from "../routes/auth/ResetPasswordPage";
import { UpdatePasswordPage } from "../routes/auth/UpdatePasswordPage";
import { OnboardingPage } from "../routes/onboarding/OnboardingPage";
import { TodayPage } from "../routes/today/TodayPage";
import { PlanPage } from "../routes/plan/PlanPage";
import { LogPage } from "../routes/log/LogPage";
import { TrendsPage } from "../routes/trends/TrendsPage";
import { SettingsPage } from "../routes/settings/SettingsPage";

export const router = createBrowserRouter([
  { path: "login", element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: "register", element: <GuestOnly><RegisterPage /></GuestOnly> },
  { path: "reset-password", element: <GuestOnly><ResetPasswordPage /></GuestOnly> },
  // Email-link targets: reachable signed in or out.
  { path: "update-password", element: <UpdatePasswordPage /> },
  { path: "auth/callback", element: <AuthCallbackPage /> },
  { path: "onboarding", element: <RequireAuth><OnboardingPage /></RequireAuth> },
  {
    element: (
      <RequireAuth>
        <RequireProfile>
          <AppLayout />
        </RequireProfile>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TodayPage /> },
      { path: "plan", element: <PlanPage /> },
      { path: "log", element: <LogPage /> },
      { path: "trends", element: <TrendsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <TodayPage /> },
    ],
  },
]);
