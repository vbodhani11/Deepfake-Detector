---
title: Deepfake Detection
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: streamlit
sdk_version: 1.38.0
app_file: app.py
pinned: false
license: mit
---

# Deepfake Detection using Xception

Detect deepfakes in videos using a fine-tuned Xception model.

Upload a video, and the app will analyze frames to detect if it's real or fake.

## Features

- Real-time video analysis
- Adjustable detection threshold
- Frame-by-frame analysis
- Face detection and cropping
- Confidence scores

## Model

- **Architecture:** Xception (fine-tuned)
- **Input:** 299x299 face crops
- **Output:** Binary classification (Real/Fake)
