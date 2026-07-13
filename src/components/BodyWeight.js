import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function BodyWeight() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [date, setDate] = useState(() => {
    const now = new Date();
    const barbadosOffset = -4 * 60; // -240 minutes
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = localOffset - barbadosOffset;
    const barbadosDate = new Date(now.getTime() - offsetDiff * 60 * 1000);
    return barbadosDate.toISOString().slice(0, 10);
  });
  const [weight, setWeight] = useState('');
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!weight || Number(weight) <= 0) {
      addToast('Enter a valid weight', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'weights'), {
        date,
        weight: Number(weight),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      addToast('Weight added', 'success');
      setWeight('');
    } catch (err) {
      console.error('Error saving weight:', err);
      addToast('Failed to save weight', 'error');
    }
  }

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Query both timestamp-based dates and legacy string dates for compatibility.
      const startTs = Timestamp.fromDate(new Date(startDate));
      const endTs = Timestamp.fromDate(new Date(endDate));

      const qTs = query(
        collection(db, 'weights'),
        where('userId', '==', user.uid),
        where('date', '>=', startTs),
        where('date', '<=', endTs),
        orderBy('date', 'asc')
      );

      const qStr = query(
        collection(db, 'weights'),
        where('userId', '==', user.uid),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );

      const [snapTs, snapStr] = await Promise.all([getDocs(qTs), getDocs(qStr)]);
      let items = [...snapTs.docs.map(d => d.data()), ...snapStr.docs.map(d => d.data())];

      // normalize date to ISO YYYY-MM-DD string and group by date
      const grouped = {};
      items.forEach(it => {
        let dateKey = null;
        if (it.date && typeof it.date.toDate === 'function') {
          dateKey = it.date.toDate().toISOString().slice(0, 10);
        } else if (typeof it.date === 'string') {
          dateKey = it.date;
        }
        if (!dateKey) return;
        // keep latest weight for the date
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

        {data.length > 0 ? (
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
        ) : (
          <p style={{ marginTop: 16 }}>No weight data in the selected range.</p>
        )}
      </div>
    </section>
  );
}
