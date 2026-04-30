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
import StudentDashboard from "./pages/StudentDashboard";

function Router() {
  return (
    <Switch>
      {/* Landing Page */}
      <Route path="/" component={Home} />

      {/* Studierenden-Dashboard (alle Subrouten werden intern verwaltet) */}
      <Route path="/student" component={StudentDashboard} />
      <Route path="/student/:tab" component={StudentDashboard} />

      {/* Prüfer:innen-Dashboard */}
      <Route path="/examiner" component={ExaminerDashboard} />
      <Route path="/examiner/:tab" component={ExaminerDashboard} />

      {/* JWT-gesicherte CTA-Seite für Prüfer:innen (Login-frei) */}
      <Route path="/examiner/respond" component={ExaminerAction} />

      {/* Admin-Dashboard */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:tab" component={AdminDashboard} />

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
