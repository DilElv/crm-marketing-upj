import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CampaignDetail from './pages/CampaignDetail';
import LeadDetail from './pages/LeadDetail';
import './App.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/register', element: <Register /> },
    {
      path: '/dashboard',
      element: (
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      ),
    },
    {
      path: '/campaign/:id',
      element: (
        <PrivateRoute>
          <CampaignDetail />
        </PrivateRoute>
      ),
    },
    {
      path: '/lead/:id',
      element: (
        <PrivateRoute>
          <LeadDetail />
        </PrivateRoute>
      ),
    },
    { path: '/', element: <Navigate to="/dashboard" /> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

export default App;
