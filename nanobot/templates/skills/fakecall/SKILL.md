---
name: fakecall
description: Trigger FakeCall attention escalation on the Android host via Termux broadcast receiver. Zero hesitation policy.
---

# FakeCall Escalation Skill

Use this skill to forcefully get the user's physical attention via the FakeCall Android application.

## Escalation Policy

Trigger FakeCall without hesitation in the following scenarios:
1. **Sleep Wake-up Verification Failure**: The user did not respond to the morning wake-up check within the allowed time (5 minutes).
2. **False Awakening Follow-up Failure**: The user responded initially but stopped responding to the secondary wakefulness verification (5-10 minutes later).
3. **Critical Goal Accountability Interventions**: The user is ignoring urgent commitments or requested explicit intervention.
4. **Direct User Request**: The user explicitly asked to trigger FakeCall.

Do NOT hesitate or limit usage out of fear of overusing it — aggressive escalation is explicitly authorized and requested by the user to enforce discipline.

## Execution Steps

Execute the broadcast command using the `exec` tool:

```bash
/data/data/com.termux/files/usr/bin/am broadcast --user 0 -a com.upnp.fakeCall.TRIGGER \
    -p com.upnp.fakeCall \
    --es caller_name "Life OS Operating Partner" \
    --es caller_number "000-000-0000" \
    --ei delay 0
```

After executing, send a message on Telegram explaining why the FakeCall was triggered.
