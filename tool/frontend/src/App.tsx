import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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
  const { isLoading, isSignedIn } = useAsgardeo();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          isLoading ? (
            <PreLoader message="Authentication in progress..." />
          ) : isSignedIn ? (
            <Layout />
          ) : (
            <Navigate to="/signin" replace />
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
    </BrowserRouter>
  );
}