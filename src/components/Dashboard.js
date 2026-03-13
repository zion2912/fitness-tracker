import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [workoutName, setWorkoutName] = useState('');
  const [metric, setMetric] = useState('reps');
  const [data, setData] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('trend');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [compareData, setCompareData] = useState([]);

  const fetchData = useCallback(async (name) => {
    if (!user || !name) return;
    try {
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid),
        where('exercise', '==', name),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      let items = snap.docs.map(d => d.data());
      // filter by date range
      items = items.filter(it => it.date >= startDate && it.date <= endDate);
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
  }, [user, startDate, endDate]);

  const fetchCompareData = useCallback(async (exList) => {
    if (!user || exList.length === 0) return;
    try {
      const q = query(
        collection(db, 'workouts'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      let items = snap.docs.map(d => d.data());
      console.log('Total items fetched:', items.length, items);
      console.log('Selected exercises:', exList);
      console.log('Date range:', startDate, 'to', endDate);
      
      // Normalize exercise names for comparison
      const normalizedSelected = exList.map(e => e.trim().toLowerCase());
      
      // filter by date range and selected exercises
      items = items.filter(it => {
        const exName = (it.exercise || '').trim().toLowerCase();
        const dateMatch = it.date >= startDate && it.date <= endDate;
        const exMatch = normalizedSelected.includes(exName);
        console.log(`Item: ${it.exercise}, Date: ${it.date}, ExMatch: ${exMatch}, DateMatch: ${dateMatch}`);
        return exMatch && dateMatch;
      });
      
      console.log('Filtered items count:', items.length, items);
      
      // group by exercise and get max values
      const grouped = {};
      normalizedSelected.forEach((ex, idx) => {
        grouped[ex] = { reps: 0, weight: 0, originalName: exList[idx] };
      });
      
      items.forEach(it => {
        const exNormalized = (it.exercise || '').trim().toLowerCase();
        if (!grouped[exNormalized]) return; // Skip if not in selected
        const reps = parseInt(it.reps) || 0;
        const weight = parseFloat(it.weight) || 0;
        if (reps > grouped[exNormalized].reps) {
          grouped[exNormalized].reps = reps;
        }
        if (weight > grouped[exNormalized].weight) {
          grouped[exNormalized].weight = weight;
        }
      });
      
      console.log('Grouped data:', grouped);
      
      const chartData = normalizedSelected.map((exNorm, idx) => ({
        name: exList[idx],
        reps: grouped[exNorm].reps,
        weight: grouped[exNorm].weight
      }));
      
      console.log('Final chart data:', chartData);
      setCompareData(chartData);
    } catch (error) {
      console.error('Error fetching compare data:', error);
      setCompareData([]);
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    if (mode === 'compare' && selectedExercises.length > 0) {
      fetchCompareData(selectedExercises);
    }
  }, [mode, selectedExercises, fetchCompareData]);

  // Fetch unique exercise names
  useEffect(() => {
    if (!user) return;
    const fetchExercises = async () => {
      try {
        const q = query(collection(db, 'workouts'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const uniqueNames = [...new Set(snap.docs.map(d => d.data().exercise))];
        setExercises(uniqueNames.sort());
      } catch (error) {
        console.error('Error fetching exercises:', error);
      }
    };
    fetchExercises();
  }, [user]);

  const filteredExercises = workoutName.trim()
    ? exercises.filter(e => e.toLowerCase().includes(workoutName.toLowerCase()))
    : exercises;

  useEffect(() => {
    if (workoutName) fetchData(workoutName);
  }, [workoutName, fetchData, startDate, endDate]);

  return (
    <section className="panel" style={{ textAlign: 'center' }}>
      <h2>Workout Dashboard</h2>

      {/* Mode Toggle */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={() => {
            setMode('trend');
            setSelectedExercises([]);
          }}
          style={{
            padding: '8px 16px',
            background: mode === 'trend' ? '#0ea5e9' : '#e6e9ee',
            color: mode === 'trend' ? '#fff' : '#0f172a',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Trend
        </button>
        <button
          onClick={() => {
            setMode('compare');
            setWorkoutName('');
          }}
          style={{
            padding: '8px 16px',
            background: mode === 'compare' ? '#0ea5e9' : '#e6e9ee',
            color: mode === 'compare' ? '#fff' : '#0f172a',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Compare
        </button>
      </div>

      {/* Date Range */}
      <div className="row dashboard-input" style={{ marginBottom: 12, alignItems: 'center', justifyContent: 'center', gap: 12, flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            From
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ marginTop: 4 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            To
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ marginTop: 4 }} />
          </label>
        </div>
      </div>

      {mode === 'trend' ? (
        <>
          {/* Trend Mode */}
          <div className="row dashboard-input" style={{ marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
            <label>
              Workout name
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={workoutName}
                  onChange={e => {
                    setWorkoutName(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="e.g. Push-ups"
                />
                {showDropdown && filteredExercises.length > 0 && (
                  <ul
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #e6e9ee',
                      borderTop: 'none',
                      borderRadius: '0 0 6px 6px',
                      margin: 0,
                      padding: '4px 0',
                      listStyle: 'none',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 10
                    }}
                  >
                    {filteredExercises.map(ex => (
                      <li
                        key={ex}
                        onClick={() => {
                          setWorkoutName(ex);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          color: '#0f172a',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={e => e.target.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.target.style.background = '#fff'}
                      >
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>
            <label style={{ marginLeft: 16 }}>
              Metric
              <select value={metric} onChange={e => setMetric(e.target.value)} style={{ marginTop: 6, padding: '6px 8px', fontSize: 14 }}>
                <option value="reps">Reps</option>
                <option value="weight">Weight</option>
              </select>
            </label>
          </div>
          {data.length > 0 ? (
            <div style={{ width: '100%', height: 300, marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: metric === 'reps' ? 'Reps' : 'Weight', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={metric === 'reps' ? '#0ea5e9' : '#f59e0b'}
                    strokeWidth={2}
                    name={metric === 'reps' ? 'Reps' : 'Weight'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : workoutName ? (
            <p style={{ marginTop: 20, textAlign: 'center' }}>No data found for "{workoutName}" in this date range.</p>
          ) : (
            <p style={{ marginTop: 20, textAlign: 'center' }}>Enter a workout name above to see your progression.</p>
          )}
        </>
      ) : (
        <>
          {/* Compare Mode */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ marginBottom: 8, fontWeight: 500 }}>Select exercises to compare:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {exercises.map(ex => (
                <button
                  key={ex}
                  onClick={() =>
                    setSelectedExercises(prev =>
                      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
                    )
                  }
                  style={{
                    padding: '6px 12px',
                    background: selectedExercises.includes(ex) ? '#0ea5e9' : '#e6e9ee',
                    color: selectedExercises.includes(ex) ? '#fff' : '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>
              Metric
              <select value={metric} onChange={e => setMetric(e.target.value)} style={{ marginTop: 6, padding: '6px 8px', fontSize: 14 }}>
                <option value="reps">Reps (Max)</option>
                <option value="weight">Weight (Max)</option>
              </select>
            </label>
          </div>
          {compareData.length > 0 ? (
            <div style={{ width: '100%', height: 300, marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 5, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis label={{ value: metric === 'reps' ? 'Max Reps' : 'Max Weight', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey={metric}
                    fill={metric === 'reps' ? '#0ea5e9' : '#f59e0b'}
                    name={metric === 'reps' ? 'Max Reps' : 'Max Weight'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : selectedExercises.length > 0 ? (
            <p style={{ marginTop: 20 }}>No data found for selected exercises in this date range.</p>
          ) : (
            <p style={{ marginTop: 20 }}>Select exercises above to compare.</p>
          )}
        </>
      )}
    </section>
  );
}