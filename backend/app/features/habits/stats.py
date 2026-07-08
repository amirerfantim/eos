"""Streak / progress computation.

Pure functions over a habit's per-day completion counts — no DB access — so they
are trivial to unit-test and reason about.

A "period" is met when the counts within it sum to at least the target:
- period="day":  each calendar day is judged on its own count.
- period="week": each ISO week (Mon–Sun) is judged on its summed count.

Streaks are runs of consecutive *met periods* ending at the current one (or the
previous one, if the current period isn't finished yet — so a streak isn't shown
as broken before the day/week is over).
"""

import datetime as dt


def _week_start(day: dt.date) -> dt.date:
    """Monday of the ISO week containing `day`."""
    return day - dt.timedelta(days=day.weekday())


def compute_stats(
    counts: dict[dt.date, int], today: dt.date, target: int, period: str
) -> tuple[bool, int, int, int]:
    """Return (done_today, count_today, current_streak, best_streak).

    - done_today:   the current period's target is met.
    - count_today:  progress within the current period (today's count for a
                    daily goal; the running week total for a weekly goal).
    - current_streak / best_streak: consecutive met periods.
    """
    if period == "week":
        return _weekly_stats(counts, today, target)
    return _daily_stats(counts, today, target)


def _daily_stats(
    counts: dict[dt.date, int], today: dt.date, target: int
) -> tuple[bool, int, int, int]:
    count_today = counts.get(today, 0)
    done_today = count_today >= target

    def met(day: dt.date) -> bool:
        return counts.get(day, 0) >= target

    # Walk back from today (or yesterday if today isn't met yet).
    current = 0
    cursor = today if done_today else today - dt.timedelta(days=1)
    while met(cursor):
        current += 1
        cursor -= dt.timedelta(days=1)

    # Longest run of consecutive met days ever.
    met_days = sorted(d for d, c in counts.items() if c >= target)
    best = _longest_run(met_days, dt.timedelta(days=1))

    return done_today, count_today, current, best


def _weekly_stats(
    counts: dict[dt.date, int], today: dt.date, target: int
) -> tuple[bool, int, int, int]:
    # Sum each week's counts, keyed by the week's Monday.
    by_week: dict[dt.date, int] = {}
    for day, c in counts.items():
        by_week[_week_start(day)] = by_week.get(_week_start(day), 0) + c

    this_week = _week_start(today)
    count_today = by_week.get(this_week, 0)
    done_today = count_today >= target

    def met(week: dt.date) -> bool:
        return by_week.get(week, 0) >= target

    current = 0
    cursor = this_week if done_today else this_week - dt.timedelta(weeks=1)
    while met(cursor):
        current += 1
        cursor -= dt.timedelta(weeks=1)

    met_weeks = sorted(w for w, total in by_week.items() if total >= target)
    best = _longest_run(met_weeks, dt.timedelta(weeks=1))

    return done_today, count_today, current, best


def _longest_run(ordered: list[dt.date], step: dt.timedelta) -> int:
    """Longest run of consecutive dates (spaced by `step`) in a sorted list."""
    if not ordered:
        return 0
    run = best = 1
    for prev, cur in zip(ordered, ordered[1:]):
        run = run + 1 if cur - prev == step else 1
        best = max(best, run)
    return best
