import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import MatchNotifications from "./components/match/MatchNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NewMatch from "./pages/NewMatch";
import Scoring from "./pages/Scoring";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import Search from "./pages/Search";
import PlayerProfile from "./pages/PlayerProfile";
import Career from "./pages/Career";
import Leaderboard from "./pages/Leaderboard";
import LiveMatch from "./pages/LiveMatch";
import MatchAnalytics from "./pages/MatchAnalytics";
import NotFound from "./pages/NotFound";
import NewTournament from "./pages/NewTournament";
import NewSeries from "./pages/NewSeries";
import Tournament from "./pages/Tournament";
import ViewMatches from "./pages/ViewMatches";
import ViewTournaments from "./pages/ViewTournaments";
import Messages from "./pages/Messages";
import EmbedTicker from "./pages/EmbedTicker";
import ViewSeries from "./pages/ViewSeries";
import Series from "./pages/Series";
import CompareStats from "./pages/CompareStats";
import NotificationSettings from "./pages/NotificationSettings";
import Grounds from "./pages/Grounds";
import GroundDetails from "./pages/GroundDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MatchNotifications enabled={true} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/search" element={<Search />} />
            <Route path="/player/:playerId" element={<PlayerProfile />} />
            <Route path="/career" element={<Career />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/new-match" element={<NewMatch />} />
            <Route path="/scoring/:matchId" element={<Scoring />} />
            <Route path="/match/:matchId" element={<LiveMatch />} />
            <Route path="/match/:matchId/analytics" element={<MatchAnalytics />} />
            <Route path="/new-tournament" element={<NewTournament />} />
            <Route path="/new-series" element={<NewSeries />} />
            <Route path="/tournament/:tournamentId" element={<Tournament />} />
            <Route path="/view-matches" element={<ViewMatches />} />
            <Route path="/view-tournaments" element={<ViewTournaments />} />
            <Route path="/view-series" element={<ViewSeries />} />
            <Route path="/series/:seriesId" element={<Series />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/embed/ticker" element={<EmbedTicker />} />
            <Route path="/compare" element={<CompareStats />} />
            <Route path="/notification-settings" element={<NotificationSettings />} />
            <Route path="/grounds" element={<Grounds />} />
            <Route path="/ground/:groundId" element={<GroundDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
