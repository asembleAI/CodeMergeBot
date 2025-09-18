# Overview

This is a full-stack workspace merging application that allows users to intelligently merge two GitHub repositories using AI. The application fetches code from GitHub repositories, analyzes differences, and uses AI services (OpenAI or Anthropic) to automatically resolve conflicts and merge codebases. It provides a visual interface for reviewing merged files, handling conflicts, and downloading the final merged workspace.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Radix UI primitives with custom shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **File Structure**: Component-based architecture with shared types and utilities

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for merge job management
- **Storage Strategy**: In-memory storage with interface for database abstraction
- **Development**: Vite middleware integration for hot reloading

## Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Merge jobs and workspace files tables with proper relationships
- **Migration Support**: Drizzle Kit for schema migrations
- **Connection**: Neon Database serverless PostgreSQL connection

## Authentication and Authorization
- **GitHub Integration**: GitHub API tokens for repository access
- **AI Services**: API key-based authentication for OpenAI and Anthropic
- **Session Management**: Express session handling with PostgreSQL store

## External Service Integrations
- **GitHub API**: Repository file fetching and validation via Octokit
- **AI Services**: OpenAI and Anthropic SDKs for intelligent code merging
- **File Processing**: JSZip for workspace archive generation
- **Development Tools**: Replit integration for cloud development environment

The architecture follows a clean separation of concerns with the frontend handling user interactions and visualization, while the backend manages GitHub integration, AI processing, and data persistence. The system is designed for scalability with database abstraction and pluggable AI providers.