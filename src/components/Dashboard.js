import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase-config';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Custom tooltip for line chart
const CustomTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: '8px 12px',
        fontSize: '13px'
      }}>
        <p style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 600 }}>
          {data.date}
        </p>
        <p style={{ margin: 0, color: '#475569' }}>
          {metric === 'reps' ? 'Reps' : 'Weight'}: <strong>{payload[0].value}</strong>
        </p>
      </div>
    );
  }
  return null;
};

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
      
      // Group by date and take max values
      const grouped = {};
      items.forEach(it => {
        const date = it.date;
        if (!grouped[date]) {
          grouped[date] = { reps: 0, weight: 0 };
        }
        const reps = it.reps || 0;
        const weight = it.weight || 0;
        grouped[date].reps = Math.max(grouped[date].reps, reps);
        grouped[date].weight = Math.max(grouped[date].weight, weight);
      });
      
      // convert to chart-friendly array, sorted by date
      const chart = Object.keys(grouped)
        .sort()
        .map(date => ({
          date,
          reps: grouped[date].reps,
          weight: grouped[date].weight
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
      <div className="dashboard-mode-toggle">
        <button
          className={mode === 'trend' ? 'active' : ''}
          onClick={() => {
            setMode('trend');
            setSelectedExercises([]);
          }}
        >
          Trend Chart
        </button>
        <button
          className={mode === 'compare' ? 'active' : ''}
          onClick={() => {
            setMode('compare');
            setWorkoutName('');
          }}
        >
          Compare Exercises
        </button>
      </div>

      {/* Date Range */}
      <div className="dashboard-date-range">
        <label>
          From
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
      </div>

      {mode === 'trend' ? (
        <>
          {/* Trend Mode */}
          <div className="dashboard-exercise-search">
            <input
              type="text"
              value={workoutName}
              onChange={e => {
                setWorkoutName(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Search exercise..."
            />
            {showDropdown && filteredExercises.length > 0 && (
              <ul className="dashboard-exercise-dropdown">
                {filteredExercises.map(ex => (
                  <li
                    key={ex}
                    onClick={() => {
                      setWorkoutName(ex);
                      setShowDropdown(false);
                    }}
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-metric-select">
            <label>
              Metric
              <select value={metric} onChange={e => setMetric(e.target.value)}>
                <option value="reps">Reps</option>
                <option value="weight">Weight (lbs)</option>
              </select>
            </label>
          </div>

          {data.length > 0 ? (
            <div className="dashboard-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <YAxis label={{ value: metric === 'reps' ? 'Reps' : 'Weight (lbs)', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip metric={metric} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke={metric === 'reps' ? '#6366f1' : '#f59e0b'}
                    strokeWidth={3}
                    dot={{ fill: metric === 'reps' ? '#6366f1' : '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                    name={metric === 'reps' ? 'Reps' : 'Weight'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : workoutName ? (
            <p className="dashboard-message">No data found for "{workoutName}" in this date range.</p>
          ) : (
            <p className="dashboard-message">Search for an exercise to view your progression over time.</p>
          )}
        </>
      ) : (
        <>
          {/* Compare Mode */}
          <div className="dashboard-compare-exercises">
            <p>Select exercises to compare:</p>
            <div className="dashboard-compare-buttons">
              {exercises.map(ex => (
                <button
                  key={ex}
                  className={selectedExercises.includes(ex) ? 'selected' : ''}
                  onClick={() =>
                    setSelectedExercises(prev =>
                      prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]
                    )
                  }
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-metric-select">
            <label>
              Metric
              <select value={metric} onChange={e => setMetric(e.target.value)}>
                <option value="reps">Reps (Max)</option>
                <option value="weight">Weight (Max)</option>
              </select>
            </label>
          </div>

          {compareData.length > 0 ? (
            <div className="dashboard-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 5, right: 20, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <YAxis label={{ value: metric === 'reps' ? 'Max Reps' : 'Max Weight (lbs)', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <Legend />
                  <Bar
                    dataKey={metric}
                    fill={metric === 'reps' ? '#6366f1' : '#f59e0b'}
                    radius={[8, 8, 0, 0]}
                    name={metric === 'reps' ? 'Max Reps' : 'Max Weight'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : selectedExercises.length > 0 ? (
            <p className="dashboard-message">No data found for selected exercises in this date range.</p>
          ) : (
            <p className="dashboard-message">Select exercises above to compare your performance.</p>
          )}
        </>
      )}
    </section>
  );
}