import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentDataUploadPage } from './pages/StudentDataUploadPage';
import { ColumnMappingPage } from './pages/ColumnMappingPage';
import { ValidationResultsPage } from './pages/ValidationResultsPage';
import { StudentRecordsListPage } from './pages/StudentRecordsListPage';
import { StudentRecordDetailsPage } from './pages/StudentRecordDetailsPage';
import { VerificationCasesPage } from './pages/VerificationCasesPage';
import { ReportsPage } from './pages/ReportsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { InstitutionSettingsPage } from './pages/InstitutionSettingsPage';
import { CertificatePreviewPage } from './pages/CertificatePreviewPage';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { IntakeReconciliationPage } from './pages/IntakeReconciliationPage';
import { DuplicateReviewPage } from './pages/DuplicateReviewPage';
import { InstitutionRegistryPage } from './pages/InstitutionRegistryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OversightDashboardPage } from './pages/OversightDashboardPage';
import { ValidationRulesPage } from './pages/ValidationRulesPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Public: employers / regulators verify a certificate without logging in */}
          <Route path="/verify/:certId" element={<PublicVerifyPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="upload" element={<StudentDataUploadPage />} />
            <Route path="mapping" element={<ColumnMappingPage />} />
            <Route path="validation" element={<ValidationResultsPage />} />
            <Route path="students" element={<StudentRecordsListPage />} />
            <Route path="students/:id" element={<StudentRecordDetailsPage />} />
            <Route path="cases" element={<VerificationCasesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="settings" element={<InstitutionSettingsPage />} />
            <Route path="certificate" element={<CertificatePreviewPage />} />
            <Route path="duplicates" element={<DuplicateReviewPage />} />
            <Route path="intake" element={<IntakeReconciliationPage />} />
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="institutions" element={<InstitutionRegistryPage />} />
            <Route path="oversight" element={<OversightDashboardPage />} />
            <Route path="rules" element={<ValidationRulesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
