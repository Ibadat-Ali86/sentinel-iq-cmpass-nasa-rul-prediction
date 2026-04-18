"""
SentinelIQ — PyTorch Model Architectures
==========================================

Implements all model architectures used in the SentinelIQ v2.0 ML pipeline:

  1. CMAPSSDataset          — PyTorch Dataset with sliding-window sequences
  2. CMAPSSDataset_MultiTask — Extended dataset returning failure mode labels
  3. LSTMModel              — Bidirectional 2-layer LSTM baseline
  4. TemporalBlock           — Single TCN residual block (dilated causal convolutions)
  5. TCNModel               — Full TCN stack (Phase 8 — replaces LSTM)
  6. MultiTaskTCN           — Shared TCN backbone + RUL head + failure-mode head (Phase 9)
  7. Autoencoder            — Encoder-decoder for reconstruction-based anomaly detection

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1 — PyTorch Datasets
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class CMAPSSDataset(Dataset):
    """
    Sliding-window PyTorch Dataset for sequence-based RUL prediction.

    For each engine unit, generates overlapping sequences of shape
    (sequence_length, n_features) and pairs each with the RUL value at
    the final timestep of the window.

    Args:
        df:              DataFrame with unit_id, cycle, sensor columns, target.
        feature_cols:    List of sensor column names to use as model input.
        sequence_length: Number of timesteps per window.
        target_col:      Column containing the regression target (default: RUL_capped).
    """

    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        sequence_length: int,
        target_col: str = "RUL_capped",
    ):
        sequences: List[np.ndarray] = []
        targets: List[float] = []

        for unit_id in df["unit_id"].unique():
            unit_data = df[df["unit_id"] == unit_id].sort_values("cycle")
            features = unit_data[feature_cols].values
            rul_values = unit_data[target_col].values

            for i in range(len(features) - sequence_length + 1):
                sequences.append(features[i : i + sequence_length])
                targets.append(float(rul_values[i + sequence_length - 1]))

        self.sequences = torch.FloatTensor(np.array(sequences))
        self.targets = torch.FloatTensor(np.array(targets))
        logger.debug("CMAPSSDataset — %d sequences created.", len(self.sequences))

    def __len__(self) -> int:
        return len(self.sequences)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.sequences[idx], self.targets[idx]


class CMAPSSDataset_MultiTask(Dataset):
    """
    Extended dataset for multi-task learning (RUL + failure mode classification).

    Requires 'failure_mode' column to be present in the DataFrame (added by
    FailureModeLabeler in features.py).

    __getitem__ returns (sequence, rul_target, failure_mode_label).
    """

    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        sequence_length: int,
        target_col: str = "RUL_capped",
    ):
        sequences: List[np.ndarray] = []
        targets: List[float] = []
        failure_modes: List[int] = []

        for unit_id in df["unit_id"].unique():
            unit_data = df[df["unit_id"] == unit_id].sort_values("cycle")
            features = unit_data[feature_cols].values
            rul_values = unit_data[target_col].values
            mode = int(unit_data["failure_mode"].iloc[0])  # Same mode for all cycles

            for i in range(len(features) - sequence_length + 1):
                sequences.append(features[i : i + sequence_length])
                targets.append(float(rul_values[i + sequence_length - 1]))
                failure_modes.append(mode)

        self.sequences = torch.FloatTensor(np.array(sequences))
        self.targets = torch.FloatTensor(np.array(targets))
        self.failure_modes = torch.LongTensor(failure_modes)

    def __len__(self) -> int:
        return len(self.sequences)

    def __getitem__(
        self, idx: int
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.sequences[idx], self.targets[idx], self.failure_modes[idx]


class CMAPSSTestDataset(Dataset):
    """
    Dataset for test evaluation.
    Only extracts the final sequence of each unit, as true RUL is only available
    for the end of the test trajectory.
    """

    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        sequence_length: int,
    ):
        sequences: List[np.ndarray] = []
        targets: List[float] = []

        for unit_id in df["unit_id"].unique():
            unit_data = df[df["unit_id"] == unit_id].sort_values("cycle")
            features = unit_data[feature_cols].values

            if len(features) >= sequence_length:
                sequences.append(features[-sequence_length:])
            else:
                pad = np.zeros((sequence_length - len(features), len(feature_cols)))
                sequences.append(np.vstack((pad, features)))

            targets.append(0.0)  # Dummy target

        self.sequences = torch.FloatTensor(np.array(sequences))
        self.targets = torch.FloatTensor(np.array(targets))

    def __len__(self) -> int:
        return len(self.sequences)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.sequences[idx], self.targets[idx]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2 — LSTM Baseline (Phase 1–7)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class LSTMModel(nn.Module):
    """
    Bidirectional 2-layer LSTM for RUL regression.

    Input:  (batch, sequence_length, n_features)
    Output: (batch,) — scalar RUL estimate per sample

    Architecture:
    - 2-layer bidirectional LSTM
    - Dropout between layers and before the output head
    - Linear output layer (regression, no activation)

    Performance target: RMSE ≤ 18 cycles on CMAPSS FD001 test set.
    """

    def __init__(self, input_dim: int, hidden_dim: int = 128, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=dropout,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * 2, 1)  # ×2 for bidirectional

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        out = self.dropout(lstm_out[:, -1, :])  # Last timestep
        return self.fc(out).squeeze(-1)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3 — TCN (Phase 8)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TemporalBlock(nn.Module):
    """
    Single TCN residual block with dilated causal convolutions.

    Dilation doubles with each successive block:
      Block 0: dilation=1  → receptive field = 3 timesteps
      Block 1: dilation=2  → receptive field = 5 timesteps
      Block 2: dilation=4  → receptive field = 9 timesteps
      Block 3: dilation=8  → receptive field = 17 timesteps

    Causal padding removes future information (output[:, :, :-padding]).
    A residual (skip) connection handles the case where in_channels ≠ out_channels.
    """

    def __init__(
        self,
        n_inputs: int,
        n_outputs: int,
        kernel_size: int,
        stride: int,
        dilation: int,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation

        self.conv1 = nn.Conv1d(
            n_inputs, n_outputs, kernel_size,
            stride=stride, padding=self.padding, dilation=dilation,
        )
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(dropout)

        self.conv2 = nn.Conv1d(
            n_outputs, n_outputs, kernel_size,
            stride=stride, padding=self.padding, dilation=dilation,
        )
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(dropout)

        self.downsample = (
            nn.Conv1d(n_inputs, n_outputs, 1) if n_inputs != n_outputs else None
        )
        self.relu = nn.ReLU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.conv1(x)
        out = out[:, :, : -self.padding] if self.padding else out  # Remove future
        out = self.relu1(out)
        out = self.dropout1(out)

        out = self.conv2(out)
        out = out[:, :, : -self.padding] if self.padding else out
        out = self.relu2(out)
        out = self.dropout2(out)

        res = x if self.downsample is None else self.downsample(x)
        return self.relu(out + res)


class TCNModel(nn.Module):
    """
    Temporal Convolutional Network for RUL prediction.

    Input:  (batch, sequence_length, n_features)   ← note: seq-first
    Output: (batch,)

    Architecture:
    - Stack of TemporalBlocks with exponentially increasing dilation
    - Default channels: [64, 128, 128, 64]
    - Final FC head produces scalar RUL estimate

    Performance target: RMSE ≤ 13 cycles on CMAPSS FD001 test set.
    (Outperforms LSTM baseline due to parallelisable training + multi-scale receptive field)
    """

    def __init__(
        self,
        input_dim: int,
        num_channels: Optional[List[int]] = None,
        kernel_size: int = 3,
        dropout: float = 0.2,
    ):
        super().__init__()
        if num_channels is None:
            num_channels = [64, 128, 128, 64]

        layers = []
        for i, out_ch in enumerate(num_channels):
            in_ch = input_dim if i == 0 else num_channels[i - 1]
            dilation = 2 ** i
            layers.append(
                TemporalBlock(in_ch, out_ch, kernel_size, stride=1, dilation=dilation, dropout=dropout)
            )
        self.network = nn.Sequential(*layers)
        self.fc = nn.Linear(num_channels[-1], 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, features) → (batch, features, seq_len) for Conv1d
        out = self.network(x.transpose(1, 2))
        out = out[:, :, -1]  # Last timestep
        return self.fc(out).squeeze(-1)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4 — Multi-Task TCN (Phase 9)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class MultiTaskTCN(nn.Module):
    """
    TCN with dual output heads: RUL regression + failure mode classification.

    Shared backbone learns general degradation features.
    Task-specific heads specialise independently.

    Combined Loss:
        L_total = L_RUL (MSE) + lambda * L_mode (CrossEntropy)
        Default lambda = 0.5 (configurable in Config.lambda_classification)

    Inputs/Outputs:
        Input:  (batch, seq_len, n_features)
        Output: (rul_pred, failure_mode_logits)
                rul_pred shape:        (batch,)
                failure_mode_logits:   (batch, n_failure_modes)

    Performance targets:
        RUL RMSE ≤ 16 cycles | Failure mode F1 ≥ 0.75
    """

    def __init__(
        self,
        input_dim: int,
        num_channels: Optional[List[int]] = None,
        n_failure_modes: int = 5,
        kernel_size: int = 3,
        dropout: float = 0.2,
    ):
        super().__init__()
        if num_channels is None:
            num_channels = [64, 128, 128, 64]

        # Shared backbone
        backbone_layers = []
        for i, out_ch in enumerate(num_channels):
            in_ch = input_dim if i == 0 else num_channels[i - 1]
            backbone_layers.append(
                TemporalBlock(in_ch, out_ch, kernel_size, stride=1, dilation=2 ** i, dropout=dropout)
            )
        self.shared_backbone = nn.Sequential(*backbone_layers)

        # Task heads
        self.rul_head = nn.Linear(num_channels[-1], 1)
        self.failure_mode_head = nn.Sequential(
            nn.Linear(num_channels[-1], 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, n_failure_modes),
        )

    def forward(
        self, x: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        shared = self.shared_backbone(x.transpose(1, 2))
        shared = shared[:, :, -1]  # Last timestep

        rul_pred = self.rul_head(shared).squeeze(-1)
        mode_logits = self.failure_mode_head(shared)
        return rul_pred, mode_logits


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5 — Autoencoder (Phase 10 — Anomaly Detection)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class Autoencoder(nn.Module):
    """
    Encoder-decoder network for reconstruction-based anomaly detection.

    Principle:
    - Trained exclusively on HEALTHY sensor patterns (high-RUL cycles).
    - Healthy patterns → low reconstruction error.
    - Anomalous patterns → high reconstruction error → anomaly alert.

    Architecture:
        Encoder: input_dim → 64 → 32 → latent_dim
        Decoder: latent_dim → 32 → 64 → input_dim

    Usage:
        ae = Autoencoder(input_dim=14)
        error = ae.reconstruction_error(x_tensor)  # shape (batch,)
    """

    def __init__(self, input_dim: int, latent_dim: int = 16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, latent_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.decoder(self.encoder(x))

    @torch.no_grad()
    def reconstruction_error(self, x: torch.Tensor) -> np.ndarray:
        """Compute per-sample MSE reconstruction error (anomaly score proxy)."""
        reconstructed = self.forward(x)
        errors = torch.mean((x - reconstructed) ** 2, dim=1)
        return errors.cpu().numpy()


# Alias used by src/models/__init__.py
TCNEnsemble = TCNModel
