# 📱 Frontend Deployment Guide (ELI5)

This guide explains how to turn your project into a real app that you can install on a phone. We use a tool called **EAS** (Expo Application Services) to do the "heavy lifting" of building the app in the cloud.

---

## 🏗️ Step 1: The Basics

1.  **Backend First**: Your backend must be live on Render before you do this! (See `RENDER_DEPLOYMENT.md`).
2.  **Expo Account**: You need an account at [expo.dev](https://expo.dev).
3.  **Install EAS**: Run this in your terminal to get the build tool:
    ```bash
    npm install -g eas-cli
    ```

---

## ⚙️ Step 2: Setup Your Project

Go into your frontend folder:
```bash
cd frontend
npx eas login
npx eas build:configure
```
*(This creates an `eas.json` file which is like a settings menu for your builds.)*

---

## 🔑 Step 3: Add Your "Secret Recipes" to the Cloud

Just like Render, EAS needs to know your API URL and Firebase keys. 

1. Go to your [Expo Dashboard](https://expo.dev).
2. Find your project -> **Project Settings** -> **Environment Variables**.
3. Add these variables (copy the values from your `frontend/.env`):

- `EXPO_PUBLIC_BASE_API_URL`: `https://pageturner-backend-o1h8.onrender.com/api/v1/`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: (Your Google ID)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: (Your Google ID)

---

## 🚀 Step 4: Build the App!

Run this command to start the build in the cloud:

### For Testing (APK file you can install directly)
```bash
npx eas build --platform android --profile preview
```

### For the Play Store (AAB file)
```bash
npx eas build --platform android --profile production
```

---

## 📥 Step 5: Install it!

1.  Wait for the build to finish (it takes about 10-15 minutes).
2.  EAS will give you a link or a QR code.
3.  Scan the QR code with your phone to download the **APK** file.
4.  Open the file on your Android phone to install your app! 🎉

---

## ✅ Important Checklist

-   **Check the URL**: Make sure `EXPO_PUBLIC_BASE_API_URL` starts with `https://` and points to Render, not `192.168...` (your local computer).
-   **Google Services**: Your `google-services.json` must be inside the `frontend/` folder before you build.
-   **App ID**: Your app's unique name is `com.maria.pageturnerapp`. This must match what you set in the Firebase Console!

---

## 🆘 Common Problems

-   **App can't talk to Backend**: You probably forgot to update the Environment Variable in the Expo Dashboard.
-   **Google Login fails**: You need to add the "SHA-1 fingerprint" from your EAS build to your Firebase settings.
