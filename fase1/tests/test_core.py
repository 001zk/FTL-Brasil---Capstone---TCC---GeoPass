import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from geopass_core import group_event_indices


class GroupEventIndicesTests(unittest.TestCase):
    def test_one_complete_pass(self):
        self.assertEqual(group_event_indices([0, 1, 2]), [(0, [1], 2)])

    def test_multiple_culminations_belong_to_same_pass(self):
        self.assertEqual(group_event_indices([0, 1, 1, 2]), [(0, [1, 2], 3)])

    def test_incomplete_passes_are_not_published(self):
        self.assertEqual(group_event_indices([1, 2, 0, 1]), [])

    def test_two_passes(self):
        self.assertEqual(group_event_indices([0, 1, 2, 0, 1, 2]), [(0, [1], 2), (3, [4], 5)])


if __name__ == "__main__":
    unittest.main()
