from datetime import datetime
from typing import List
from zoneinfo import ZoneInfo


def is_schedule_active(schedule: dict | None, now: datetime) -> bool:
    """Return False only when a schedule exists and the current time is outside its window."""
    if not schedule:
        return True
    try:
        tz = ZoneInfo(schedule.get("tz", "Asia/Kolkata"))
        local = now.astimezone(tz)
        if local.weekday() not in schedule.get("days", list(range(7))):
            return False
        sh, sm = map(int, schedule["start"].split(":"))
        eh, em = map(int, schedule["end"].split(":"))
        cur = local.hour * 60 + local.minute
        return sh * 60 + sm <= cur <= eh * 60 + em
    except Exception:
        return True  # malformed schedule → always active (fail open)


def make_speech(missing: List[str]) -> str:
    if not missing:
        return "All items carried. Have a good day."
    if len(missing) == 1:
        items = missing[0]
    else:
        items = ", ".join(missing[:-1]) + " and " + missing[-1]
    return f"Alert. Please remember your {items}."


def compute_required(active_lists: List[dict]) -> set:
    """
    C_required = union of all active lists' tag names.
    Each dict must have a 'tag_names' key with a list of strings.
    Context rules (weather, schedule) will be inserted here when needed.
    """
    required: set = set()
    for lst in active_lists:
        required |= set(lst.get("tag_names", []))
    # Hook point: apply context rules here (weather, schedule, etc.)
    return required
