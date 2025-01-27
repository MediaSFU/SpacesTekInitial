# MediaSFU React SpaceTek Initial Application

This React project serves as the foundation for future MediaSFU integration. It focuses on the initial structure and setup, providing components and services to handle basic application functionalities without actual media integration logic.

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

This project establishes the groundwork for building a React application with MediaSFU capabilities. The current focus is on creating reusable components and basic application logic, which will later be extended to include full MediaSFU integration.

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** (v14 or later)
- **[npm](https://www.npmjs.com/)** (comes with Node.js) or **[Yarn](https://yarnpkg.com/)**
- **[React.js](https://reactjs.org/)**

## Getting Started

### Clone the Repository

If you haven't cloned the repository yet, do so now:

```bash
git clone https://github.com/MediaSFU/SpacesTekInitial.git
cd SpacesTekInitial/mediasfu_reactjs
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

Start the development server:

```bash
npm start
```

Navigate to `http://localhost:3000/` in your web browser. The application will automatically reload if you change any of the source files.

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

    Alternatively, you can run the following commands to start the backend server:

   ```bash
   node index.js
   ```

   The backend server will start at `http://localhost:3001`.

4. Ensure the React application is configured to use the backend by updating `index.ts` in the `api` folder:

   ```javascript
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

- **React.js Issues**

  Ensure that you have a compatible version of React.js installed. Check the version by running:

  ```bash
  npm list react
  ```

- **Backend Server Issues**

  Ensure the backend server is running at `http://localhost:3001`. If you encounter issues, verify the following:

  - Dependencies are installed in the `backend` folder.
  - No other process is using port `3001`.

- **Dependency Conflicts**

  If you encounter dependency conflicts, try running:

  ```bash
  npm update
  ```

- **Build Failures**

  Clean the build cache and rebuild:

  ```bash
  npm run clean
  npm install
  npm start
  ```

- **Port Already in Use**

  If port `3000` is already in use, specify a different port:

  ```bash
  PORT=3001 npm start
  ```

## Learn More

- **[React.js Documentation](https://reactjs.org/docs/getting-started.html)**
- **[JavaScript Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**
- **[MediaSFU Documentation](https://www.mediasfu.com/documentation/)**
- **[Express.js Documentation](https://expressjs.com/)**
- **[React Router](https://reactrouter.com/)**

---

*Happy Coding with React.js and MediaSFU! 🚀🌐*

