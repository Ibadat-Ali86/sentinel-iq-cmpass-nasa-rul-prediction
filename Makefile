# Makefile — SentinelIQ CLI shortcuts
# ─────────────────────────────────────────────────────────────────────────────
# All targets operate from the project root.
# Run: make <target>
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: install lint test train evaluate clean docker-up docker-down help notebooks

# ── Setup ─────────────────────────────────────────────────────────────────────

install:
	pip install -r requirements.txt
	pip install -e ".[dev]"
	@echo "✅ Dependencies installed"

# ── Code Quality ──────────────────────────────────────────────────────────────

lint:
	black src/ tests/ ml_server/ --line-length 100 --check
	isort src/ tests/ ml_server/ --check-only
	flake8 src/ tests/ ml_server/ --max-line-length 100
	@echo "✅ Lint passed"

lint-fix:
	black src/ tests/ ml_server/ --line-length 100
	isort src/ tests/ ml_server/
	@echo "✅ Auto-format applied"

# ── Testing ───────────────────────────────────────────────────────────────────

test:
	pytest tests/ -v --cov=src --cov-report=term-missing
	@echo "✅ Tests complete"

test-fast:
	pytest tests/ -v -x --ignore=tests/test_models.py
	@echo "✅ Fast test pass (model tests excluded)"

# ── Data ──────────────────────────────────────────────────────────────────────

download-data:
	python src/data/data_loader.py
	@echo "✅ Dataset downloaded to data/raw/"

# ── ML Pipeline ───────────────────────────────────────────────────────────────

train:
	python -m pipeline.sentineliq_ml_pipeline --config configs/training_config.yaml
	@echo "✅ Training complete — model saved to models/"

evaluate:
	python -m pipeline.sentineliq_ml_pipeline --config configs/training_config.yaml --evaluate-only
	python src/visualization/visualize.py
	@echo "✅ Evaluation and figures saved to reports/figures/"

notebooks:
	jupyter nbconvert --to notebook --execute --ExecutePreprocessor.kernel_name=sentineliq notebooks/01_data_exploration.ipynb
	jupyter nbconvert --to notebook --execute --ExecutePreprocessor.kernel_name=sentineliq notebooks/02_feature_engineering.ipynb
	jupyter nbconvert --to notebook --execute --ExecutePreprocessor.kernel_name=sentineliq notebooks/03_model_evaluation.ipynb
	@echo "✅ Notebooks executed"

# ── API Server ────────────────────────────────────────────────────────────────

api:
	uvicorn ml_server.main:app --reload --host 0.0.0.0 --port 8000

api-prod:
	uvicorn ml_server.main:app --host 0.0.0.0 --port 8000 --workers 4

# ── Docker ────────────────────────────────────────────────────────────────────

docker-up:
	docker-compose up -d --build
	@echo "✅ All services started"

docker-down:
	docker-compose down
	@echo "✅ All services stopped"

docker-logs:
	docker-compose logs -f

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
	find . -name ".coverage" -delete
	@echo "✅ Cache and compiled files removed"

clean-all: clean
	find . -type d -name "*.egg-info" -delete
	rm -rf dist/ build/
	@echo "✅ Full clean complete"

# ── Security ──────────────────────────────────────────────────────────────────

security-scan:
	pip install detect-secrets --quiet
	detect-secrets scan
	@echo "✅ Secret scan complete — review .secrets.baseline for findings"

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "SentinelIQ Makefile Targets"
	@echo "────────────────────────────────────────"
	@echo "  install        Install all dependencies"
	@echo "  lint           Run black + isort + flake8 checks"
	@echo "  lint-fix       Auto-format all source files"
	@echo "  test           Run test suite with coverage"
	@echo "  test-fast      Run tests excluding model tests"
	@echo "  download-data  Download NASA C-MAPSS dataset"
	@echo "  train          Train TCN ensemble pipeline"
	@echo "  evaluate       Evaluate model + generate figures"
	@echo "  notebooks      Execute all notebooks headlessly"
	@echo "  api            Start FastAPI dev server"
	@echo "  api-prod       Start FastAPI production server"
	@echo "  docker-up      Build and start all Docker services"
	@echo "  docker-down    Stop all Docker services"
	@echo "  clean          Remove .pyc files and caches"
	@echo "  security-scan  Scan for accidentally committed secrets"
	@echo "────────────────────────────────────────"
