"""
Hybrid Indian Food Recognition + Nutrition Estimator - FastAPI Backend
Uses MobileNetV2 transfer learning to classify Indian food images,
then estimates nutrition and evaluates balanced diet goals.
"""

import os
import random
import logging
from pathlib import Path
from typing import Optional, List

import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ──────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────
BASE_PATH = "/ml-api"
MODEL_PATH = Path(__file__).parent / "model" / "indian_food_model.h5"
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
IMAGE_SIZE = (224, 224)

# ──────────────────────────────────────────────────────────────
# Food Classes & Descriptions
# ──────────────────────────────────────────────────────────────
FOOD_CLASSES = [
    "Baked Potato", "Bread", "Crispy Chicken", "Dairy product", "Dessert",
    "Donut", "Egg", "Fried food", "Fries", "Hot Dog", "Meat", "Noodles-Pasta",
    "Rice", "Sandwich", "Seafood", "Taco", "Taquito",
    "Vegetable-Fruit", "apple_pie", "burger", "butter_naan", "chai", "chapati",
    "cheesecake", "chicken_curry", "chole_bhature", "dal_makhani", "dhokla",
    "fried_rice", "ice_cream", "idli", "jalebi", "kaathi_rolls", "kadai_paneer",
    "kulfi", "masala_dosa", "momos", "omelette", "paani_puri", "pakode",
    "pav_bhaji", "pizza", "samosa", "sushi"
]

FOOD_DESCRIPTIONS = {c: f"{c.replace('_', ' ').title()} food item" for c in FOOD_CLASSES}

