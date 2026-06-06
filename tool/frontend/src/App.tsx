import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';

import { Layout } from './components/Layout';
import { LoginRedirect } from './components/LoginRedirect';
import { PreLoader } from './components/PreLoader';

import { Templates } from './pages/Templates';
import { Receivers } from './pages/Receivers';
import { RTIRequests } from './pages/RTIRequests';
import { RTIDetail } from './pages/RTIDetail';
import { Statuses } from './pages/Statuses';
import { useAsgardeo } from '@asgardeo/react';
import { Senders } from './pages/Senders';
import toast from 'react-hot-toast';

export function App() {
  const { isLoading, isSignedIn, signOut } = useAsgardeo();

  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [queryClient] = useState(() => {
    const handleAuthError = (error: any) => {
      // Check if it's a 401 Unauthorized response from either the http client or Axios
      if (error?.response?.status === 401 || error?.status === 401) {
        toast.error('Session expired. Please sign in again.', { id: 'auth-error' });
        signOutRef.current();
      }
    };

    return new QueryClient({
      queryCache: new QueryCache({
        onError: handleAuthError,
      }),
      mutationCache: new MutationCache({
        onError: handleAuthError,
      }),
      defaultOptions: {
        queries: {
          retry: (failureCount, error: any) => {
            if (error?.response?.status === 401 || error?.status === 401) {
              return false; // Do not retry on 401
            }
            return failureCount < 3;
          },
        },
      },
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
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
            <Route index element={<Navigate to="rti-requests" replace />} />
            <Route path="templates" element={<Templates />} />
            <Route path="receivers" element={<Receivers />} />
            <Route path="rti-requests" element={<RTIRequests />} />
            <Route path="rti-requests/:id" element={<RTIDetail />} />
            <Route path="statuses" element={<Statuses />} />
            <Route path="senders" element={<Senders />} />
          </Route>
          <Route path="/signin" element={<LoginRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}