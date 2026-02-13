# Contributing to MCP Launcher

Thank you for your interest in contributing to MCP Launcher! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-launcher
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd src/frontend && npm install
   cd ../..
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run in development mode**
   ```bash
   # Terminal 1 - Backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd src/frontend && npm run dev
   ```

## Project Structure

- `src/server/` - Express backend
- `src/frontend/` - React/Vite frontend
- `src/orchestrator/` - Deployment logic
- `src/gcp/` - GCP API integrations
- `template/` - MCP server template
- `bin/` - CLI entry point

## Making Changes

1. Create a new branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test thoroughly
4. Build the project: `npm run build`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Submit a pull request

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Add comments for complex logic
- Keep functions small and focused

## Testing

Before submitting a PR:
- Test the CLI with `npx .` from the project root
- Test the full deployment flow
- Verify the dashboard works correctly

## Reporting Issues

When reporting issues, please include:
- Node.js version
- Operating system
- Error messages (full stack trace)
- Steps to reproduce

## Questions?

Feel free to open an issue for questions or join discussions.

Thank you for contributing!
