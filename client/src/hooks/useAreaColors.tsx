import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';
import type { AreaColor } from '../types';

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
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    api.getAreaColors()
      .then(fetchedAreas => {
        const map: Record<string, string> = {};
        const areaList: string[] = [];
        fetchedAreas.forEach((a: AreaColor) => {
          map[a.name] = a.color; 
          areaList.push(a.name);
        });
        setAreas(areaList);
        setColors(map);
        setHasLoaded(true);
      })
      .catch(err => {
        console.error(err);
        setHasLoaded(true);
      });
  }, []);

  const updateColor = useCallback(async (area: string, color: string) => {
    setColors(prev => ({ ...prev, [area]: color }));
    await api.updateAreaColor(area, color);
  }, []);

  const getColor = useCallback((area: string) => {
    if (colors[area]) return colors[area];
    const defaultColor = [
      ['body', '#00ffcc'], ['mind', '#3b82f6'], ['soul', '#8b5cf6'],
      ['growth', '#f59e0b'], ['money', '#10b981'], ['mission', '#ef4444'],
      ['romance', '#ec4899'], ['family', '#f97316'], ['friends', '#84cc16'],
      ['joy', '#fbbf24']
    ].find(([name]) => name === area.toLowerCase());
    return defaultColor ? defaultColor[1] : FALLBACK;
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

  useEffect(() => {
    if (hasLoaded || areas.length > 0) return;

    const defaults = [
      ['body', '#00ffcc'],
      ['mind', '#3b82f6'],
      ['soul', '#8b5cf6'],
      ['growth', '#f59e0b'],
      ['money', '#10b981'],
      ['mission', '#ef4444'],
      ['romance', '#ec4899'],
      ['family', '#f97316'],
      ['friends', '#84cc16'],
      ['joy', '#fbbf24'],
    ] as const;

    setAreas(defaults.map(([name]) => name));
    setColors(Object.fromEntries(defaults));
  }, [areas.length, hasLoaded]);

  return (
    <AreaColorsContext.Provider value={{ areas, colors, updateColor, getColor, addArea, removeArea }}>
      {children}
    </AreaColorsContext.Provider>
  );
}

export function useAreaColors() {
  return useContext(AreaColorsContext);
}
