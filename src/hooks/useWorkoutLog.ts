import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export type Workout = {
  id: string;
  user_id: string;
  created_at: string;
  date: string; // YYYY-MM-DD
  name: string;
  duration_minutes: number;
  calories_burned: number;
};

type NewWorkout = {
  user_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  duration_minutes: number;
  calories_burned: number;
};

async function fetchWorkoutsByDate(userId: string, date: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Workout[];
}

async function addWorkoutToSupabase(newWorkout: NewWorkout): Promise<Workout> {
  const { data, error } = await supabase
    .from("workouts")
    .insert([newWorkout])
    .select("*")
    .single();

  if (error) throw error;
  return data as Workout;
}

export function useWorkoutLog(userId: string | undefined, selectedDate: string) {
  const queryClient = useQueryClient();

  const workoutsQuery = useQuery({
    queryKey: ["workouts", selectedDate, userId],
    queryFn: () => fetchWorkoutsByDate(userId!, selectedDate),
    enabled: !!userId && !!selectedDate,
  });

  const addWorkoutMutation = useMutation({
    mutationFn: addWorkoutToSupabase,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workouts", variables.date, variables.user_id] });
      toast.success("Treino adicionado!");
    },
    onError: (err: any) => {
      console.error("Erro ao adicionar treino:", err);
      toast.error("Erro ao adicionar treino");
    },
  });

  return { workoutsQuery, addWorkoutMutation };
}