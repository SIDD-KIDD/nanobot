---
name: android-controls
description: Controls Android system alarms via Fossify Clock and triggers attention mechanisms via FakeCall intents natively in Termux.
---
# Android Control Workflows

Use this skill whenever the user asks to manage their wake-up routine, set alarms, or when an urgent accountability escalation requires getting the user's physical attention via a phone call.

## Core Workflows

### 1. Triggering an Immediate Escalation Call (FakeCall)
When ordinary chat notifications are being ignored during a high-priority accountability check-in, or during wake-up verification failure, execute a broadcast intent using `termux-am` to trigger an immediate call.

```bash
termux-am broadcast -a com.upnp.fakeCall.TRIGGER -p com.upnp.fakeCall --es caller_name "Life OS" --es caller_number "000" --ei delay 0
```

### 2. Setting a Reliable Morning Alarm (Fossify Clock)

When the user asks to "plan my day" or set a wake-up time, calculate the requested hour and minute, and create a system alarm with SKIP_UI enabled.

```bash
termux-am start -a android.intent.action.SET_ALARM \
    --ei android.provider.alarmclock.extra.HOUR 6 \
    --ei android.provider.alarmclock.extra.MINUTES 0 \
    --es android.provider.alarmclock.extra.MESSAGE "Life OS Wakeup" \
    --ez android.provider.alarmclock.extra.SKIP_UI true
```

## The Sleep Verification Protocol

When setting or responding to a wake-up routine, you must enforce a multi-step confirmation loop using the built-in `cron` tool.

1. **The Initial Wakeup:** At the user's scheduled time (or when detecting they should be awake), send a Telegram message: *"Good morning. Please confirm you are fully awake by replying to this message."*
2. **The Security Check:** Immediately use the `cron` tool to schedule an automated verification turn exactly **5 minutes later**. **CRITICAL:** Set the cron `message` parameter exactly to: *"WAKEUP_VERIFICATION: Read the chat history. If the user has not confirmed they are awake, use the `exec` tool to run the FakeCall Escalation command via `termux-am` immediately."*
3. **The Verification Check:** When that scheduled turn triggers, read the intervening conversation history:
* **If the user replied** (e.g., "I am awake"): Log a habit success entry in `MEMORY.md` and stand down.
* **If the user failed to reply or went silent:** Assume they fell back asleep. Immediately use the `exec` tool to run the **FakeCall Escalation** command, and reschedule another check 3 minutes later.
