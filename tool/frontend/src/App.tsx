import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Templates } from './pages/Templates';
import { Receivers } from './pages/Receivers';
import { RTIRequests } from './pages/RTIRequests';
import { RTIDetail } from './pages/RTIDetail';
import { Statuses } from './pages/Statuses';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="templates" element={<Templates />} />
          <Route path="receivers" element={<Receivers />} />
          <Route path="rti-requests" element={<RTIRequests />} />
          <Route path="rti-requests/:id" element={<RTIDetail />} />
          <Route path="statuses" element={<Statuses />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}