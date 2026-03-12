import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [workoutName, setWorkoutName] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (name) => {
    if (!user || !name) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        where('exercise', '==', name),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      let items = snap.docs.map(d => d.data());
      // filter to last 3 months
      const today = new Date();
      const past = new Date(today);
      past.setMonth(past.getMonth() - 3);
      const cutoff = past.toISOString().slice(0,10);
      items = items.filter(it => it.date >= cutoff);
      // convert to chart-friendly
      const chart = items.map(it => ({
        date: it.date,
        reps: it.reps || 0,
        weight: it.weight || 0
      }));
      setData(chart);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      setData([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (workoutName) fetchData(workoutName);
  }, [workoutName, fetchData]);

  return (
    <section className="panel">
      <h2>Workout Dashboard</h2>
      <div className="row dashboard-input" style={{ marginBottom: 12 }}>
        <label>
          Workout name
          <input
            type="text"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            placeholder="e.g. Push-ups"
          />
        </label>
      </div>
      {data.length > 0 ? (
        <div style={{ width: '100%', height: 400, marginTop: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Reps', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="reps" stroke="#0ea5e9" strokeWidth={2} name="Reps" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : workoutName ? (
        <p style={{ marginTop: 20 }}>No data found for "{workoutName}" in the past 3 months.</p>
      ) : (
        <p style={{ marginTop: 20 }}>Enter a workout name above to see your progression.</p>
      )}
    </section>
  );
}