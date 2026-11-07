from __future__ import annotations


def group_event_indices(events: list[int]) -> list[tuple[int, list[int], int]]:
    groups: list[tuple[int, list[int], int]] = []
    current_rise: int | None = None
    peaks: list[int] = []

    for index, event in enumerate(events):
        if event == 0:
            current_rise = index
            peaks = []
        elif event == 1 and current_rise is not None:
            peaks.append(index)
        elif event == 2 and current_rise is not None:
            if peaks:
                groups.append((current_rise, peaks.copy(), index))
            current_rise = None
            peaks = []

    return groups
