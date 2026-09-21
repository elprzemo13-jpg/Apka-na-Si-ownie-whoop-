import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import { TodayPage } from "../routes/today/TodayPage";
import { PlanPage } from "../routes/plan/PlanPage";
import { LogPage } from "../routes/log/LogPage";
import { TrendsPage } from "../routes/trends/TrendsPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "plan", element: <PlanPage /> },
      { path: "log", element: <LogPage /> },
      { path: "trends", element: <TrendsPage /> },
      { path: "*", element: <TodayPage /> },
    ],
  },
]);
