import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Box, CircularProgress, useMediaQuery } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { PublishingProvider } from './context/PublishingContext';
import PublishingStatusPill from './components/PublishingStatusPill';
import { ThemeContextProvider } from './theme/ThemeContext';
import { useThemeMode } from './theme/ThemeContext';

import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import PeoplePage from './pages/PeoplePage';
import SearchPage from './pages/SearchPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import MessagesPage from './pages/MessagesPage';
import PostDetailsPage from './pages/PostDetailsPage';
import SatisfiedGamesPage from './pages/SatisfiedGamesPage';
import SatisfiedGamesPrompt from './components/SatisfiedGamesPrompt';
import AdminPage from './pages/AdminPage';
import SupportRequestPage from './pages/SupportRequestPage';
import ModerationNoticeLayer from './components/ModerationNoticeLayer';

const GhostCursor = React.lazy(() => import('./components/reactbits/GhostCursor'));

function GlobalGhostCursor() {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const { mode } = useThemeMode();
  const location = useLocation();

  if (reduceMotion || coarsePointer || location.pathname === '/satisfied-games') return null;

  return (
    <React.Suspense fallback={null}>
      <GhostCursor
        fixed
        color={mode === 'dark' ? '#71D8F0' : '#087C98'}
        brightness={0.68}
        edgeIntensity={0}
        trailLength={32}
        inertia={0.46}
        grainIntensity={0.018}
        bloomStrength={0.12}
        bloomRadius={0.9}
        bloomThreshold={0.035}
        fadeDelayMs={650}
        fadeDurationMs={1000}
        maxDevicePixelRatio={0.5}
        zIndex={0}
        mixBlendMode={mode === 'dark' ? 'screen' : 'multiply'}
      />
    </React.Suspense>
  );
}

// Root index route handler
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  if (isAuthenticated) return <Navigate to="/home" replace />;
  if (loading) {
    return (
      <Box sx={{ minHeight: '55dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Loading Vuprise" />
      </Box>
    );
  }
  return <LandingPage />;
};

const GroupConversationRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/messages?group=${encodeURIComponent(id)}`} replace />;
};

function App() {
  return (
    <ThemeContextProvider>
      <AuthProvider>
        <PublishingProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Root / Landing */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/satisfied-games" element={<SatisfiedGamesPage />} />
                <Route path="/support/request" element={<SupportRequestPage />} />
              </Route>

              {/* Authentication Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>

              {/* Main Application Protected Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<HomePage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/groups" element={<Navigate to="/messages" replace />} />
                <Route path="/groups/:id/messages" element={<GroupConversationRedirect />} />
                <Route path="/post/:id" element={<PostDetailsPage />} />
                <Route path="/profile/:id" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<EditProfilePage />} />
                <Route path="/people" element={<PeoplePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <ModerationNoticeLayer />
            <GlobalGhostCursor />
            <SatisfiedGamesPrompt />
            <PublishingStatusPill />
          </BrowserRouter>
        </NotificationProvider>
        </PublishingProvider>
      </AuthProvider>
    </ThemeContextProvider>
  );
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.isAdmin ? children : <Navigate to="/home" replace />;
}

export default App;
