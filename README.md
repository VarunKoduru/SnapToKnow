# Snap to Know 📸🥗
### Hybrid AI-Powered Food Recognition & Personalized Nutrition Tracker



---

## 📝 Table of Contents
1. [About the Project](#-about-the-project)
2. [Key Features](#-key-features)
3. [System Architecture](#%EF%B8%8F-system-architecture)
4. [Tech Stack](#-tech-stack)
5. [Repository Structure](#-repository-structure)
6. [Getting Started](#-getting-started)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Installation & Setup](#installation--setup)
7. [ML Model & Training Pipeline](#-ml-model--training-pipeline)
   - [Dataset & Classes](#dataset--classes)
   - [Model Architecture](#model-architecture)
   - [Training Workflow](#training-workflow)
8. [API Endpoints](#-api-endpoints)
   - [FastAPI ML Server (`/ml-api`)](#fastapi-ml-server-ml-api)
   - [Express Server (`/api`)](#express-server-api)
9. [Database Schema](#-database-schema)
10. [Roadmap & Future Enhancements](#-roadmap--future-enhancements)
11. [Contributing](#-contributing)
12. [License](#-license)
13. [Contact](#-contact)

---

## 📖 About the Project

**Snap to Know** is a hybrid, full-stack, AI-powered food logging and nutrition tracking application. 

### The Problem
Traditional dietary tracking software (e.g., MyFitnessPal) relies heavily on manual textual logging, which is tedious, error-prone, and causes user compliance dropouts. Furthermore, estimating portion sizes and calories of complex recipes—especially Indian cuisine—is challenging for the average user.

### The Solution
**Snap to Know** eliminates manual log friction using a dual-input pipeline:
1. **Computer Vision (Camera AI):** Instantly recognizes 44 distinct categories of cooked food items (with an emphasis on Indian dishes) from an uploaded image.
2. **Barcode Scanner:** Scans packaged foods to pull instant nutritional profiles from the global **OpenFoodFacts API**.

A hybrid confirmation flow lets users edit or confirm AI suggestions, log portion sizes in grams, compute customized macronutrient goals (BMR/TDEE), dynamically roll over calorie balances across a rolling 7-day stack, and track progress on a premium dashboard.

---

## ✨ Key Features

- **AI Image Classification:** Powered by a transfer-learned MobileNetV2 model that performs real-time classification.
- **Dynamic Barcode Scanner:** Real-time camera scanner using `@zxing/library` that interfaces with the OpenFoodFacts API.
- **Hybrid Correction Flow:** Merges machine learning predictions with user agency by enabling adjustments via a class dropdown.
- **Harris-Benedict Goal Engine:** Calculates Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) from age, weight, height, activity, and goals.
- **Calorie Rollover Stack:** Automatically carries over calorie surpluses or deficits to adjust target allowances dynamically.
- **Firebase Real-time Sync:** Synchronizes food logs, history, and goals across devices instantly using Google OAuth and Cloud Firestore.
- **Premium Visualization:** Interactive charts (pie & bar charts via Recharts) displaying macro distributions and progress with Framer Motion transitions.

---

## 🛠️ System Architecture

The project is built as a three-tier client-server architecture inside a pnpm monorepo workspace.

```mermaid
graph TD
    subgraph Client [React Frontend: TypeScript + Vite]
        UI[User Interface / Dashboard]
        Cam[Device Camera]
        Scanner[Barcode Scanner Module]
        Uploader[Image Drag-and-Drop Uploader]
        AuthCtx[Firebase Auth Context]
        DataCtx[UserData Firestore Sync]
        
        UI --> Cam
        Cam --> Scanner
        Cam --> Uploader
        Scanner --> |Barcode Text| UI
        Uploader --> |Image Upload| UI
    end

    subgraph Firebase [Firebase Cloud Services]
        Authentication[Firebase Auth Service]
        Firestore[(Firestore Database)]
        
        AuthCtx <--> Authentication
        DataCtx <--> |Realtime Sync: User Logs & Goals| Firestore
    end

    subgraph Server [Backend: FastAPI Python Server]
        Router[REST API Router]
        PreProcessor[OpenCV Preprocessing]
        ModelLoader[Keras MobileNetV2 Model]
        NutriDB[(Nutrition Database)]
        GoalEngine[Goal & Scoring Logic]
        
        Router --> |1. Preprocess| PreProcessor
        PreProcessor --> |2. Tensor Array| ModelLoader
        ModelLoader --> |3. Predicted Class + Confidence| Router
        Router --> |4. Lookup Macros| NutriDB
        NutriDB --> Router
        Router --> |5. Calculate Target / Score| GoalEngine
        GoalEngine --> Router
    end

    subgraph External [External Services]
        OFF[OpenFoodFacts API]
    end

    Uploader --> |POST /predict| Router
    UI --> |POST /nutrition, /set-goal, /diet-score| Router
    Scanner --> |Fetch Product JSON| OFF
    Router --> |JSON Response| UI
```

---

## 💻 Tech Stack

| Component | Technology | Description |
| --- | --- | --- |
| **Frontend** | React 19.1 + TypeScript + Vite 7.3 | Quick bundling, DOM rendering, and type safety |
| **Styling** | Tailwind CSS v4 + Framer Motion v12 | Modern styling utility framework and fluid transitions |
| **Charts** | Recharts v2 | Vector-based macro distributions & progress indicators |
| **Scanner** | `@zxing/library` + `html5-qrcode` | Client-side camera-based barcode reader |
| **Backend (ML)** | FastAPI (Python) + Uvicorn | Async HTTP service for inferences and calculations |
| **Backend (Web)** | Express 5 (Node.js) | Boilerplate server with health-check and scaling readiness |
| **Deep Learning** | TensorFlow / Keras | MobileNetV2 base weights and transfer learning head |
| **Computer Vision**| OpenCV (`cv2`) + Pillow | Preprocessing, resizing, and color space alignment |
| **Monorepo** | pnpm workspaces | Monorepo dependency management and tasks runner |
| **Auth & Database**| Firebase Auth + Firestore | Secure identity management and real-time syncing |
| **SQL DB (Boilerplate)**| PostgreSQL + Drizzle ORM | Configured SQL schema database connector |

---

## 📁 Repository Structure

The monorepo contains frontend applications, microservices, and shared libraries:

```text
deep-learn-site/
├── artifacts/
│   ├── api-server/                  # Node.js Express API Server (boilerplated at /api)
│   │   ├── src/
│   │   │   ├── app.ts               # Express configuration, cors, pino-logger middleware
│   │   │   └── routes/              # /healthz endpoint configuration
│   │   └── package.json
│   │
│   ├── food-api/                    # FastAPI Machine Learning Python Server (mounted at /ml-api)
│   │   ├── main.py                  # Core REST API definitions, BMR math, and model loading
│   │   ├── train.log                # Extracted training output for MobileNetV2
│   │   ├── dataset/                 # 44 subfolders for food image classes (not in version control)
│   │   ├── uploads/                 # Temporary directory for uploaded image files
│   │   └── model/
│   │       ├── train.py             # Data generator, MobileNetV2 head, and training callbacks
│   │       ├── class_indices.txt    # Maps class indexes (0-43) to name strings
│   │       └── indian_food_model.h5 # Saved model checkpoint weights (compiled by Keras)
│   │
│   └── deep-learning-hub/           # React Single Page Frontend Application (mounted at /)
│       ├── src/
│       │   ├── App.tsx              # App routing (wouter), provider configurations
│       │   ├── components/          # BarcodeScannerPanel, ConfirmationStep, NutritionPanel, etc.
│       │   ├── contexts/            # AuthContext (Firebase) & UserDataContext (Firestore)
│       │   ├── hooks/               # use-ml-api (TanStack React Query hooks)
│       │   └── pages/               # Dashboard, Home, LandingPage, Login, SignUp
│       ├── .env                     # Firebase Client configurations
│       └── package.json
│
├── lib/                             # Shared Library Packages
│   ├── api-client-react/            # Generated React Query API hooks
│   ├── api-spec/                    # OpenAPI description file for codegen
│   ├── api-zod/                     # Auto-generated schemas for validation
│   └── db/                          # Boilerplate PostgreSQL Drizzle tables file
│
├── package.json                     # Monorepo workspaces command manager
├── pnpm-workspace.yaml              # Configures package directories and catalogs
└── tsconfig.json                    # Composite TypeScript configurations root reference
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 20 or higher
- **pnpm**: Version 9 or higher
- **Python**: Version 3.10 or higher with `pip` or `uv`
- **Nix** (Optional/For Replit environments): Nix packages load required system libraries (e.g., `freetype`, `libjpeg`, `zlib`) for OpenCV and Pillow image manipulation.

### Environment Variables
Configure the environment file in the frontend repository:
Create a `.env` file at `artifacts/deep-learning-hub/.env`:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

If you plan to utilize the boilerplate PostgreSQL backend:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd MP-2-Updated/Deep-Learn-Site
   ```

2. **Install node dependencies:**
   Ensure you run `pnpm` as it is enforced in the root package configuration:
   ```bash
   pnpm install
   ```

3. **Install Python backend dependencies:**
   Navigate to the ML API folder and set up your python environment:
   ```bash
   cd artifacts/food-api
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Launch Development Servers:**
   You must run both servers concurrently to have a fully functional web interface:

   * **Start Python FastAPI ML Server:**
     ```bash
     cd artifacts/food-api
     uvicorn main:app --host 0.0.0.0 --port 8000 --reload
     ```
     *The ML API will run on `http://localhost:8000`. If `indian_food_model.h5` is not found, it automatically boots up in **Demo Mode** simulating inferences.*

   * **Start React Frontend (Vite):**
     Open another terminal in the project root:
     ```bash
     cd artifacts/deep-learning-hub
     pnpm run dev
     ```
     *The frontend will boot on `http://localhost:5173`.*

   * **Start Express Boilerplate (Optional):**
     ```bash
     cd artifacts/api-server
     pnpm run dev
     ```
     *Runs on `http://localhost:8080`.*

---

## 🧠 ML Model & Training Pipeline

### Dataset & Classes
The dataset contains **32,239 images** categorized across **44 distinct classes** (e.g., standard global items like `Pizza`, `Sushi`, `Burger`, and Indian items like `Samosa`, `Pav Bhaji`, `Chole Bhature`, `Dal Makhani`, `Chai`, etc.).

### Model Architecture
The architecture is structured around transfer learning via a **MobileNetV2** model pretrained on ImageNet:
- **Base model**: MobileNetV2 (154 layers, frozen during phase 1).
- **Classification Head**:
  - `GlobalAveragePooling2D` (flattens feature maps to 1280-d vector)
  - `Dense` (256 units, ReLU activation)
  - `Dropout` (0.3 rate)
  - `Dense` (44 units, Softmax activation)

### Training Workflow
The training script `artifacts/food-api/model/train.py` executes a two-phase pipeline:
1. **Phase 1: Feature Extraction:** Base layers are frozen. Custom dense classification head is trained for 15 epochs using Adam ($LR = 10^{-3}$).
2. **Phase 2: Fine-Tuning:** If Phase 1 validation accuracy exceeds 70%, the top 20 layers of the MobileNetV2 base are unfrozen and fine-tuned for 5 epochs ($LR = 10^{-4}$).

To retrain the model:
1. Deposit your dataset at `artifacts/food-api/dataset/` structured in subfolders.
2. Run:
   ```bash
   cd artifacts/food-api
   python model/train.py
   ```
3. The best model checkpoint will be saved to `model/indian_food_model.h5`.

---

## 🔌 API Endpoints

### FastAPI ML Server (`/ml-api`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| **GET** | `/health` | Server status, model loaded indicators | No |
| **GET** | `/classes` | Lists 44 supported food classes and descriptions | No |
| **GET** | `/model-status`| Verifies if weights file exists and is loaded | No |
| **POST**| `/predict` | Multipart image upload; returns top-5 classifications | No |
| **POST**| `/correct` | Submits prediction adjustments to update telemetry | No |
| **POST**| `/nutrition` | Computes macros scaled to a given weight (grams) | No |
| **POST**| `/set-goal` | Calculates customized calorie/macro targets (BMR/TDEE) | No |
| **POST**| `/diet-score`| Generates 0-100 score & feedback from day's logs | No |

### Express Server (`/api`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| **GET** | `/healthz` | Confirms Node.js Express server is functional | No |

---

## 🗄️ Database Schema

### Firebase Firestore: `/users/{uid}`
Production tracking stores data under a user-keyed Firestore document structure:

```json
{
  "goal": {
    "bmr": 1640.5,
    "tdee": 2542.8,
    "target_calories": 2042.8,
    "protein_g": 102.1,
    "carbs_g": 255.4,
    "fat_g": 68.1,
    "fiber_g": 25.0,
    "goal": "maintenance",
    "summary": "Target 2043 kcal/day to maintain current weight."
  },
  "log": [
    {
      "id": "c62040db-9b2f-488f-b98a-7e045cb95eb2",
      "food_name": "samosa",
      "portion_grams": 150.0,
      "date": "2026-06-02",
      "nutrition": {
        "food_name": "samosa",
        "portion_grams": 150.0,
        "calories": 480.0,
        "protein_g": 6.8,
        "carbs_g": 52.5,
        "fat_g": 27.0,
        "fiber_g": 4.5
      }
    }
  ]
}
```

> [!NOTE]
> To save storage cost and keep array writes quick, the application automatically prunes log entries older than 7 days during operations.

---

## 🗺️ Roadmap & Future Enhancements

- [ ] **Complete Training Pipeline:** Train MobileNetV2 to completion beyond Phase 1 step interrupt.
- [ ] **Autonomous Portion Volume Estimation:** Use image scaling techniques or smartphone depth sensor integration to estimate food volume and calculate grams automatically.
- [ ] **OpenFoodFacts Fallback API:** Integrate third-party nutrition databases to capture a wider array of global barcodes.
- [ ] **Enable Local SQL Stack:** Connect Express API to PostgreSQL via Drizzle ORM to transition from Firestore.
- [ ] **Zero-Shot VLM Migration:** Transition classification architecture to Vision-Language Models (VLM) for open-ended classification.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## ✉️ Contact

Project Link: [https://github.com/your-username/snap-to-know](https://github.com/your-username/snap-to-know)
