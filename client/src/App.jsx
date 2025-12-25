import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FindPropertiesPage from './pages/FindPropertiesPage';
import TenantDashboard from './pages/TenantDashboard';
import LandlordDashboard from './pages/LandlordDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfileViewPage from './pages/ProfileViewPage';
import ProfileEditPage from './pages/ProfileEditPage';
import VerificationPage from './pages/VerificationPage';
import AdminVerificationReview from './pages/AdminVerificationReview';
import MyListingsPage from './pages/MyListingsPage';
import ListingFormPage from './pages/ListingFormPage';
import SearchResultsPage from './pages/SearchResultsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import InfoPage from './pages/InfoPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import PaymentDashboard from './pages/PaymentDashboard';
import { NotificationProvider } from './context/NotificationContext';
import LandlordAvailabilityPage from './pages/LandlordAvailabilityPage';
import LandlordAppointmentsPage from './pages/LandlordAppointmentsPage';
import TenantAppointmentsPage from './pages/TenantAppointmentsPage';
import RequestAppointmentPage from './pages/RequestAppointmentPage';
import BookingPaymentPage from './pages/BookingPaymentPage';
import TenantPaymentsPage from './pages/TenantPaymentsPage';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/find" element={<FindPropertiesPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route
                path="/dashboard/tenant"
                element={
                  <ProtectedRoute roles={['tenant']}>
                    <TenantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/landlord"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <LandlordDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/landlord/payments"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <PaymentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/verification/:userId"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminVerificationReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/profile"
                element={
                  <ProtectedRoute roles={['tenant', 'landlord']}>
                    <ProfileViewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/profile/edit"
                element={
                  <ProtectedRoute roles={['tenant', 'landlord']}>
                    <ProfileEditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/verification"
                element={
                  <ProtectedRoute roles={['tenant', 'landlord']}>
                    <VerificationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/listings"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <MyListingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/listings/new"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <ListingFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/availability"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <LandlordAvailabilityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/appointments"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <LandlordAppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenant/appointments"
                element={
                  <ProtectedRoute roles={['tenant']}>
                    <TenantAppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments/new/:listingId"
                element={
                  <ProtectedRoute roles={['tenant']}>
                    <RequestAppointmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/listings/:id/edit"
                element={
                  <ProtectedRoute roles={['landlord']}>
                    <ListingFormPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/listing/:id" element={<ListingDetailPage />} />
              <Route
                path="/bookings/:id/pay"
                element={
                  <ProtectedRoute roles={['tenant']}>
                    <BookingPaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/tenant/payments"
                element={
                  <ProtectedRoute roles={['tenant']}>
                    <TenantPaymentsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/how-it-works" element={<InfoPage title="How It Works">Content coming soon.</InfoPage>} />
              <Route path="/support" element={<InfoPage title="Support">Create tickets coming soon.</InfoPage>} />
              <Route path="/about" element={<InfoPage title="About Us">Platform info.</InfoPage>} />
              <Route path="/privacy" element={<InfoPage title="Privacy Policy">Privacy details.</InfoPage>} />
              <Route path="/terms" element={<InfoPage title="Terms of Service">Terms details.</InfoPage>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
