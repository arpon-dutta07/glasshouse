---
description: Generate a rigorous execution plan for a project phase
---

# Workflow: Plan Phase

This workflow guides you to create a detailed, XML-structured plan for a specific phase of work.

## Step 1: Context Gathering
1. Read `.planning/PROJECT.md` to understand the vision and constraints.
2. Read `.planning/ROADMAP.md` (if it exists) to see the phases.
   - If `ROADMAP.md` doesn't exist, ask the user what they want to work on immediately and treat it as "Phase 1".

## Step 2: Select Scope
Ask the user: "Which phase or feature are we planning right now?"
- If they select a large phase, suggest breaking it down into smaller "Plans" (e.g., Phase 1 Plan 1).

## Step 3: Generate Plan
Use the template at `.agent/templates/phase-prompt.md`.
1. Create a new file: `.planning/phases/[phase-name]/[number]-PLAN.md`.
2. Fill in the template:
   - **Objective**: Clear goal for this chunk of work.
   - **Context**: Reference the project files.
   - **Tasks**: Break the work into 2-3 atomic tasks.
     - **Type**: `auto` for coding, `checkpoint` for decisions/verification.
     - **Action**: Be extremely specific. "Create file X with function Y that does Z."
     - **Verify**: "Run command A and expect output B."

## Step 4: Review
Present the plan to the user.
- "Here is the plan for [Phase X]. Does this look correct?"
- Iterate if they have feedback.

## Step 5: Commit
Once approved:
1. `git add .planning/phases/...`
2. `git commit -m "docs: add plan for [phase]"`
