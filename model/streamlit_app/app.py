"""
Streamlit Deepfake Detection App
Uses the DeepfakeDetectorPipeline from src.deepfake_detector
"""

import streamlit as st
import os
import sys
import pandas as pd
from pathlib import Path

# Add parent directory to path to import from src
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.deepfake_detector import DeepfakeDetectorPipeline

# --------- Config ---------
IMG_SIZE = (299, 299)
FRAME_RATE = 3
ENLARGE = 1.3
TOP_SHOW = 6
THRESHOLD = 0.5

# Hardcoded model path
MODEL_PATH = "models/xception_best.pt"

# --------- UI ---------
st.set_page_config(page_title="Deepfake Checker (XceptionNet)", page_icon="🎬", layout="wide")
st.title("🎬 Deepfake Checker (XceptionNet)")
st.caption("Upload a short video; the app samples frames, detects faces, and predicts Real/Fake.")

with st.sidebar:
    st.subheader("Settings")
    fps = st.slider("Sampling FPS", 1, 6, 3, 1, help="Frames per second to extract from video")
    THRESHOLD = st.slider("Decision threshold (Fake ≥)", 0.0, 1.0, 0.5, 0.01, help="Threshold for fake detection")

uploaded = st.file_uploader("Upload a video (.mp4 / .mov)", type=["mp4", "mov"])

# Only proceed if file is uploaded
if uploaded is not None:
    # Save uploaded file temporarily
    tmp_path = "/tmp/_upload.mp4"
    with open(tmp_path, "wb") as f:
        f.write(uploaded.read())
    
    st.video(tmp_path)
    
    # Process video using your pipeline
    if st.button("Analyze Video"):
        if not os.path.exists(MODEL_PATH):
            st.error(f"Model not found at: {MODEL_PATH}")
            st.stop()
        
        with st.spinner("Processing video..."):
            try:
                # Initialize your pipeline
                detector = DeepfakeDetectorPipeline()
                
                # Get prediction using your pipeline
                result = detector.predict_video(tmp_path, MODEL_PATH, fps=fps)
                
                if "error" in result:
                    st.error(f"Error: {result['error']}")
                    st.stop()
                
                # Display results
                prob_fake = result['average_fake_probability']
                label = "Fake" if prob_fake >= THRESHOLD else "Real"
                confidence = result['average_confidence']
                
                # Color coding
                color = "#ff4b4b" if label == "Fake" else "#4CAF50"
                st.markdown(f"""<div style='padding:10px;border-radius:8px;background:{color};color:white;
                            display:inline-block;font-weight:700'>
                            Prediction: {label} — Confidence: {confidence:.2%}</div>""",
                            unsafe_allow_html=True)
                
                st.write(f"**Frames analyzed:** {result['total_frames_processed']}")
                st.write(f"**Fake frames:** {result['fake_frames']}/{result['total_frames_processed']}")
                st.write(f"**Fake ratio:** {result['fake_ratio']:.2%}")
                st.write(f"**Average confidence:** {result['average_confidence']:.2%}")
                
                # Show frame predictions
                if 'frame_predictions' in result:
                    st.subheader("Frame-by-frame Analysis")
                    frame_data = []
                    for pred in result['frame_predictions']:
                        frame_data.append({
                            'Frame': pred['frame_number'],
                            'Prediction': pred['prediction'],
                            'Confidence': f"{pred['confidence']:.3f}",
                            'Fake Prob': f"{pred['fake_probability']:.3f}",
                            'Real Prob': f"{pred['real_probability']:.3f}"
                        })
                    
                    if frame_data:
                        df = pd.DataFrame(frame_data)
                        st.dataframe(df, use_container_width=True)
                
            except Exception as e:
                st.error(f"Error processing video: {str(e)}")
    
    # Clean up
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
else:
    st.info("Upload a short video to begin.")
