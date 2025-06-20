import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

const baseUrl = 'https://time-right-api.onrender.com/api/v1';
const wsUrl = 'wss://time-right-api.onrender.com';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameMessage, setGameMessage] = useState('');
  const [messageType, setMessageType] = useState<'start' | 'stop' | ''>('');

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        localStorage.setItem('userId', decoded.userId);
        setUserId(decoded.userId);
      } catch (error) {
        handleLogout();
      }

      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'LEADERBOARD_UPDATE') {
          setLeaderboard(payload);
        }
      };
      return () => ws.close();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setToken(null);
    setUserId(null);
  };

  const login = async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
    }
  };

  const startGame = async () => {
    try {
      const res = await fetch(`${baseUrl}/games/${userId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) return handleLogout();
      const data = await res.json();

      if (res.status === 400) {
        setGameMessage(data.error);
        setMessageType('start');
      }

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        setGameMessage('Juego iniciado correctamente.');
        setMessageType('start');
      }
    } catch (error) {
      setGameMessage('Error al iniciar el juego.');
      setMessageType('start');
    }
  };

  const stopGame = async () => {
    try {
      const res = await fetch(`${baseUrl}/games/${userId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      });
      if (res.status === 401) return handleLogout();
      const data = await res.json();

      if (res.status === 400) {
        setGameMessage(data.error);
        setMessageType('stop');
      } else {
        setGameMessage(`Tu desviación fue: ${data.deviation}ms`);
        setMessageType('stop');
      }
    } catch (error) {
      setGameMessage('Error al detener el juego.');
      setMessageType('stop');
    }
  };

  if (!token) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <h2 className="text-xl font-bold mb-2">Login</h2>
        <input placeholder="Username" className="border p-2 w-full mb-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" className="border p-2 w-full mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Bienvenido</h2>
      <div className="flex gap-2 mb-4">
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={startGame}>Start Game</button>
        <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={stopGame}>Stop Game</button>
      </div>

      {messageType === 'start' && <div className="mb-2 text-green-700">{gameMessage}</div>}
      {messageType === 'stop' && <div className="mb-4 text-blue-700">{gameMessage}</div>}

      <h3 className="text-xl font-semibold mt-6 mb-2">Leaderboard</h3>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">User ID</th>
            <th className="border px-4 py-2">Games</th>
            <th className="border px-4 py-2">Avg Deviation</th>
            <th className="border px-4 py-2">Best</th>
            <th className="border px-4 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, idx) => (
            <tr key={idx} className="text-center">
              <td className="border px-4 py-2">{entry.userId}</td>
              <td className="border px-4 py-2">{entry.totalGames}</td>
              <td className="border px-4 py-2">{entry.averageDeviation}ms</td>
              <td className="border px-4 py-2">{entry.bestDeviation}ms</td>
              <td className="border px-4 py-2">{entry.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
