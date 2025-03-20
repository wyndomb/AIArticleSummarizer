# Server Architecture

## Overview

The server-side of AI Article Analyzer is built with Node.js, Express.js, and TypeScript. It handles authentication, article processing, and integration with the OpenAI API for article analysis and question answering.

## Directory Structure

- `/server` - Main server code
  - `index.ts` - Server entry point
  - `routes.ts` - API route definitions
  - `vite.ts` - Vite server configuration
  - `storage.ts` - Data storage utilities
  - `portCheck.ts` - Utility for checking available ports
  - `/lib` - Server-side libraries and utilities

## Key Technologies

- **Node.js** - JavaScript runtime
- **Express.js** - Web server framework
- **TypeScript** - Type-safe JavaScript
- **OpenAI API** - For AI-powered analysis and question answering
- **Supabase Auth** - Authentication service integration
- **Drizzle ORM** - Database ORM
- **article-parser** - For extracting article content from URLs

## API Endpoints

Based on the project structure, the server likely exposes several API endpoints:

1. **Authentication Endpoints**

   - Login/logout handlers
   - Session management
   - User profile information

2. **Article Analysis Endpoints**

   - Endpoint to submit a URL for analysis
   - Endpoint to receive structured analysis results

3. **Question Answering Endpoints**
   - Endpoint to submit a URL and question
   - Endpoint to receive AI-generated answers

## Authentication Flow

1. Authentication is handled via Supabase integration
2. Server validates session tokens
3. Protected routes check for valid authentication
4. User session data is stored securely

## Article Processing Flow

1. **URL Submission**

   - Client submits URL to the server
   - Server validates the URL

2. **Article Extraction**

   - Server uses article-parser library to extract content
   - Article metadata and body text are extracted

3. **AI Analysis**

   - Extracted content is sent to OpenAI API
   - Structured prompts guide the AI's analysis
   - Results are formatted according to predefined structure

4. **Response**
   - Formatted results are sent back to the client

## Question Answering Flow

1. **Question Submission**

   - Client submits URL and question
   - Server validates inputs

2. **Article Context**

   - Server extracts article content
   - Content is used as context for the question

3. **AI Response Generation**

   - Question and article context sent to OpenAI API
   - AI generates a relevant response

4. **Response**
   - AI-generated answer is sent back to the client

## Security Considerations

- API keys stored in environment variables
- Authentication required for protected routes
- Input validation for all API endpoints
