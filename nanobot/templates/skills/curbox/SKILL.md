---
name: curbox
description: Control Curbox focus sessions, app/keyword/reel blockers, DND, and query screentime and reel statistics.
---

# Curbox Productivity & Focus Skill

Curbox is the productivity and focus app installed on the host Android device. You can query screentime stats, inspect reel consumption, start/stop focus sessions, enable app/keyword/reel blockers, and toggle Do Not Disturb (DND).

## CLI Helper Specification (`curbox`)

Execute commands using the `exec` tool:

### 1. Requesting Permission (First Time Setup)
If Curbox permission is not granted yet, ask Curbox to launch the permission request dialog:
```bash
curbox permission
```
*(Alternative Intent)*:
```bash
/data/data/com.termux/files/usr/bin/am start -a neth.iecal.curbox.api.REQUEST_PERMISSION
```

### 2. Querying Statistics & Current Status
- **Screentime Today**: `curbox query SCREENTIME_TODAY`
  *Returns:* `{"screentime":"73"}` (in minutes)
- **Reels Consumed Today**: `curbox query REELS_TODAY`
  *Returns:* `{"reels":"18"}` (count)
- **Active Focus Status**: `curbox query FOCUS_ACTIVE`
  *Returns:* `{"active":"true","focus_group":"Study","focus_remaining":"22"}`
- **Full Status Overview**: `curbox list STATUS`
  *Returns:* `{"focusActive":false,"keywordBlocker":true,"reelBlocker":false,"reelCounter":true,"uiHider":false}`

### 3. Discovering Groups & IDs
To find group IDs before starting a focus session or toggling blockers:
- **List Focus Groups**: `curbox list FOCUS_GROUPS`
  *Returns:* `[{"id":"a1b2c3d4","name":"Deep Work","apps":12,"websites":3,"blockMode":"BLOCK_SELECTED","exitable":true,"autoTurnOnDnd":true}]`
- **List App Blocker Groups**: `curbox list APP_BLOCKER_GROUPS`
- **List Keyword Groups**: `curbox list KEYWORD_GROUPS`

### 4. Controlling Focus & Blockers
- **Start Focus Session**:
  `curbox start-focus <group_id> <minutes>`
  *(Example: `curbox start-focus a1b2c3d4 45`)*
- **Stop Active Focus Session**:
  `curbox stop-focus`
- **Toggle Reel Blocker**:
  `curbox set-reel-blocker true` (or `false`)
- **Toggle Keyword Blocker**:
  `curbox set-keyword-blocker true` (or `false`)
- **Toggle Do Not Disturb (DND)**:
  `curbox set-dnd true` (or `false`)

---

## Life OS Accountability & Integration Rules

1. **Distraction Prevention**:
   During dynamic check-ins, if `REELS_TODAY` is high (e.g. > 15 reels) or `SCREENTIME_TODAY` is excessive while primary goals are pending:
   - Call out the discrepancy with real data: *"You've watched 18 reels today and accumulated 90 mins screentime. Want me to start a 45-minute Deep Work focus session?"*
   - If authorized or in strict focus mode, immediately call `curbox start-focus` or `curbox set-reel-blocker true`.

2. **Night / Sleep Routine**:
   When the evening/night routine is triggered, automatically turn on DND (`curbox set-dnd true`) and enable the Reel Blocker (`curbox set-reel-blocker true`).

3. **Daily & Weekly Reviews**:
   Include exact screentime minutes (`SCREENTIME_TODAY`) and reel counts (`REELS_TODAY`) in the Reflection report.
