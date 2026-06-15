import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import QuotePage from "./pages/QuotePage";
import InvoicePage from "./pages/InvoicePage";
import ReviewPage from "./pages/ReviewPage";
import { usePwaForceUpdate } from "./hooks/usePwaForceUpdate";

function Router() {
  return (
    <Switch>
      <Route path={"/quote/:slug"} component={({ params }) => <QuotePage slug={params.slug} />} />
      <Route path={"/invoice/:slug"} component={({ params }) => <InvoicePage slug={params.slug} />} />
      <Route path={"/review/:slug"} component={({ params }) => <ReviewPage slug={params.slug} />} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  usePwaForceUpdate();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
