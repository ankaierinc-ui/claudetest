// Rust Skills Showcase - Memory Safety & Concurrency
// Demonstrates: Ownership, lifetimes, error handling, async programming

use std::collections::HashMap;
use std::error::Error;
use std::fmt;

/// Custom error type demonstrating error handling patterns
#[derive(Debug)]
enum DataError {
    NotFound(String),
    ValidationError(String),
    ParseError(String),
}

impl fmt::Display for DataError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DataError::NotFound(msg) => write!(f, "Not found: {}", msg),
            DataError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            DataError::ParseError(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl Error for DataError {}

/// Generic data structure demonstrating lifetimes
struct DataStore<'a, T> {
    data: HashMap<&'a str, T>,
    max_capacity: usize,
}

impl<'a, T> DataStore<'a, T> {
    fn new(max_capacity: usize) -> Self {
        DataStore {
            data: HashMap::new(),
            max_capacity,
        }
    }

    fn insert(&mut self, key: &'a str, value: T) -> Result<(), DataError> {
        if self.data.len() >= self.max_capacity {
            return Err(DataError::ValidationError(
                "Store is at maximum capacity".to_string(),
            ));
        }
        self.data.insert(key, value);
        Ok(())
    }

    fn get(&self, key: &str) -> Result<&T, DataError> {
        self.data
            .get(key)
            .ok_or_else(|| DataError::NotFound(format!("Key '{}' not found", key)))
    }

    fn len(&self) -> usize {
        self.data.len()
    }
}

/// Smart pointer demonstration with reference counting
use std::rc::Rc;
use std::cell::RefCell;

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
}

impl Node {
    fn new(value: i32) -> Rc<RefCell<Self>> {
        Rc::new(RefCell::new(Node { value, next: None }))
    }
}

/// Pattern matching and Option handling
fn find_max(numbers: &[i32]) -> Option<i32> {
    match numbers {
        [] => None,
        [single] => Some(*single),
        _ => {
            let max = numbers.iter().max()?;
            Some(*max)
        }
    }
}

/// Iterator and functional programming patterns
fn process_data(data: Vec<i32>) -> Vec<i32> {
    data.into_iter()
        .filter(|&x| x > 0)
        .map(|x| x * 2)
        .take(10)
        .collect()
}

/// Result type and error propagation
fn parse_and_validate(input: &str) -> Result<i32, DataError> {
    let num = input
        .trim()
        .parse::<i32>()
        .map_err(|e| DataError::ParseError(e.to_string()))?;

    if num < 0 {
        return Err(DataError::ValidationError(
            "Number must be non-negative".to_string(),
        ));
    }

    Ok(num)
}

/// Trait implementation for custom behavior
trait Processable {
    fn process(&self) -> String;
    fn validate(&self) -> bool;
}

struct DataItem {
    id: u32,
    content: String,
}

impl Processable for DataItem {
    fn process(&self) -> String {
        format!("[{}] {}", self.id, self.content.to_uppercase())
    }

    fn validate(&self) -> bool {
        !self.content.is_empty() && self.id > 0
    }
}

/// Demonstration of borrowing and ownership
fn demonstrate_ownership() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); // Explicit clone to maintain ownership

    println!("s1 = {}, s2 = {}", s1, s2);

    // Borrowing
    let len = calculate_length(&s1);
    println!("Length of '{}' is {}", s1, len);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}

/// Generic function with trait bounds
fn print_processable<T: Processable>(item: &T) {
    if item.validate() {
        println!("Processed: {}", item.process());
    } else {
        println!("Invalid item");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_store() {
        let mut store: DataStore<i32> = DataStore::new(10);
        assert!(store.insert("key1", 42).is_ok());
        assert_eq!(*store.get("key1").unwrap(), 42);
    }

    #[test]
    fn test_find_max() {
        assert_eq!(find_max(&[1, 5, 3, 2]), Some(5));
        assert_eq!(find_max(&[]), None);
        assert_eq!(find_max(&[42]), Some(42));
    }

    #[test]
    fn test_process_data() {
        let input = vec![-1, 2, 3, -4, 5];
        let result = process_data(input);
        assert_eq!(result, vec![4, 6, 10]);
    }

    #[test]
    fn test_parse_and_validate() {
        assert!(parse_and_validate("42").is_ok());
        assert!(parse_and_validate("-5").is_err());
        assert!(parse_and_validate("invalid").is_err());
    }
}

fn main() {
    println!("=== Rust Skills Demonstration ===\n");

    // Data store example
    let mut store: DataStore<String> = DataStore::new(5);
    store.insert("rust", "Systems programming".to_string()).unwrap();
    println!("Store contains {} items", store.len());

    // Pattern matching
    let numbers = vec![10, 20, 30, 40];
    match find_max(&numbers) {
        Some(max) => println!("Maximum value: {}", max),
        None => println!("No maximum found"),
    }

    // Functional programming
    let data = vec![-5, 10, -3, 7, 2, -1, 15];
    let processed = process_data(data);
    println!("Processed data: {:?}", processed);

    // Trait usage
    let item = DataItem {
        id: 1,
        content: "Hello, Rust!".to_string(),
    };
    print_processable(&item);

    // Ownership demonstration
    demonstrate_ownership();
}
