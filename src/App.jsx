import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { LanguageProvider } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/AppLayout';
import Oggi from '@/pages/Oggi';
import Abitudini from '@/pages/Abitudini';
import ActivityDetail from '@/pages/ActivityDetail';
import ObiettiviRanking from '@/pages/ObiettiviRanking';
import Agenda from '@/pages/Agenda';
import FocusTime from '@/pages/FocusTime';
import Focusy from '@/pages/Focusy';
import Profilo from '@/pages/Profilo';
import GymTracker from '@/pages/GymTracker';
import RemoveAdsSuccess from '@/pages/RemoveAdsSuccess';
import BodyFuel from '@/pages/BodyFuel';
import Lezioni from '@/pages/Lezioni';
import Workspace from '@/pages/Workspace';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import WorkWithUs from '@/pages/WorkWithUs';
import InviteFriends from '@/pages/InviteFriends';
import AdminPromoReport from '@/pages/AdminPromoReport';
import AdminAnalytics from '@/pages/AdminAnalytics';
import DreamFunctionality from '@/pages/DreamFunctionality';
import Landing from '@/pages/Landing';
import Welcome from '@/pages/Welcome';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { initCapacitor } from '@/lib/capacitorInit';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    initCapacitor(navigate);
  }, [navigate]);

  // Show loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Always render routes — public routes (login/register/etc) are always accessible,
  // ProtectedRoute handles auth gating with SPA navigation (no full page reload)
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/" replace />} />}>
      <Route element={<AppLayout />}>
        <Route path="/home" element={<Oggi />} />
        <Route path="/abitudini" element={<Abitudini />} />
        <Route path="/attivita/:id" element={<ActivityDetail />} />
        <Route path="/attivita" element={<Navigate to="/abitudini" replace />} />
        <Route path="/riepilogo" element={<Navigate to="/abitudini" replace />} />
        <Route path="/obiettivi" element={<ObiettiviRanking />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/focus" element={<FocusTime />} />
        <Route path="/focusy" element={<Focusy />} />
        <Route path="/gym" element={<GymTracker />} />
        <Route path="/statistiche" element={<Navigate to="/obiettivi?tab=lifestats" replace />} />
        <Route path="/profilo" element={<Profilo />} />
        <Route path="/remove-ads-success" element={<RemoveAdsSuccess />} />
        <Route path="/body-fuel" element={<BodyFuel />} />
        <Route path="/lezioni" element={<Lezioni />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/work-with-us" element={<WorkWithUs />} />
        <Route path="/invita" element={<InviteFriends />} />
        <Route path="/admin/promo-report" element={<AdminPromoReport />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/dream" element={<DreamFunctionality />} />
      </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <LanguageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App