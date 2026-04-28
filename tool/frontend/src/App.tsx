import { SignedIn, SignOutButton } from '@asgardeo/react'
import { ProtectedRoute } from '@asgardeo/react-router';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Layout } from './components/Layout';
import { LoginRedirect } from './components/LoginRedirect';

import { Templates } from './pages/Templates';
import { Receivers } from './pages/Receivers';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute redirectTo="/signin">
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="templates" element={
            <ProtectedRoute redirectTo="/signin">
              <Templates /></ProtectedRoute>} />

          <Route path="receivers" element={
            <ProtectedRoute redirectTo="/signin">
              <Receivers /></ProtectedRoute>} />
        </Route>
        <Route path="/signin" element={<LoginRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}