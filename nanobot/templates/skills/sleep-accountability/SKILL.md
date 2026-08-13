---
name: sleep-accountability
description: Manage the wake-up verification flow, false awakening checks, and aggressive escalation via FakeCall across Telegram and WebUI.
---

# Sleep Accountability Skill

False awakenings (turning off an alarm and going back to sleep or lying in bed thinking you woke up) are a primary problem to solve.

## Morning Wakefulness Verification Procedure

### Stage 1: Alarm & Message Check-in
1. Set the morning alarm via the `alarm` skill (`am start -a android.intent.action.SET_ALARM`).
2. At the target wake-up time, send a direct, engaging check-in message:
   *"Good morning! Time to get up. Reply to confirm you are out of bed!"*
3. Schedule a one-shot follow-up check using `cron` (`at` parameter) for +5 minutes.

### Stage 2: Verification vs. Escalation
- **If the user responds within 5 minutes**:
  - Do NOT just accept "I'm up". Ask a simple cognitive engagement question requiring an active answer (e.g. *"What is your #1 priority task for the first 2 hours today?"*).
  - Schedule a secondary verification check for 10 minutes later to ensure they didn't fall back asleep after replying.
- **If the user DOES NOT respond within 5 minutes**:
  - Immediately trigger the `fakecall` skill (`am broadcast -a com.upnp.fakeCall.TRIGGER`).
  - Send another message: *"Wake up! FakeCall triggered. Confirm you're awake."*
  - If still no response 3 minutes after FakeCall, trigger `fakecall` again.

### Stage 3: Secondary Wakefulness Check (False Awakening Verification)
- 10 minutes after initial confirmation, send a brief check:
  *"Quick 10-minute check: are you still up and active?"*
- If no response within 5 minutes → Trigger `fakecall` skill immediately.
