# PageTurner - Book Store Application

PageTurner is a full-stack book store application built with **React Native (Expo)** for the frontend and **Node.js (Express)** for the backend. It uses **MongoDB** as the primary database and **Cloudinary** for image storage.

## 📁 Project Structure

- `backend/`: Node.js Express API.
- `frontend/`: React Native mobile application using Expo.

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Expo Go](https://expo.dev/expo-go) app on your mobile device (for testing the frontend)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database) account

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env  # Then fill in your keys
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env  # Then fill in your local IP address
npx expo start
```

---

## 🌐 Deployment

For instructions on how to deploy:
- **Backend (Render)**: 👉 [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)
- **Frontend (Expo/EAS)**: 👉 [FRONTEND_DEPLOYMENT.md](FRONTEND_DEPLOYMENT.md)

---

## 🔒 Security & Secrets

The following files are excluded from this repository for security reasons and must be manually provided on each new setup:

- `backend/.env`
- `frontend/.env`
- `backend/src/utils/firebase-service-account.json`
- `frontend/google-services.json`

Check the `.env.example` files in each directory for the required fields.

---

## 🛠️ Features
- **User Authentication**: Secure login and registration.
- **Product Management**: Browse, search, and filter books.
- **Cart & Checkout**: Manage items and place orders.
- **Admin Dashboard**: Manage categories, products, and orders.
- **Image Upload**: Seamless integration with Cloudinary.
- **Push Notifications**: Real-time order updates.
