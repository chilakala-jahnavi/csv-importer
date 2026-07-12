# AI-Powered CSV Importer

A full-stack application that intelligently extracts CRM lead information from any CSV format using AI.

## Features

- 📤 Drag & drop CSV upload
- 👁️ Preview CSV data before import
- 🤖 AI-powered field mapping
- 📊 Beautiful responsive tables with sticky headers
- ⚡ Batch processing for large files
- 🎨 Dark mode UI
- 🐳 Docker support

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **AI**: OpenAI GPT-4
- **Deployment**: Docker, Vercel/Railway ready

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Environment Setup

1. Create `.env` file in the root:
```env
OPENAI_API_KEY=your_api_key_here
PORT=5000
NEXT_PUBLIC_API_URL=http://localhost:5000