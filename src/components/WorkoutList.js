import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

function groupByDate(items) {
  return items.reduce((acc, it) => {
    (acc[it.date] = acc[it.date] || []).push(it);
    return acc;
  }, {});
}

export default function WorkoutList() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [firestoreWorkouts, setFirestoreWorkouts] = useState([]);
  const [openDates, setOpenDates] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestoreWorkouts(items);
    });
    return unsub;
  }, [user]);

  const allWorkouts = firestoreWorkouts;
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
      addToast('Workout deleted', 'success');
    } catch (error) {
      console.error('Error deleting workout:', error);
      addToast('Failed to delete workout', 'error');
    }
  }

  function startEdit(workout) {
    setEditingId(workout.id);
    setEditForm({
      date: workout.date,
      exercise: workout.exercise,
      reps: workout.reps || '',
      weight: workout.weight || '',
      time: workout.time || ''
    });
  }

  async function saveEdit(docId) {
    try {
      await updateDoc(doc(db, 'workouts', docId), {
        date: editForm.date,
        exercise: editForm.exercise,
        reps: editForm.reps ? Number(editForm.reps) : null,
        weight: editForm.weight ? Number(editForm.weight) : null,
        time: editForm.time ? Number(editForm.time) : null
      });
      setEditingId(null);
      setEditForm({});
      addToast('Workout updated', 'success');
    } catch (error) {
      console.error('Error updating workout:', error);
      addToast('Failed to update workout', 'error');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function handleDuplicate(workout) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await addDoc(collection(db, 'workouts'), {
        date: today,
        exercise: workout.exercise,
        reps: workout.reps,
        weight: workout.weight,
        time: workout.time,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      addToast(`${workout.exercise} duplicated for today!`, 'success');
    } catch (error) {
      console.error('Error duplicating workout:', error);
      addToast('Failed to duplicate workout', 'error');
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
                {grouped[date].map(w => {
                  const createdTime = w.createdAt?.toDate ? w.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const isEditing = editingId === w.id;
                  return (
                    <li key={w.id} className="workout-item" style={{ flexDirection: isEditing ? 'column' : 'row', alignItems: isEditing ? 'flex-start' : 'center' }}>
                      {isEditing ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                              style={{ padding: '6px 8px', fontSize: 14, border: '1px solid #e6e9ee', borderRadius: '6px' }}
                            />
                            <input
                              type="text"
                              value={editForm.exercise}
                              onChange={e => setEditForm({ ...editForm, exercise: e.target.value })}
                              placeholder="Exercise"
                              style={{ padding: '6px 8px', fontSize: 14, border: '1px solid #e6e9ee', borderRadius: '6px', flex: 1 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="number"
                              min="1"
                              value={editForm.reps}
                              onChange={e => setEditForm({ ...editForm, reps: e.target.value })}
                              placeholder="Reps"
                              style={{ padding: '6px 8px', fontSize: 14, border: '1px solid #e6e9ee', borderRadius: '6px', width: '80px' }}
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editForm.weight}
                              onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                              placeholder="Weight (lbs)"
                              style={{ padding: '6px 8px', fontSize: 14, border: '1px solid #e6e9ee', borderRadius: '6px', width: '100px' }}
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editForm.time}
                              onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                              placeholder="Time (min)"
                              style={{ padding: '6px 8px', fontSize: 14, border: '1px solid #e6e9ee', borderRadius: '6px', width: '90px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => saveEdit(w.id)}
                              style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{ padding: '6px 12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span>{w.exercise}</span>
                          <span>{w.reps ? `${w.reps} reps` : ''}{w.weight ? ` @ ${w.weight} lbs` : ''}{w.time ? ` ${w.reps ? 'in' : 'for'} ${w.time} min` : ''} {createdTime && `(${createdTime})`}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="delete-btn"
                              onClick={() => startEdit(w)}
                              aria-label="Edit workout"
                              style={{ background: '#0ea5e9', width: 'auto', padding: '4px 8px', fontSize: 14, marginLeft: 0 }}
                            >
                              ✏
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDuplicate(w)}
                              aria-label="Duplicate workout"
                              style={{ background: '#8b5cf6', width: 'auto', padding: '4px 8px', fontSize: 14 }}
                            >
                              ⎘
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(w.id)} aria-label="Delete workout">×</button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
