# MediaSFU Angular SpaceTek Initial Application

This Angular project serves as the foundation for future MediaSFU integration. It focuses on the initial structure and setup, providing components and services to handle basic application functionalities without actual media integration logic.

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

This project establishes the groundwork for building an Angular application with MediaSFU capabilities. The current focus is on creating reusable components and basic application logic, which will later be extended to include full MediaSFU integration.

## Prerequisites

Before you begin, ensure you have the following installed:

- [**Node.js**](https://nodejs.org/) (v14 or later)
- [**npm**](https://www.npmjs.com/) (comes with Node.js) or [**Yarn**](https://yarnpkg.com/)
- [**Angular CLI**](https://angular.io/cli)

## Getting Started

### Clone the Repository

If you haven't cloned the repository yet, do so now:

```bash
git clone https://github.com/MediaSFU/SpacesTekInitial.git
cd SpacesTekInitial/mediasfu_angular
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
ng serve
```

Navigate to `http://localhost:4200/` in your web browser. The application will automatically reload if you change any of the source files.

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

  Alternatively, you can run the backend server using Node.js directly:

   ```bash
   node index.js
   ```

  The backend server will start at `http://localhost:3001`.

4. Ensure the Angular application is configured to use the backend by updating `api.service.ts`:

   ```typescript
   const USE_SERVER = true;
   const SERVER_URL = 'http://localhost:3001';
   ```

## Key Components

### App Component (`app.component.ts` and `app.component.html`)

Acts as the root component, hosting the router outlet and providing a base layout for navigation and content rendering.

### Welcome Component (`welcome.component.ts` and `welcome.component.html`)

Enables user profile selection or creation. Key features include:

- Displaying available user profiles fetched from the backend.
- Allowing users to create a new profile with a display name and optional avatar URL.

### Spaces List Component (`spaces-list.component.ts` and `spaces-list.component.html`)

Lists available spaces, offering search and filter options. Users can:

- View, join, or request to join spaces.
- Navigate between spaces using pagination.
- Data is fetched from the backend in real-time.

### Space Card Component (`space-card.component.ts` and `space-card.component.html`)

Displays details of a single space, such as title, description, and status. Includes actions like:

- Joining or requesting to join a space.
- Viewing details for scheduled or ended spaces.

### Space Details Component (`space-details.component.ts` and `space-details.component.html`)

Displays detailed information about a space, including:

- Title and description.
- Participant management.
- Controls for joining, leaving, or ending a space.
- Integrates with backend API for real-time updates.

### Modal Component (`app-modal`)

A reusable modal component for displaying additional information or capturing user actions, such as managing join and speak requests.

### Spinner Component (`app-spinner`)

Provides a loading indicator for asynchronous operations.

### Routing Configuration (`app.routes.ts`)

Defines navigation routes for the application, such as:

- `/welcome`: Renders the Welcome Component.
- `/spaces`: Renders the Spaces List Component.
- `/space/:id`: Renders the Space Details Component.

## Troubleshooting

- **Angular CLI Not Found**

  If you encounter an error related to Angular CLI, install it globally:

  ```bash
  npm install -g @angular/cli
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

- **Port Already in Use**

  If port `4200` is already in use, specify a different port:

  ```bash
  ng serve --port 4300
  ```

## Learn More

- [**Angular Documentation**](https://angular.io/docs)
- [**Angular CLI**](https://angular.io/cli)
- [**Express.js Documentation**](https://expressjs.com/)
- [**Angular Material**](https://material.angular.io/) (if applicable)

---

*Happy Coding with Angular and MediaSFU! 🚀*


