# AI Article Analyzer

A React-based article analysis tool powered by OpenAI's GPT-4o model that provides comprehensive, structured analysis of web articles and answers specific questions.

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

### User Experience

- Tabbed interface for choosing between analysis types
- Copy analysis or answers to clipboard
- Clean, responsive design

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
