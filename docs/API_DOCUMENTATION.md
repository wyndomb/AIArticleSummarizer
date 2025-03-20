# API Documentation

## Overview

This document outlines the API endpoints available in the AI Article Analyzer application. The API is RESTful and primarily handles article analysis, question answering, and authentication.

## Base URL

For local development: `http://localhost:5000/api`

## Authentication

The application uses Supabase for authentication. Most endpoints require authentication.

### Authentication Headers

```
Authorization: Bearer <supabase_token>
```

## API Endpoints

### Authentication

#### GET /auth/user

Returns the current authenticated user's information.

**Response**

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

#### POST /auth/logout

Logs out the current user.

**Response**

```json
{
  "success": true
}
```

### Article Analysis

#### POST /api/analyze

Analyzes an article from a provided URL.

**Request Body**

```json
{
  "url": "https://example.com/article",
  "customInstructions": "Optional custom instructions for analysis"
}
```

**Response**

```json
{
  "analysis": {
    "coreInformation": "...",
    "executiveSummary": "...",
    "keyInsights": ["...", "..."],
    "thoughtProvokingElements": ["...", "..."],
    "criticalDiscussionPoints": ["...", "..."],
    "keyQuotes": ["...", "..."]
  },
  "articleTitle": "Article Title",
  "articleSource": "example.com",
  "timestamp": "2023-05-30T12:34:56Z"
}
```

### Question Answering

#### POST /api/ask

Asks a specific question about an article.

**Request Body**

```json
{
  "url": "https://example.com/article",
  "question": "What is the main argument of this article?"
}
```

**Response**

```json
{
  "answer": "The main argument of the article is...",
  "articleTitle": "Article Title",
  "articleSource": "example.com",
  "timestamp": "2023-05-30T12:34:56Z"
}
```

### Error Responses

All endpoints may return the following error responses:

#### 400 Bad Request

```json
{
  "error": "Invalid input",
  "details": "URL is required"
}
```

#### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "details": "Authentication required"
}
```

#### 404 Not Found

```json
{
  "error": "Not found",
  "details": "Resource not found"
}
```

#### 500 Server Error

```json
{
  "error": "Server error",
  "details": "An unexpected error occurred"
}
```

## Rate Limiting

The API may implement rate limiting to prevent abuse. If rate limited, you will receive a 429 status code:

```json
{
  "error": "Too many requests",
  "details": "Please try again later"
}
```

## Notes

- Article analysis may take longer for lengthy articles
- OpenAI API usage is subject to their terms and rate limits
- URLs must be publicly accessible for article extraction to work
