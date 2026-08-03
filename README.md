# AniCharDoku

Ani Char Doku is a full-stack anime character sudoku app built with React, Vite, TypeScript, Express, and Firebase. It lets users browse anime and character records, register or edit entries, manage traits, view profiles, and play a Sudoku with the registered data.

## Features

- Browse anime and character collections
- Register, edit, and remove database entries
- Manage traits and app configuration
- Authenticated user profiles and admin-oriented views
- Sudoku gameplay page
- Backend API with MyAnimeList proxy support and Firebase persistence

## Tech Stack

- Frontend: React, Vite, TypeScript
- Backend: Express + TypeScript
- Data: Firebase / Firestore
- Deployment: Vercel-ready with API rewrites

## Getting Started

1. Install dependencies:
   ```bash
   npm install

2. Create a local environment file from the example.

3. Fill in the required environment variables for the MyAnimeList proxy and Firebase connection.

4. Start the frontend:
    ```bash
    npm run dev:frontend

5. Start the backend in a second terminal:
    ```bash
    npm run dev:backend

The frontend will run at http://localhost:5173, and the API will be available on http://localhost:3001.

### Available Scripts:

    npm run dev:frontend — start the Vite frontend
    npm run dev:backend — start the Express backend
    npm run build — build the frontend for production
    npm run vercel-build — build the API bundle and frontend for Vercel
    npm run preview — preview the production frontend build
    
### Environment Variables
The project expects the following variables in .env:

    MAL_PROXY_API_BASE_URL
    FIREBASE_PROJECT_ID
    FIREBASE_CLIENT_EMAIL
    FIREBASE_PRIVATE_KEY
    FIRESTORE_API_KEY
    FIRESTORE_AUTH_DOMAIN
    FIRESTORE_PROJECT_ID
    FIRESTORE_STORAGE_BUCKET
    FIRESTORE_MESSAGING_SENDER_ID
    FIRESTORE_APP_ID
    FIRESTORE_DATABASE_ID
    FIRESTORE_MEASUREMENT_ID

## Project Structure

    src/ — React frontend application
    server/ — Express backend, routes, and models
    shared/ — shared TypeScript types and utilities
    public/ — static assets

## License
ISC