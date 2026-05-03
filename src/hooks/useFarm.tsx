import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Farm, Flock } from "@/lib/farm";
import { useAuth } from "@/hooks/useAuth";

type FarmContextValue = {
  farms: Farm[];
  flocks: Flock[];
  selectedFarm: Farm | null;
  selectedFlock: Flock | null;
  setSelectedFarmId: (id: string) => void;
  setSelectedFlockId: (id: string | null) => void;
  reloadFarms: () => Promise<void>;
  reloadFlocks: () => Promise<void>;
  loading: boolean;
};

const FarmContext = createContext<FarmContextValue | undefined>(undefined);

export const FarmProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [selectedFarmId, setSelectedFarmIdState] = useState<string | null>(null);
  const [selectedFlockId, setSelectedFlockIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSelectedFarmId = useCallback((id: string) => {
    setSelectedFarmIdState(id);
    setSelectedFlockIdState(null);
    if (user) localStorage.setItem(`mp_farm_${user.id}`, id);
  }, [user]);

  const setSelectedFlockId = useCallback((id: string | null) => {
    setSelectedFlockIdState(id);
  }, []);

  const reloadFarms = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("farms").select("*").order("created_at", { ascending: true });
    const list = (data as Farm[]) ?? [];
    setFarms(list);
    const stored = localStorage.getItem(`mp_farm_${user.id}`);
    const valid = stored && list.find((f) => f.id === stored);
    if (!selectedFarmId || !list.find((f) => f.id === selectedFarmId)) {
      const next = valid ? stored! : list[0]?.id ?? null;
      setSelectedFarmIdState(next);
    }
  }, [user, selectedFarmId]);

  const reloadFlocks = useCallback(async () => {
    if (!selectedFarmId) { setFlocks([]); return; }
    const { data } = await supabase
      .from("flocks").select("*").eq("farm_id", selectedFarmId)
      .order("created_at", { ascending: true });
    setFlocks((data as Flock[]) ?? []);
  }, [selectedFarmId]);

  useEffect(() => {
    if (!user) { setFarms([]); setFlocks([]); setLoading(false); return; }
    setLoading(true);
    reloadFarms().finally(() => setLoading(false));
  }, [user, reloadFarms]);

  useEffect(() => { reloadFlocks(); }, [reloadFlocks]);

  const value = useMemo<FarmContextValue>(() => ({
    farms,
    flocks,
    selectedFarm: farms.find((f) => f.id === selectedFarmId) ?? null,
    selectedFlock: selectedFlockId ? flocks.find((f) => f.id === selectedFlockId) ?? null : null,
    setSelectedFarmId,
    setSelectedFlockId,
    reloadFarms,
    reloadFlocks,
    loading,
  }), [farms, flocks, selectedFarmId, selectedFlockId, setSelectedFarmId, setSelectedFlockId, reloadFarms, reloadFlocks, loading]);

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
};

export const useFarm = () => {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within FarmProvider");
  return ctx;
};
