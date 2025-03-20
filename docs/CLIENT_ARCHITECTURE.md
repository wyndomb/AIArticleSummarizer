# Client Architecture

## Overview

The client-side of AI Article Analyzer is built with React, TypeScript, and Vite, using a modern stack of UI components and utilities. It provides the user interface for article analysis, question answering, and user authentication.

## Directory Structure

- `/client/src` - Main source code
  - `/components` - Reusable UI components
  - `/pages` - Page components for different routes
  - `/hooks` - Custom React hooks
  - `/lib` - Utility functions and client-side libraries
  - `App.tsx` - Main application component
  - `main.tsx` - Entry point
  - `index.css` - Global styles

## Key Technologies

- **React** - Frontend library
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - UI component library built on Radix UI
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Query** - Data fetching and caching
- **wouter** - Routing library

## Component Architecture

The application likely follows a component-based architecture:

1. **Layout Components**

   - Main layout with navigation and authentication state
   - Page-specific layouts

2. **Feature Components**

   - Article analysis form and results display
   - Question answering interface
   - User profile and authentication components

3. **UI Components**
   - Buttons, inputs, tabs, accordions, etc.
   - Loading states and error handling components
   - Toast notifications

## State Management

The application likely uses a combination of:

- React's built-in state management (useState, useReducer)
- React Query for server state
- Context API for global state (auth, themes, etc.)

## Authentication Flow

1. User clicks login button
2. Redirected to Supabase/Google OAuth flow
3. After successful authentication, redirected back to the application
4. User session maintained via Supabase client

## Data Flow

1. **Article Analysis**

   - User inputs URL and optionally custom instructions
   - Request sent to server
   - Loading state displayed during processing
   - Results displayed in a structured format

2. **Question Answering**
   - User inputs URL and question
   - Request sent to server
   - AI-generated response displayed

## API Integration

The client communicates with the server via REST API endpoints, likely using fetch or axios for HTTP requests.
