import { ProtectedRoute } from '@asgardeo/react-router';

import { Routes, Route } from 'react-router-dom';

import { Layout } from './components/Layout';
import { LoginRedirect } from './components/LoginRedirect';
import { PreLoader } from './components/PreLoader';

import { Templates } from './pages/Templates';
import { Receivers } from './pages/Receivers';
import { RTIRequests } from './pages/RTIRequests';
import { RTIDetail } from './pages/RTIDetail';
import { Statuses } from './pages/Statuses';
import { useAsgardeo } from '@asgardeo/react';

export function App() {
  const { isLoading } = useAsgardeo();
  return (
    <Routes>
      <Route path="/" element={
        isLoading ? (
          <PreLoader message="Authentication in progress..." />
        ) : (
          <ProtectedRoute redirectTo="/signin">
            <Layout />
          </ProtectedRoute>
        )
      }>
        <Route path="templates" element={<Templates />} />
        <Route path="receivers" element={<Receivers />} />
        <Route path="rti-requests" element={<RTIRequests />} />
        <Route path="rti-requests/:id" element={<RTIDetail />} />
        <Route path="statuses" element={<Statuses />} />
      </Route>
      <Route path="/signin" element={<LoginRedirect />} />
    </Routes>
  );
}