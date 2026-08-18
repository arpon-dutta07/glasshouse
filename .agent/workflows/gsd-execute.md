---
description: Execute a specific plan file step-by-step
---

# Workflow: Execute Plan

This workflow guides you to execute a specific `.planning/phases/.../PLAN.md` file.

## Step 1: Load Context
1. Ask the user: "Which plan file should I execute?" (or look for the most recent one).
2. Read the target `PLAN.md` file.
3. Read `.planning/PROJECT.md` to ensure alignment.

## Step 2: Execute Tasks
**Iterate through each `<task>` in the plan:**

1. **Read Task**: Identify the `<action>` and `<verify>` steps.
2. **Execute**: Perform the code changes described in `<action>`.
3. **Verify**: Run the command described in `<verify>`.
   - **CRITICAL**: If verification fails, FIX IT immediately. Do not proceed to the next task until the current one is verified.
4. **Commit**: Once verified, commit the changes.
   - `git add [modified files]`
   - `git commit -m "feat: [task name]"`

## Step 3: Update Summary
After all tasks are done:
1. Create/Update the `SUMMARY.md` for this phase.
2. Log what was accomplished, any files changed, and decisions made.

## Step 4: Wrap Up
Inform the user: "Plan complete. Summary updated. Ready for next plan?"
