import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Beaker, CheckCircle2, LayoutDashboard, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModelStatus, usePredictFood, type PredictResponse, type NutritionResponse, type ConsumedItem } from "@/hooks/use-ml-api";
import { ImageUploader } from "@/components/ImageUploader";
import { TopPredictions } from "@/components/TopPredictions";
import { ConfirmationStep } from "@/components/ConfirmationStep";
import { NutritionPanel } from "@/components/NutritionPanel";
import { formatFoodName, formatConfidence } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeScannerPanel } from "@/components/BarcodeScannerPanel";
import LandingPage from "./LandingPage";
import { useUserData } from "@/contexts/UserDataContext";

export default function Home() {
  const { currentUser, logout } = useAuth();
  const { addLogItem } = useUserData();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [predictionData, setPredictionData] = useState<PredictResponse | null>(null);
  const [confirmedFood, setConfirmedFood] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addedToLog, setAddedToLog] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");

  const { data: modelStatus, isLoading: statusLoading } = useModelStatus();
  const predictMutation = usePredictFood();

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    setAddedToLog(false);
    setConfirmedFood(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    predictMutation.mutate(file, {
      onSuccess: (data) => setPredictionData(data),
      onError: (err) => {
        setErrorMsg(err.message || "Failed to analyse image");
        setSelectedFile(null);
        setPreviewUrl(null);
      },
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPredictionData(null);
    setConfirmedFood(null);
    setErrorMsg(null);
    setAddedToLog(false);
    predictMutation.reset();
  };

  const handleAddToLog = (item: any) => {
    if (!currentUser) return;
    addLogItem(item);
    setAddedToLog(true);
  };

  if (!currentUser) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[80%] rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Snap to Know</h1>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* Dashboard link */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full text-sm font-medium hover:bg-destructive/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          {/* Model status pill */}
          <div className="hidden lg:flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
            {statusLoading ? (
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
            ) : modelStatus?.demo_mode ? (
              <><div className="w-2 h-2 rounded-full bg-accent" /><span className="text-sm font-medium text-muted-foreground">Demo Mode</span></>
            ) : (
              <><div className="w-2 h-2 rounded-full bg-success" /><span className="text-sm font-medium text-muted-foreground">Model Active</span></>
            )}
          </div>
        </div>
      </header>

      {/* Demo Mode Banner */}
      <AnimatePresence>
        {modelStatus?.demo_mode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="bg-accent/10 border-y border-accent/20 w-full z-10"
          >
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3 text-accent-foreground">
              <AlertCircle className="w-5 h-5 text-accent" />
              <p className="text-sm font-medium">
                System is running in demo mode with simulated predictions. Train the model using{" "}
                <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono text-primary">model/train.py</code> for real results.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 flex flex-col items-center z-10">

        {/* Hero (hidden after prediction) */}
        <AnimatePresence mode="wait">
          {!predictionData && (
            <motion.div
              key="hero-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden", transition: { duration: 0.3 } }}
              className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight tracking-tight">
                Identify Indian cuisine with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Deep Learning</span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Upload a food image → get an AI prediction → confirm → estimate nutrition → track your diet.
              </p>
              <p className="mt-6 text-lg text-muted-foreground">
                Upload images of a single food item for accurate results.
              </p>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3 w-full max-w-2xl mx-auto"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload / Scanner Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="ai">AI Food Upload</TabsTrigger>
            <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
          </TabsList>

          <TabsContent value="barcode" className="w-full">
            <BarcodeScannerPanel onAddToLog={handleAddToLog} onClear={handleReset} />
          </TabsContent>

          <TabsContent value="ai" className="w-full">
            <ImageUploader
              onFileSelect={handleFileSelect}
              isLoading={predictMutation.isPending}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onClear={handleReset}
            />

            {/* AI Results */}
            <AnimatePresence>
              {predictionData && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                  className="w-full mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8"
                >
                  {/* Left column */}
                  <div className="lg:col-span-7 space-y-8">
                    {/* Prediction card */}
                    <div className="bg-card rounded-3xl p-8 shadow-xl shadow-black/5 border border-border/50 relative overflow-hidden">
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-4 tracking-wide uppercase">
                        <CheckCircle2 className="w-4 h-4" /> Analysis Complete
                      </div>
                      <h3 className="text-4xl md:text-5xl font-display font-bold text-foreground">
                        {formatFoodName(predictionData.prediction)}
                      </h3>
                      {predictionData.description && (
                        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{predictionData.description}</p>
                      )}
                      <div className="mt-8 pt-8 border-t border-border/50">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Confidence Score</span>
                          <span className="text-3xl font-display font-bold text-primary">
                            {formatConfidence(predictionData.confidence)}
                          </span>
                        </div>
                        <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${predictionData.confidence * 100}%` }}
                            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Confirmation */}
                    <ConfirmationStep
                      originalPrediction={predictionData.prediction}
                      confidence={predictionData.confidence}
                      onReset={handleReset}
                      onConfirmed={setConfirmedFood}
                    />

                    {/* Nutrition panel — appears after confirmation */}
                    <AnimatePresence>
                      {confirmedFood && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <NutritionPanel foodName={confirmedFood} onAddToLog={handleAddToLog} />

                          {/* Added to log banner */}
                          <AnimatePresence>
                            {addedToLog && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 bg-success/10 border border-success/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3 text-success font-medium text-sm">
                                  <CheckCircle2 className="w-5 h-5" />
                                  Added to your daily log!
                                </div>
                                <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline shrink-0">
                                  View Dashboard →
                                </Link>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right column */}
                  <div className="lg:col-span-5">
                    <TopPredictions predictions={predictionData.top_predictions} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