# ──────────────────────────────────────────────────────────────
# Nutrition Database (per 100g)
# calories (kcal), protein (g), carbs (g), fat (g), fiber (g)
# ──────────────────────────────────────────────────────────────
NUTRITION_DB: dict[str, dict] = {
    "baked potato":   {"calories": 93, "protein": 2.5, "carbs": 21.0, "fat": 0.1, "fiber": 2.2},
    "bread":           {"calories": 265, "protein": 9.0,  "carbs": 49.0, "fat": 3.2, "fiber": 2.7},
    "Crispy chicken": {"calories": 290, "protein": 14.0, "carbs": 16.0, "fat": 18.0, "fiber": 0.5},
    "dairy product":   {"calories": 150, "protein": 8.0,  "carbs": 12.0, "fat": 8.0, "fiber": 0.0},
    "dessert":         {"calories": 380, "protein": 4.0,  "carbs": 55.0, "fat": 15.0, "fiber": 1.0},
    "donut":          {"calories": 452, "protein": 4.9, "carbs": 51.0, "fat": 25.0, "fiber": 1.5},
    "egg":             {"calories": 155, "protein": 13.0, "carbs": 1.1,  "fat": 11.0, "fiber": 0.0},
    "fried food":      {"calories": 312, "protein": 6.0,  "carbs": 35.0, "fat": 16.0, "fiber": 2.2},
    "fries":          {"calories": 312, "protein": 3.4, "carbs": 41.0, "fat": 15.0, "fiber": 3.8},
    "hot dog":        {"calories": 290, "protein": 11.0, "carbs": 18.0, "fat": 26.0, "fiber": 0.0},
    "meat":            {"calories": 250, "protein": 26.0, "carbs": 0.0,  "fat": 17.0, "fiber": 0.0},
    "noodles-pasta":   {"calories": 131, "protein": 5.0,  "carbs": 25.0, "fat": 1.1, "fiber": 1.2},
    "rice":            {"calories": 130, "protein": 2.7,  "carbs": 28.0, "fat": 0.3, "fiber": 0.4},
    "sandwich":       {"calories": 250, "protein": 12.0, "carbs": 28.0, "fat": 9.0, "fiber": 2.0},
    "seafood":         {"calories": 120, "protein": 23.0, "carbs": 0.0,  "fat": 3.0, "fiber": 0.0},
    "taco":           {"calories": 226, "protein": 8.9, "carbs": 20.0, "fat": 12.0, "fiber": 2.5},
    "taquito":        {"calories": 280, "protein": 9.0, "carbs": 31.0, "fat": 14.0, "fiber": 2.0},
    "vegetable-fruit": {"calories": 65,  "protein": 1.5,  "carbs": 15.0, "fat": 0.3, "fiber": 3.0},
    "apple_pie":      {"calories": 237, "protein": 2.4, "carbs": 34.0, "fat": 11.0, "fiber": 1.6},
    "burger":         {"calories": 295, "protein": 17.0, "carbs": 24.0, "fat": 14.0, "fiber": 1.1},
    "butter_naan":    {"calories": 270, "protein": 8.0, "carbs": 45.0, "fat": 6.0, "fiber": 2.5},
    "chai":           {"calories": 43, "protein": 1.4, "carbs": 7.0, "fat": 1.0, "fiber": 0.0},
    "chapati":        {"calories": 297, "protein": 10.0, "carbs": 60.0, "fat": 1.5, "fiber": 9.7},
    "cheesecake":     {"calories": 321, "protein": 5.5, "carbs": 25.0, "fat": 22.0, "fiber": 0.4},
    "chicken_curry":  {"calories": 243, "protein": 15.0, "carbs": 7.0, "fat": 18.0, "fiber": 1.0},
    "chole_bhature":  {"calories": 320, "protein": 7.0, "carbs": 38.0, "fat": 15.0, "fiber": 4.0},
    "dal_makhani":    {"calories": 280, "protein": 9.0, "carbs": 20.0, "fat": 18.0, "fiber": 6.0},
    "dhokla":         {"calories": 160, "protein": 7.0, "carbs": 25.0, "fat": 3.0, "fiber": 2.5},
    "fried_rice":     {"calories": 163, "protein": 4.0, "carbs": 33.0, "fat": 1.5, "fiber": 1.0},
    "ice_cream":      {"calories": 207, "protein": 3.5, "carbs": 24.0, "fat": 11.0, "fiber": 0.7},
    "idli":           {"calories": 115, "protein": 3.0, "carbs": 25.0, "fat": 0.5, "fiber": 1.5},
    "jalebi":         {"calories": 350, "protein": 1.5, "carbs": 60.0, "fat": 12.0, "fiber": 0.5},
    "kaathi_rolls":   {"calories": 280, "protein": 10.0, "carbs": 30.0, "fat": 12.0, "fiber": 3.0},
    "kadai_paneer":   {"calories": 260, "protein": 14.0, "carbs": 10.0, "fat": 18.0, "fiber": 2.0},
    "kulfi":          {"calories": 220, "protein": 5.0, "carbs": 25.0, "fat": 10.0, "fiber": 0.5},
    "masala_dosa":    {"calories": 170, "protein": 4.0, "carbs": 28.0, "fat": 4.5, "fiber": 2.0},
    "momos":          {"calories": 150, "protein": 8.0, "carbs": 20.0, "fat": 3.0, "fiber": 1.5},
    "omelette":       {"calories": 154, "protein": 11.0, "carbs": 0.6, "fat": 12.0, "fiber": 0.0},
    "paani_puri":     {"calories": 120, "protein": 2.0, "carbs": 20.0, "fat": 3.0, "fiber": 1.0},
    "pakode":         {"calories": 310, "protein": 6.0, "carbs": 35.0, "fat": 16.0, "fiber": 3.0},
    "pav_bhaji":      {"calories": 180, "protein": 4.5, "carbs": 25.0, "fat": 6.0, "fiber": 3.5},
    "pizza":          {"calories": 266, "protein": 11.0, "carbs": 33.0, "fat": 10.0, "fiber": 2.3},
    "samosa":         {"calories": 320, "protein": 4.5, "carbs": 35.0, "fat": 18.0, "fiber": 3.0},
    "sushi":          {"calories": 143, "protein": 4.5, "carbs": 28.0, "fat": 1.5, "fiber": 0.5},
}

# ──────────────────────────────────────────────────────────────
# Model Loading (lazy auto-reload enabled)
# ──────────────────────────────────────────────────────────────
_model = None
_model_mtime = 0.0

