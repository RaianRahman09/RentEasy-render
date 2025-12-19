import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
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

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
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
              path="/landlord/listings/:id/edit"
              element={
                <ProtectedRoute roles={['landlord']}>
                  <ListingFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/listing/:id" element={<ListingDetailPage />} />

            <Route path="/how-it-works" element={<InfoPage title="How It Works">Content coming soon.</InfoPage>} />
            <Route path="/support" element={<InfoPage title="Support">Create tickets coming soon.</InfoPage>} />
            <Route path="/about" element={<InfoPage title="About Us">Platform info.</InfoPage>} />
            <Route path="/privacy" element={<InfoPage title="Privacy Policy">Privacy details.</InfoPage>} />
            <Route path="/terms" element={<InfoPage title="Terms of Service">Terms details.</InfoPage>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
