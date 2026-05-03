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
          <Route path="templates" element={<Templates />} />
          <Route path="receivers" element={<Receivers />} />
        </Route>
        <Route path="/signin" element={<LoginRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}