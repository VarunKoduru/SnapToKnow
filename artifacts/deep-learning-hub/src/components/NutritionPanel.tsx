import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Beef, Wheat, Droplets, Plus, Loader2, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useGetNutrition, type NutritionResponse, type ConsumedItem } from "@/hooks/use-ml-api";
import { formatFoodName } from "@/lib/utils";

interface NutritionPanelProps {
  foodName: string;
  onAddToLog: (item: ConsumedItem & { nutrition: NutritionResponse }) => void;
}

const MACRO_COLORS = {
  protein: "#f97316",
  carbs: "#eab308",
  fat: "#06b6d4",
};

const StatCard = ({
  icon: Icon, label, value, unit, color,
}: { icon: any; label: string; value: number; unit: string; color: string }) => (
  <div className={`flex flex-col gap-1 bg-background rounded-2xl p-4 border border-border/50`}>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1`} style={{ background: `${color}20` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
    <span className="text-2xl font-bold text-foreground">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></span>
  </div>
);

export function NutritionPanel({ foodName, onAddToLog }: NutritionPanelProps) {
  const [portionGrams, setPortionGrams] = useState<string>("150");
  const [nutrition, setNutrition] = useState<NutritionResponse | null>(null);
  const getNutrition = useGetNutrition();

  const handleCalculate = () => {
    const grams = parseFloat(portionGrams);
    if (isNaN(grams) || grams <= 0) return;
    getNutrition.mutate(
      { food_name: foodName, portion_grams: grams },
      { onSuccess: (data) => setNutrition(data) }
    );
  };

  const handleAddToLog = () => {
    if (!nutrition) return;
    onAddToLog({
      food_name: foodName,
      portion_grams: nutrition.portion_grams,
      nutrition,
    });
  };

  const chartData = nutrition
    ? [
        { name: "Protein", value: nutrition.protein_g * 4, grams: nutrition.protein_g },
        { name: "Carbs",   value: nutrition.carbs_g * 4,   grams: nutrition.carbs_g },
        { name: "Fat",     value: nutrition.fat_g * 9,     grams: nutrition.fat_g },
      ]
    : [];

  return (
    <div className="w-full bg-card rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 border border-border/50">
      <h3 className="text-lg font-display font-semibold text-foreground mb-1">Nutrition Estimator</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Enter portion size for <span className="font-semibold text-foreground">{formatFoodName(foodName)}</span>
      </p>

      {/* Portion Input */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="number"
            value={portionGrams}
            onChange={(e) => setPortionGrams(e.target.value)}
            min={10} max={2000}
            className="w-full bg-background border-2 border-border rounded-xl py-3 pl-4 pr-14 text-foreground font-semibold text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            placeholder="150"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">g</span>
        </div>
        <button
          onClick={handleCalculate}
          disabled={getNutrition.isPending}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getNutrition.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Calculate
        </button>
      </div>

      {/* Common portion shortcuts */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[50, 100, 150, 200, 300].map((g) => (
          <button
            key={g}
            onClick={() => setPortionGrams(String(g))}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              portionGrams === String(g)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {g}g
          </button>
        ))}
      </div>

      {/* Nutrition Results */}
      <AnimatePresence>
        {nutrition && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard icon={Flame} label="Calories" value={nutrition.calories} unit="kcal" color="#f97316" />
              <StatCard icon={Beef}  label="Protein"  value={nutrition.protein_g} unit="g" color="#22c55e" />
              <StatCard icon={Wheat} label="Carbs"    value={nutrition.carbs_g}   unit="g" color="#eab308" />
              <StatCard icon={Droplets} label="Fat"   value={nutrition.fat_g}     unit="g" color="#06b6d4" />
            </div>

            {/* Fiber row */}
            <div className="flex items-center justify-between bg-background rounded-xl px-4 py-3 border border-border/50 mb-6">
              <span className="text-sm font-medium text-muted-foreground">Dietary Fiber</span>
              <span className="font-semibold text-foreground">{nutrition.fiber_g}g</span>
            </div>

            {/* Pie Chart */}
            <div className="h-40 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    <Cell fill={MACRO_COLORS.protein} />
                    <Cell fill={MACRO_COLORS.carbs} />
                    <Cell fill={MACRO_COLORS.fat} />
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) =>
                      [`${props.payload.grams}g (${Math.round(value)} kcal)`, name]
                    }
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Add to daily log */}
            <button
              onClick={handleAddToLog}
              className="w-full flex items-center justify-center gap-2 bg-success text-success-foreground py-3.5 px-6 rounded-xl font-semibold shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Add to Daily Log
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
