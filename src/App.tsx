import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TicketProvider } from "@/contexts/TicketContext";
import AppLayout from "@/components/AppLayout";
import SummaryPage from "@/pages/SummaryPage";
import ListPage from "@/pages/ListPage";
import BoardPage from "@/pages/BoardPage";
import ForYouPage from "@/pages/ForYouPage";
import RecentPage from "@/pages/RecentPage";
import StarredPage from "@/pages/StarredPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TicketProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/space/sp1/board" replace />} />
              <Route path="/space/:spaceId/summary" element={<SummaryPage />} />
              <Route path="/space/:spaceId/list" element={<ListPage />} />
              <Route path="/space/:spaceId/board" element={<BoardPage />} />
              <Route path="/for-you" element={<ForYouPage />} />
              <Route path="/recent" element={<RecentPage />} />
              <Route path="/starred" element={<StarredPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TicketProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
