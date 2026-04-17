# Hybrid Deployment Guide: Vercel + Hugging Face Spaces

This guide walks you through deploying SentinelIQ in a completely free, highly-optimized, portfolio-ready architecture.

**Architecture Summary:**
*   **Frontend (UI + React Server):** Vercel (Hobby Tier - $0/mo)
*   **Backend (FastAPI + ML Models):** Hugging Face Spaces (Docker Free Tier - $0/mo)

---

## Phase 1: Deploying the Backend to Hugging Face Spaces

Hugging Face Spaces allows you to run Docker containers for free with 16GB of RAM, making it perfect for heavy Machine Learning inference APIs.

### 1. Set Up Your Hugging Face Space
1. Create a free account at [Hugging Face](https://huggingface.co/join).
2. Go to your profile and click **New Space**.
3. Fill out the configuration:
   - **Space name:** `sentineliq-api` (or any name you prefer)
   - **License:** MIT (or your choice)
   - **Select the Space SDK:** Choose **Docker** and select the **Blank** template.
   - **Space Hardware:** Select **Free** (2 vCPU, 16GB RAM).
4. Click **Create Space**.

### 2. Push Code to Hugging Face
Hugging Face acts exactly like a Git repository. 

1. On your local machine, open your terminal and navigate to the `sentinel-iq-cmpass-nasa-rul-prediction` directory.
2. Follow the remote addition commands shown on your blank Space's page. It will look something like this:
   ```bash
   git remote add hf https://huggingface.co/spaces/<your-username>/sentineliq-api
   ```
3. Because Hugging Face expects a `Dockerfile` at the root, ensure the provided `Dockerfile` and `requirements.txt` are pushed.
4. Push your repository to the HF remote:
   ```bash
   git push hf main
   ```

### 3. Verify the Backend Deployment
1. Go back to your Hugging Face space in the browser. It will say "Building". Once built, it will transition to "Running".
2. At the top of the space, click the three dots (`...`) and click **Embed this Space**. 
3. Note down the **Direct URL** provided (it looks like `https://<username>-sentineliq-api.hf.space`). 
4. Verify it works in your browser by visiting `https://<username>-sentineliq-api.hf.space/docs` to see the FastAPI Swagger UI.

---

## Phase 2: Deploying the Frontend to Vercel

Vercel will host the Next.js frontend and provide the edge caching layer. We've structured the codebase to handle Hugging Face cold starts gracefully.

### 1. Set Up Vercel
1. Create a free account at [Vercel](https://vercel.com/signup) using your GitHub repository.
2. Click **Add New** > **Project** and import your SentinelIQ GitHub repository.

### 2. Configure Vercel Build Settings
In the Vercel project configuration page, use the following settings before clicking "Deploy":

- **Framework Preset:** Next.js (Should be auto-detected)
- **Root Directory:** `frontend` (Crucial! The frontend is inside a subdirectory).

### 3. Configure Environment Variables
Still on the configuration page, click **Environment Variables** and add the following:

- **Key:** `NEXT_PUBLIC_ML_SERVER_URL`
- **Value:** `https://<username>-sentineliq-api.hf.space` (The Direct URL you grabbed from Hugging Face).

*Note: Ensure there is no trailing slash on the URL.*

### 4. Deploy
Click **Deploy**. Vercel will build the `frontend` directory and provide you with a live, secure `https` URL for your dashboard.

---

## Technical Edge-Cases to Know for Your Portfolio Showcase

Because you are using free tiers, Hugging Face will put your backend to "sleep" after 48 hours of inactivity. 

**Here is what happens when a client clicks your Vercel link while HF is sleeping:**
1. The user hits the landing page.
2. In the background, `page.tsx` silently fires a request to the HF Space.
3. Hugging Face begins spinning up a new Docker container and loading the PyTorch/TensorFlow models. This takes ~1-2 minutes.
4. If the user rushes into the dashboard and attempts a prediction before the engine is fully booted, Vercel will time out the request after 8-10 seconds.
5. **The Magic:** Your Next.js app has been configured to elegantly intercept this timeout, preventing an ugly 500 error page. Instead, it throws a simulated Error `503 Waking Up Hugging Face Space`, showing the user a professional message that the backend is booting.

This demonstrates massive architectural maturity to any hiring manager reviewing your code!
