import React from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase-config';

const q = query(collection(db, 'workouts'), orderBy('createdAt', 'desc'));
const snap = await getDocs(q);
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

function groupByDate(items) {
  return items.reduce((acc, it) => {
    (acc[it.date] = acc[it.date] || []).push(it);
    return acc;
  }, {});
}

export default function WorkoutList({ workouts }) {
  if (!workouts || workouts.length === 0) return <p>No workouts yet.</p>;

  const grouped = groupByDate(workouts);
  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <section>
      <h2>Workout History</h2>
      {dates.map(date => (
        <div key={date} style={{ marginBottom: 16 }}>
          <h3>{date}</h3>
          <ul>
            {grouped[date].map(w => (
              <li key={w.id}>{w.exercise} — {w.reps} reps</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
