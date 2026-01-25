"""
Python Skills Showcase - Data Processing & Algorithm Implementation
Demonstrates: Type hints, error handling, algorithms, data structures
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class User:
    """User data model with validation."""
    id: int
    username: str
    email: str
    created_at: datetime

    def to_dict(self) -> Dict:
        """Serialize user to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


class DataProcessor:
    """Advanced data processing with security considerations."""

    def __init__(self, max_batch_size: int = 1000):
        self.max_batch_size = max_batch_size
        self._cache: Dict[str, any] = {}

    def validate_input(self, data: str) -> bool:
        """Validate input to prevent injection attacks."""
        dangerous_patterns = ['<script>', 'DROP TABLE', '--', ';--']
        return not any(pattern.lower() in data.lower() for pattern in dangerous_patterns)

    def fibonacci(self, n: int) -> List[int]:
        """Generate fibonacci sequence using dynamic programming."""
        if n <= 0:
            return []
        elif n == 1:
            return [0]

        fib = [0, 1]
        for i in range(2, n):
            fib.append(fib[i-1] + fib[i-2])
        return fib

    def binary_search(self, arr: List[int], target: int) -> Optional[int]:
        """Efficient binary search implementation."""
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

    def merge_sort(self, arr: List[int]) -> List[int]:
        """Merge sort algorithm - O(n log n)."""
        if len(arr) <= 1:
            return arr

        mid = len(arr) // 2
        left = self.merge_sort(arr[:mid])
        right = self.merge_sort(arr[mid:])

        return self._merge(left, right)

    def _merge(self, left: List[int], right: List[int]) -> List[int]:
        """Helper method for merge sort."""
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

    def process_batch(self, items: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """Process batch with error handling and validation."""
        processed = []
        errors = []

        for idx, item in enumerate(items[:self.max_batch_size]):
            try:
                if 'data' in item and self.validate_input(str(item['data'])):
                    processed.append({
                        'id': idx,
                        'data': item['data'],
                        'processed_at': datetime.now().isoformat()
                    })
                else:
                    errors.append(f"Invalid data at index {idx}")
            except Exception as e:
                errors.append(f"Error at index {idx}: {str(e)}")

        return processed, errors


def demonstrate_features():
    """Demonstrate various Python capabilities."""
    processor = DataProcessor(max_batch_size=100)

    # Algorithm demonstration
    print("Fibonacci(10):", processor.fibonacci(10))

    # Sorting demonstration
    unsorted = [64, 34, 25, 12, 22, 11, 90]
    print("Merge Sort:", processor.merge_sort(unsorted))

    # Binary search demonstration
    sorted_arr = [1, 3, 5, 7, 9, 11, 13, 15]
    print("Binary Search for 7:", processor.binary_search(sorted_arr, 7))

    # User model demonstration
    user = User(
        id=1,
        username="demo_user",
        email="demo@example.com",
        created_at=datetime.now()
    )
    print("User JSON:", json.dumps(user.to_dict(), indent=2))


if __name__ == "__main__":
    demonstrate_features()
