import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Beaker, ArrowLeft, Trash2, RefreshCw, Trophy, AlertCircle, TrendingUp, LogOut, CalendarDays
} from "lucide-react";
import { DietGoalsForm } from "@/components/DietGoalsForm";
import { formatFoodName } from "@/lib/utils";
import { useDailySummary, useDietScore, type GoalResponse, type ConsumedItem, type NutritionResponse, type DailySummaryResponse, type DietScoreResponse } from "@/hooks/use-ml-api";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData, type LogItem } from "@/contexts/UserDataContext";

const GRADE_COLORS: Record<string, string> = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", F: "#ef4444" };
const MACRO_COLORS = ["#f97316", "#eab308", "#06b6d4"];

function MacroBar({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 120) : 0;
  const over = consumed > target;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-foreground">{label}</span>
        <span className={`font-semibold ${over ? "text-destructive" : "text-muted-foreground"}`}>
          {consumed.toFixed(1)} <span className="font-normal">/ {target.toFixed(1)}</span>
        </span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: over ? "#ef4444" : color }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { logout } = useAuth();
  const { goal, log, updateGoal, removeLogItem, clearDayLog, loadingData } = useUserData();

  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const [scoreData, setScoreData] = useState<DietScoreResponse | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const summaryMutation = useDailySummary();
  const scoreMutation = useDietScore();

  // Group logs efficiently
  const groupedLog = useMemo(() => {
    const group: Record<string, LogItem[]> = {};
    for (const item of log) {
      if (!group[item.date]) group[item.date] = [];
      group[item.date].push(item);
    }
    return group;
  }, [log]);

  const currentLogWindow = groupedLog[selectedDate] || [];

  // Calorie Rollover Stack Logic
  const activeTargetCal = useMemo(() => {
    if (!goal) return 0;
    let carryoverPool = 0;

    Object.keys(groupedLog).forEach(dateStr => {
      // Only stack deficits/surpluses from days PRIOR to the selected window
      if (dateStr >= selectedDate) return;
      const dayConsumed = groupedLog[dateStr].reduce((sum, item) => sum + item.nutrition.calories, 0);
      const remaining = goal.target_calories - dayConsumed;
      carryoverPool += remaining;
    });

    return Math.max(0, goal.target_calories + carryoverPool);
  }, [groupedLog, goal, selectedDate]);

  // Data Fetching Hook
  useEffect(() => {
    if (!goal || currentLogWindow.length === 0) {
      setSummary(null);
      setScoreData(null);
      return;
    }
    const consumed = currentLogWindow.map((i) => ({ food_name: i.food_name, portion_grams: i.portion_grams }));

    summaryMutation.mutate(
      {
        consumed,
        target_calories: activeTargetCal,
        target_protein_g: goal.protein_g,
        target_carbs_g: goal.carbs_g,
        target_fat_g: goal.fat_g,
        target_fiber_g: goal.fiber_g,
      },
      {
        onSuccess: (data) => {
          setSummary(data);
          scoreMutation.mutate({
            consumed_calories: data.consumed_total.calories,
            consumed_protein_g: data.consumed_total.protein_g,
            consumed_carbs_g: data.consumed_total.carbs_g,
            consumed_fat_g: data.consumed_total.fat_g,
            consumed_fiber_g: data.consumed_total.fiber_g,
            target_calories: activeTargetCal,
            target_protein_g: goal.protein_g,
            target_carbs_g: goal.carbs_g,
            target_fat_g: goal.fat_g,
            target_fiber_g: goal.fiber_g,
          }, { onSuccess: setScoreData });
        },
      }
    );
  }, [log, goal, selectedDate]);

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted-foreground font-medium">Syncing with cloud...</p>
      </div>
    );
  }

  // Chart Properties
  const barData = summary
    ? [
      { name: "Calories", consumed: summary.consumed_total.calories, target: activeTargetCal },
      { name: "Protein", consumed: summary.consumed_total.protein_g, target: goal?.protein_g ?? 0 },
      { name: "Carbs", consumed: summary.consumed_total.carbs_g, target: goal?.carbs_g ?? 0 },
      { name: "Fat", consumed: summary.consumed_total.fat_g, target: goal?.fat_g ?? 0 },
    ]
    : [];

  const pieData = summary
    ? [
      { name: "Protein", value: +(summary.consumed_total.protein_g * 4).toFixed(1) },
      { name: "Carbs", value: +(summary.consumed_total.carbs_g * 4).toFixed(1) },
      { name: "Fat", value: +(summary.consumed_total.fat_g * 9).toFixed(1) },
    ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Snap to Know</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Analyse Food
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Nutrition Dashboard</h2>
            <p className="text-muted-foreground mt-1">Review your 7-day limits and stacked calorie roll-overs.</p>
          </div>

          {/* Calendar 7 Day Selector */}
          <div className="flex items-center gap-2 overflow-x-auto p-1 bg-secondary/30 rounded-2xl border border-border/50 max-w-full">
            <CalendarDays className="w-5 h-5 text-muted-foreground ml-2 hidden sm:block" />
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dStr = d.toLocaleDateString('en-CA');
              const isSelected = selectedDate === dStr;
              const isToday = (6 - i) === 0;
              return (
                <button
                  key={dStr}
                  onClick={() => setSelectedDate(dStr)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${isSelected
                    ? "bg-primary text-primary-foreground shadow-sm scale-100"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground scale-95"
                    }`}
                >
                  {isToday ? "Today" : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <DietGoalsForm onGoalSet={updateGoal} currentGoal={goal} />

            {goal && (
              <div className="mt-8 bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h4 className="font-display font-semibold text-foreground flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-primary" /> Calorie Summary
                </h4>

                {(() => {
                  const consumed = summary ? summary.consumed_total.calories : 0;
                  const remaining = activeTargetCal - consumed;
                  return (
                    <div className="space-y-6 relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Consumed</p>
                          <p className="text-3xl font-bold">{Math.round(consumed)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase font-semibold">Target</p>
                          <p className="text-3xl font-bold text-primary">{Math.round(activeTargetCal)}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/50">
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                          {remaining >= 0 ? "Remaining to Eat" : "Over Target By"}
                        </p>
                        <p className={`text-4xl font-black ${remaining >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                          {Math.abs(Math.round(remaining))} <span className="text-xl font-bold text-muted-foreground">kcal</span>
                        </p>
                      </div>

                      {activeTargetCal !== goal.target_calories && (
                        <div className="bg-secondary/50 rounded-xl p-3 mt-4 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground block mb-1">Why is my target {Math.round(activeTargetCal)}?</span>
                          Your base goal is {goal.target_calories}. We {activeTargetCal > goal.target_calories ? "added" : "subtracted"} {Math.abs(Math.round(activeTargetCal - goal.target_calories))} kcal based on your {activeTargetCal > goal.target_calories ? "deficit" : "surplus"} from previous days.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence>
              {scoreData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-primary" />
                      <h3 className="font-display font-semibold text-foreground">Diet Balance Score</h3>
                    </div>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl shadow-lg"
                      style={{ background: GRADE_COLORS[scoreData.grade] ?? "#888" }}
                    >
                      {scoreData.grade}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-bold text-foreground">{scoreData.score}/100</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${scoreData.score}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: GRADE_COLORS[scoreData.grade] }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {scoreData.feedback.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-4 flex-wrap">
                    {Object.entries(scoreData.macros_pct).map(([key, pct]) => (
                      <div key={key} className="bg-background rounded-xl px-4 py-2 border border-border/50 text-center">
                        <div className="text-xs text-muted-foreground capitalize">{key}</div>
                        <div className="font-bold text-foreground">{pct}%</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-foreground text-sm">Consumed vs Target</h4>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} barGap={4}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                          labelStyle={{ fontWeight: 600 }}
                        />
                        <Bar dataKey="target" name="Target" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="consumed" name="Consumed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50">
                  <h4 className="font-display font-semibold text-foreground text-sm mb-4">Macro Distribution</h4>
                  {pieData.length > 0 ? (
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} paddingAngle={3} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i % MACRO_COLORS.length]} />)}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [`${v} kcal`]}
                            contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                          />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                  )}
                </div>
              </div>
            )}

            {summary && goal && (
              <div className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 space-y-4">
                <h4 className="font-display font-semibold text-foreground">Selected Day Progress</h4>
                <MacroBar label="Calories (kcal)" consumed={summary.consumed_total.calories} target={activeTargetCal} color="#f97316" />
                <MacroBar label="Protein (g)" consumed={summary.consumed_total.protein_g} target={goal.protein_g} color="#22c55e" />
                <MacroBar label="Carbs (g)" consumed={summary.consumed_total.carbs_g} target={goal.carbs_g} color="#eab308" />
                <MacroBar label="Fat (g)" consumed={summary.consumed_total.fat_g} target={goal.fat_g} color="#06b6d4" />
                <MacroBar label="Fiber (g)" consumed={summary.consumed_total.fiber_g} target={goal.fiber_g} color="#a855f7" />
              </div>
            )}

            <div className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-semibold text-foreground">Food Log ({new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })})</h4>
                {currentLogWindow.length > 0 && (
                  <button
                    onClick={() => clearDayLog(selectedDate)}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear day
                  </button>
                )}
              </div>

              {currentLogWindow.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
                  <AlertCircle className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No food logged for this date.<br />Analyse an image to get started.</p>
                  <Link href="/" className="mt-2 text-sm font-semibold text-primary hover:underline">
                    → Go to food analyser
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {currentLogWindow.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{formatFoodName(item.food_name)}</div>
                        <div className="text-xs text-muted-foreground">{item.portion_grams}g</div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
                        <span className="font-semibold text-foreground">{item.nutrition.calories} kcal</span>
                        <span className="hidden sm:inline">P: {item.nutrition.protein_g}g</span>
                        <span className="hidden sm:inline">C: {item.nutrition.carbs_g}g</span>
                        <span className="hidden sm:inline">F: {item.nutrition.fat_g}g</span>
                      </div>
                      <button
                        onClick={() => removeLogItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
