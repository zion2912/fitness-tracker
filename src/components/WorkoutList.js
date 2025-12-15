import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase-config';

function groupByDate(items) {
  return items.reduce((acc, it) => {
    (acc[it.date] = acc[it.date] || []).push(it);
    return acc;
  }, {});
}

export default function WorkoutList({ workouts }) {
  const [firestoreWorkouts, setFirestoreWorkouts] = useState([]);
  const [openDates, setOpenDates] = useState(() => new Set());

  useEffect(() => {
    const q = query(collection(db, 'workouts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestoreWorkouts(items);
    });
    return unsub;
  }, []);

  const allWorkouts = (firestoreWorkouts && firestoreWorkouts.length > 0) ? firestoreWorkouts : (workouts || []);
  if (!allWorkouts || allWorkouts.length === 0) return (
    <div className="no-workouts">
      <p>No workouts yet.</p>
      <p>Start by adding your first workout!</p>
    </div>
  );

  const grouped = groupByDate(allWorkouts);
  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  function toggleDate(date) {
    setOpenDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  async function handleDelete(docId) {
    try {
      await deleteDoc(doc(db, 'workouts', docId));
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  }

  return (
    <section className="panel history">
      <h2>Workout History</h2>
      {dates.map(date => {
        const isOpen = openDates.has(date);
        return (
          <div key={date} className="workout-date">
            <button
              className={`date-header ${isOpen ? 'open' : 'closed'}`}
              onClick={() => toggleDate(date)}
              aria-expanded={isOpen}
            >
              <span>{date}</span>
              <span className={`chevron ${isOpen ? 'open' : ''}`} aria-hidden>▾</span>
            </button>
            {isOpen && (
              <ul className="workout-list">
                {grouped[date].map(w => (
                  <li key={w.id} className="workout-item">
                    <span>{w.exercise}</span>
                    <span>{w.reps ? `${w.reps} reps` : ''}{w.weight ? ` @ ${w.weight} lbs` : ''}{w.time ? ` in ${w.time} min` : ''}</span>
                    <button className="delete-btn" onClick={() => handleDelete(w.id)} aria-label="Delete workout">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
