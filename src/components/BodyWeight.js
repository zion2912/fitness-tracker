import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', weight: '' });
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
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        .map(d => ({ id: grouped[d].id, date: d, weight: grouped[d].weight }));
      setData(chart);
    } catch (err) {
      console.error('Error fetching weights:', err);
      setData([]);
    }
  }, [user, startDate, endDate]);

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date || '',
      weight: entry.weight ?? ''
    });
  }

  async function saveEdit(entryId) {
    const weightValue = Number(editForm.weight);
    if (!editForm.date || !weightValue || Number.isNaN(weightValue) || weightValue <= 0) {
      addToast('Enter a valid date and weight', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'weights', entryId), {
        date: Timestamp.fromDate(localMidnightDate(editForm.date)),
        weight: weightValue
      });
      setEditingId(null);
      setEditForm({ date: '', weight: '' });
      addToast('Weight updated', 'success');
      fetchData();
    } catch (err) {
      console.error('Error updating weight:', err);
      addToast('Failed to update weight', 'error');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ date: '', weight: '' });
  }

  async function handleDelete(entryId) {
    try {
      await deleteDoc(doc(db, 'weights', entryId));
      addToast('Weight entry deleted', 'success');
      fetchData();
    } catch (err) {
      console.error('Error deleting weight:', err);
      addToast('Failed to delete weight', 'error');
    }
  }

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

        <div style={{ marginTop: 16, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
          {data.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[...data].reverse().map(entry => {
                const isEditing = editingId === entry.id;
                return (
                  <li key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
                          Date
                          <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
                          Weight
                          <input type="number" min="0" step="0.1" value={editForm.weight} onChange={e => setEditForm({ ...editForm, weight: e.target.value })} aria-label="Weight" />
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                          <button className="btn" type="button" onClick={() => saveEdit(entry.id)}>Update</button>
                          <button className="btn" type="button" onClick={cancelEdit} style={{ background: '#6b7280' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 600 }}>{entry.date}</div>
                          <div style={{ color: '#64748b' }}>{entry.weight} lbs</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn" type="button" onClick={() => startEdit(entry)} aria-label="Edit weight" style={{ padding: '6px 10px' }}>Edit</button>
                          <button className="btn" type="button" onClick={() => handleDelete(entry.id)} style={{ padding: '6px 10px', background: '#ef4444' }}>Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ marginTop: 16 }}>No weight data in the selected range.</p>
          )}
        </div>
      </div>
    </section>
  );
}
