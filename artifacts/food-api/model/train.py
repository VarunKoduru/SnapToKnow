"""
MobileNetV2 Transfer Learning - Food Classification
========================================================

Usage:
    python model/train.py

Output:
    model/indian_food_model.h5
"""

import os
import sys
from pathlib import Path

# ─── Paths ──────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent
DATASET_DIR = MODEL_DIR.parent / "dataset" / "Food Classification dataset"
MODEL_SAVE_PATH = MODEL_DIR / "indian_food_model.h5"

# ─── Hyperparameters ─────────────────────────────────────────────────────────
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15
LEARNING_RATE = 1e-3
DENSE_UNITS = 256
DROPOUT_RATE = 0.3

# ─── Imports ─────────────────────────────────────────────────────────────────
print("Loading TensorFlow...")
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import (
    ModelCheckpoint,
    EarlyStopping,
    ReduceLROnPlateau,
)

print(f"TensorFlow version: {tf.__version__}")


# ─── Dataset Validation ───────────────────────────────────────────────────────
def validate_dataset():
    """Check that the dataset directory exists and has the expected structure."""
    if not DATASET_DIR.exists():
        print(f"\n[ERROR] Dataset directory not found: {DATASET_DIR}")
        sys.exit(1)

    classes = sorted([d.name for d in DATASET_DIR.iterdir() if d.is_dir()])
    print(f"\nDetected {len(classes)} classes: {', '.join(classes)}")
    return classes


# ─── Data Generators ─────────────────────────────────────────────────────────
def build_generators(classes):
    """Create Keras datasets with dynamic 80/20 split and augmentation."""
    from tensorflow.keras.utils import image_dataset_from_directory

    train_ds = image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    val_ds = image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.2),
        layers.RandomZoom(0.2),
    ], name="data_augmentation")

    rescaling = layers.Rescaling(1./255)

    train_gen = train_ds.map(lambda x, y: (data_augmentation(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)
    train_gen = train_gen.map(lambda x, y: (rescaling(x), y), num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)

    val_gen = val_ds.map(lambda x, y: (rescaling(x), y), num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)
    
    # Store class names for saving mapping later
    train_gen.class_names = train_ds.class_names

    return train_gen, val_gen


# ─── Model Architecture ───────────────────────────────────────────────────────
def build_model(num_classes: int) -> Model:
    """
    Build MobileNetV2 transfer learning model:
    - Base: MobileNetV2 pretrained on ImageNet (include_top=False)
    - All base layers frozen initially
    - Custom head: GlobalAveragePooling2D → Dense(ReLU) → Dropout → Softmax
    """
    base_model = MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,        # Remove ImageNet classification head
        weights="imagenet",       # Use pretrained ImageNet weights
    )

    # Freeze all base layers for initial training
    base_model.trainable = False
    print(f"\nBase model: {base_model.name}")
    print(f"  Total layers : {len(base_model.layers)}")
    
    # Build custom classification head
    x = base_model.output
    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = layers.Dense(DENSE_UNITS, activation="relu", name="dense_head")(x)
    x = layers.Dropout(DROPOUT_RATE, name="dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = Model(inputs=base_model.input, outputs=outputs, name="indian_food_mobilenetv2")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


# ─── Fine-tuning ──────────────────────────────────────────────────────────────
def fine_tune(model: Model, train_gen, val_gen, fine_tune_epochs: int = 5):
    """
    Unfreeze the top layers of MobileNetV2 and fine-tune with a low LR.
    Only run if initial training achieves > 70% validation accuracy.
    """
    base_model = model.layers[0]  # MobileNetV2 is the first layer
    base_model.trainable = True

    # Unfreeze only the top 20 layers of MobileNetV2
    fine_tune_at = len(base_model.layers) - 20
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    print(f"\nFine-tuning top {20} layers of MobileNetV2...")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE / 10),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=3, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-7),
        ModelCheckpoint(
            str(MODEL_SAVE_PATH),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
    ]

    history_ft = model.fit(
        train_gen,
        epochs=fine_tune_epochs,
        validation_data=val_gen,
        callbacks=callbacks,
    )
    return history_ft


# ─── Main Training Loop ───────────────────────────────────────────────────────
def train():
    print("=" * 60)
    print("  Food Recognition - MobileNetV2 Dynamic Training")
    print("=" * 60)

    classes = validate_dataset()
    num_classes = len(classes)

    train_gen, val_gen = build_generators(classes)

    model = build_model(num_classes)
    model.summary()

    callbacks = [
        EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
        ModelCheckpoint(
            str(MODEL_SAVE_PATH),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
    ]

    print(f"\nTraining for up to {EPOCHS} epochs...")
    history = model.fit(
        train_gen,
        epochs=EPOCHS,
        validation_data=val_gen,
        callbacks=callbacks,
    )

    val_acc = max(history.history.get("val_accuracy", [0]))
    print(f"\nBest validation accuracy: {val_acc:.2%}")

    if val_acc > 0.70:
        print("\nStarting fine-tuning phase...")
        history_ft = fine_tune(model, train_gen, val_gen, fine_tune_epochs=5)

    model.save(str(MODEL_SAVE_PATH))
    print(f"\nModel saved to: {MODEL_SAVE_PATH}")

    # Save class index mapping
    class_map_path = MODEL_DIR / "class_indices.txt"
    with open(class_map_path, "w") as f:
        for idx, cls in enumerate(train_gen.class_names):
            f.write(f"{idx}: {cls}\n")
    print(f"Class mapping saved to: {class_map_path}")

    print("\nTraining complete!")
    return model


if __name__ == "__main__":
    trained_model = train()
