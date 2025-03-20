# AI Article Analyzer

A React-based article analysis tool powered by OpenAI's GPT-4o model that provides comprehensive, structured analysis of web articles and answers specific questions. The application includes Google authentication via Supabase to secure access.

## Documentation

For detailed documentation about the application's architecture, features, and development process, see the [docs](./docs) directory. It contains:

- Project overview and tech stack
- Detailed feature descriptions
- Client and server architecture
- API documentation
- Development guide

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- OpenAI API key
- Supabase account and project

### Local Development Setup

1. Clone the repository

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

   - Copy `.env.example` to `.env`
   - Replace `your_openai_api_key` with your actual OpenAI API key
   - Replace `your_supabase_url` and `your_supabase_anon_key` with your Supabase project details

4. Set up Supabase and Google OAuth

   - Create a Supabase project at [https://supabase.com](https://supabase.com)
   - In your Supabase dashboard, go to Authentication > Providers > Google
   - Enable Google authentication
   - Create a Google OAuth client ID and secret in the [Google Cloud Console](https://console.cloud.google.com/)
   - Add your application's URL to the authorized redirect URIs in Google Cloud Console
     - For local development: `http://localhost:5000/auth/callback`
     - For production: `https://your-domain.com/auth/callback`
   - Add the Google client ID and secret to your Supabase project

5. Start the development server

```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5000`

The app will be running in development mode with hot-reload enabled.

## Features

### Authentication

- Secure Google OAuth authentication via Supabase
- Protected routes requiring authentication
- User profile display with avatar and email
- Seamless login/logout experience

### Structured Analysis

- Comprehensive article analysis from URLs
- Structured analysis with multiple sections:
  - Core Information
  - Executive Summary
  - Key Insights
  - Thought-Provoking Elements
  - Critical Discussion Points
  - Key Quotes
- Custom analysis instructions
- Markdown-formatted output

### Question Answering

- Ask specific questions about any article
- Get conversational, friendly responses
- Focus on particular aspects of the article
- Receive answers in a clear, readable format

### Performance Optimizations

- Response caching for OpenAI API calls to reduce API usage and improve response times
- Robust article extraction with fallback mechanisms for when primary extraction fails
- In-memory content caching to prevent repeated processing of the same articles
- Efficient text processing with optimized string operations
- Redundancy handling with graceful degradation for network and parsing errors
- Optimized HTTP client with concurrency limits and intelligent timeouts

### User Experience

- Tabbed interface for choosing between analysis types
- Copy analysis or answers to clipboard
- Clean, responsive design

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `VITE_SUPABASE_URL`: Your Supabase project URL (required for authentication)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key (required for authentication)
