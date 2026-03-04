import { useState, useEffect, useMemo, useRef } from 'react';
import { auth, db, googleProvider, authorizedUsers } from './firebase';
import { 
    onAuthStateChanged, signInWithPopup, signInAnonymously, signOut 
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { marked } from 'marked';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
