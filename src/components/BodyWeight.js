import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localMidnightDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function BodyWeight() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [date, setDate] = useState(() => localDateString(new Date()));
  const [weight, setWeight] = useState('');
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return localDateString(d);
  });
  const [endDate, setEndDate] = useState(localDateString(new Date()));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!weight || Number(weight) <= 0) {
      addToast('Enter a valid weight', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'weights'), {
        date: Timestamp.fromDate(localMidnightDate(date)),
        weight: Number(weight),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      addToast('Weight added', 'success');
      setWeight('');
      fetchData();
    } catch (err) {
      console.error('Error saving weight:', err);
      addToast('Failed to save weight', 'error');
    }
  }

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'weights'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => d.data());
      const grouped = {};
      const lower = startDate;
      const upper = endDate;

      items.forEach(it => {
        let dateKey = null;
        if (it.date && typeof it.date.toDate === 'function') {
          dateKey = localDateString(it.date.toDate());
        } else if (typeof it.date === 'string') {
          dateKey = it.date;
        }
        if (!dateKey) return;
        if (dateKey < lower || dateKey > upper) return;
        grouped[dateKey] = it;
      });

      const chart = Object.keys(grouped)
        .sort()
        .map(d => ({ date: d, weight: grouped[d].weight }));
      setData(chart);
    } catch (err) {
      console.error('Error fetching weights:', err);
      setData([]);
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <section className="panel">
      <h2>Body Weight</h2>
      <form className="workout-form" onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="row">
          <label>
            Date
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>
            Weight (lbs)
            <input type="number" min="0" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 170.5" />
          </label>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="btn" type="submit">Save</button>
        </div>
      </form>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            From
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
          <button className="btn" onClick={fetchData} style={{ marginLeft: 8 }}>Refresh</button>
        </div>

        <div style={{ height: 320, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis domain={[dataMin => Math.floor(dataMin - 5), dataMax => Math.ceil(dataMax + 5)]} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {data.length === 0 && (
          <p style={{ marginTop: 16 }}>No weight data in the selected range.</p>
        )}
      </div>
    </section>
  );
}
