# Heartbeat Tasks

<!--
This file is checked periodically by your nanobot agent. When nanobot gateway starts with gateway.heartbeat.enabled=true, it automatically registers a protected heartbeat cron job that reads this file.

Use this file for recurring background checks that should stay quiet unless there is something useful to report. Regular cron jobs are different: they normally deliver each run's result back to the chat/session where they were created.

If this file has no tasks (only headers and comments), the agent will skip it. Completed tasks should be deleted, not kept - heartbeat only reads "Active Tasks".
-->

## Active Tasks

- **Life OS Behavioral Check-In:** Review `memory/MEMORY.md` (specifically the Life OS Status section) and the recent session history. Evaluate the following:
  1. Has the user been completely inactive (no messages sent) for more than 24 hours?
  2. Does the Behavioral Drift analysis indicate the user is currently neglecting a Core Objective or repeating a Known Pitfall?
  *Action:* If EITHER of these conditions is true, initiate a proactive, thoughtful check-in message. Ask a direct, probing question to help them identify their current blocker. If they are on track, or if you have already checked in recently without a reply, stay completely silent and report nothing.
