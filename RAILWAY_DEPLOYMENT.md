# Railway Cloud Backend Deployment Guide

This guide describes how to deploy the Node.js Express and Socket.io backend to **Railway**, while keeping the frontend hosted on **Netlify**.

---

## 1. Prepare Your Environment
Make sure you have:
- A GitHub account holding your **`Veloop_rewards`** repository.
- A free account on [Railway](https://railway.app/).
- A free MongoDB Atlas cluster ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas)).

---

## 2. Deploy Backend on Railway

1. Go to your [Railway Dashboard](https://railway.app/) and click **New Project** ➜ **Deploy from GitHub repo**.
2. Select your cloned **`Veloop_rewards`** repository.
3. Once imported, click on the **Service Card** (by default named after your repo).
4. Go to **Settings** and modify:
   * **Root Directory:** `backend`
   * **Start Command:** `npm start`
5. Go to the **Variables** tab and click **New Variable** to add the following variables:
   * `MONGODB_URI` ➜ Set this to your MongoDB Atlas connection string (e.g. `mongodb+srv://sullagaddi55_db_user:2005@...`).
   * `JWT_SECRET` ➜ Set this to a long random secret key.
   * `NODE_ENV` ➜ `production`
   * `PORT` ➜ `5000` (Railway will automatically handle port binding to its internal routing using this value).
6. Go to **Settings** ➜ **Networking** and click **Generate Domain** (or set up a custom subdomain).
7. Copy the generated domain (e.g. `https://veloop-backend.up.railway.app`). This is your new backend API URL.

---

## 3. Configure Frontend on Netlify

1. Go to your [Netlify Dashboard](https://app.netlify.com/).
2. Select your frontend site, go to **Site Configuration** ➜ **Environment Variables**.
3. Create/update the following environment variables:
   * `VITE_API_URL` ➜ Set to your generated Railway API domain (e.g., `https://veloop-backend.up.railway.app`).
   * `VITE_SOCKET_URL` ➜ Set to your generated Railway API domain (same as above).
4. Trigger a new deployment on Netlify to build the frontend with the correct environment variables.

Your frontend on Netlify will now communicate directly and securely with your backend on Railway!
