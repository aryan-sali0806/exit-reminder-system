from typing import List


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
