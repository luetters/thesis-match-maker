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
import PavDashboard from "./pages/PavDashboard";
import PavRespond from "./pages/PavRespond";
import DeanDashboard from "./pages/DeanDashboard";
import Maintenance from "./pages/Maintenance";
import ResetPassword from "./pages/ResetPassword";
import ThesisConfirm from "./pages/ThesisConfirm";
import ExaminerOnboarding from "./pages/ExaminerOnboarding";
import DeanStats from "./pages/DeanStats";
import ExaminerManagement from "./pages/ExaminerManagement";
import { useNotificationPoller } from "./hooks/useNotificationPoller";
import SelectRole from "./pages/SelectRole";
import VerifyDocument from "./pages/VerifyDocument";
import RolePending from "./pages/RolePending";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import NotificationSettings from "./pages/NotificationSettings";

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

      {/* Rollenauswahl nach Magic-Link-Login */}
      <Route path="/select-role" component={SelectRole} />
      <Route path="/role-pending" component={RolePending} />

      {/* Persönliche Profilseite (alle Rollen) */}
      <Route path="/profile" component={Profile as any} />
      {/* Öffentliche Profilseite (rollenbasierte Zugriffskontrolle) */}
      <Route path="/profile/:userId" component={PublicProfile} />

      {/* Studierenden-Dashboard (alle Subrouten werden intern verwaltet) */}
      <Route path="/student" component={StudentDashboard} />
      <Route path="/student/profile" component={StudentDashboard} />
      <Route path="/student/:tab" component={StudentDashboard} />

      {/* Prüfer:innen-Onboarding-Assistent */}
      <Route path="/examiner/onboarding" component={ExaminerOnboarding} />

      {/* Prüfer:innen-Dashboard */}
      <Route path="/examiner" component={ExaminerDashboard} />

      {/* Öffentliche Prüfer:innen-Profilseite (muss vor /examiner/:tab stehen) */}
      <Route path="/examiner/profile/:id" component={ExaminerProfile} />

      {/* Prüfer:innen-Dashboard Tabs */}
      <Route path="/examiner/:tab" component={ExaminerDashboard} />

      {/* Öffentliches Prüfer:innen-Verzeichnis */}
      <Route path="/examiners" component={ExaminerDirectory} />

      {/* JWT-gesicherte CTA-Seite für Prüfer:innen (Login-frei) */}
      <Route path="/examiner/respond" component={ExaminerAction} />

      {/* Admin-Dashboard */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:tab" component={AdminDashboard} />

      {/* Superadmin-Bereich */}
      <Route path="/superadmin" component={SuperadminDashboard} />
      <Route path="/superadmin/:tab" component={SuperadminDashboard} />

      {/* PA-Vorsitz-Dashboard */}
      <Route path="/pav" component={PavDashboard} />
      <Route path="/pav/respond" component={PavRespond} />

      {/* Dekanat-Dashboard */}
      <Route path="/dean" component={DeanDashboard} />
      <Route path="/dean/stats" component={DeanStats} />

      {/* Prüfer:innen-Verwaltung (Superadmin) */}
      <Route path="/superadmin/examiners" component={ExaminerManagement} />

      {/* Kolloquiums-Verwaltung */}
      <Route path="/admin/colloquiums" component={ColloquiumManagement} />

      {/* Wartungsmodus-Seite */}
      <Route path="/maintenance" component={Maintenance} />

      {/* Passwort-Reset */}
      <Route path="/reset-password" component={ResetPassword} />

      {/* Studierenden-Bestätigung (Examiner/PAV-initiierter Antrag) */}
      <Route path="/thesis/confirm" component={ThesisConfirm} />

      {/* E-Mail-Benachrichtigungs-Einstellungen */}
      <Route path="/settings/notifications">{() => <NotificationSettings />}</Route>

      {/* Öffentliche Dokumentenverifikation (Login-frei) */}
      <Route path="/verify/:token" component={VerifyDocument} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Aktiviere Benachrichtigungs-Polling
  useNotificationPoller();
  
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
