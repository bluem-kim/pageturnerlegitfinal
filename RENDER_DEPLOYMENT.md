# 🚀 Render Deployment Guide (ELI5)

This guide explains how to put your **Backend** on the internet using a service called **Render**. Think of Render as a big computer in the cloud that will run your code 24/7 so your app can work from anywhere.

---

## 🏗️ Step 1: Tell Render About Your Code

1.  **Push to GitHub**: Make sure all your latest code is on GitHub (we already did this!).
2.  **Go to Render**: Log in to [dashboard.render.com](https://dashboard.render.com).
3.  **New Web Service**: Click the **"New +"** button and pick **"Web Service"**.
4.  **Connect GitHub**: Find your `PageTurnerFinal` repository and click **"Connect"**.

---

## ⚙️ Step 2: Fill in the Settings

When Render asks for details, use these exactly:

-   **Name**: `pageturner-backend`
-   **Environment**: `Node`
-   **Region**: Pick the one closest to you (e.g., Singapore or Oregon).
-   **Branch**: `main`
-   **Root Directory**: `backend`  *(This is very important!)*
-   **Build Command**: `npm install`
-   **Start Command**: `npm start`

---

## 🔑 Step 3: Add Your "Secret Recipes" (Environment Variables)

Your app needs special keys to talk to the Database and Firebase. In Render, go to the **"Environment"** tab and click **"Add Environment Variable"** for each of these:

### 1. The Essentials
-   `MONGODB_URI`: Paste your MongoDB connection string here.
-   `JWT_SECRET`: Type a long, random sentence (like a super password).

### 2. Firebase (The tricky part)
-   `FIREBASE_PROJECT_ID`: Your Firebase project ID.
-   `FIREBASE_CLIENT_EMAIL`: From your Firebase service account JSON.
-   `FIREBASE_PRIVATE_KEY`: From your Firebase service account JSON private key (keep `\\n` escaped in Render).

Alternative single-var option:
-   `FIREBASE_SERVICE_ACCOUNT_JSON`: Paste the full Firebase service account JSON as one value.

### 3. Cloudinary (For Images)
-   `CLOUDINARY_CLOUD_NAME`: Your Cloudinary name.
-   `CLOUDINARY_API_KEY`: Your Cloudinary key.
-   `CLOUDINARY_API_SECRET`: Your Cloudinary secret.

---

- **`GLIBC_2.38` not found error**: 
  - This happens if Render uses a Node.js version that is too new for their current system (like Node 22) or if a package version (like `sqlite3` v6) requires a newer system library than Render provides.
  - **Fix**: 
    1. I've added an `engines` field in `backend/package.json` to force **Node 20 (LTS)**.
    2. I've downgraded `sqlite3` to **`^5.1.7`** for better compatibility with Render's Linux environment.

---

## 🚀 Step 4: Launch!

1.  Click **"Create Web Service"**.
2.  Wait a few minutes, then open the **Logs** tab in Render to watch startup output.
3.  Your backend is live when Render shows **"Your service is live"** and your app logs show something like `API running on http://0.0.0.0:<port>`.
4.  Seeing `GET / 404` in logs is normal because this API has no `/` route. Use `/api/v1/health` to test it.

---

## 🔗 Step 5: Connect Your Phone App

Once your backend is live, Render will give you a link like `https://pageturner-backend-o1h8.onrender.com`.

1.  Go to your **Frontend** code.
2.  Find the file where you set the API URL (usually `frontend/.env`).
3.  Change the URL to: `https://pageturner-backend-o1h8.onrender.com/api/v1/`

---

## ✅ Step 6: Check if it Works

Open this link in your browser: 
`https://pageturner-backend-o1h8.onrender.com/api/v1/health`

If you see `{"ok":true,"message":"API is healthy"}`, you did it! 🎉
