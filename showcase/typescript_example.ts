/**
 * TypeScript Skills Showcase - Advanced Type System & Async Operations
 * Demonstrates: Generics, async/await, design patterns, type safety
 */

// Advanced type definitions
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Generic cache implementation with LRU strategy
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// API client with retry logic and error handling
class APIClient {
  private baseURL: string;
  private retryAttempts: number;
  private cache: LRUCache<string, any>;

  constructor(baseURL: string, retryAttempts: number = 3) {
    this.baseURL = baseURL;
    this.retryAttempts = retryAttempts;
    this.cache = new LRUCache(50);
  }

  async fetch<T>(endpoint: string, useCache: boolean = true): Promise<Result<T>> {
    const cacheKey = `${this.baseURL}${endpoint}`;

    if (useCache && this.cache.has(cacheKey)) {
      return { success: true, data: this.cache.get(cacheKey) };
    }

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await this.makeRequest<T>(endpoint);

        if (useCache) {
          this.cache.set(cacheKey, response);
        }

        return { success: true, data: response };
      } catch (error) {
        if (attempt === this.retryAttempts - 1) {
          return {
            success: false,
            error: error instanceof Error ? error : new Error('Unknown error')
          };
        }

        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    return { success: false, error: new Error('Max retries exceeded') };
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Simulated API request
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve({ data: 'Mock response' } as T);
        } else {
          reject(new Error('Network error'));
        }
      }, 100);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Observer pattern implementation
interface Observer<T> {
  update(data: T): void;
}

class Observable<T> {
  private observers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  notify(data: T): void {
    this.observers.forEach(observer => observer.update(data));
  }

  getObserverCount(): number {
    return this.observers.size;
  }
}

// State machine implementation
type State = 'idle' | 'loading' | 'success' | 'error';
type Event = 'FETCH' | 'SUCCESS' | 'ERROR' | 'RESET';

class StateMachine {
  private state: State = 'idle';
  private transitions: Map<State, Map<Event, State>>;

  constructor() {
    this.transitions = new Map([
      ['idle', new Map([['FETCH', 'loading' as State]])],
      ['loading', new Map([['SUCCESS', 'success' as State], ['ERROR', 'error' as State]])],
      ['success', new Map([['RESET', 'idle' as State]])],
      ['error', new Map([['RESET', 'idle' as State], ['FETCH', 'loading' as State]])]
    ]);
  }

  getState(): State {
    return this.state;
  }

  transition(event: Event): boolean {
    const nextState = this.transitions.get(this.state)?.get(event);

    if (nextState) {
      this.state = nextState;
      return true;
    }

    return false;
  }
}

// Demonstration function
async function demonstrateFeatures(): Promise<void> {
  console.log('=== TypeScript Skills Demonstration ===\n');

  // LRU Cache
  const cache = new LRUCache<string, number>(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  console.log('Cache has "a":', cache.has('a'));

  // API Client with retry
  const client = new APIClient('https://api.example.com');
  const result = await client.fetch<any>('/users');
  console.log('API Result:', result.success ? 'Success' : 'Failed');

  // Observer pattern
  const observable = new Observable<string>();
  const observer = {
    update: (data: string) => console.log('Observer received:', data)
  };
  observable.subscribe(observer);
  observable.notify('Hello, Observers!');

  // State machine
  const stateMachine = new StateMachine();
  console.log('\nState Machine Demo:');
  console.log('Initial state:', stateMachine.getState());
  stateMachine.transition('FETCH');
  console.log('After FETCH:', stateMachine.getState());
  stateMachine.transition('SUCCESS');
  console.log('After SUCCESS:', stateMachine.getState());
}

export {
  LRUCache,
  APIClient,
  Observable,
  StateMachine,
  demonstrateFeatures,
  type Result,
  type Repository
};
