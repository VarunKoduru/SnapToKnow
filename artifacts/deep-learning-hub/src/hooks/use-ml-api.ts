import { useQuery, useMutation } from "@tanstack/react-query";

const BASE_URL = "/ml-api";

// ─── Existing Types ──────────────────────────────────────────
export interface ModelStatus {
  model_file_exists: boolean;
  model_loaded: boolean;
  demo_mode: boolean;
  message: string;
}

export interface FoodClassesResponse {
  classes: string[];
  descriptions: Record<string, string>;
  total: number;
}

export interface Prediction {
  class: string;
  confidence: number;
}

export interface PredictResponse {
  prediction: string;
  confidence: number;
  top_predictions: Prediction[];
  demo_mode: boolean;
  description: string;
}

export interface CorrectRequest {
  original_prediction: string;
  corrected_class: string;
  confidence: number;
}

export interface CorrectResponse {
  success: boolean;
  message: string;
  corrected_class: string;
}

// ─── New Nutrition Types ─────────────────────────────────────
export interface NutritionRequest {
  food_name: string;
  portion_grams: number;
}

export interface NutritionResponse {
  food_name: string;
  portion_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  per_100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

export interface GoalRequest {
  age: number;
  gender: "male" | "female";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "weight_loss" | "weight_gain" | "maintenance";
}

export interface GoalResponse {
  bmr: number;
  tdee: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  goal: string;
  summary: string;
}

export interface ConsumedItem {
  food_name: string;
  portion_grams: number;
}

export interface NutrientSummary {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface DailySummaryRequest {
  consumed: ConsumedItem[];
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g?: number;
}

export interface DailySummaryResponse {
  consumed_total: NutrientSummary;
  targets: NutrientSummary;
  remaining: NutrientSummary;
  items: (ConsumedItem & NutrientSummary)[];
  meals_logged: number;
}

export interface DietScoreRequest {
  consumed_calories: number;
  consumed_protein_g: number;
  consumed_carbs_g: number;
  consumed_fat_g: number;
  consumed_fiber_g?: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g?: number;
}

export interface DietScoreResponse {
  score: number;
  grade: string;
  feedback: string[];
  macros_pct: { protein: number; carbs: number; fat: number };
}

// ─── Hooks ───────────────────────────────────────────────────
export function useModelStatus() {
  return useQuery<ModelStatus>({
    queryKey: ["model-status"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/model-status`);
      if (!res.ok) throw new Error("Failed to fetch model status");
      return res.json();
    },
    retry: false,
  });
}

export function useFoodClasses() {
  return useQuery<FoodClassesResponse>({
    queryKey: ["food-classes"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/classes`);
      if (!res.ok) throw new Error("Failed to fetch food classes");
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function usePredictFood() {
  return useMutation<PredictResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Prediction failed");
      }
      return res.json();
    },
  });
}

export function useCorrectPrediction() {
  return useMutation<CorrectResponse, Error, CorrectRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Correction failed");
      }
      return res.json();
    },
  });
}

export function useGetNutrition() {
  return useMutation<NutritionResponse, Error, NutritionRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Nutrition fetch failed");
      }
      return res.json();
    },
  });
}

export function useSetGoal() {
  return useMutation<GoalResponse, Error, GoalRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/set-goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Goal setup failed");
      }
      return res.json();
    },
  });
}

export function useDailySummary() {
  return useMutation<DailySummaryResponse, Error, DailySummaryRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/daily-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Daily summary failed");
      }
      return res.json();
    },
  });
}

export function useDietScore() {
  return useMutation<DietScoreResponse, Error, DietScoreRequest>({
    mutationFn: async (data) => {
      const res = await fetch(`${BASE_URL}/diet-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Diet score failed");
      }
      return res.json();
    },
  });
}
