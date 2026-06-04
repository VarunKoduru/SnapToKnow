import { useState } from "react";
import { Check, Edit2, ChevronDown, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatFoodName } from "@/lib/utils";
import { useFoodClasses, useCorrectPrediction } from "@/hooks/use-ml-api";

interface ConfirmationStepProps {
  originalPrediction: string;
  confidence: number;
  onReset: () => void;
  onConfirmed: (finalFoodName: string) => void;
}

type StepState = "initial" | "editing" | "confirmed";

export function ConfirmationStep({ originalPrediction, confidence, onReset, onConfirmed }: ConfirmationStepProps) {
  const [step, setStep]               = useState<StepState>("initial");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [confirmedFood, setConfirmedFood] = useState<string>("");

  const { data: classData, isLoading: classesLoading } = useFoodClasses();
  const correctMutation = useCorrectPrediction();

  const handleConfirm = () => {
    setConfirmedFood(originalPrediction);
    setStep("confirmed");
    onConfirmed(originalPrediction);
  };

  const handleSubmitCorrection = () => {
    if (!selectedClass) return;
    correctMutation.mutate(
      { original_prediction: originalPrediction, corrected_class: selectedClass, confidence },
      {
        onSuccess: () => {
          setConfirmedFood(selectedClass);
          setStep("confirmed");
          onConfirmed(selectedClass);
        },
      }
    );
  };

  return (
    <div className="w-full bg-card rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 border border-border/50 overflow-hidden">
      <AnimatePresence mode="wait">

        {/* Step 1: Initial Question */}
        {step === "initial" && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <h3 className="text-xl font-display font-semibold text-foreground">Did we get it right?</h3>
            <div className="flex flex-col sm:flex-row w-full gap-4 justify-center">
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 bg-success text-success-foreground py-3.5 px-6 rounded-xl font-semibold shadow-lg shadow-success/20 hover:shadow-xl hover:shadow-success/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <Check className="w-5 h-5" /> Yes, that's correct!
              </button>
              <button
                onClick={() => setStep("editing")}
                className="flex-1 flex items-center justify-center gap-2 bg-card text-foreground border-2 border-border py-3.5 px-6 rounded-xl font-semibold hover:border-primary hover:text-primary transition-all duration-200"
              >
                <Edit2 className="w-4 h-4" /> No, edit prediction
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Editing Form */}
        {step === "editing" && (
          <motion.div
            key="editing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground">Help us improve</h3>
              <p className="text-sm text-muted-foreground mt-1">Select the correct dish from the list below.</p>
            </div>

            {classesLoading ? (
              <div className="py-4 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full appearance-none bg-background border-2 border-border rounded-xl py-3.5 pl-4 pr-10 text-foreground font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                >
                  <option value="" disabled>Select correct food...</option>
                  {classData?.classes.map((cls) => (
                    <option key={cls} value={cls}>{formatFoodName(cls)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("initial")}
                disabled={correctMutation.isPending}
                className="px-5 py-3 rounded-xl font-semibold text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCorrection}
                disabled={!selectedClass || correctMutation.isPending}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-6 rounded-xl font-semibold shadow-lg shadow-primary/25 transition-all duration-200",
                  !selectedClass || correctMutation.isPending
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
                )}
              >
                {correctMutation.isPending ? "Submitting..." : "Submit Correction"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Confirmed — prompt to calculate nutrition */}
        {step === "confirmed" && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center space-y-3 py-2"
          >
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center text-success">
              <Check className="w-7 h-7" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground">
              {correctMutation.isSuccess ? "Correction Submitted!" : "Confirmed!"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {correctMutation.isSuccess
                ? `Logged as ${formatFoodName(confirmedFood)}. Calculate nutrition below.`
                : "Great! Now enter the portion size below to estimate nutrition."}
            </p>
            <button
              onClick={onReset}
              className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Analyse another image
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
