import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase-config';

function groupByDate(items) {
  return items.reduce((acc, it) => {
    (acc[it.date] = acc[it.date] || []).push(it);
    return acc;
  }, {});
}

export default function WorkoutList({ workouts }) {
  const [firestoreWorkouts, setFirestoreWorkouts] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'workouts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestoreWorkouts(items);
    });
    return unsub;
  }, []);

  const allWorkouts = firestoreWorkouts.length > 0 ? firestoreWorkouts : workouts;
  if (!allWorkouts || allWorkouts.length === 0) return <p>No workouts yet.</p>;

  const grouped = groupByDate(allWorkouts);
  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <section className="panel history">
      <h2>Workout History</h2>
      {dates.map(date => (
        <div key={date} className="workout-date">
          <h3>{date}</h3>
          <ul className="workout-list">
            {grouped[date].map(w => (
              <li key={w.id} className="workout-item">
                <span>{w.exercise}</span>
                <span>{w.reps} reps</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
