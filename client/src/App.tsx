import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";

// Admin pages
import Login from "./pages/Login";
import Quotes from "./pages/admin/Quotes";
import QuoteEditor from "./pages/admin/QuoteEditor";
import Library from "./pages/admin/Library";
import Contacts from "./pages/admin/Contacts";
import Agencies from "./pages/admin/Agencies";
import CalendarPage from "./pages/admin/Calendar";
import Invoices from "./pages/admin/Invoices";
import Notifications from "./pages/admin/Notifications";
import EmailTemplates from "./pages/admin/EmailTemplates";
import Settings from "./pages/admin/Settings";

// Public pages
import QuoteView from "./pages/QuoteView";

function Router() {
  return (
    <Switch>
      {/* Public customer-facing quote view */}
      <Route path="/quote/:id" component={QuoteView} />

      {/* Admin routes */}
      <Route path="/admin" component={Quotes} />
      <Route path="/admin/quotes/:id" component={QuoteEditor} />
      <Route path="/admin/library" component={Library} />
      <Route path="/admin/contacts" component={Contacts} />
      <Route path="/admin/agencies" component={Agencies} />
      <Route path="/admin/calendar" component={CalendarPage} />
      <Route path="/admin/invoices" component={Invoices} />
      <Route path="/admin/notifications" component={Notifications} />
      <Route path="/admin/email-templates" component={EmailTemplates} />
      <Route path="/admin/settings" component={Settings} />

      {/* Login */}
      <Route path="/login" component={Login} />

      {/* Root redirect to admin */}
      <Route path="/" component={Quotes} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
