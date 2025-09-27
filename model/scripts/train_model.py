"""
Training script for deepfake detection model
Completely independent from backend/database
"""

import os
import sys
import argparse
import numpy as np
import tensorflow as tf
from pathlib import Path
from typing import Tuple, Optional
import json
from datetime import datetime

# Add src to path to import our modules
sys.path.append(str(Path(__file__).parent.parent / "src"))

from config.model_config import ModelConfig

class DeepfakeTrainer:
    """Standalone trainer for deepfake detection models"""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.model = None
        self.history = None
        
    def load_data(self, data_dir: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Load training data from directory structure:
        data_dir/
        ├── train/
        │   ├── real/
        │   └── fake/
        └── val/
            ├── real/
            └── fake/
        """
        print("Loading training data...")
        
        # This is a placeholder - implement your data loading logic
        # You might want to use tf.keras.preprocessing.image.ImageDataGenerator
        # or tf.data.Dataset for more efficient data loading
        
        # Example structure:
        train_datagen = tf.keras.preprocessing.image.ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            validation_split=0.2
        )
        
        train_generator = train_datagen.flow_from_directory(
            os.path.join(data_dir, 'train'),
            target_size=self.config.image_size,
            batch_size=self.config.batch_size,
            class_mode='binary',
            subset='training'
        )
        
        val_generator = train_datagen.flow_from_directory(
            os.path.join(data_dir, 'train'),
            target_size=self.config.image_size,
            batch_size=self.config.batch_size,
            class_mode='binary',
            subset='validation'
        )
        
        return train_generator, val_generator
    
    def build_model(self) -> tf.keras.Model:
        """Build the deepfake detection model"""
        print("Building model architecture...")
        
        # Example CNN architecture - customize based on your needs
        model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(32, (3, 3), activation='relu', 
                                 input_shape=(*self.config.image_size, 3)),
            tf.keras.layers.MaxPooling2D(2, 2),
            
            tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            
            tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            
            tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2, 2),
            
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(512, activation='relu'),
            tf.keras.layers.Dense(1, activation='sigmoid')  # Binary classification
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )
        
        return model
    
    def train(self, data_dir: str, epochs: int = 50, save_path: Optional[str] = None) -> None:
        """Train the model"""
        print(f"Starting training for {epochs} epochs...")
        
        # Load data
        train_gen, val_gen = self.load_data(data_dir)
        
        # Build model
        self.model = self.build_model()
        
        # Print model summary
        self.model.summary()
        
        # Callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.0001
            )
        ]
        
        # Train the model
        self.history = self.model.fit(
            train_gen,
            epochs=epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        # Save model
        if save_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            save_path = f"models/deepfake_detector_{timestamp}.h5"
        
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        self.model.save(save_path)
        print(f"Model saved to {save_path}")
        
        # Save training history
        history_path = save_path.replace('.h5', '_history.json')
        with open(history_path, 'w') as f:
            # Convert numpy arrays to lists for JSON serialization
            history_dict = {key: [float(val) for val in values] 
                          for key, values in self.history.history.items()}
            json.dump(history_dict, f, indent=2)
        print(f"Training history saved to {history_path}")
    
    def evaluate(self, test_data_dir: str) -> dict:
        """Evaluate the trained model"""
        if self.model is None:
            raise ValueError("Model not trained yet")
        
        print("Evaluating model...")
        
        # Load test data
        test_datagen = tf.keras.preprocessing.image.ImageDataGenerator(rescale=1./255)
        test_generator = test_datagen.flow_from_directory(
            test_data_dir,
            target_size=self.config.image_size,
            batch_size=self.config.batch_size,
            class_mode='binary',
            shuffle=False
        )
        
        # Evaluate
        results = self.model.evaluate(test_generator, verbose=1)
        
        # Create results dictionary
        metrics = {}
        for i, metric_name in enumerate(self.model.metrics_names):
            metrics[metric_name] = results[i]
        
        print("Evaluation Results:")
        for name, value in metrics.items():
            print(f"{name}: {value:.4f}")
        
        return metrics

def main():
    parser = argparse.ArgumentParser(description='Train deepfake detection model')
    parser.add_argument('--data-dir', required=True, help='Path to training data directory')
    parser.add_argument('--epochs', type=int, default=50, help='Number of training epochs')
    parser.add_argument('--model-path', help='Path to save the trained model')
    parser.add_argument('--test-dir', help='Path to test data for evaluation')
    
    args = parser.parse_args()
    
    # Create trainer
    config = ModelConfig()
    trainer = DeepfakeTrainer(config)
    
    # Train model
    trainer.train(
        data_dir=args.data_dir,
        epochs=args.epochs,
        save_path=args.model_path
    )
    
    # Evaluate if test data provided
    if args.test_dir:
        trainer.evaluate(args.test_dir)

if __name__ == "__main__":
    main()
