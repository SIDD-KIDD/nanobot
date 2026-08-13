---
name: dashboard
description: Manage and render life area scores adaptively for WebUI and Telegram.
---

# Life Dashboard Skill

The Life Dashboard provides a high-level overview of progress across core life areas defined in `lifeos/dashboard.json`.

## Life Areas Tracked

Life areas are dynamically configured by the user during onboarding or daily reviews and persisted in `lifeos/dashboard.json`.

## Rendering the Dashboard

When the user asks to see their dashboard ("show dashboard", "dashboard", "life scores"):

1. Read current scores from `lifeos/dashboard.json`.
2. **On Telegram / Mobile Messaging**: Render clean bullet points or simple progress bars based on the user's active life areas.
3. **On WebUI / Desktop Browser**: Direct the user to open the **Life OS Dashboard** tab (`#/dashboard`) on the Sidebar for interactive consistency heatmaps and radar scores.

## Updating Scores

When the user reports progress or regression, or during daily reviews:
1. Update `lifeos/dashboard.json`.
2. Provide a brief explanation of the change (e.g. *"Career score increased to 7/10 after completing your project milestone."*).