def load_model():
    global _model, _model_mtime
    if not MODEL_PATH.exists():
        _model = None
        _model_mtime = 0.0
        return None
    
    current_mtime = MODEL_PATH.stat().st_mtime
    if _model is not None and current_mtime <= _model_mtime:
        return _model

    try:
        import tensorflow as tf
        _model = tf.keras.models.load_model(str(MODEL_PATH))
        _model_mtime = current_mtime
        logger.info(f"Dynamically loaded new weights from {MODEL_PATH}")
    except Exception as e:
        logger.warning(f"Failed to load new model: {e}. Using demo mode.")
        _model = None
        _model_mtime = 0.0
    return _model


# ──────────────────────────────────────────────────────────────
# Image Preprocessing
# ──────────────────────────────────────────────────────────────
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Could not decode image. Please upload a valid image file.")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, IMAGE_SIZE)
    img_normalized = img_resized.astype(np.float32) / 255.0
    return np.expand_dims(img_normalized, axis=0)


def simulate_prediction(image_bytes: bytes) -> dict:
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    seed = int(img.mean() * 1000) % 10000 if img is not None else 42
    rng = random.Random(seed)
    top_idx = rng.randint(0, len(FOOD_CLASSES) - 1)
    top_class = FOOD_CLASSES[top_idx]
    top_conf = round(rng.uniform(0.72, 0.97), 4)
    remaining = 1.0 - top_conf
    others = rng.sample([c for i, c in enumerate(FOOD_CLASSES) if i != top_idx], 4)
    weights = sorted([rng.random() for _ in others], reverse=True)
    total = sum(weights)
    top_n = [{"class": top_class, "confidence": top_conf}]
    for cls, w in zip(others, weights):
        top_n.append({"class": cls, "confidence": round(remaining * w / total, 4)})
    return {"prediction": top_class, "confidence": top_conf, "top_predictions": top_n, "demo_mode": True}


