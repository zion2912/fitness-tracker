import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import InputWorkout from './components/InputWorkout';
import WorkoutList from './components/WorkoutList';
import Login from './components/Login';
import Signup from './components/Signup';

function AppContent() {
  const { user, logout } = useAuth();

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
        <button className="logout-btn" onClick={logout}>Logout</button>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/input" replace />} />
          <Route path="/input" element={<InputWorkout />} />
          <Route path="/history" element={<WorkoutList />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
