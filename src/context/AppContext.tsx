import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface CountData {
  traits: number;
  characters: number;
  animes: number;
}

interface AppContextType {
  traitsCount: number;
  charsCount: number;
  animeCount: number;
  loadedData: boolean;
  updateCount: (countData: CountData) => void;
  updateTraitsCount: (count: number) => void;
  updateCharsCount: (count: number) => void;
  updateAnimeCount: (count: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [traitsCount, setTraitsCount] = useState<number>(-1);
  const [charsCount, setCharsCount] = useState<number>(-1);
  const [animeCount, setAnimeCount] = useState<number>(-1);
  const [loadedData, setLoadedData] = useState<boolean>(false);

  function updateCount(countData: CountData): void {
    if (countData.traits >= 0) {
      setTraitsCount(countData.traits);
    }
    if (countData.characters >= 0) {
      setCharsCount(countData.characters);
    }
    if (countData.animes >= 0) {
      setAnimeCount(countData.animes);
    }
  }

  function updateTraitsCount(count: number): void {
    if (count >= 0) setTraitsCount(count);
    else setTraitsCount(0);
  }

  function updateCharsCount(count: number): void {
    if (count >= 0) setCharsCount(count);
    else setCharsCount(0);
  }

  function updateAnimeCount(count: number): void {
    if (count >= 0) setAnimeCount(count);
    else setAnimeCount(0);
  }

  useEffect(() => {
    if (traitsCount < 0 || charsCount < 0 || animeCount < 0) {
      setLoadedData(false);
    } else {
      setLoadedData(true);
    }
  }, [traitsCount, charsCount, animeCount]);

  return (
    <AppContext.Provider
      value={{
        traitsCount,
        charsCount,
        animeCount,
        loadedData,
        updateCount,
        updateTraitsCount,
        updateCharsCount,
        updateAnimeCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};