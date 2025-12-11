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
    <section>
      <h2>Add Workout</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Date:{' '}
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
        </div>
        <div>
          <label>
            Exercise:{' '}
            <input value={exercise} onChange={e => setExercise(e.target.value)} placeholder="e.g. Push-ups" />
          </label>
        </div>
        <div>
          <label>
            Reps:{' '}
            <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} />
          </label>
        </div>
        <div>
          <button type="submit">Add</button>
        </div>
      </form>
    </section>
  );
}
