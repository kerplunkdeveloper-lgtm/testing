# Project Management Tool - Backend

A Node.js backend for a project management tool with user authentication, role-based access, and project assignment.

## Features

- User registration and authentication (JWT + Cookies)
- Role-based access control (Admin, Quality Lead, Team)
- Profile management (CRUD)
- Project creation and assignment to employees
- Secure API with rate limiting and CORS

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT for authentication
- bcryptjs for password hashing

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:
   ```
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=7d
   JWT_COOKIE_EXPIRE=7
   COOKIE_SECRET=your_cookie_secret
   ```

3. Start the server:
   ```bash
   npm run dev  # For development with nodemon
   npm start    # For production
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout user

### Profiles
- `GET /api/profile/me` - Get current user's profile
- `PUT /api/profile` - Update profile
- `DELETE /api/profile` - Delete profile
- `GET /api/profile` - Get all profiles (Admin only)
- `GET /api/profile/:id` - Get single profile (Admin only)

### Projects
- `GET /api/projects` - Get all projects (filtered by role)
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project (Admin/Quality Lead)
- `PUT /api/projects/:id` - Update project (Admin/Quality Lead)
- `DELETE /api/projects/:id` - Delete project (Admin/Quality Lead)
- `PUT /api/projects/:id/assign` - Assign project to users (Admin/Quality Lead)

## Roles

- **Admin**: Full access to all features
- **Quality Lead**: Can create, update, delete projects and assign them
- **Team**: Can view assigned projects and manage their profile

## Database Models

- **User**: name, email, password, role, profile (ref)
- **Profile**: user (ref), bio, skills, experience, department, phone, address
- **Project**: name, description, status, assignedTo (array of users), createdBy, dates, priority