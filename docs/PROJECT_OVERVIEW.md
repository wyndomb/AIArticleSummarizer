# AI Article Analyzer - Project Overview

## Project Description

AI Article Analyzer is a full-stack web application that uses OpenAI's GPT-4o model to analyze web articles, providing comprehensive, structured analysis and answering specific questions about the content. The application includes Google authentication via Supabase for secure access.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui (Radix UI components)
- **Backend**: Node.js, Express.js, TypeScript
- **Authentication**: Supabase (Google OAuth)
- **Database**: Likely using Supabase/PostgreSQL (via Drizzle ORM)
- **AI Integration**: OpenAI API (GPT-4o)
- **Deployment**: Configuration suggests it can be deployed to various environments

## Key Features

1. **Secure Authentication**

   - Google OAuth via Supabase
   - Protected routes requiring authentication
   - User profile display with avatar and email

2. **Article Analysis**

   - URL-based article fetching and parsing
   - Structured analysis with multiple sections
   - Custom analysis instructions option

3. **Question Answering**

   - Ability to ask specific questions about articles
   - AI-generated responses focused on article content

4. **User Experience**
   - Tabbed interface for different analysis types
   - Copy-to-clipboard functionality
   - Clean, responsive design

## Project Structure

The project follows a client-server architecture:

- `/client` - Frontend React application
- `/server` - Backend Express server
- `/shared` - Shared code/types between client and server

## Environment Setup

The application requires several environment variables:

- OpenAI API key
- Supabase project URL and anonymous key
- Additional configuration for local development

## Next Steps

For more detailed information about specific aspects of the project, refer to:

- [Client Architecture](./CLIENT_ARCHITECTURE.md)
- [Server Architecture](./SERVER_ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
