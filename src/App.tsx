import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "@/components/AppLayout";

import SummaryPage from "@/pages/SummaryPage";
import ListPage from "@/pages/ListPage";
import BoardPage from "@/pages/BoardPage";
import ForYouPage from "@/pages/ForYouPage";
import RecentPage from "@/pages/RecentPage";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import AdminProjectsPage from "@/pages/AdminProjectsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import NotFound from "./pages/NotFound";
import { TicketProvider } from "@/contexts/TicketContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function ProtectedApp() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <TicketProvider>
      <AppLayout />
    </TicketProvider>
  );
}

function HomeRedirect() {
  return <Navigate to="/for-you" replace />;
}

function SuperAdminRoute({ children }: { children: any }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'SUPER_ADMIN') return <Navigate to="/for-you" replace />;
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>

        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<ProtectedApp />}>

              <Route
                path="/"
                element={<HomeRedirect />}
              />

              <Route
                path="/space/:spaceId/summary"
                element={<SummaryPage />}
              />

              <Route
                path="/space/:spaceId/list"
                element={<ListPage />}
              />

              <Route
                path="/space/:spaceId/board"
                element={<BoardPage />}
              />

              <Route
                path="/for-you"
                element={<ForYouPage />}
              />

              <Route
                path="/recent"
                element={<RecentPage />}
              />
              <Route
                path="/admin/projects"
                element={<SuperAdminRoute><AdminProjectsPage /></SuperAdminRoute>}
              />

              <Route
                path="/admin/users"
                element={<SuperAdminRoute><AdminUsersPage /></SuperAdminRoute>}
              />

            </Route>

            <Route path="*" element={<NotFound />} />

          </Routes>
        </BrowserRouter>
        </AuthProvider>

      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
