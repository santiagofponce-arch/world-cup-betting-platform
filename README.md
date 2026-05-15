# World Cup 2026 Betting Platform

A full-stack React application for managing a friendly betting pool (polla) for the 2026 World Cup. Built with Vite, React, and Firebase.

## Features
- **User Authentication:** Secure login using Firebase Auth.
- **Live Betting Interface:** Users can submit and manage their predictions.
- **Real-time Updates:** Uses Firestore for fast, real-time data syncing.
- **Rules Modal:** Custom React Portal implementation to display the official rules.
- **Responsive Design:** Works smoothly across desktop and mobile devices.

## Tech Stack
- **Frontend:** React, Vite, Vanilla CSS
- **Backend & Database:** Firebase (Auth, Firestore)

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd world-cup-friendly-bets
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in your Firebase project credentials.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## Firebase Setup
If you are setting this up from scratch, you will need a Firebase project:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable Firestore and Authentication.
3. Grab your web app config keys and place them in the `.env` file.
