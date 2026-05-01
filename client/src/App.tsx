import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminDashboard from "./pages/AdminDashboard";
import ExaminerAction from "./pages/ExaminerAction";
import ExaminerDashboard from "./pages/ExaminerDashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthVerify from "./pages/AuthVerify";
import StudentDashboard from "./pages/StudentDashboard";
import Onboarding from "./pages/Onboarding";
import ExaminerProfile from "./pages/ExaminerProfile";
import ColloquiumManagement from "./pages/ColloquiumManagement";
import ExaminerDirectory from "./pages/ExaminerDirectory";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import Maintenance from "./pages/Maintenance";
import ResetPassword from "./pages/ResetPassword";

function Router() {
  return (
    <Switch>
      {/* Landing Page */}
      <Route path="/" component={Home} />

      {/* Auth-Routen (Magic Link) */}
      <Route path="/login" component={Login} />
      <Route path="/auth/verify" component={AuthVerify} />

      {/* Onboarding: Rollenwahl nach erstem Login */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Studierenden-Dashboard (alle Subrouten werden intern verwaltet) */}
      <Route path="/student" component={StudentDashboard} />
      <Route path="/student/:tab" component={StudentDashboard} />

      {/* Prüfer:innen-Dashboard */}
      <Route path="/examiner" component={ExaminerDashboard} />
      <Route path="/examiner/:tab" component={ExaminerDashboard} />

      {/* Öffentliches Prüfer:innen-Verzeichnis */}
      <Route path="/examiners" component={ExaminerDirectory} />

      {/* Öffentliche Prüfer:innen-Profilseite */}
      <Route path="/examiner/profile/:id" component={ExaminerProfile} />

      {/* JWT-gesicherte CTA-Seite für Prüfer:innen (Login-frei) */}
      <Route path="/examiner/respond" component={ExaminerAction} />

      {/* Admin-Dashboard */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:tab" component={AdminDashboard} />

      {/* Superadmin-Bereich */}
      <Route path="/superadmin" component={SuperadminDashboard} />
      <Route path="/superadmin/:tab" component={SuperadminDashboard} />

      {/* Kolloquiums-Verwaltung */}
      <Route path="/admin/colloquiums" component={ColloquiumManagement} />

      {/* Wartungsmodus-Seite */}
      <Route path="/maintenance" component={Maintenance} />

      {/* Passwort-Reset */}
      <Route path="/reset-password" component={ResetPassword} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
