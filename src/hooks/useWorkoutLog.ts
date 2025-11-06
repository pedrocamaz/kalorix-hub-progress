import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/phone";

export type Workout = {
  id: number;
  date: string; // YYYY-MM-DD
  name: string;
  duration_minutes: number;
  calories_burned: number;
  created_at: string;
};

type NewWorkout = {
  phone: string;      // usuario_telefone
  date: string;       // data_treino
  name: string;       // tipo_treino
  duration_minutes: number; // duracao_minutos
  calories_burned: number;  // calorias_queimadas
};

async function fetchWorkoutsByDate(phone: string, date: string): Promise<Workout[]> {
  const userPhone = normalizePhone(phone);
  const { data, error } = await supabase
    .from("registros_treino")
    .select("id, usuario_telefone, data_treino, tipo_treino, duracao_minutos, calorias_queimadas, created_at")
    .eq("usuario_telefone", userPhone)
    .eq("data_treino", date)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.data_treino,
    name: r.tipo_treino,
    duration_minutes: r.duracao_minutos,
    calories_burned: r.calorias_queimadas,
    created_at: r.created_at,
  })) as Workout[];
}

async function addWorkoutToSupabase(newWorkout: NewWorkout): Promise<Workout> {
  const userPhone = normalizePhone(newWorkout.phone);
  const payload = {
    usuario_telefone: userPhone,
    data_treino: newWorkout.date,
    tipo_treino: newWorkout.name,
    duracao_minutos: newWorkout.duration_minutes,
    calorias_queimadas: newWorkout.calories_burned,
  };

  const { data, error } = await supabase
    .from("registros_treino")
    .insert([payload])
    .select("id, usuario_telefone, data_treino, tipo_treino, duracao_minutos, calorias_queimadas, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    date: data.data_treino,
    name: data.tipo_treino,
    duration_minutes: data.duracao_minutos,
    calories_burned: data.calorias_queimadas,
    created_at: data.created_at,
  } as Workout;
}

export function useWorkoutLog(phone: string | undefined, selectedDate: string) {
  const queryClient = useQueryClient();

  const workoutsQuery = useQuery({
    queryKey: ["workouts", selectedDate, phone],
    queryFn: () => fetchWorkoutsByDate(phone!, selectedDate),
    enabled: !!phone && !!selectedDate,
  });

  const addWorkoutMutation = useMutation({
    mutationFn: addWorkoutToSupabase,
    onSuccess: (_, variables) => {
      const userPhone = normalizePhone(variables.phone);
      queryClient.invalidateQueries({ queryKey: ["workouts", variables.date, userPhone] });
      toast.success("Treino adicionado!");
    },
    onError: (err: any) => {
      console.error("Erro ao adicionar treino:", err);
      toast.error("Erro ao adicionar treino");
    },
  });

  return { workoutsQuery, addWorkoutMutation };
}