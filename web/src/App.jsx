import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/ui.jsx';
import { DonorLayout, AdminLayout, PublicLayout } from './components/Layout.jsx';
const CampaignManager = lazy(() => import('./components/CampaignManager.jsx'));
import { homeFor } from './constants.js';

// Pages publiques
const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const RegisterDonor = lazy(() => import('./pages/RegisterDonor.jsx'));
const HospitalJoin = lazy(() => import('./pages/HospitalJoin.jsx'));
const FamilyRequest = lazy(() => import('./pages/FamilyRequest.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const Campaigns = lazy(() => import('./pages/public/Campaigns.jsx'));
const CampaignDetail = lazy(() => import('./pages/public/CampaignDetail.jsx'));
const Support = lazy(() => import('./pages/public/Support.jsx'));
const Receipt = lazy(() => import('./pages/public/Receipt.jsx'));
const Transparency = lazy(() => import('./pages/public/Transparency.jsx'));
const Track = lazy(() => import('./pages/public/Track.jsx'));

// Super Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminHospitals = lazy(() => import('./pages/admin/Hospitals.jsx'));
const AdminDonors = lazy(() => import('./pages/admin/Donors.jsx'));
const AdminRequests = lazy(() => import('./pages/admin/Requests.jsx'));
const AdminPayments = lazy(() => import('./pages/admin/Payments.jsx'));
const AdminSubscriptions = lazy(() => import('./pages/admin/Subscriptions.jsx'));
const AdminLogs = lazy(() => import('./pages/admin/Logs.jsx'));
const AdminFinances = lazy(() => import('./pages/admin/Finances.jsx'));

// Hôpital
const HospDashboard = lazy(() => import('./pages/hospital/Dashboard.jsx'));
const HospNewRequest = lazy(() => import('./pages/hospital/NewRequest.jsx'));
const HospRequests = lazy(() => import('./pages/hospital/Requests.jsx'));
const HospResponses = lazy(() => import('./pages/hospital/Responses.jsx'));
const HospBloodBanks = lazy(() => import('./pages/hospital/BloodBanks.jsx'));
const HospUsers = lazy(() => import('./pages/hospital/Users.jsx'));
const HospHistory = lazy(() => import('./pages/hospital/History.jsx'));
const HospSubscription = lazy(() => import('./pages/hospital/Subscription.jsx'));
const HospProfile = lazy(() => import('./pages/hospital/Profile.jsx'));

// Donneur
const DonorDashboard = lazy(() => import('./pages/donor/Dashboard.jsx'));
const DonorUrgences = lazy(() => import('./pages/donor/Urgences.jsx'));
const DonorHistory = lazy(() => import('./pages/donor/History.jsx'));
const DonorProfile = lazy(() => import('./pages/donor/Profile.jsx'));
const DonorCampaigns = lazy(() => import('./pages/donor/Campaigns.jsx'));

// Banque de sang
const BankDashboard = lazy(() => import('./pages/bloodbank/Dashboard.jsx'));
const BankMovements = lazy(() => import('./pages/bloodbank/Movements.jsx'));
const BankRequests = lazy(() => import('./pages/bloodbank/Requests.jsx'));
const BankProfile = lazy(() => import('./pages/bloodbank/Profile.jsx'));

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}


export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      {/* Site public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/inscription" element={<RegisterDonor />} />
        <Route path="/adhesion-hopital" element={<HospitalJoin />} />
        <Route path="/besoin-urgent" element={<FamilyRequest />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/campagnes" element={<Campaigns />} />
        <Route path="/campagnes/:id" element={<CampaignDetail />} />
        <Route path="/soutenir" element={<Support />} />
        <Route path="/recu/:reference" element={<Receipt />} />
        <Route path="/transparence" element={<Transparency />} />
        <Route path="/suivi" element={<Track />} />
        <Route path="/suivi/:code" element={<Track />} />
      </Route>

      {/* Donneur — navigation basse mobile */}
      <Route path="/donneur" element={<RequireRole role="donor"><DonorLayout /></RequireRole>}>
        <Route index element={<DonorDashboard />} />
        <Route path="urgences" element={<DonorUrgences />} />
        <Route path="campagnes" element={<DonorCampaigns />} />
        <Route path="historique" element={<DonorHistory />} />
        <Route path="profil" element={<DonorProfile />} />
      </Route>

      {/* Super Admin */}
      <Route path="/admin" element={<RequireRole role="super_admin"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="hopitaux" element={<AdminHospitals />} />
        <Route path="donneurs" element={<AdminDonors />} />
        <Route path="demandes" element={<AdminRequests />} />
        <Route path="paiements" element={<AdminPayments />} />
        <Route path="abonnements" element={<AdminSubscriptions />} />
        <Route path="activite" element={<AdminLogs />} />
        <Route path="campagnes" element={<CampaignManager subtitle="Toutes les campagnes du réseau national" />} />
        <Route path="finances" element={<AdminFinances />} />
      </Route>

      {/* Hôpital */}
      <Route path="/hopital" element={<RequireRole role="hospital_admin"><AdminLayout /></RequireRole>}>
        <Route index element={<HospDashboard />} />
        <Route path="nouvelle-demande" element={<HospNewRequest />} />
        <Route path="demandes" element={<HospRequests />} />
        <Route path="reponses" element={<HospResponses />} />
        <Route path="banques" element={<HospBloodBanks />} />
        <Route path="campagnes" element={<CampaignManager subtitle="Mobilisez les donneurs autour de votre établissement" />} />
        <Route path="utilisateurs" element={<HospUsers />} />
        <Route path="historique" element={<HospHistory />} />
        <Route path="abonnement" element={<HospSubscription />} />
        <Route path="profil" element={<HospProfile />} />
      </Route>

      {/* Banque de sang */}
      <Route path="/banque" element={<RequireRole role="blood_bank_admin"><AdminLayout /></RequireRole>}>
        <Route index element={<BankDashboard />} />
        <Route path="mouvements" element={<BankMovements />} />
        <Route path="campagnes" element={<CampaignManager subtitle="Collectes organisées par votre banque de sang" />} />
        <Route path="demandes" element={<BankRequests />} />
        <Route path="profil" element={<BankProfile />} />
      </Route>

      {/* Déjà connecté → redirection vers son espace */}
      <Route path="*" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}