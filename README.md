# AI Article Summarizer

A React-based article summarization tool powered by OpenAI's GPT-4 model.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- OpenAI API key

### Local Development Setup

1. Clone the repository

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
   - Copy `.env.example` to `.env`
   - Replace `your_api_key_here` with your actual OpenAI API key

4. Start the development server
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5000`

The app will be running in development mode with hot-reload enabled.

## Features

- Article summarization from URLs
- Custom summarization instructions
- Copy summary to clipboard
- Well-formatted output with paragraphs and bullet points

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
