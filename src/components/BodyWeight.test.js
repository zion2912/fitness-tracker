import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BodyWeight from './BodyWeight';

const mockAddToast = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  addDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'timestamp'),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: (...args) => mockGetDocs(...args),
  Timestamp: {
    fromDate: (date) => ({ toDate: () => date })
  },
  doc: jest.fn(() => ({})),
  updateDoc: (...args) => mockUpdateDoc(...args)
}));

jest.mock('../config/firebase-config', () => ({
  db: {}
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } })
}));

jest.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast })
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null
}));

describe('BodyWeight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'weight-1',
          data: () => ({
            date: { toDate: () => new Date('2026-07-15T00:00:00') },
            weight: 170,
            userId: 'user-1',
            createdAt: { toDate: () => new Date('2026-07-15T00:00:00') }
          })
        }
      ]
    });
  });

  it('updates an existing daily weight entry', async () => {
    render(<BodyWeight />);

    const editButton = await screen.findByRole('button', { name: /edit weight/i });
    fireEvent.click(editButton);

    const weightInput = screen.getByLabelText('Weight');
    fireEvent.change(weightInput, { target: { value: '171.5' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });

  it('shows a show more button for long weight histories', async () => {
    const today = new Date();
    const docs = Array.from({ length: 6 }, (_, index) => ({
      id: `weight-${index}`,
      data: () => ({
        date: { toDate: () => new Date(today.getFullYear(), today.getMonth(), today.getDate() - index) },
        weight: 170 + index,
        userId: 'user-1',
        createdAt: { toDate: () => new Date(today.getFullYear(), today.getMonth(), today.getDate() - index) }
      })
    }));

    mockGetDocs.mockResolvedValue({ docs });
    render(<BodyWeight />);

    expect(await screen.findByRole('button', { name: /show more/i })).toBeInTheDocument();
  });
});
