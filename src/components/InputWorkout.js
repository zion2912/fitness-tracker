import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase-config';

export default function InputWorkout({ onAdd }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!exercise.trim() || !reps) return;
    const entry = {
      id: Date.now(),
      date,
      exercise: exercise.trim(),
      reps: Number(reps),
    };
    onAdd(entry);
    await addDoc(collection(db, 'workouts'), {
      date: entry.date,
      exercise: entry.exercise,
      reps: entry.reps,
      createdAt: serverTimestamp()
    });
    setExercise('');
    setReps('');
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
            <input type="text" value={exercise} onChange={e => setExercise(e.target.value)} placeholder="e.g. Push-ups" />
          </label>
          <label>
            Reps
            <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} />
          </label>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn" type="submit" disabled={!exercise || !reps}>Add</button>
        </div>
      </form>
    </section>
  );
}
