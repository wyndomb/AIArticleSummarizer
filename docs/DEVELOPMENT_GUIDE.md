# Development Guide

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- OpenAI API key
- Supabase account and project

### Local Setup

1. **Clone the repository**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   - Copy `.env.example` to `.env`
   - Fill in required values:
     ```
     OPENAI_API_KEY=your_openai_api_key
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## Project Structure

### Client-Server Architecture

The project follows a client-server architecture:

- `/client` - Frontend React application
- `/server` - Backend Express server
- `/shared` - Shared code/types between client and server

### Key Configuration Files

- `package.json` - Project dependencies and scripts
- `vite.config.ts` - Vite configuration for the project
- `.env` - Environment variables
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - TailwindCSS configuration

## Development Workflow

### Running in Development Mode

```bash
npm run dev
```

This starts both the client and server in development mode with hot reloading.

### Building for Production

```bash
npm run build
```

This builds the client and server for production deployment.

### Starting Production Server

```bash
npm start
```

This starts the production server.

### Checking TypeScript

```bash
npm run check
```

This runs TypeScript type checking on the project.

### Database Migrations

```bash
npm run db:push
```

This runs Drizzle ORM migrations.

## Best Practices

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks in React
- Organize components by feature/module
- Keep components small and focused

### State Management

- Use React Query for server state
- Use useState/useReducer for local component state
- Use Context API sparingly for global state

### API Calls

- Create abstracted service functions for API calls
- Handle loading and error states appropriately
- Use React Query for caching and state management

### Authentication

- Always check authentication for protected routes
- Handle token expiration and refresh
- Securely store tokens

### Error Handling

- Implement proper error boundaries in React components
- Log errors appropriately
- Provide meaningful error messages to users

## Testing

This project likely doesn't have a formal testing setup yet, but consider:

- Adding Jest for unit testing
- Using React Testing Library for component tests
- Implementing end-to-end tests with Cypress or Playwright

## Troubleshooting

### Common Issues

1. **Authentication Issues**

   - Check Supabase configuration
   - Verify `.env` variables
   - Check browser console for errors

2. **API Errors**

   - Verify OpenAI API key is valid
   - Check API rate limits
   - Ensure URLs are publicly accessible

3. **Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check for TypeScript errors
   - Verify npm scripts are correct

### Developer Tools

- Use browser developer tools for debugging
- Check server logs for backend issues
- Use React Developer Tools browser extension

## Contributing Guidelines

1. Create feature branches from main/develop
2. Follow consistent commit message format
3. Write clear documentation for new features
4. Ensure code is properly typed with TypeScript
5. Test changes thoroughly before submitting PRs
