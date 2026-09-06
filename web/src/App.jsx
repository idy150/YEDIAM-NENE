import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/ui.jsx';
import { DonorLayout, AdminLayout } from './components/Layout.jsx';

// Pages publiques
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import RegisterDonor from './pages/RegisterDonor.jsx';
import HospitalJoin from './pages/HospitalJoin.jsx';
import FamilyRequest from './pages/FamilyRequest.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

// Super Admin
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminHospitals from './pages/admin/Hospitals.jsx';
import AdminDonors from './pages/admin/Donors.jsx';
import AdminRequests from './pages/admin/Requests.jsx';
import AdminPayments from './pages/admin/Payments.jsx';
import AdminSubscriptions from './pages/admin/Subscriptions.jsx';
import AdminLogs from './pages/admin/Logs.jsx';

// Hôpital
import HospDashboard from './pages/hospital/Dashboard.jsx';
import HospNewRequest from './pages/hospital/NewRequest.jsx';
import HospRequests from './pages/hospital/Requests.jsx';
import HospResponses from './pages/hospital/Responses.jsx';
import HospBloodBanks from './pages/hospital/BloodBanks.jsx';
import HospUsers from './pages/hospital/Users.jsx';
import HospHistory from './pages/hospital/History.jsx';
import HospSubscription from './pages/hospital/Subscription.jsx';
import HospProfile from './pages/hospital/Profile.jsx';

// Donneur
import DonorDashboard from './pages/donor/Dashboard.jsx';
import DonorUrgences from './pages/donor/Urgences.jsx';
import DonorHistory from './pages/donor/History.jsx';
import DonorProfile from './pages/donor/Profile.jsx';

// Banque de sang
import BankDashboard from './pages/bloodbank/Dashboard.jsx';
import BankMovements from './pages/bloodbank/Movements.jsx';
import BankRequests from './pages/bloodbank/Requests.jsx';
import BankProfile from './pages/bloodbank/Profile.jsx';

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

const homeFor = (role) =>
  ({ super_admin: '/admin', hospital_admin: '/hopital', donor: '/donneur', blood_bank_admin: '/banque' }[role] || '/');

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <Routes>
      {/* Publiques */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/inscription" element={<RegisterDonor />} />
      <Route path="/adhesion-hopital" element={<HospitalJoin />} />
      <Route path="/besoin-urgent" element={<FamilyRequest />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />

      {/* Donneur — navigation basse mobile */}
      <Route path="/donneur" element={<RequireRole role="donor"><DonorLayout /></RequireRole>}>
        <Route index element={<DonorDashboard />} />
        <Route path="urgences" element={<DonorUrgences />} />
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
      </Route>

      {/* Hôpital */}
      <Route path="/hopital" element={<RequireRole role="hospital_admin"><AdminLayout /></RequireRole>}>
        <Route index element={<HospDashboard />} />
        <Route path="nouvelle-demande" element={<HospNewRequest />} />
        <Route path="demandes" element={<HospRequests />} />
        <Route path="reponses" element={<HospResponses />} />
        <Route path="banques" element={<HospBloodBanks />} />
        <Route path="utilisateurs" element={<HospUsers />} />
        <Route path="historique" element={<HospHistory />} />
        <Route path="abonnement" element={<HospSubscription />} />
        <Route path="profil" element={<HospProfile />} />
      </Route>

      {/* Banque de sang */}
      <Route path="/banque" element={<RequireRole role="blood_bank_admin"><AdminLayout /></RequireRole>}>
        <Route index element={<BankDashboard />} />
        <Route path="mouvements" element={<BankMovements />} />
        <Route path="demandes" element={<BankRequests />} />
        <Route path="profil" element={<BankProfile />} />
      </Route>

      {/* Déjà connecté → redirection vers son espace */}
      <Route path="*" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Navigate to="/" replace />} />
    </Routes>
  );
}