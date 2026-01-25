"""
Testing Skills Showcase
Demonstrates: pytest, unittest, mocking, fixtures, parametrization
"""

import pytest
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from typing import List


# Import from our example (assuming it exists)
# In real scenario: from showcase.python_example import DataProcessor, User


class TestDataProcessor(unittest.TestCase):
    """Unit tests demonstrating various testing patterns."""

    def setUp(self):
        """Setup method called before each test."""
        self.processor = Mock()
        self.processor.max_batch_size = 100

    def tearDown(self):
        """Cleanup method called after each test."""
        self.processor = None

    def test_validate_input_safe_data(self):
        """Test that safe input passes validation."""
        safe_inputs = [
            "Hello, World!",
            "user@example.com",
            "12345",
            "Normal text input"
        ]
        # Mock the validate_input method
        self.processor.validate_input = lambda x: not any(
            p.lower() in x.lower() for p in ['<script>', 'DROP TABLE', '--', ';--']
        )

        for data in safe_inputs:
            self.assertTrue(
                self.processor.validate_input(data),
                f"Safe input '{data}' should pass validation"
            )

    def test_validate_input_dangerous_data(self):
        """Test that dangerous input fails validation."""
        dangerous_inputs = [
            "<script>alert('xss')</script>",
            "DROP TABLE users;",
            "admin' --",
            "'; DROP TABLE users;--"
        ]
        self.processor.validate_input = lambda x: not any(
            p.lower() in x.lower() for p in ['<script>', 'DROP TABLE', '--', ';--']
        )

        for data in dangerous_inputs:
            self.assertFalse(
                self.processor.validate_input(data),
                f"Dangerous input '{data}' should fail validation"
            )


# pytest-style tests
@pytest.fixture
def sample_data():
    """Fixture providing sample test data."""
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]


@pytest.fixture
def empty_list():
    """Fixture providing empty list."""
    return []


@pytest.mark.parametrize("n,expected", [
    (0, []),
    (1, [0]),
    (2, [0, 1]),
    (5, [0, 1, 1, 2, 3]),
    (10, [0, 1, 1, 2, 3, 5, 8, 13, 21, 34])
])
def test_fibonacci_parametrized(n, expected):
    """Parametrized test for fibonacci sequence."""
    def fibonacci(n: int) -> List[int]:
        if n <= 0:
            return []
        elif n == 1:
            return [0]
        fib = [0, 1]
        for i in range(2, n):
            fib.append(fib[i-1] + fib[i-2])
        return fib

    assert fibonacci(n) == expected


@pytest.mark.parametrize("arr,target,expected", [
    ([1, 3, 5, 7, 9], 5, 2),
    ([1, 3, 5, 7, 9], 1, 0),
    ([1, 3, 5, 7, 9], 9, 4),
    ([1, 3, 5, 7, 9], 4, None),
    ([], 5, None)
])
def test_binary_search(arr, target, expected):
    """Test binary search with various inputs."""
    def binary_search(arr: List[int], target: int):
        left, right = 0, len(arr) - 1
        while left <= right:
            mid = (left + right) // 2
            if arr[mid] == target:
                return mid
            elif arr[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return None

    assert binary_search(arr, target) == expected


class TestMergeSort:
    """Test suite for merge sort algorithm."""

    def test_empty_array(self):
        """Test sorting empty array."""
        assert self._merge_sort([]) == []

    def test_single_element(self):
        """Test sorting single element."""
        assert self._merge_sort([5]) == [5]

    def test_already_sorted(self):
        """Test already sorted array."""
        assert self._merge_sort([1, 2, 3, 4, 5]) == [1, 2, 3, 4, 5]

    def test_reverse_sorted(self):
        """Test reverse sorted array."""
        assert self._merge_sort([5, 4, 3, 2, 1]) == [1, 2, 3, 4, 5]

    def test_random_order(self):
        """Test randomly ordered array."""
        assert self._merge_sort([64, 34, 25, 12, 22, 11, 90]) == [11, 12, 22, 25, 34, 64, 90]

    def test_duplicates(self):
        """Test array with duplicate values."""
        assert self._merge_sort([3, 1, 2, 3, 1, 2]) == [1, 1, 2, 2, 3, 3]

    def _merge_sort(self, arr: List[int]) -> List[int]:
        """Helper method implementing merge sort."""
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left = self._merge_sort(arr[:mid])
        right = self._merge_sort(arr[mid:])
        return self._merge(left, right)

    def _merge(self, left: List[int], right: List[int]) -> List[int]:
        """Merge two sorted arrays."""
        result = []
        i = j = 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        result.extend(left[i:])
        result.extend(right[j:])
        return result


@pytest.mark.asyncio
async def test_async_function():
    """Test async function execution."""
    import asyncio

    async def fetch_data(delay: float) -> str:
        await asyncio.sleep(delay)
        return "data fetched"

    result = await fetch_data(0.1)
    assert result == "data fetched"


class TestMocking:
    """Demonstrate mocking and patching techniques."""

    def test_mock_external_api(self):
        """Test mocking external API calls."""
        mock_api = Mock()
        mock_api.get_user.return_value = {
            'id': 1,
            'name': 'Test User',
            'email': 'test@example.com'
        }

        user = mock_api.get_user(1)
        assert user['name'] == 'Test User'
        mock_api.get_user.assert_called_once_with(1)

    @patch('datetime.datetime')
    def test_patch_datetime(self, mock_datetime):
        """Test patching datetime for consistent testing."""
        mock_datetime.now.return_value = datetime(2026, 1, 25, 12, 0, 0)

        result = datetime.now()
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 25

    def test_side_effect(self):
        """Test using side_effect for dynamic behavior."""
        mock_func = Mock(side_effect=[1, 2, 3, ValueError("Error")])

        assert mock_func() == 1
        assert mock_func() == 2
        assert mock_func() == 3

        with pytest.raises(ValueError, match="Error"):
            mock_func()


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_division_by_zero(self):
        """Test division by zero handling."""
        with pytest.raises(ZeroDivisionError):
            _ = 1 / 0

    def test_type_error(self):
        """Test type error handling."""
        with pytest.raises(TypeError):
            _ = "string" + 123

    def test_index_out_of_range(self):
        """Test index out of range handling."""
        arr = [1, 2, 3]
        with pytest.raises(IndexError):
            _ = arr[10]

    def test_key_error(self):
        """Test key error in dictionary."""
        d = {'a': 1, 'b': 2}
        with pytest.raises(KeyError):
            _ = d['nonexistent']


if __name__ == '__main__':
    # Run unittest tests
    unittest.main(argv=[''], exit=False)

    # Run pytest tests
    pytest.main([__file__, '-v'])
