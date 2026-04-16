# Contributing to SentinelIQ

Thank you for your interest in contributing to SentinelIQ — an industrial-grade predictive maintenance platform built on the NASA C-MAPSS dataset.

## Code of Conduct

All contributors are expected to follow respectful, professional conduct in all project spaces (issues, PRs, discussions). Harassment of any form is not tolerated.

---

## How to Contribute

### Reporting Bugs

Open a GitHub Issue with:
- **Description**: What went wrong and where
- **Reproduction steps**: Exact commands and environment details
- **Expected vs actual behavior**: What should have happened
- **Environment**: OS, Python version, GPU/CPU, relevant package versions

### Suggesting Enhancements

Open an Issue with the label `enhancement`. Include:
- The use case this solves
- The proposed solution (implementation sketch optional but welcome)
- Alternative approaches you considered

### Pull Requests

1. **Fork** the repository and clone your fork
2. Create a **feature branch**: `git checkout -b feat/your-feature-name`
3. Follow the code quality standards below
4. **Add tests** for all new or changed functionality
5. Run the full test suite: `pytest tests/ --cov=src`
6. Run the linter: `make lint`
7. Commit using **Conventional Commits** format (see below)
8. Push and open a PR against `main`

---

## Development Setup

```bash
# 1. Clone your fork
git clone https://github.com/your-handle/sentinel-iq-cmpass-nasa-rul-prediction.git
cd sentinel-iq-cmpass-nasa-rul-prediction

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate    # Linux/macOS
# .venv\Scripts\activate     # Windows

# 3. Install with dev dependencies
pip install -e ".[dev]"

# 4. Download the NASA C-MAPSS dataset
# See data/README.md for instructions
```

---

## Commit Message Format (Conventional Commits)

```
<type>(<scope>): <subject>

Body (optional — explain what and why, not how)
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature or model |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration changes |
| `chore` | Maintenance tasks (dependency bumps, etc.) |

**Examples:**

```bash
feat(models): add multi-task failure mode classification head
fix(features): handle zero-variance sensors in FD002/FD004
docs(readme): add benchmark comparison table
perf(training): reduce memory usage via chunked data loading
test(evaluator): add unit tests for NASA asymmetric score function
```

---

## Code Style

- **Formatter**: `black` (line length 100)
- **Import sort**: `isort`
- **Linter**: `flake8`
- **Type annotations**: Required on all public functions
- **Docstrings**: NumPy or Google style

Run all checks:

```bash
make lint
```

---

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=term-missing

# Run a specific test file
pytest tests/test_models.py -v
```

Tests that require the dataset are marked with `pytest.skip()` and are excluded from CI unless data is available.

---

## Branching Strategy

```
main          ← stable, always deployable
develop       ← integration branch
feat/*        ← feature branches (from develop)
fix/*         ← bug fix branches
docs/*        ← documentation only
```

---

## Project Maintainers

Open an issue for questions rather than direct messages. All technical discussions should be public so the community can benefit.
