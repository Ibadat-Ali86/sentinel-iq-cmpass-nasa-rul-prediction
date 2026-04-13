"""
SentinelIQ — Maintenance Cost Optimizer
=========================================

Uses Mixed-Integer Linear Programming (via PuLP) to compute the optimal
maintenance schedule that minimises total cost across the fleet.

Formulation:
  Decision variable: x[unit] ∈ {0, 1}  (1 = do preventive maintenance)
  Minimize: Σ [ preventive_cost × x[i] + failure_cost × (1-x[i]) × P_fail[i] ]
  Subject to:
    Σ x[i] ≤ max_concurrent_jobs     (resource capacity constraint)
    x[i] = 1 if RUL ≤ forced_horizon (forced maintenance window)

Output: Optimal binary decisions + expected savings vs naive reactive strategy.

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class ScheduleResult:
    """Output of a maintenance optimization run."""
    unit_id: str
    do_preventive: bool  # True = schedule preventive maintenance
    maintenance_type: str  # "preventive" | "corrective"
    expected_cost: float
    failure_probability: float
    rul_estimate: float


class MaintenanceScheduler:
    """
    Fleet-wide maintenance cost optimizer using PuLP MILP solver.

    Usage:
        scheduler = MaintenanceScheduler(preventive_cost=5000, failure_cost=50000)
        results = scheduler.optimize_schedule(predictions_df)
        report = scheduler.generate_report(results, predictions_df)
    """

    def __init__(
        self,
        preventive_cost: float = 5000.0,
        failure_cost: float = 50000.0,
        max_concurrent_jobs: int = 3,
        forced_maintenance_rul: int = 10,  # Force maintenance if RUL ≤ this
    ):
        self.preventive_cost = preventive_cost
        self.failure_cost = failure_cost
        self.max_concurrent_jobs = max_concurrent_jobs
        self.forced_maintenance_rul = forced_maintenance_rul

    def optimize_schedule(self, predictions_df: pd.DataFrame) -> List[ScheduleResult]:
        """
        Solve the maintenance scheduling MILP.

        Args:
            predictions_df: DataFrame with columns:
                - unit_id           (str or int)
                - rul_estimate      (float, cycles remaining)
                - failure_probability (float, 0–1)

        Returns:
            List of ScheduleResult, one per unit.
        """
        try:
            import pulp  # noqa: F401
        except ImportError:
            raise ImportError("PuLP is required: pip install pulp==2.7.0")

        import pulp

        n = len(predictions_df)
        units = predictions_df["unit_id"].tolist()
        rul = predictions_df["rul_estimate"].tolist()
        p_fail = predictions_df["failure_probability"].tolist()

        prob = pulp.LpProblem("SentinelIQ_Maintenance_Scheduler", pulp.LpMinimize)

        # Decision variables: x[i] = 1 if preventive maintenance is done
        x = [pulp.LpVariable(f"x_{i}", cat="Binary") for i in range(n)]

        # Objective: minimise total expected cost
        prob += pulp.lpSum(
            self.preventive_cost * x[i]
            + self.failure_cost * (1 - x[i]) * p_fail[i]
            for i in range(n)
        )

        # Constraint 1: Max concurrent maintenance jobs
        prob += pulp.lpSum(x) <= self.max_concurrent_jobs

        # Constraint 2: Force preventive if RUL is critically low
        for i in range(n):
            if rul[i] <= self.forced_maintenance_rul:
                prob += x[i] == 1

        status = prob.solve(pulp.PULP_CBC_CMD(msg=0))
        logger.info("MILP solver status: %s", pulp.LpStatus[status])

        if pulp.LpStatus[status] not in ("Optimal", "Feasible"):
            logger.warning("MILP infeasible — defaulting to RUL-priority greedy schedule.")
            return self._greedy_fallback(units, rul, p_fail)

        results = []
        for i, unit_id in enumerate(units):
            do_prev = bool(round(pulp.value(x[i])))
            cost = (
                self.preventive_cost if do_prev
                else self.failure_cost * p_fail[i]
            )
            results.append(
                ScheduleResult(
                    unit_id=str(unit_id),
                    do_preventive=do_prev,
                    maintenance_type="preventive" if do_prev else "corrective",
                    expected_cost=round(cost, 2),
                    failure_probability=p_fail[i],
                    rul_estimate=rul[i],
                )
            )

        n_preventive = sum(1 for r in results if r.do_preventive)
        logger.info(
            "Maintenance schedule: %d preventive | %d corrective",
            n_preventive, n - n_preventive,
        )
        return results

    def generate_report(
        self, results: List[ScheduleResult], predictions_df: pd.DataFrame
    ) -> str:
        """
        Generate a human-readable cost comparison report.

        Compares optimal schedule vs naive reactive strategy
        (maintain everything correctively).
        """
        optimal_cost = sum(r.expected_cost for r in results)
        naive_cost = sum(
            self.failure_cost * p
            for p in predictions_df["failure_probability"]
        )
        savings = naive_cost - optimal_cost
        savings_pct = 100 * savings / (naive_cost + 1e-8)

        lines = [
            "=" * 60,
            "MAINTENANCE OPTIMIZATION REPORT",
            "=" * 60,
            f"Units Analysed        : {len(results)}",
            f"Optimal Total Cost    : ${optimal_cost:,.2f}",
            f"Naive Reactive Cost   : ${naive_cost:,.2f}",
            f"Expected Savings      : ${savings:,.2f} ({savings_pct:.1f}%)",
            "-" * 60,
            f"{'Unit':<15} {'Type':>15} {'RUL':>8} {'P(fail)':>10} {'Cost':>12}",
            "-" * 60,
        ]

        for r in sorted(results, key=lambda r: r.rul_estimate):
            lines.append(
                f"{r.unit_id:<15} {r.maintenance_type:>15} {r.rul_estimate:>8.1f}"
                f" {r.failure_probability:>10.3f} ${r.expected_cost:>10,.2f}"
            )

        lines += ["=" * 60]
        report = "\n".join(lines)
        logger.info("%s", report)
        return report

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _greedy_fallback(
        self, units: List, rul: List[float], p_fail: List[float]
    ) -> List[ScheduleResult]:
        """Greedy fallback when MILP is infeasible: prioritise lowest RUL."""
        indexed = sorted(enumerate(zip(units, rul, p_fail)), key=lambda x: x[1][1])
        results = []
        budget = self.max_concurrent_jobs
        forced = {i for i, (_, r, _) in enumerate(zip(units, rul, p_fail)) if r <= self.forced_maintenance_rul}

        for i, (uid, r, pf) in indexed:
            do_prev = i in forced or (budget > 0 and pf > 0.5)
            if do_prev and i not in forced:
                budget -= 1
            cost = self.preventive_cost if do_prev else self.failure_cost * pf
            results.append(
                ScheduleResult(
                    unit_id=str(uid), do_preventive=do_prev,
                    maintenance_type="preventive" if do_prev else "corrective",
                    expected_cost=round(cost, 2), failure_probability=pf, rul_estimate=r,
                )
            )
        return results
