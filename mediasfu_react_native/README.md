# MediaSFU React Native (CLI) SpaceTek Initial Application

This MediaSFU React Native starter application demonstrates how to integrate and use the **MediaSFU** packages within a React Native project, enabling seamless development for both iOS and Android platforms. The application now supports integration with a dedicated backend service for managing spaces and user data.

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

This project establishes the groundwork for building a React Native application with MediaSFU capabilities. It integrates with a backend service to handle spaces and user data, offering improved functionality and scalability.

## Prerequisites

Before you begin, ensure you have the following installed:

- [**Node.js**](https://nodejs.org/) (v14 or later)
- [**npm**](https://www.npmjs.com/) (comes with Node.js) or [**Yarn**](https://yarnpkg.com/)
- [**React Native CLI**](https://reactnative.dev/docs/environment-setup)
- [**Xcode**](https://developer.apple.com/xcode/) (for iOS development, macOS only)
- [**Android Studio**](https://developer.android.com/studio) (for Android development)

## Getting Started

### Clone the Repository

If you haven't cloned the repository yet, do so now:

```bash
git clone https://github.com/MediaSFU/SpacesTekInitial.git
cd SpacesTekInitial/mediasfu_react_native
```

> **Note**: React Native may encounter issues when building from long path names. To avoid potential errors, it's recommended to copy the `mediasfu_react_native` folder to a shorter directory (e.g., `C:/Projects/mediasfu_react_native` on Windows) before proceeding with setup and builds.

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

#### For iOS

Ensure you have Xcode installed. Then, run:

```bash
npx react-native run-ios
```

#### For Android

Ensure you have an Android emulator running or a device connected. Then, run:

```bash
npx react-native run-android
```

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

4. Ensure the React Native application is configured to use the backend by updating `index.ts` in the `api` folder:

   ```typescript
   const USE_SERVER = true;
   const SERVER_URL = 'http://localhost:3001';
   ```

## Key Components

### Main Application (`App.tsx`)

Acts as the entry point for the app. Includes routing logic for navigation between pages such as `WelcomePage`, `SpacesList`, and `SpaceDetails`.

### Welcome Page (`WelcomePage.tsx`)

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

### Create Space (`CreateSpace.tsx`)

Enables users to create a new space with configurable options such as:

- Title, description, and capacity.
- Start time and duration.
- Saves data to the backend.

### Header (`Header.tsx`)

Provides a header bar for navigation and user profile display.

### Modal (`Modal.tsx`)

A reusable modal component for displaying additional information or capturing user actions, such as managing join and speak requests.

### Spinner (`Spinner.tsx`)

Displays a loading spinner for asynchronous operations.

## Troubleshooting

- **Port Already in Use**

  If port `8081` (default React Native port) is already in use, you can specify a different port by modifying the command:

  ```bash
  npx react-native start --reset-cache --port 8008
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

- **iOS Build Issues**

  Ensure that you have the latest Xcode installed and that you have accepted the Xcode license agreements:

  ```bash
  sudo xcodebuild -license
  ```

- **Android Build Issues**

  Ensure that your Android SDK is up to date and that the `ANDROID_HOME` environment variable is set correctly.

- **Metro Bundler Issues**

  If the Metro bundler hangs or crashes, try resetting the cache:

  ```bash
  npx react-native start --reset-cache
  ```

## Learn More

- [**React Native Documentation**](https://reactnative.dev/docs/getting-started)
- [**MediaSFU Documentation**](https://www.mediasfu.com/documentation/)
- [**Express.js Documentation**](https://expressjs.com/)
- [**React Native CLI**](https://reactnative.dev/docs/environment-setup)
- [**React Navigation**](https://reactnavigation.org/)

---

*Happy Coding with React Native and MediaSFU! 📱🎉*

