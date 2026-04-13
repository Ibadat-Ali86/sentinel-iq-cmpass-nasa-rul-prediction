"""
SentinelIQ — Model Trainer
===========================

Handles training loops, early stopping, checkpointing, and performance
logging for all model variants (LSTM, TCN, MultiTask).

Author: SentinelIQ Team
Version: 2.0
"""

import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

from .models import Autoencoder, LSTMModel, MultiTaskTCN, TCNModel

logger = logging.getLogger(__name__)


class ModelTrainer:
    """
    Unified trainer for LSTM, TCN, and MultiTask TCN models.

    Features:
    - Adam optimiser with configurable learning rate
    - MSE loss for regression (CrossEntropy added for multi-task)
    - Early stopping on validation loss
    - Best-model checkpointing to disk
    - Per-epoch performance logging

    Usage:
        trainer = ModelTrainer(config)
        model = trainer.train_lstm(train_loader, val_loader, input_dim=14)
    """

    def __init__(self, config):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("ModelTrainer initialised — device: %s", self.device)

    # ──────────────────────────────────────────────────────────────────────────
    # Public: LSTM
    # ──────────────────────────────────────────────────────────────────────────

    def train_lstm(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        input_dim: int,
        save_path: Optional[Path] = None,
    ) -> nn.Module:
        """Train bidirectional LSTM and return the best checkpoint."""
        model = LSTMModel(
            input_dim=input_dim,
            hidden_dim=self.config.hidden_dim,
            dropout=self.config.dropout_rate,
        ).to(self.device)

        return self._train_regression(
            model, train_loader, val_loader,
            name="LSTM",
            save_path=save_path or self.config.model_dir / "lstm_best.pth",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Public: TCN
    # ──────────────────────────────────────────────────────────────────────────

    def train_tcn(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        input_dim: int,
        save_path: Optional[Path] = None,
    ) -> nn.Module:
        """Train TCN model and return the best checkpoint."""
        model = TCNModel(
            input_dim=input_dim,
            num_channels=self.config.tcn_channels,
            kernel_size=self.config.tcn_kernel_size,
            dropout=self.config.dropout_rate,
        ).to(self.device)

        return self._train_regression(
            model, train_loader, val_loader,
            name="TCN",
            save_path=save_path or self.config.model_dir / "tcn_best.pth",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Public: Multi-Task TCN
    # ──────────────────────────────────────────────────────────────────────────

    def train_multitask(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        input_dim: int,
        save_path: Optional[Path] = None,
    ) -> nn.Module:
        """
        Train MultiTaskTCN with combined MSE + CrossEntropy loss.

        train_loader must yield (sequences, rul_targets, failure_modes).
        """
        model = MultiTaskTCN(
            input_dim=input_dim,
            num_channels=self.config.tcn_channels,
            n_failure_modes=self.config.n_failure_modes,
            kernel_size=self.config.tcn_kernel_size,
            dropout=self.config.dropout_rate,
        ).to(self.device)

        regression_criterion = nn.MSELoss()
        classification_criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=self.config.learning_rate)

        best_val_loss = float("inf")
        patience_counter = 0
        save_path = save_path or self.config.model_dir / "multitask_best.pth"
        history: Dict[str, List[float]] = {"train_loss": [], "val_loss": []}

        logger.info("=" * 60)
        logger.info("Training MultiTask TCN")
        logger.info("=" * 60)

        for epoch in range(self.config.n_epochs):
            model.train()
            train_loss = 0.0

            for sequences, rul_targets, failure_modes in train_loader:
                sequences = sequences.to(self.device)
                rul_targets = rul_targets.to(self.device)
                failure_modes = failure_modes.to(self.device)

                optimizer.zero_grad()
                rul_pred, mode_logits = model(sequences)

                loss = (
                    regression_criterion(rul_pred, rul_targets)
                    + self.config.lambda_classification
                    * classification_criterion(mode_logits, failure_modes)
                )
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                train_loss += loss.item()

            # Validation
            val_loss = self._validate_multitask(
                model, val_loader, regression_criterion, classification_criterion
            )
            train_loss /= len(train_loader)
            history["train_loss"].append(train_loss)
            history["val_loss"].append(val_loss)

            if (epoch + 1) % 5 == 0:
                logger.info(
                    "MultiTask Epoch %3d/%d — Train: %.4f | Val: %.4f",
                    epoch + 1, self.config.n_epochs, train_loss, val_loss,
                )

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                torch.save(model.state_dict(), save_path)
            else:
                patience_counter += 1
                if patience_counter >= self.config.patience:
                    logger.info("Early stopping at epoch %d", epoch + 1)
                    break

        model.load_state_dict(torch.load(save_path, map_location=self.device))
        logger.info("MultiTask — Best val loss: %.4f | Saved: %s", best_val_loss, save_path)
        return model

    # ──────────────────────────────────────────────────────────────────────────
    # Public: Autoencoder (for anomaly detection)
    # ──────────────────────────────────────────────────────────────────────────

    def train_autoencoder(
        self,
        healthy_data: torch.Tensor,
        input_dim: int,
        epochs: int = 50,
        save_path: Optional[Path] = None,
    ) -> Autoencoder:
        """
        Train autoencoder on healthy sensor data only (RUL > threshold).

        Args:
            healthy_data:  FloatTensor of shape (n_samples, n_features).
            input_dim:     Number of sensor features.
            epochs:        Training epochs.
            save_path:     Where to save the trained weights.
        """
        model = Autoencoder(input_dim=input_dim).to(self.device)
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        dataset = torch.utils.data.TensorDataset(healthy_data)
        loader = torch.utils.data.DataLoader(dataset, batch_size=64, shuffle=True)

        save_path = save_path or self.config.model_dir / "autoencoder.pth"

        logger.info("Training Autoencoder on %d healthy samples ...", len(healthy_data))
        for epoch in range(epochs):
            model.train()
            total_loss = 0.0
            for (batch,) in loader:
                batch = batch.to(self.device)
                optimizer.zero_grad()
                reconstructed = model(batch)
                loss = criterion(reconstructed, batch)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            if (epoch + 1) % 10 == 0:
                logger.info(
                    "Autoencoder Epoch %3d/%d — Loss: %.6f",
                    epoch + 1, epochs, total_loss / len(loader),
                )

        torch.save(model.state_dict(), save_path)
        logger.info("Autoencoder saved to %s", save_path)
        return model

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _train_regression(
        self,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        name: str,
        save_path: Path,
    ) -> nn.Module:
        """Shared training loop for single-output regression models (LSTM, TCN)."""
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=self.config.learning_rate)

        best_val_loss = float("inf")
        patience_counter = 0
        history: Dict[str, List[float]] = {"train_loss": [], "val_loss": []}

        logger.info("=" * 60)
        logger.info("Training %s | device=%s", name, self.device)
        logger.info("=" * 60)
        t0 = time.time()

        for epoch in range(self.config.n_epochs):
            model.train()
            train_loss = 0.0

            for sequences, targets in train_loader:
                sequences = sequences.to(self.device)
                targets = targets.to(self.device)

                optimizer.zero_grad()
                predictions = model(sequences)
                loss = criterion(predictions, targets)
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                train_loss += loss.item()

            train_loss /= len(train_loader)
            val_loss = self._validate_regression(model, val_loader, criterion)

            history["train_loss"].append(train_loss)
            history["val_loss"].append(val_loss)

            if (epoch + 1) % 5 == 0:
                logger.info(
                    "%s Epoch %3d/%d — Train: %.4f | Val: %.4f",
                    name, epoch + 1, self.config.n_epochs, train_loss, val_loss,
                )

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                torch.save(model.state_dict(), save_path)
            else:
                patience_counter += 1
                if patience_counter >= self.config.patience:
                    logger.info("%s early stop at epoch %d", name, epoch + 1)
                    break

        model.load_state_dict(torch.load(save_path, map_location=self.device))
        elapsed = time.time() - t0
        logger.info(
            "%s done — best val loss: %.4f | time: %.1fs | saved: %s",
            name, best_val_loss, elapsed, save_path,
        )
        return model

    def _validate_regression(
        self, model: nn.Module, val_loader: DataLoader, criterion: nn.Module
    ) -> float:
        model.eval()
        total = 0.0
        with torch.no_grad():
            for sequences, targets in val_loader:
                predictions = model(sequences.to(self.device))
                total += criterion(predictions, targets.to(self.device)).item()
        return total / len(val_loader)

    def _validate_multitask(
        self,
        model: nn.Module,
        val_loader: DataLoader,
        reg_crit: nn.Module,
        cls_crit: nn.Module,
    ) -> float:
        model.eval()
        total = 0.0
        with torch.no_grad():
            for sequences, rul_targets, failure_modes in val_loader:
                rul_pred, mode_logits = model(sequences.to(self.device))
                total += (
                    reg_crit(rul_pred, rul_targets.to(self.device))
                    + self.config.lambda_classification
                    * cls_crit(mode_logits, failure_modes.to(self.device))
                ).item()
        return total / len(val_loader)
