# MediaSFU SpacesTek Backend Service

This backend service provides an API for managing spaces and user data. It is built with **Express.js** and uses a JSON file (`db.json`) as its data store.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup and Run](#setup-and-run)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Learn More](#learn-more)

## Overview

The backend service enables basic CRUD operations for spaces and users. It is designed to support the MediaSFU applications by serving as a lightweight JSON-based backend.

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** (v14 or later)
- **[npm](https://www.npmjs.com/)** (comes with Node.js)

## Setup and Run

### Clone the Repository

If you haven't cloned the repository yet, do so now:

```bash
git clone https://github.com/MediaSFU/SpacesTekInitial.git
cd SpacesTekInitial/backend
```

### Install Dependencies

Install the required packages using npm:

```bash
npm install
```

### Start the Server

Run the server:

```bash
npm start
```

Alternatively, you can run the server using Node.js:

```bash
node index.js
```

The server will start at `http://localhost:3001`.

## API Endpoints

### Base URL

`http://localhost:3001/api`

### Endpoints

#### **GET** `/read`
- **Description**: Fetches all spaces and user data.
- **Response**:
  ```json
  {
    "spaces": [...],
    "users": [...]
  }
  ```

#### **POST** `/write`
- **Description**: Updates spaces and user data.
- **Request Body**:
  ```json
  {
    "spaces": [...],
    "users": [...]
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "success": true
  }
  ```

## Project Structure

```plaintext
backend/
├── db.json          # JSON file storing spaces and user data
├── index.js         # Main server file
├── package.json     # Project metadata and dependencies
```

## Troubleshooting

- **CORS Issues**
  Ensure that the `cors` middleware is enabled to allow cross-origin requests:
  ```javascript
  app.use(cors());
  ```

- **Port Conflicts**
  If port `3001` is already in use, specify a different port in `index.js`:
  ```javascript
  const PORT = 4000;
  ```

- **File Permission Errors**
  Ensure that the `db.json` file has proper read and write permissions.

## Learn More

- [**Express.js Documentation**](https://expressjs.com/)
- [**CORS Middleware**](https://www.npmjs.com/package/cors)
- [**Node.js fs Module**](https://nodejs.org/api/fs.html)

---

*Happy Coding with MediaSFU Backend! 🚀*

