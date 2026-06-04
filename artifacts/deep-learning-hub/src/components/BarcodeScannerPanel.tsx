import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Camera, ScanBarcode, AlertTriangle, Loader2, CheckCircle2, Search } from "lucide-react";
import { useZxing } from "react-zxing";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type NutritionResponse } from "@/hooks/use-ml-api";
import { motion, AnimatePresence } from "framer-motion";

interface BarcodeScannerPanelProps {
  onAddToLog: (item: any) => void;
  onClear?: () => void;
}

export function BarcodeScannerPanel({ onAddToLog }: BarcodeScannerPanelProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [productData, setProductData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [added, setAdded] = useState(false);
  const [portionGrams, setPortionGrams] = useState<number>(100);

  // Create hints only once
  const hints = useMemo(() => {
    const h = new Map();
    h.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ]);
    // Uncomment if scanning is difficult on laptop/webcam:
    // h.set(DecodeHintType.TRY_HARDER, true);
    return h;
  }, []);

  const { ref: zxingRef } = useZxing({
    paused: !scannerActive,
    hints,
    constraints: {
      video: {
        facingMode: "environment",
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      },
    },
    onDecodeResult(result) {
      if (!scannerActive) return;

      const text = result.getText().trim();
      console.log("✅ Barcode detected:", text);

      // Stop scanner immediately after successful scan
      setScannerActive(false);
      setBarcodeInput(text);
      fetchProductData(text);
    },
    onError(error) {
      // Ignore continuous scanning errors (normal behavior)
      if (process.env.NODE_ENV === "development") {
        // console.debug("ZXing scan error:", error.message);
      }
    },
  });

  // Cleanup camera stream when component unmounts or scanner stops
  useEffect(() => {
    return () => {
      stopVideoStream();
    };
  }, []);

  const stopVideoStream = useCallback(() => {
    if (zxingRef.current?.srcObject) {
      const stream = zxingRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      zxingRef.current.srcObject = null;
    }
  }, [zxingRef]);

  const fetchProductData = async (barcode: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setProductData(null);
    setAdded(false);
    setPortionGrams(100);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      if (!response.ok) {
        throw new Error("Failed to connect to database.");
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        throw new Error("Product not found in the Open Food Facts database.");
      }

      setProductData(data.product);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while fetching product data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    if (scannerActive) {
      setScannerActive(false);
      stopVideoStream();
    }
    fetchProductData(barcodeInput.trim());
  };

  const startScanner = () => {
    setScannerActive(true);
    setErrorMsg(null);
    setProductData(null);
    setAdded(false);
  };

  const stopScanner = () => {
    setScannerActive(false);
    stopVideoStream();
  };

  // Nutrient calculations
  const nutriments = productData?.nutriments || {};
  const scale = (portionGrams || 100) / 100.0;

  const calories = (nutriments["energy-kcal_100g"] || nutriments["energy-kcal_value"] || 0) * scale;
  const proteins = (nutriments.proteins_100g || 0) * scale;
  const carbs = (nutriments.carbohydrates_100g || 0) * scale;
  const fat = (nutriments.fat_100g || 0) * scale;
  const fiber = (nutriments.fiber_100g || 0) * scale;
  const sugars = (nutriments.sugars_100g || 0) * scale;
  const salt = (nutriments.salt_100g || 0) * scale;
  const satFat = (nutriments["saturated-fat_100g"] || 0) * scale;

  const productName = productData?.product_name || "Unknown Product";

  const nutrientLevels = productData?.nutrient_levels || {};
  const nutriscore = productData?.nutriscore_grade?.toLowerCase() || "";

  const isWarningsPresent =
    nutriscore === "d" ||
    nutriscore === "e" ||
    nutrientLevels.fat === "high" ||
    nutrientLevels.salt === "high" ||
    nutrientLevels["saturated-fat"] === "high" ||
    nutrientLevels.sugars === "high";

  const issueList: string[] = [];
  if (nutrientLevels.sugars === "high") issueList.push("High Sugar");
  if (nutrientLevels.fat === "high" || nutrientLevels["saturated-fat"] === "high")
    issueList.push("High Fat");
  if (nutrientLevels.salt === "high") issueList.push("High Sodium");

  const submitToLog = () => {
    const nutrition: NutritionResponse = {
      food_name: productName,
      portion_grams: portionGrams || 100,
      calories: Math.round(calories),
      protein_g: Number(proteins.toFixed(1)),
      carbs_g: Number(carbs.toFixed(1)),
      fat_g: Number(fat.toFixed(1)),
      fiber_g: Number(fiber.toFixed(1)),
      per_100g: {
        calories: nutriments["energy-kcal_100g"] || nutriments["energy-kcal_value"] || 0,
        protein: nutriments.proteins_100g || 0,
        carbs: nutriments.carbohydrates_100g || 0,
        fat: nutriments.fat_100g || 0,
        fiber: nutriments.fiber_100g || 0,
      },
    };

    onAddToLog({
      food_name: productName,
      portion_grams: portionGrams || 100,
      nutrition,
    });

    setAdded(true);
  };

  return (
    <div className="w-full flex justify-center mt-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-xl shadow-black/5 border border-border/50 relative overflow-hidden">

          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-6 uppercase tracking-wide">
            <ScanBarcode className="w-4 h-4" /> Barcode Scanner
          </div>

          {!scannerActive ? (
            <div className="flex flex-col gap-6">
              <Button
                onClick={startScanner}
                className="w-full h-24 rounded-2xl flex flex-col items-center justify-center gap-3 bg-secondary/50 hover:bg-secondary border border-dashed border-border/80"
              >
                <div className="p-3 bg-background rounded-full shadow-sm">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Start Camera Scanner</span>
              </Button>

              <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
                <div className="flex-1 h-px bg-border/50" />
                OR TYPE BARCODE MANUALLY
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <form onSubmit={handleManualSubmit} className="flex items-center gap-3">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="e.g. 737628064502"
                  className="flex-1 h-12 rounded-xl text-lg font-mono bg-background"
                />
                <Button type="submit" disabled={isLoading} className="h-12 px-6 rounded-xl">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  ref={zxingRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                {/* Scanning Overlay */}
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-primary/50 relative">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-primary animate-scan shadow-[0_0_12px_3px_rgba(var(--primary),0.6)]" />
                  </div>
                </div>
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Point your camera at the barcode • Good lighting recommended
              </p>

              <Button variant="outline" onClick={stopScanner} className="h-12 rounded-xl">
                Cancel Scanner
              </Button>
            </div>
          )}

          {/* Results & Messages */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-3"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </motion.div>
            )}

            {productData && !errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 border-t border-border/50 pt-8"
              >
                {/* Product Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                      {productName}
                    </h3>
                    <p className="text-muted-foreground mt-1">Per 100g / 100ml</p>
                  </div>
                  {productData.image_front_thumb_url && (
                    <img
                      src={productData.image_front_thumb_url}
                      alt={productName}
                      className="w-20 h-20 object-contain rounded-lg bg-white border border-border"
                    />
                  )}
                </div>

                {/* Health Warning */}
                {isWarningsPresent && (
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-500">
                          Not ideal for daily consumption
                        </p>
                        <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
                          {nutriscore && `Nutri-Score: ${nutriscore.toUpperCase()}. `}
                          {issueList.length > 0 ? `High in ${issueList.join(", ")}.` : "Consume in moderation."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nutritional Information */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Nutrition Facts</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground font-medium">Portion:</span>
                      <div className="flex items-center w-28">
                        <Input
                          type="number"
                          min={1}
                          max={5000}
                          value={portionGrams || ""}
                          onChange={(e) => {
                            setPortionGrams(parseInt(e.target.value) || 100);
                            setAdded(false);
                          }}
                          className="h-9 text-center font-bold px-2 rounded-r-none border-r-0"
                        />
                        <div className="h-9 px-3 bg-secondary/50 border border-border border-l-0 rounded-r-md flex items-center text-sm font-medium text-muted-foreground">
                          g
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Nutrients */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                      <div className="text-sm text-muted-foreground font-medium mb-1">Calories</div>
                      <div className="text-2xl font-bold text-foreground">{Math.round(calories)}</div>
                      <div className="text-xs text-muted-foreground">kcal</div>
                    </div>
                    <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                      <div className="text-sm text-muted-foreground font-medium mb-1">Protein</div>
                      <div className="text-2xl font-bold text-foreground">{proteins.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">g</div>
                    </div>
                    <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                      <div className="text-sm text-muted-foreground font-medium mb-1">Carbs</div>
                      <div className="text-2xl font-bold text-foreground">{carbs.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">g</div>
                    </div>
                    <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                      <div className="text-sm text-muted-foreground font-medium mb-1">Fat</div>
                      <div className="text-2xl font-bold text-foreground">{fat.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">g</div>
                    </div>
                  </div>

                  {/* Secondary Nutrients */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-background rounded-xl p-3 border border-border/40">
                      <div className="text-xs text-muted-foreground font-medium">Sugars</div>
                      <div className="text-lg font-bold text-foreground">{sugars.toFixed(1)}g</div>
                    </div>
                    <div className="bg-background rounded-xl p-3 border border-border/40">
                      <div className="text-xs text-muted-foreground font-medium">Salt</div>
                      <div className="text-lg font-bold text-foreground">{salt.toFixed(2)}g</div>
                    </div>
                    <div className="bg-background rounded-xl p-3 border border-border/40">
                      <div className="text-xs text-muted-foreground font-medium">Sat. Fat</div>
                      <div className="text-lg font-bold text-foreground">{satFat.toFixed(1)}g</div>
                    </div>
                    <div className="bg-background rounded-xl p-3 border border-border/40">
                      <div className="text-xs text-muted-foreground font-medium">Fiber</div>
                      <div className="text-lg font-bold text-foreground">{fiber.toFixed(1)}g</div>
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                {!added ? (
                  <Button onClick={submitToLog} className="w-full mt-8 h-12 rounded-xl text-base font-semibold">
                    Add {portionGrams || 100}g to Daily Log
                  </Button>
                ) : (
                  <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-5 h-5" /> Successfully added to your daily log!
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}