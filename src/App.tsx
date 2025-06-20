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
  const [gameStartMessage, setGameStartMessage] = useState('');
  const [gameStopMessage, setGameStopMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

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

  const handleAuth = async () => {
    const endpoint = isRegistering ? 'users' : 'auth/login';
    const res = await fetch(`${baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.status >= 400) {
      setAuthError(data.error || 'Error en la autenticación');
      return;
    }

    if (isRegistering) {
      setIsRegistering(false);
      setAuthError('Usuario registrado. Inicia sesión.');
    } else if (data.token) {
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
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        setGameStartMessage('Juego iniciado correctamente.');
        setGameStopMessage('');
      }
    } catch {
      setGameStartMessage('Error al iniciar el juego.');
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
      setGameStopMessage(`Tu desviación fue: ${data.deviation}ms`);
      setGameStartMessage('');
    } catch {
      setGameStopMessage('Error al detener el juego.');
    }
  };

  if (!token) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <h2 className="text-xl font-bold mb-2">{isRegistering ? 'Registro' : 'Login'}</h2>

        <input placeholder="Username" className="border p-2 w-full mb-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" className="border p-2 w-full mb-2" value={password} onChange={(e) => setPassword(e.target.value)} />

        {authError && <div className="text-red-600 mb-2">{authError}</div>}

        <button className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-2" onClick={handleAuth}>
          {isRegistering ? 'Registrar' : 'Iniciar Sesión'}
        </button>

        <button
          className="text-sm underline text-gray-600 w-full"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setAuthError('');
          }}
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
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

      {gameStartMessage && <div className="mb-2 text-green-700">{gameStartMessage}</div>}
      {gameStopMessage && <div className="mb-4 text-blue-700">{gameStopMessage}</div>}

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
