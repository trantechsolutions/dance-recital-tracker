import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase entirely — no network calls in tests
vi.mock('../firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  authorizedUsers: ['superadmin@test.com'],
  DB_PREFIX: '',
  coll: (name) => name,
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ type: 'collection' })),
  query: vi.fn(() => ({ type: 'query' })),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  doc: vi.fn(() => ({ type: 'docRef' })),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  updateDoc: vi.fn(),
}));

// Mock react-router-dom for components that use hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Stub browser APIs not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
});

Object.assign(navigator, {
  share: undefined,
});

// IntersectionObserver stub
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
