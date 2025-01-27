# MediaSFU Flutter SpaceTek Initial Application

This Flutter project serves as the foundation for future MediaSFU integration. It focuses on the initial structure and setup, providing components and services to handle basic application functionalities without actual media integration logic.

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

This project establishes the groundwork for building a Flutter application with MediaSFU capabilities. The current focus is on creating reusable components and basic application logic, which will later be extended to include full MediaSFU integration.

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Flutter SDK](https://flutter.dev/docs/get-started/install)** (version 2.0 or later)
- **[Dart SDK](https://dart.dev/get-dart)** (comes with Flutter)
- **[Android Studio](https://developer.android.com/studio)** or **[Xcode](https://developer.apple.com/xcode/)** (for iOS development)
- **[VS Code](https://code.visualstudio.com/)** or **[Android Studio](https://developer.android.com/studio)** (recommended IDEs)

## Getting Started

### Clone the Repository

If you haven't cloned the repository yet, do so now:

```bash
git clone https://github.com/MediaSFU/SpacesTekInitial.git
cd SpacesTekInitial/mediasfu_flutter
```

### Install Dependencies

Fetch the required packages using Flutter's package manager:

```bash
flutter pub get
```

### Run the Application

#### On an Emulator or Physical Device

1. **Start an Emulator**: Launch an Android emulator or connect a physical device.
2. **Run the App**:

   ```bash
   flutter run
   ```

#### On Web (Optional)

To run the app on a web browser:

```bash
flutter run -d chrome
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
   node index.js
   ```

   The backend server will start at `http://localhost:3001`.

4. Ensure the Flutter application is configured to use the backend by updating `api.dart`:

   ```dart
   const USE_SERVER = true;
   const SERVER_URL = 'http://localhost:3001';
   ```

## Key Components

### Main Application (`main.dart`)

Acts as the entry point for the app. Includes routing logic for navigation between pages such as `WelcomePage`, `SpacesList`, and `SpaceDetails`.

### Welcome Page (`welcome.dart`)

Allows users to select or create a profile. Key features include:

- Displaying available user profiles fetched from the backend.
- Creating a new profile with a display name and optional avatar URL.

### Spaces List (`spaces_list.dart`)

Lists available spaces, offering search and filter options. Users can:

- View, join, or request to join spaces.
- Navigate between spaces using pagination.
- Data is fetched from the backend in real-time.

### Space Details (`space_details.dart`)

Displays detailed information about a space, including:

- Title and description.
- Participant management.
- Controls for joining, leaving, or ending a space.
- Integrates with backend API for real-time updates.

### Create Space (`create_space.dart`)

Enables users to create a new space with configurable options such as:

- Title, description, and capacity.
- Start time and duration.
- Saves data to the backend.

### Header (`header.dart`)

Provides a header bar for navigation and user profile display.

### Custom Modal (`custom_modal.dart`)

A reusable modal component for displaying additional information or capturing user actions, such as managing join and speak requests.

### Spinner (`spinner.dart`)

Displays a loading spinner for asynchronous operations.

## Troubleshooting

- **Flutter SDK Issues**

  Ensure that the Flutter SDK is correctly installed and added to your system's `PATH`. Verify by running:

  ```bash
  flutter doctor
  ```

  Address any issues highlighted by the `flutter doctor` command.

- **Backend Server Issues**

  Ensure the backend server is running at `http://localhost:3001`. If you encounter issues, verify the following:

  - Dependencies are installed in the `backend` folder.
  - No other process is using port `3001`.

- **Dependency Conflicts**

  If you encounter dependency conflicts, try running:

  ```bash
  flutter pub upgrade
  ```

- **Build Failures**

  Clean the build cache and rebuild:

  ```bash
  flutter clean
  flutter pub get
  flutter run
  ```

- **iOS Build Issues**

  Ensure that you have the latest Xcode installed and that you have accepted the Xcode license agreements:

  ```bash
  sudo xcodebuild -license
  ```

- **Android Build Issues**

  Ensure that your Android SDK is up to date and that the `ANDROID_HOME` environment variable is set correctly.

## Learn More

- **[Flutter Documentation](https://flutter.dev/docs)**
- **[Dart Documentation](https://dart.dev/guides)**
- **[MediaSFU Documentation](https://www.mediasfu.com/documentation/)**
- **[Express.js Documentation](https://expressjs.com/)**
- **[Flutter Packages](https://pub.dev/)**

---

*Happy Coding with Flutter and MediaSFU! 🚀📱*

