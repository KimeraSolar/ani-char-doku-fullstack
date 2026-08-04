import { createContext, ReactNode, useContext, useState } from "react";

interface AppContextType {
    traitsCount: number;
    charsCount: number;
    animeCount: number;
    updateTraitsCount: (count: number) => void;
    updateCharsCount: (count: number) => void;
    updateAnimeCount: (count: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ traitsCount, setTraitsCount ] = useState<number>(0);
    const [ charsCount, setCharsCount ] = useState<number>(0);
    const [ animeCount, setAnimeCount ] = useState<number>(0);

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

    return (
    <AppContext.Provider
      value={{
        traitsCount,
        charsCount,
        animeCount,
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