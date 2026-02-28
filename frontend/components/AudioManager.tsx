import type { AudioPlayer } from "expo-audio";
import React, { createContext, useCallback, useContext, useRef } from "react";

interface AudioContextType {
  activePlayer: AudioPlayer | null;
  setActivePlayer: (player: AudioPlayer) => Promise<void>;
  clearActivePlayer: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const activePlayerRef = useRef<AudioPlayer | null>(null);

  /**
   * Sets the currently active player.
   * If another player is already active, it will be paused.
   */
  const setActivePlayer = useCallback(async (player: AudioPlayer) => {
    // If another player is playing, pause it
    if (activePlayerRef.current && activePlayerRef.current !== player) {
      try {
        activePlayerRef.current.pause();
      } catch (e) {
        console.warn("Error pausing previous player:", e);
      }
    }

    activePlayerRef.current = player;
  }, []);

  /**
   * Clears the active player reference.
   * Useful when a post unmounts.
   */
  const clearActivePlayer = useCallback(() => {
    activePlayerRef.current = null;
  }, []);

  return (
    <AudioContext.Provider
      value={{
        activePlayer: activePlayerRef.current,
        setActivePlayer,
        clearActivePlayer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudioManager = (): AudioContextType => {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error("useAudioManager must be used within AudioProvider");
  }

  return context;
};
