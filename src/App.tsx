import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { INTERCEPTOR_ACTIVE } from "./lib/fetch-interceptor"; // Redirect legacy URLs to Yandex Cloud
import Index from "./pages/Index";
import Oferta from "./pages/Oferta";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Conversations from "./pages/Conversations";
import Subscriptions from "./pages/Subscriptions";
import UserMessages from "./pages/UserMessages";
import Blacklist from "./pages/Blacklist";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Ensure interceptor is loaded
console.log('[App.tsx] Fetch interceptor loaded:', INTERCEPTOR_ACTIVE);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/oferta" element={<Oferta />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/chat/:userId" element={<Chat />} />
          <Route path="/messages" element={<Conversations />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/user-messages/:userId" element={<UserMessages />} />
          <Route path="/blacklist" element={<Blacklist />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;