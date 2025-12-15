import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase-config';

export default function InputWorkout({ onAdd }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [time, setTime] = useState('');

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
    onAdd(entry);
    await addDoc(collection(db, 'workouts'), {
      date: entry.date,
      exercise: entry.exercise,
      reps: entry.reps,
      weight: entry.weight,
      time: entry.time,
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
            <input type="text" value={exercise} onChange={e => setExercise(e.target.value)} placeholder="e.g. Push-ups" />
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
