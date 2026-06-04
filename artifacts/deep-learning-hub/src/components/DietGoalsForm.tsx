import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Loader2, CheckCircle2 } from "lucide-react";
import { useSetGoal, type GoalRequest, type GoalResponse } from "@/hooks/use-ml-api";

interface DietGoalsFormProps {
  onGoalSet: (goal: GoalResponse) => void;
  currentGoal: GoalResponse | null;
}

const ACTIVITY_OPTIONS = [
  { value: "sedentary",   label: "Sedentary",    desc: "Little or no exercise" },
  { value: "light",       label: "Light",         desc: "1–3 days/week" },
  { value: "moderate",    label: "Moderate",      desc: "3–5 days/week" },
  { value: "active",      label: "Active",        desc: "6–7 days/week" },
  { value: "very_active", label: "Very Active",   desc: "Twice/day or physical job" },
];

const GOAL_OPTIONS = [
  { value: "weight_loss",  label: "Lose Weight",   emoji: "📉" },
  { value: "maintenance",  label: "Maintain",      emoji: "⚖️" },
  { value: "weight_gain",  label: "Gain Muscle",   emoji: "📈" },
];

export function DietGoalsForm({ onGoalSet, currentGoal }: DietGoalsFormProps) {
  const [form, setForm] = useState<GoalRequest>({
    age: 25,
    gender: "male",
    height_cm: 170,
    weight_kg: 70,
    activity_level: "moderate",
    goal: "maintenance",
  });

  const setGoal = useSetGoal();

  const handleChange = (key: keyof GoalRequest, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoal.mutate(form, { onSuccess: onGoalSet });
  };

  return (
    <div className="bg-card rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 border border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">Set Diet Goals</h3>
          <p className="text-sm text-muted-foreground">Personalised targets using Harris-Benedict equation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row: Age + Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Age</label>
            <input
              type="number" min={10} max={100}
              value={form.age}
              onChange={(e) => handleChange("age", parseInt(e.target.value))}
              className="w-full bg-background border-2 border-border rounded-xl py-2.5 px-4 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl py-2.5 px-4 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {/* Row: Height + Weight */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Height (cm)</label>
            <input
              type="number" min={100} max={250}
              value={form.height_cm}
              onChange={(e) => handleChange("height_cm", parseFloat(e.target.value))}
              className="w-full bg-background border-2 border-border rounded-xl py-2.5 px-4 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Weight (kg)</label>
            <input
              type="number" min={20} max={300}
              value={form.weight_kg}
              onChange={(e) => handleChange("weight_kg", parseFloat(e.target.value))}
              className="w-full bg-background border-2 border-border rounded-xl py-2.5 px-4 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        {/* Activity Level */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Activity Level</label>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  form.activity_level === opt.value ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {form.activity_level === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <input type="radio" name="activity" value={opt.value} checked={form.activity_level === opt.value as any}
                  onChange={() => handleChange("activity_level", opt.value)} className="sr-only" />
                <div>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Your Goal</label>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <button
                type="button" key={opt.value}
                onClick={() => handleChange("goal", opt.value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all ${
                  form.goal === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={setGoal.isPending}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 px-6 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {setGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
          Calculate My Targets
        </button>

        {/* Goal Result */}
        {currentGoal && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 rounded-2xl p-4 border border-primary/20 space-y-3"
          >
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" /> Goals Set!
            </div>
            <p className="text-sm text-muted-foreground">{currentGoal.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Daily Calories", value: `${currentGoal.target_calories} kcal` },
                { label: "Protein",        value: `${currentGoal.protein_g}g` },
                { label: "Carbohydrates",  value: `${currentGoal.carbs_g}g` },
                { label: "Fat",            value: `${currentGoal.fat_g}g` },
              ].map((s) => (
                <div key={s.label} className="bg-background rounded-xl p-3 border border-border/50">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="font-bold text-foreground">{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
