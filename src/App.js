import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { useToast } from './contexts/ToastContext';
import Toast from './components/Toast';
import InputWorkout from './components/InputWorkout';
import WorkoutList from './components/WorkoutList';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import Account from './components/Account';

function AppContent() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully', 'success');
    } catch (error) {
      addToast('Logout failed', 'error');
    }
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="App">
      <nav className="App-nav">
        <Link to="/input">Add Workout</Link>
        <span className="nav-sep">|</span>
        <Link to="/history">History</Link>
        <span className="nav-sep">|</span>
        <Link to="/dashboard">Dashboard</Link>
        <span className="nav-sep">|</span>
        <Link to="/account">Account</Link>
        <span className="nav-sep">|</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/input" replace />} />
          <Route path="/input" element={<InputWorkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<WorkoutList />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Toast />
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
