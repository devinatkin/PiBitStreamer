// src/App.tsx
import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import Home from './pages/Home';
import HomeLayout from './pages/HomeLayout';
import PrivateRoutes from './utils/PrivateRoutes';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route element={<HomeLayout />}>
          <Route index element={<Home />} />
          <Route element={<PrivateRoutes />}>
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </Router>
  );
};

export default App;
