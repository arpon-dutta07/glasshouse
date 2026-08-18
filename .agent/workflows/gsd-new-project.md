---
description: Initialize a new project with deep context gathering and PROJECT.md
---

# Workflow: Initialize New Project

This workflow guides you (the agent) to interview the user and establish the project foundation.

## Step 1: Check Pre-requisites
1. Check if `.planning/PROJECT.md` already exists.
   - If it does, inform the user the project is already initialized and ask if they want to overwrite it.
2. Check if this is a "brownfield" project (existing code).
   - Run `ls -R` or `find` to look for code files.
   - If code exists but `.planning/codebase` does not, ask the user if they want to map the codebase first (which would be a separate workflow, but for now just note it).

## Step 2: The Interview
Conduct a "Context Engineering" interview with the user. Do not ask all questions at once. Have a conversation.

**Questions to cover:**
1. **The Vision**: "What do you want to build?" (Start freeform)
2. **The Core**: "If you could only nail one thing, what would it be?" (Identify the Core Value)
3. **The Scope**: "What is explicitly NOT in v1?" (Identify Out of Scope)
4. **The Constraints**: "Any hard constraints? (Tech stack, timeline, budget?)"

*Keep asking follow-up questions until you feel you have a solid grasp of the project.*

## Step 3: Create Artifacts
Once you have the answers, synthesize them into the following files.

### 1. `.planning/PROJECT.md`
Use the template at `.agent/templates/project.md`. Fill it in with the user's answers.
- **What This Is**: 2-3 sentences.
- **Core Value**: The one thing.
- **Requirements**:
    - **Active**: The features they requested for v1.
    - **Out of Scope**: What they explicitly excluded.
- **Constraints**: Technical or other constraints.

### 2. `.planning/config.json`
Create a simple config file:
```json
{
  "mode": "interactive",
  "depth": "standard"
}
```
(You can ask the user for preference, but default to interactive/standard).

## Step 4: Git Init
1. Initialize a git repo if one doesn't exist: `git init`
2. Add the planning files: `git add .planning/PROJECT.md .planning/config.json`
3. Commit: `git commit -m "docs: initialize project structure"`

## Step 5: Wrap Up
Inform the user that the project is initialized and they can now proceed to create a roadmap.
