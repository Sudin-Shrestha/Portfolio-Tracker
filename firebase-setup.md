# Firebase Integration Guide

This document outlines the steps to connect your portfolio and expense tracker application to Firebase, as well as the proposed database schema.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project** (or add a project).
3. Name your project (e.g., `portfolio-tracker`).
4. Enable **Firestore Database** in test mode or production mode.
5. Setup a Web App within your Firebase project. Under project settings, register your app and you will receive a `firebaseConfig` object.

## Step 2: Install Firebase

In your project directory, install the Firebase SDK:

```bash
npm install firebase
```

## Step 3: Initialize Firebase

Create a new file `src/lib/firebase.ts` (or `.js` depending on your setup) and initialize the SDK with the config object:

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Optional: if you plan to add user authentication

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
export const auth = getAuth(app); // if using Firebase Auth
```

## Step 4: Proposed Firestore Schema

Since the application tracks portfolios (Crypto, NEPSE) and expenses, here is an optimized NoSQL schema for Firestore:

### `users` Collection (Optional, if implementing Auth)
Each document represents a user.
- **Document ID**: `user_uid` (from Firebase Auth)
- **Fields**:
  - `email`: string
  - `createdAt`: timestamp

### `expenses` Collection
Stores individual expense records.
- **Document ID**: Auto-generated string
- **Fields**:
  - `userId`: string (reference to the user who owns this expense)
  - `description`: string (e.g., "Lunch")
  - `amount`: number
  - `category`: string (e.g., "Food")
  - `date`: timestamp (or ISO date string)
  - `createdAt`: timestamp

### `portfolios` Collection
Stores portfolio assets. You could keep separate collections for `crypto_assets` and `nepse_assets`, or combine them with a `type` field.
- **Document ID**: Auto-generated
- **Fields**:
  - `userId`: string
  - `tracker`: string ("crypto" or "nepal")
  - `asset`: string (e.g., "BTC" or "NABIL")
  - `quantity`: number
  - `buyPrice`: number
  - `coingeckoId`: string (optional, for crypto)
  - `createdAt`: timestamp

---

## Example: Saving an Expense to Firebase

To save an expense using the schema above, you can use the `addDoc` function from Firestore:

```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const addExpenseToFirebase = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(db, "expenses"), {
      ...expenseData,
      createdAt: new Date(),
      // userId: currUser.uid // Add this if you have user authentication
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};
```

## Summary
1. Initialize Firebase and Firestore.
2. Replace local storage reads/writes in hooks like `usePortfolio` and component states (in `ExpenseTracker.tsx`) with Firestore queries (`getDocs`, `onSnapshot`) and mutations (`addDoc`, `updateDoc`, `deleteDoc`).
3. If the app is used by multiple people, require Firebase Authentication so data is scoped to individual `uid`s.
