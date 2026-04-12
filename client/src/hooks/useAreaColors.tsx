import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';

interface AreaColorsContextType {
  areas: string[];
  colors: Record<string, string>;
  updateColor: (area: string, color: string) => Promise<void>;
  getColor: (area: string) => string;
  addArea: (area: string, color: string) => Promise<void>;
  removeArea: (area: string) => Promise<void>;
}

const FALLBACK = '#8b949e';

const AreaColorsContext = createContext<AreaColorsContextType>({
  areas: [],
  colors: {},
  updateColor: async () => {},
  getColor: () => FALLBACK,
  addArea: async () => {},
  removeArea: async () => {},
});

export function AreaColorsProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<string[]>([]);
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getAreaColors()
      .then(fetchedAreas => {
        const map: Record<string, string> = {};
        const areaList: string[] = [];
        fetchedAreas.forEach(a => { 
          map[a.name] = a.color; 
          areaList.push(a.name);
        });
        setAreas(areaList);
        setColors(map);
      })
      .catch(console.error);
  }, []);

  const updateColor = useCallback(async (area: string, color: string) => {
    setColors(prev => ({ ...prev, [area]: color }));
    await api.updateAreaColor(area, color);
  }, []);

  const getColor = useCallback((area: string) => {
    return colors[area] || FALLBACK;
  }, [colors]);

  const addArea = useCallback(async (area: string, color: string) => {
    setAreas(prev => prev.includes(area) ? prev : [...prev, area]);
    setColors(prev => ({ ...prev, [area]: color }));
    await api.updateAreaColor(area, color);
  }, []);

  const removeArea = useCallback(async (area: string) => {
    setAreas(prev => prev.filter(a => a !== area));
    setColors(prev => {
      const next = { ...prev };
      delete next[area];
      return next;
    });
    await api.deleteArea(area);
  }, []);

  return (
    <AreaColorsContext.Provider value={{ areas, colors, updateColor, getColor, addArea, removeArea }}>
      {children}
    </AreaColorsContext.Provider>
  );
}

export function useAreaColors() {
  return useContext(AreaColorsContext);
}
