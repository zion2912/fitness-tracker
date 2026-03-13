import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { useAuth } from '../contexts/AuthContext';

export default function InputWorkout() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [time, setTime] = useState('');
  const [exercises, setExercises] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch unique exercise names from user's workouts
  useEffect(() => {
    if (!user) return;
    const fetchExercises = async () => {
      try {
        const q = query(collection(db, 'workouts'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const uniqueNames = [...new Set(snap.docs.map(d => d.data().exercise))];
        setExercises(uniqueNames.sort());
      } catch (error) {
        console.error('Error fetching exercises:', error);
      }
    };
    fetchExercises();
  }, [user]);

  const filteredExercises = exercise.trim()
    ? exercises.filter(e => e.toLowerCase().includes(exercise.toLowerCase()))
    : exercises;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!exercise.trim()) return;
    const entry = {
      id: Date.now(),
      date,
      exercise: exercise.trim(),
      reps: reps ? Number(reps) : null,
      weight: weight ? Number(weight) : null,
      time: time ? Number(time) : null,
    };
    // onAdd(entry); // Removed since Firestore handles persistence
    await addDoc(collection(db, 'workouts'), {
      date: entry.date,
      exercise: entry.exercise,
      reps: entry.reps,
      weight: entry.weight,
      time: entry.time,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    setExercise('');
    setReps('');
    setWeight('');
    setTime('');
  }

  return (
    <section className="panel">
      <h2>Add Workout</h2>
      <form className="workout-form" onSubmit={handleSubmit}>
        <div className="row">
          <label>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>
            Exercise
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={exercise}
                onChange={e => {
                  setExercise(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="e.g. Push-ups"
              />
              {showDropdown && filteredExercises.length > 0 && (
                <ul
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e6e9ee',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    margin: 0,
                    padding: '4px 0',
                    listStyle: 'none',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}
                >
                  {filteredExercises.map(ex => (
                    <li
                      key={ex}
                      onClick={() => {
                        setExercise(ex);
                        setShowDropdown(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        color: '#0f172a',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      onMouseEnter={e => e.target.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.target.style.background = '#fff'}
                    >
                      {ex}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </label>
          <label>
            Reps
            <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} />
          </label>
          <label>
            Weight (lbs)
            <input type="number" min="0" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} placeholder="lbs" />
          </label>
          <label>
            Time (min)
            <input type="number" min="0" step="0.5" value={time} onChange={e => setTime(e.target.value)} placeholder="minutes" />
          </label>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn" type="submit" disabled={!exercise.trim()}>Add</button>
        </div>
      </form>
    </section>
  );
}
