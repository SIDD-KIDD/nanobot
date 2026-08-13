---
name: alarm
description: Set a morning alarm or reminder alarm on the Android host via Termux `am` intent.
---

# Alarm Setting Skill

Use this skill whenever the user requests setting an alarm, or when automatically scheduling the morning wake-up alarm.

## Execution Steps

1. Parse or calculate the target `{hour}` (0-23, 24-hour format) and `{minutes}` (0-59).
2. Execute the shell command using the `exec` tool:

```bash
/data/data/com.termux/files/usr/bin/am start --user 0 -a android.intent.action.SET_ALARM \
    --ei android.provider.alarmclock.extra.HOUR {hour} \
    --ei android.provider.alarmclock.extra.MINUTES {minutes} \
    --es android.provider.alarmclock.extra.MESSAGE "Life OS: Stated Goal Check" \
    --ez android.provider.alarmclock.extra.SKIP_UI true
```

3. Confirm to the user conversationally (e.g., *"Morning alarm set for {hour}:{minutes}."*).
