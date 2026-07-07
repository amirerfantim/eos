"""Time helpers.

Habits are day-based, so "today" must be computed in the user's timezone (not
the server's UTC), otherwise a habit done late at night could land on the wrong
calendar day and break the streak.
"""

import datetime as dt
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def today_in(timezone: str) -> dt.date:
    """Return the current local calendar date in the given IANA timezone.

    Falls back to UTC if the timezone name is unknown, so a bad settings value
    can never crash a request.
    """
    try:
        tz = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError):
        tz = ZoneInfo("UTC")
    return dt.datetime.now(tz).date()
