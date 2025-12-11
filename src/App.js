import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import InputWorkout from './components/InputWorkout';
import WorkoutList from './components/WorkoutList';

function App() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('workouts');
      if (raw) setWorkouts(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load workouts', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('workouts', JSON.stringify(workouts));
    } catch (e) {
      console.error('Failed to save workouts', e);
    }
  }, [workouts]);

  function addWorkout(entry) {
    setWorkouts(prev => [entry, ...prev]);
  }

  return (
    <BrowserRouter>
      <div className="App">
        <nav className="App-nav">
          <Link to="/input">Add Workout</Link> |{' '}
          <Link to="/history">History</Link>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/input" replace />} />
            <Route path="/input" element={<InputWorkout onAdd={addWorkout} />} />
            <Route path="/history" element={<WorkoutList workouts={workouts} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
