// All backend calls live here.
// On Vercel: set VITE_API_URL = https://pathfinder-api.onrender.com
// Locally:   create frontend/.env.local with VITE_API_URL=http://localhost:8080
const BASE = import.meta.env.VITE_API_URL ?? '';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  /** Solve with a single algorithm */
  solvePath: (payload)     => post('/api/path', payload),

  /** Compare all algorithms */
  compareAll: (payload)    => post('/api/path/compare', payload),

  /** Claude AI route analysis */
  aiAnalyze: (payload)     => post('/api/ai/analyze', payload),

  /** Generate a traffic map (city | highway | random) */
  trafficMap: (pattern)    => post('/api/map/traffic', { pattern }),

  /** Generate a maze (recursive | prim | random) */
  maze: (type)             => post('/api/map/maze', { type }),
};
