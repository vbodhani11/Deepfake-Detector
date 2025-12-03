"""
Aggregation Strategies for Video-Level Deepfake Detection

This module implements different strategies for aggregating frame-level predictions
into video-level predictions, including the DFDC winner's confident strategy.
"""

import numpy as np
from typing import List, Union
import logging

logger = logging.getLogger(__name__)


def confident_strategy(pred: Union[List[float], np.ndarray], t: float = 0.8) -> float:
    """
    DFDC winner's confident aggregation strategy.
    
    This strategy prioritizes high-confidence fake frames or low-confidence real frames,
    otherwise uses the simple mean of all frames.
    
    Args:
        pred: Array of frame-level fake probabilities
        t: Threshold for high-confidence fake predictions (default: 0.8)
    
    Returns:
        Aggregated fake probability for the video
    
    Strategy:
        1. If many frames (> sz/2.5 and > 11) are detected as fakes with high probability (>t):
           → Return mean of high-confidence fake frames
        2. If most frames (>90%) are clearly real (fake prob < 0.2):
           → Return mean of low-confidence frames
        3. Otherwise:
           → Return mean of all frames
    """
    pred = np.array(pred)
    sz = len(pred)
    
    if sz == 0:
        logger.warning("Empty prediction array in confident_strategy")
        return 0.5  # Default to uncertain
    
    fakes = np.count_nonzero(pred > t)
    
    # If many frames are detected as fakes with high probability
    if fakes > sz // 2.5 and fakes > 11:
        high_conf_fakes = pred[pred > t]
        result = np.mean(high_conf_fakes)
        logger.debug(f"Confident strategy: Using high-confidence fake frames ({fakes}/{sz} frames)")
        return float(result)
    
    # If most frames are clearly real (low fake probability)
    low_conf_count = np.count_nonzero(pred < 0.2)
    if low_conf_count > 0.9 * sz:
        low_conf_reals = pred[pred < 0.2]
        result = np.mean(low_conf_reals)
        logger.debug(f"Confident strategy: Using low-confidence real frames ({low_conf_count}/{sz} frames)")
        return float(result)
    
    # Otherwise, use simple mean
    result = np.mean(pred)
    logger.debug(f"Confident strategy: Using simple mean of all frames")
    return float(result)


def simple_majority_vote(
    pred: Union[List[float], np.ndarray],
    threshold: float = 0.85
) -> float:
    """
    Simple majority vote aggregation strategy.
    
    Args:
        pred: Array of frame-level fake probabilities
        threshold: Classification threshold for frames (default: 0.85)
    
    Returns:
        Aggregated fake probability (mean of all frame probabilities)
    
    Note:
        The actual video-level classification is done by comparing
        the returned probability to the threshold.
    """
    pred = np.array(pred)
    
    if len(pred) == 0:
        logger.warning("Empty prediction array in simple_majority_vote")
        return 0.5  # Default to uncertain
    
    # Return mean probability
    # Video is classified as fake if mean >= threshold
    result = np.mean(pred)
    logger.debug(f"Simple majority vote: Mean probability = {result:.4f}")
    return float(result)


def get_aggregation_strategy(strategy_name: str):
    """
    Get aggregation strategy function by name.
    
    Args:
        strategy_name: Name of strategy ('confident' or 'simple')
    
    Returns:
        Aggregation function
    
    Raises:
        ValueError: If strategy name is not recognized
    """
    strategies = {
        'confident': confident_strategy,
        'simple': simple_majority_vote,
    }
    
    strategy_name_lower = strategy_name.lower()
    if strategy_name_lower not in strategies:
        raise ValueError(
            f"Unknown aggregation strategy: {strategy_name}. "
            f"Available strategies: {list(strategies.keys())}"
        )
    
    return strategies[strategy_name_lower]

