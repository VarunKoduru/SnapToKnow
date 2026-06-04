import { motion } from "framer-motion";
import { formatFoodName, formatConfidence } from "@/lib/utils";
import type { Prediction } from "@/hooks/use-ml-api";

interface TopPredictionsProps {
  predictions: Prediction[];
}

export function TopPredictions({ predictions }: TopPredictionsProps) {
  if (!predictions || predictions.length === 0) return null;

  return (
    <div className="w-full bg-card rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 border border-border/50">
      <h3 className="text-lg font-display font-semibold text-foreground mb-6">Top Predictions</h3>
      
      <div className="space-y-5">
        {predictions.map((pred, idx) => (
          <div key={pred.class} className="relative">
            <div className="flex justify-between items-end mb-2 text-sm font-medium">
              <span className="text-foreground">{formatFoodName(pred.class)}</span>
              <span className="text-muted-foreground">{formatConfidence(pred.confidence)}</span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pred.confidence * 100}%` }}
                transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  idx === 0 ? "bg-primary" : 
                  idx === 1 ? "bg-accent" : "bg-muted-foreground/40"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
