import { useEffect, useState } from "react";

export default function App() {
  const [animes, setAnimes] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnimes = async () => {
      try {
        const response = await fetch("/api/database/animes");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAnimes(data);
      } catch (error) {
        console.error("Error fetching animes:", error);
      }
    };

    fetchAnimes();
  },[]);

  return (
    <div className="App">
      <h1>Anime Character Sudoku</h1>
      <p>Welcome to Anime Character Sudoku!</p>
      <h2>Registered Animes</h2>
      {animes.length > 0 ? (
        <ul>
          {animes.map((anime) => (
            <li key={anime.malId}>
              <strong>{anime.title}</strong> (MAL ID: {anime.malId})
            </li>
          ))}
        </ul>
      ) : (
        <p>No animes registered yet.</p>
      )}
    </div>
  );
}