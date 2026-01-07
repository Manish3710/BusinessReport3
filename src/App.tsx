import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import ForgotPassword from './components/Auth/ForgotPassword';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './components/Dashboard/Dashboard';
import AutoMailReports from './components/Reports/AutoMailReports';
import InstantReports from './components/Reports/InstantReports';
import MasterUpload from './components/Reports/MasterUpload';
import UserManagement from './components/Admin/UserManagement';
import AccessControl from './components/Admin/AccessControl';
import DatabaseAdmin from './components/Admin/DatabaseAdmin';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/instant-reports" />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return '/login';
    return user.role === 'admin' ? '/dashboard' : '/instant-reports';
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={getDefaultRoute()} /> : <LoginForm />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={getDefaultRoute()} /> : <RegisterForm />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to={getDefaultRoute()} /> : <ForgotPassword />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={getDefaultRoute()} />} />
          <Route path="dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="auto-mail" element={<AutoMailReports />} />
          <Route path="instant-reports" element={<InstantReports />} />
          <Route path="master-upload" element={<MasterUpload />} />
          <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="access-control" element={<AdminRoute><AccessControl /></AdminRoute>} />
          <Route path="database" element={<AdminRoute><DatabaseAdmin /></AdminRoute>} />
        </Route>
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;