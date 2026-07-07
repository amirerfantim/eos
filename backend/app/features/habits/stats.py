"""Streak computation.

Pure functions over a set of completed dates — no DB access — so they are
trivial to unit-test and reason about.
"""

import datetime as dt


def compute_stats(
    done_dates: set[dt.date], today: dt.date
) -> tuple[bool, int, int]:
    """Return (done_today, current_streak, best_streak) for one habit.

    - done_today: whether `today` is in the completed set.
    - current_streak: consecutive completed days ending today (or ending
      yesterday if today isn't done yet, so a streak isn't shown as broken
      before the day is over).
    - best_streak: the longest run of consecutive completed days ever.
    """
    done_today = today in done_dates

    # Walk backwards from today (or yesterday) counting consecutive days.
    current = 0
    cursor = today if done_today else today - dt.timedelta(days=1)
    while cursor in done_dates:
        current += 1
        cursor -= dt.timedelta(days=1)

    # Scan all dates in order for the longest consecutive run.
    best = 0
    if done_dates:
        ordered = sorted(done_dates)
        run = best = 1
        for prev, cur in zip(ordered, ordered[1:]):
            run = run + 1 if cur - prev == dt.timedelta(days=1) else 1
            best = max(best, run)

    return done_today, current, best
