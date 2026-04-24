# Karma Yoga QA Checklist

## Build Verification
- Run `npm run build` in `client`
- Run `npm run build` in `server`

## Smoke Scenarios
- Navigate across dashboard, habits, pomodoro, health, wheel, analytics, and settings with only one primary scroll container visible.
- Open `Settings`, edit profile text, refresh, and confirm the values persist.
- Clear one measurements field, click elsewhere, refresh, and confirm the field stays empty instead of falling back to a random value.
- Enter out-of-range settings values and confirm they clamp back into safe ranges after save.
- Open `Analytics` and confirm the page still renders even if partial API data is unavailable.
- Open `Pomodoro` and confirm an adaptive recommendation card appears only when enough rated sessions exist.
- Apply the recommendation and confirm the selected preset updates immediately.
- Complete a session, skip the quality rating, and confirm the flow continues without treating the session as quality `3`.
- Enable reduced motion in `Settings` and confirm background glows, shimmer, and entry animations are visibly softened or disabled.

## Regression Checks
- Dashboard quick habit toggle refreshes current stats without stale cached state.
- Habit area deletion refreshes the screen cleanly without client errors.
- Wheel page loads with server-backed data and renders the 10-segment radial wedges correctly.
- Verify that clicking a wedge segment updates the score immediately and persists on refresh.
- Check that the Analytics page's two-column layout stacks correctly on smaller screens.
- Confirm that Focus Time cards accurately reflect session logs without data leakage between date ranges.
- Validate that device time synchronization is consistent across the Dashboard, Analytics, and Health tabs.
