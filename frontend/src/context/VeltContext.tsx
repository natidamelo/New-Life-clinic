import React, { createContext, useContext, useState, useEffect } from 'react';

interface VeltDocIdContextType {
  docIdOverride: string | null;
  setDocIdOverride: (id: string | null) => void;
}

const VeltDocIdContext = createContext<VeltDocIdContextType>({
  docIdOverride: null,
  setDocIdOverride: () => {},
});

export const VeltDocIdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [docIdOverride, setDocIdOverride] = useState<string | null>(null);
  return (
    <VeltDocIdContext.Provider value={{ docIdOverride, setDocIdOverride }}>
      {children}
    </VeltDocIdContext.Provider>
  );
};

export const useSetVeltDocId = (id: string | null) => {
  const { setDocIdOverride } = useContext(VeltDocIdContext);
  useEffect(() => {
    setDocIdOverride(id);
    return () => {
      setDocIdOverride(null);
    };
  }, [id, setDocIdOverride]);
};

export const useVeltDocIdOverride = () => {
  return useContext(VeltDocIdContext);
};
