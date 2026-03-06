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
import StarredPage from "@/pages/StarredPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import VerifyOTP from "@/pages/VerifyOTP";
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
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />

            <Route element={<ProtectedApp />}>

              <Route
                path="/"
                element={<Navigate to="/space/sp1/board" replace />}
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
                path="/starred"
                element={<StarredPage />}
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
