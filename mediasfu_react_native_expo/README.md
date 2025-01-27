# MediaSFU React Native (Expo) SpaceTek Initial Application

This MediaSFU React Native Expo starter application demonstrates how to integrate and use the **MediaSFU** packages within an Expo-managed React Native project, simplifying development and deployment processes.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Clone the Repository](#clone-the-repository)
  - [Install Dependencies](#install-dependencies)
  - [Run the Application](#run-the-application)
  - [Set Up the Backend](#set-up-the-backend)
- [Key Components](#key-components)
- [Troubleshooting](#troubleshooting)
- [Learn More](#learn-more)

## Overview

This project establishes the groundwork for building an Expo-based React Native application with MediaSFU capabilities. It integrates with a backend service to handle spaces and user data, offering improved functionality and scalability.

## Prerequisites

Before you begin, ensure you have the following installed:

- [**Node.js**](https://nodejs.org/) (v14 or later)
- [**npm**](https://www.npmjs.com/) (comes with Node.js) or [**Yarn**](https://yarnpkg.com/)
- [**Expo CLI**](https://docs.expo.dev/get-started/installation/)
- [**Expo Go**](https://expo.dev/client) app installed on your iOS or Android device (optional, for testing on physical devices)

## Getting Started

### Clone the Repository

If you haven't cloned the repository yet, do so now:

```bash
git clone https://github.com/MediaSFU/SpacesTekInitial.git
cd SpacesTekInitial/mediasfu_expo
```

### Install Dependencies

Using **npm**:

```bash
npm install
```

Or using **Yarn**:

```bash
yarn install
```

### Run the Application

Start the Expo development server:

```bash
npx expo start
```

This will open the Expo Dev Tools in your browser. From here, you can:

- **Run on Web**: Press `w`
- **Run on Android Emulator**: Press `a`
- **Run on iOS Simulator**: Press `i` (macOS only)
- **Run on Physical Device**: Scan the QR code using the Expo Go app

The application should now be running on your selected device or emulator.

### Set Up the Backend

1. Navigate to the `backend` folder in the repository:

   ```bash
   cd ../backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the backend server:

  ```bash
  npm start
  ```

  Alternatively, you can run the server using Node.js:

   ```bash
   node index.js
   ```

   The backend server will start at `http://localhost:3001`.

4. Ensure the Expo application is configured to use the backend by updating `index.ts` in the `api` folder:

   ```typescript
   const USE_SERVER = true;
   const SERVER_URL = 'http://localhost:3001';
   ```

## Key Components

### Root Layout (`_layout.tsx`)

Defines the app's theme and navigation stack. It includes routes for:

- `/welcome`: Displays the `WelcomePage`.
- `/`: Lists all available spaces (`SpacesList` component).
- `/create-space`: Allows users to create a new space (`CreateSpace` component).
- `/space/[spaceId]`: Displays detailed information about a specific space (`SpaceDetails` component).

### Welcome Page (`welcome.tsx`)

Allows users to select or create a profile. Key features include:

- Displaying available user profiles fetched from the backend.
- Creating a new profile with a display name and optional avatar URL.

### Spaces List (`SpacesList.tsx`)

Lists available spaces, offering search and filter options. Users can:

- View, join, or request to join spaces.
- Navigate between spaces using pagination.
- Data is fetched from the backend in real-time.

### Space Details (`SpaceDetails.tsx`)

Displays detailed information about a space, including:

- Title and description.
- Participant management.
- Controls for joining, leaving, or ending a space.
- Integrates with backend API for real-time updates.

### Create Space (`create-space.tsx`)

Enables users to create a new space with configurable options such as:

- Title, description, and capacity.
- Start time and duration.
- Saves data to the backend.

### Require Profile Wrapper (`RequireProfile.tsx`)

Ensures users have selected a profile before accessing other pages. Redirects to the `WelcomePage` if no profile is found.

### Participant Card (`ParticipantCard.tsx`)

Displays individual participant details, including:

- User roles (e.g., host, speaker).
- Audio status.
- Actions like muting or removing participants.

### Spinner (`Spinner.tsx`)

Displays a loading spinner for asynchronous operations.

## Troubleshooting

- **Expo CLI Not Found**

  If you encounter an error related to Expo CLI, install it globally:

  ```bash
  npm install -g expo-cli
  ```

- **Backend Server Issues**

  Ensure the backend server is running at `http://localhost:3001`. If you encounter issues, verify the following:

  - Dependencies are installed in the `backend` folder.
  - No other process is using port `3001`.

- **Dependency Issues**

  If you encounter issues during installation, try deleting `node_modules` and reinstalling:

  ```bash
  rm -rf node_modules
  npm install
  ```

  Or with Yarn:

  ```bash
  rm -rf node_modules
  yarn install
  ```

- **Metro Bundler Issues**

  If the Metro bundler hangs or crashes, try resetting the cache:

  ```bash
  npx expo start -c
  ```

## Learn More

- [**Expo Documentation**](https://docs.expo.dev/)
- [**React Native Documentation**](https://reactnative.dev/docs/getting-started)
- [**MediaSFU Documentation**](https://www.mediasfu.com/documentation/)
- [**Express.js Documentation**](https://expressjs.com/)
- [**React Navigation**](https://reactnavigation.org/)
- [**AsyncStorage Documentation**](https://react-native-async-storage.github.io/async-storage/)

---

*Happy Coding with Expo and MediaSFU! 🚀📱*

