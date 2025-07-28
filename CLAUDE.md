# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n community node package that implements in-memory key-value storage with scoped access. The package provides two main nodes:
- `KvStorage` - Core node for CRUD operations on key-value pairs
- `KvStorageTrigger` - Event listener node for storage changes

## Development Commands

### Build and Development
- `pnpm run build` - Compile TypeScript and copy assets via gulp
- `pnpm run dev` - Watch mode compilation with `tsc --watch`
- `make build` - Full build with npm linking for local n8n testing
- `make run` - Build and start n8n with proper environment variables

### Code Quality
- `pnpm run lint` - Run TSLint and ESLint
- `pnpm run lintfix` - Auto-fix linting issues
- `pnpm run format` - Format code with Prettier
- `make prepublish` - Run all code quality checks before publishing

### Local Testing
- `make run` - Sets `DEBUG=kv-storage EXECUTIONS_PROCESS=main` and starts n8n
- `make clean` - Remove build artifacts and local n8n links

## Architecture

### Core Service Pattern
The project uses TypeDI for dependency injection with a singleton service pattern:
- `KvStorageService` - Main service class decorated with `@Service()`
- Manages in-memory storage with automatic TTL cleanup (runs every 1000ms)
- Implements event-driven architecture for storage change notifications

### Storage Scopes
Three distinct scopes with different lifetimes and access patterns:
- **EXECUTION** - Scoped to single workflow execution (`$execution.id`)
- **WORKFLOW** - Shared across all executions of same workflow (`workflowId`)
- **INSTANCE** - Global scope across entire n8n instance

### Key Structure
Internal keys follow pattern: `scope:{SCOPE}-{identifier}:{userKey}`
- Example: `scope:EXECUTION-12345:counter`
- Example: `scope:WORKFLOW-workflow123:temp_data`

### Node Implementation
- Both nodes extend n8n's `INodeType` interface
- Properties define the UI configuration for n8n's node editor
- Execution logic handles the actual storage operations and event dispatching

## Important Configuration

### n8n Process Mode
This node requires `EXECUTIONS_PROCESS=main` to function properly across scopes. In `own` process mode, only EXECUTION scope works due to process isolation.

### TypeScript Configuration
- Target: ES2019 with strict mode enabled
- Decorators enabled for TypeDI dependency injection
- Output to `dist/` directory

### Build Process
1. TypeScript compilation to `dist/`
2. Gulp copies SVG icons to distribution
3. npm/pnpm scripts handle linting and formatting

## Testing and Distribution

The package uses n8n's community node structure where:
- Node files must be in `dist/nodes/` after build
- Icons are copied to maintain relative paths
- Package.json defines the n8n node entry points