# ──────────────────────────────────────────────────────────────
# Nutrition Helpers
# ──────────────────────────────────────────────────────────────
def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Harris-Benedict BMR equation."""
    if gender.lower() == "male":
        return 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else:
        return 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

GOAL_ADJUSTMENTS = {
    "weight_loss": -500,
    "weight_gain": 300,
    "maintenance": 0,
}


def compute_macros(tdee: float, goal: str) -> dict:
    """Compute macro targets in grams from calorie target."""
    if goal == "weight_loss":
        protein_pct, fat_pct, carb_pct = 0.30, 0.30, 0.40
    elif goal == "weight_gain":
        protein_pct, fat_pct, carb_pct = 0.25, 0.25, 0.50
    else:
        protein_pct, fat_pct, carb_pct = 0.20, 0.30, 0.50

    return {
        "protein_g": round(tdee * protein_pct / 4, 1),
        "fat_g":     round(tdee * fat_pct / 9, 1),
        "carbs_g":   round(tdee * carb_pct / 4, 1),
        "fiber_g":   25.0,
    }


def score_diet(consumed: dict, targets: dict) -> tuple[float, list[str]]:
    """
    Calculate a diet balance score (0–100) and feedback messages.
    consumed & targets both have keys: calories, protein_g, carbs_g, fat_g, fiber_g
    """
    feedback = []
    scores = []

    def ratio(actual, target):
        if target <= 0:
            return 1.0
        return actual / target

    cal_r   = ratio(consumed["calories"],  targets["calories"])
    prot_r  = ratio(consumed["protein_g"], targets["protein_g"])
    carb_r  = ratio(consumed["carbs_g"],   targets["carbs_g"])
    fat_r   = ratio(consumed["fat_g"],     targets["fat_g"])
    fiber_r = ratio(consumed.get("fiber_g", 0), targets.get("fiber_g", 25))

    # Score each macro: penalise for over or under
    def macro_score(r: float) -> float:
        if r < 0.5:
            return r * 100
        if r > 1.5:
            return max(0, 100 - (r - 1.5) * 100)
        penalty = abs(r - 1.0) * 60
        return max(0, 100 - penalty)

    scores = [
        macro_score(cal_r) * 0.30,
        macro_score(prot_r) * 0.25,
        macro_score(carb_r) * 0.25,
        macro_score(fat_r)  * 0.15,
        macro_score(fiber_r) * 0.05,
    ]
    total_score = round(sum(scores), 1)

    # Feedback
    if cal_r > 1.2:
        feedback.append("⚠️ Calorie intake is above your daily target.")
    elif cal_r < 0.6:
        feedback.append("⚠️ You've consumed very few calories today.")

    if prot_r < 0.7:
        feedback.append("🔴 Low protein intake — add more lentils, paneer, or chicken.")
    elif prot_r > 1.4:
        feedback.append("🟡 Protein intake is quite high for today.")

    if carb_r > 1.4:
        feedback.append("🟡 High carbohydrate intake — consider reducing rice or bread.")
    elif carb_r < 0.5:
        feedback.append("⚠️ Carbohydrate intake is very low.")

    if fat_r > 1.5:
        feedback.append("🔴 High fat intake — limit fried foods and heavy curries.")

    if fiber_r < 0.6:
        feedback.append("🟡 Low dietary fiber — eat more vegetables, dal, and whole grains.")

    if total_score >= 80:
        feedback.append("✅ Excellent! Your diet is very well balanced today.")
    elif total_score >= 60:
        feedback.append("🟢 Good balance — a few small adjustments can make it ideal.")
    elif total_score >= 40:
        feedback.append("🟡 Moderate balance — review your macros to hit your goals.")
    else:
        feedback.append("🔴 Diet needs attention — try to align with your daily targets.")

    return total_score, feedback


# ──────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────
class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    top_predictions: list
    demo_mode: bool
    description: Optional[str] = None

class CorrectionRequest(BaseModel):
    original_prediction: str
    corrected_class: str
    confidence: float

class CorrectionResponse(BaseModel):
    success: bool
    message: str
    corrected_class: str

class NutritionRequest(BaseModel):
    food_name: str
    portion_grams: float = Field(gt=0, le=2000, description="Portion size in grams")

class NutritionResponse(BaseModel):
    food_name: str
    portion_grams: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    per_100g: dict

class GoalRequest(BaseModel):
    age: int = Field(gt=0, lt=120)
    gender: str = Field(pattern="^(male|female)$")
    height_cm: float = Field(gt=50, lt=300)
    weight_kg: float = Field(gt=10, lt=500)
    activity_level: str = Field(pattern="^(sedentary|light|moderate|active|very_active)$")
    goal: str = Field(pattern="^(weight_loss|weight_gain|maintenance)$")

class GoalResponse(BaseModel):
    bmr: float
    tdee: float
    target_calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    goal: str
    summary: str

class ConsumedItem(BaseModel):
    food_name: str
    portion_grams: float

class DailySummaryRequest(BaseModel):
    consumed: List[ConsumedItem]
    target_calories: float
    target_protein_g: float
    target_carbs_g: float
    target_fat_g: float
    target_fiber_g: float = 25.0

class NutrientSummary(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float

class DailySummaryResponse(BaseModel):
    consumed_total: NutrientSummary
    targets: NutrientSummary
    remaining: NutrientSummary
    items: list
    meals_logged: int

class DietScoreRequest(BaseModel):
    consumed_calories: float
    consumed_protein_g: float
    consumed_carbs_g: float
    consumed_fat_g: float
    consumed_fiber_g: float = 0.0
    target_calories: float
    target_protein_g: float
    target_carbs_g: float
    target_fat_g: float
    target_fiber_g: float = 25.0

class DietScoreResponse(BaseModel):
    score: float
    grade: str
    feedback: List[str]
    macros_pct: dict


# ──────────────────────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Indian Food Recognition & Nutrition API",
    description="Hybrid food recognition + nutrition estimation using MobileNetV2",
    version="2.0.0",
    root_path=BASE_PATH,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────
# Core Endpoints
# ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    model = load_model()
    return {"status": "ok", "model_loaded": model is not None,
            "demo_mode": model is None, "num_classes": len(FOOD_CLASSES)}

@app.get("/classes")
async def list_classes():
    return {"classes": FOOD_CLASSES, "descriptions": FOOD_DESCRIPTIONS, "total": len(FOOD_CLASSES)}

@app.get("/model-status")
async def model_status():
    model = load_model()
    return {
        "model_file_exists": MODEL_PATH.exists(),
        "model_loaded": model is not None,
        "demo_mode": model is None,
        "message": "Trained model is loaded." if model else "Running in demo mode. Train using model/train.py.",
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    """Predict Indian food class from uploaded image."""
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
        raise HTTPException(status_code=400, detail=f"Unsupported type: {file.content_type}")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 10MB.")
    try:
        model = load_model()
        if model is not None:
            img_array = preprocess_image(image_bytes)
            preds = model.predict(img_array, verbose=0)[0]
            top_idx = int(np.argmax(preds))
            top_conf = float(preds[top_idx])
            top_class = FOOD_CLASSES[top_idx] if top_idx < len(FOOD_CLASSES) else "unknown"
            indices = np.argsort(preds)[::-1][:5]
            top_n = [{"class": FOOD_CLASSES[i], "confidence": round(float(preds[i]), 4)} for i in indices if i < len(FOOD_CLASSES)]
            result = {"prediction": top_class, "confidence": round(top_conf, 4), "top_predictions": top_n, "demo_mode": False}
        else:
            result = simulate_prediction(image_bytes)
        result["description"] = FOOD_DESCRIPTIONS.get(result["prediction"], "")
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")

@app.post("/correct", response_model=CorrectionResponse)
async def correct_prediction(correction: CorrectionRequest):
    if correction.corrected_class not in FOOD_CLASSES:
        raise HTTPException(status_code=400, detail=f"Invalid class: {correction.corrected_class}")
    logger.info(f"Correction: '{correction.original_prediction}' → '{correction.corrected_class}'")
    return {"success": True, "message": f"Correction recorded: '{correction.corrected_class}'.", "corrected_class": correction.corrected_class}


# ──────────────────────────────────────────────────────────────
# Nutrition Endpoints
# ──────────────────────────────────────────────────────────────
@app.post("/nutrition", response_model=NutritionResponse)
async def get_nutrition(req: NutritionRequest):
    """
    Calculate nutrition for a given food and portion size.
    Returns macros scaled from the per-100g database.
    """
    food = req.food_name.lower().replace(" ", "_")
    if food not in NUTRITION_DB:
        raise HTTPException(status_code=404, detail=f"Food '{req.food_name}' not in nutrition database.")
    per100 = NUTRITION_DB[food]
    scale = req.portion_grams / 100.0
    return NutritionResponse(
        food_name=food,
        portion_grams=req.portion_grams,
        calories=round(per100["calories"] * scale, 1),
        protein_g=round(per100["protein"] * scale, 1),
        carbs_g=round(per100["carbs"] * scale, 1),
        fat_g=round(per100["fat"] * scale, 1),
        fiber_g=round(per100["fiber"] * scale, 1),
        per_100g=per100,
    )


@app.post("/set-goal", response_model=GoalResponse)
async def set_goal(req: GoalRequest):
    """
    Calculate personalised daily calorie and macro targets using
    the Harris-Benedict BMR equation and activity multiplier.
    """
    bmr = calculate_bmr(req.weight_kg, req.height_cm, req.age, req.gender)
    multiplier = ACTIVITY_MULTIPLIERS.get(req.activity_level, 1.55)
    tdee = bmr * multiplier
    adjustment = GOAL_ADJUSTMENTS.get(req.goal, 0)
    target_cal = max(1200, round(tdee + adjustment, 1))
    macros = compute_macros(target_cal, req.goal)
    summary_map = {
        "weight_loss": f"Target {target_cal:.0f} kcal/day (deficit of {abs(adjustment):.0f} kcal from TDEE of {tdee:.0f} kcal).",
        "weight_gain": f"Target {target_cal:.0f} kcal/day (surplus of {adjustment:.0f} kcal from TDEE of {tdee:.0f} kcal).",
        "maintenance": f"Target {target_cal:.0f} kcal/day to maintain current weight.",
    }
    return GoalResponse(
        bmr=round(bmr, 1), tdee=round(tdee, 1), target_calories=target_cal,
        protein_g=macros["protein_g"], carbs_g=macros["carbs_g"],
        fat_g=macros["fat_g"], fiber_g=macros["fiber_g"],
        goal=req.goal, summary=summary_map.get(req.goal, ""),
    )


@app.post("/daily-summary", response_model=DailySummaryResponse)
async def daily_summary(req: DailySummaryRequest):
    """
    Aggregate consumed food items and compare with daily targets.
    Returns totals, targets, remaining macros, and per-item breakdown.
    """
    totals = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0}
    items = []

    for item in req.consumed:
        food = item.food_name.lower().replace(" ", "_")
        if food not in NUTRITION_DB:
            continue
        per100 = NUTRITION_DB[food]
        scale = item.portion_grams / 100.0
        cal   = round(per100["calories"] * scale, 1)
        prot  = round(per100["protein"]  * scale, 1)
        carbs = round(per100["carbs"]    * scale, 1)
        fat   = round(per100["fat"]      * scale, 1)
        fib   = round(per100["fiber"]    * scale, 1)
        totals["calories"]  += cal
        totals["protein_g"] += prot
        totals["carbs_g"]   += carbs
        totals["fat_g"]     += fat
        totals["fiber_g"]   += fib
        items.append({
            "food_name": food, "portion_grams": item.portion_grams,
            "calories": cal, "protein_g": prot, "carbs_g": carbs, "fat_g": fat, "fiber_g": fib,
        })

    targets = NutrientSummary(
        calories=req.target_calories, protein_g=req.target_protein_g,
        carbs_g=req.target_carbs_g, fat_g=req.target_fat_g, fiber_g=req.target_fiber_g,
    )
    consumed_total = NutrientSummary(**{k: round(v, 1) for k, v in totals.items()})
    remaining = NutrientSummary(
        calories=round(req.target_calories - totals["calories"], 1),
        protein_g=round(req.target_protein_g - totals["protein_g"], 1),
        carbs_g=round(req.target_carbs_g - totals["carbs_g"], 1),
        fat_g=round(req.target_fat_g - totals["fat_g"], 1),
        fiber_g=round(req.target_fiber_g - totals["fiber_g"], 1),
    )
    return DailySummaryResponse(
        consumed_total=consumed_total, targets=targets,
        remaining=remaining, items=items, meals_logged=len(items),
    )


@app.get("/diet-score")
@app.post("/diet-score", response_model=DietScoreResponse)
async def diet_score(req: DietScoreRequest):
    """
    Calculate a diet balance score (0–100) and provide actionable feedback
    based on comparison of actual intake vs daily targets.
    """
    consumed = {
        "calories": req.consumed_calories, "protein_g": req.consumed_protein_g,
        "carbs_g": req.consumed_carbs_g, "fat_g": req.consumed_fat_g,
        "fiber_g": req.consumed_fiber_g,
    }
    targets = {
        "calories": req.target_calories, "protein_g": req.target_protein_g,
        "carbs_g": req.target_carbs_g, "fat_g": req.target_fat_g,
        "fiber_g": req.target_fiber_g,
    }
    score, feedback = score_diet(consumed, targets)

    # Grade
    grade = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 55 else "D" if score >= 40 else "F"

    # Macros pct of total calories consumed
    total_cal = max(req.consumed_calories, 1)
    macros_pct = {
        "protein": round((req.consumed_protein_g * 4 / total_cal) * 100, 1),
        "carbs":   round((req.consumed_carbs_g   * 4 / total_cal) * 100, 1),
        "fat":     round((req.consumed_fat_g     * 9 / total_cal) * 100, 1),
    }

    return DietScoreResponse(score=score, grade=grade, feedback=feedback, macros_pct=macros_pct)

# Hot-reloaded to load 34-class weights from Epoch 1