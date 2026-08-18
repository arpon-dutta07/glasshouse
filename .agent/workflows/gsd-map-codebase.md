---
description: Analyze an existing codebase to create context files
---

# Workflow: Map Codebase

This workflow is for "Brownfield" projects (projects that already have code). It analyzes the existing code to create a "mental map" for the agent.

## Step 1: Exploration
1. **List Files**: Run `ls -R` (or `find`) to see the full project structure. Ignore `node_modules`, `.git`, etc.
2. **Identify Stack**: Look for configuration files (`package.json`, `requirements.txt`, `Cargo.toml`, `docker-compose.yml`).
3. **Identify Entry Points**: Look for `index.ts`, `main.py`, `App.tsx`, etc.

## Step 2: Analysis
Read the key files identified in Step 1 to understand:
- **Dependencies**: What libraries are used?
- **Architecture**: How does data flow? (e.g., MVC, Hexagonal, Component-based).
- **Conventions**: Naming styles, folder structure patterns.

## Step 3: Documentation
Create the `.planning/codebase/` directory and populate it with the following files:

### 1. `.planning/codebase/STACK.md`
- List languages, frameworks, and key libraries.
- List infrastructure (Docker, cloud providers).

### 2. `.planning/codebase/ARCHITECTURE.md`
- High-level overview of how the app works.
- Key directories and what they contain.
- Data flow description.

### 3. `.planning/codebase/CONVENTIONS.md`
- Coding style (indentation, naming).
- Patterns used (e.g., "All hooks go in /hooks", "Use functional components").

## Step 4: Wrap Up
Inform the user: "Codebase mapped. You can now run `/gsd-new-project` to initialize the project context using this map."
