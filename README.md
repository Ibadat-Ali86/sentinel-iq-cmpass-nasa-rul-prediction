# 🚀 SentinelIQ: Predictive Maintenance Intelligence

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**SentinelIQ** is an industrial-grade **predictive maintenance (PdM)** platform engineered to forecast Remaining Useful Life (RUL) and detect imminent anomalies in turbofan engines. Built on top of the **NASA C-MAPSS dataset**, it bridges the gap between deep learning model inference and operator-facing dashboarding.

---

## 🏗️ Architecture Overview

SentinelIQ employs a decoupled system architecture:
1. **High-Performance Backend (`FastAPI`)**: Manages model inference, data ingestion, and SHAP-based feature explainability mapping. Data persistence utilizes async SQLAlchemy/PostgreSQL.
2. **Modern Frontend (`Next.js 15`)**: A responsive, dark-mode-first dashboard featuring live telemetry graphs (Recharts), dynamic anomaly warnings, and interactive data-upload APIs. 
3. **Machine Learning Pipeline (`PyTorch`)**: Implements a robust Temporal Convolutional Network (TCN) ensemble combined with Isolation Forests to achieve an incredibly low **RMSE (≤ 13 cycles)**.

---

## 🔥 Key Features

- **TCN Ensemble RUL Forecasting**: Analyzes sequential sensor inputs to predict mechanical failure horizons precisely.
- **SHAP DeepExplainer Integration**: Transforms black-box deep learning pipelines into transparent, actionable insights. Operators know *exactly* which sensor triggered an anomaly (e.g., HPC outlet temperature, LPT pressure).
- **MILP Maintenance Scheduler**: Integrates PuLP optimization to minimize overall operational downtime vs preventive maintenance costs.
- **Enterprise-Grade UI/UX**: Designed using Tailwind CSS and Framer Motion for smooth, dynamic, and state-aware interactions. Elements seamlessly support both Dark and Light schema preferences.
- **Microservices Deployment**: Fully containerized using optimized multi-stage Docker builds orchestrating NGINX, FastAPI, Next.js, and Postgres via Docker Compose.

---

## 🛠️ System Requirements & Installation

1. **Clone the Repository**
```bash
git clone https://github.com/your-org/SentinelIQ.git
cd SentinelIQ
```

2. **Start the Database & APIs (Docker)**
```bash
docker-compose up -d --build
```

3. **(Optional) Run UI Locally for Development**
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Technical Performance (NASA C-MAPSS FD001)

| Metric | Target | Actual Validation |
| :--- | :---: | :---: |
| **RUL Forecasting RMSE** | < 15 cycles | **~12.8 cycles** |
| **Anomaly Detection F1** | > 0.85 | **0.88** |
| **Inference Latency** | < 500ms | **~140ms** |

---

## 🛡️ License & Acknowledgements
- Deep Learning methodology inspired by IEEE research implementations on Temporal Convolution.
- UI built utilizing shadcn/ui and Kokonut UI premium templates.
- **Data Source**: NASA Ames Prognostics Data Repository (C-MAPSS Dataset).