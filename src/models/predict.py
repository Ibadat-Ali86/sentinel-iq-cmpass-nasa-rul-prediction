"""
SentinelIQ — Inference Entry Point
====================================

Provides a clean predict_rul() public function that loads a trained TCN
model and returns RUL predictions for a given input tensor.

This module is the standard inference interface used by ml_server/ and
external callers — do not import from trainer.py or models.py directly
for inference.

Author: SentinelIQ Team
Version: 2.0
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Union

import numpy as np
import torch

from src.models.models import TCNModel

logger = logging.getLogger(__name__)


def predict_rul(
    sequences: Union[np.ndarray, torch.Tensor],
    model_path: Path,
    input_dim: int,
    num_channels: list | None = None,
    kernel_size: int = 3,
    dropout: float = 0.0,
) -> np.ndarray:
    """
    Load a saved TCN checkpoint and return RUL predictions.

    Args:
        sequences:    Input tensor of shape (n_samples, seq_len, n_features).
                      Accepts numpy array or torch.Tensor.
        model_path:   Path to a .pth checkpoint produced by ModelTrainer.
        input_dim:    Number of sensor features (must match training config).
        num_channels: TCN channel stack (default: [64, 128, 128, 64]).
        kernel_size:  Convolution kernel size (default: 3).
        dropout:      Dropout rate — set to 0.0 for inference (eval mode).

    Returns:
        numpy.ndarray of shape (n_samples,) with RUL predictions in cycles.

    Raises:
        FileNotFoundError: If model_path does not exist.
        RuntimeError: If the checkpoint is incompatible with the model config.
    """
    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Model checkpoint not found: {model_path}\n"
            "Run 'make train' to produce a checkpoint before calling predict_rul()."
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = TCNModel(
        input_dim=input_dim,
        num_channels=num_channels or [64, 128, 128, 64],
        kernel_size=kernel_size,
        dropout=dropout,
    )
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    if isinstance(sequences, np.ndarray):
        sequences = torch.FloatTensor(sequences)

    sequences = sequences.to(device)

    with torch.no_grad():
        predictions = model(sequences)

    return predictions.cpu().numpy()
