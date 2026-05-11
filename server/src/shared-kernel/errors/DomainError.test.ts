import { describe, expect, it } from 'vitest';
import { DomainError } from './DomainError.js';

class ExampleError extends DomainError {
  readonly code = 'example.failed';
}

class OtherError extends DomainError {
  readonly code = 'other.failed';
}

describe('DomainError', () => {
  it('carries a stable code per subclass', () => {
    const e = new ExampleError('something went wrong');
    expect(e.code).toBe('example.failed');
    expect(e.message).toBe('something went wrong');
  });

  it('sets name to the concrete subclass name', () => {
    const e = new ExampleError('x');
    expect(e.name).toBe('ExampleError');
  });

  it('is an instanceof its subclass and DomainError and Error', () => {
    const e = new ExampleError('x');
    expect(e).toBeInstanceOf(ExampleError);
    expect(e).toBeInstanceOf(DomainError);
    expect(e).toBeInstanceOf(Error);
  });

  it('different subclasses are distinguishable by instanceof', () => {
    const e: DomainError = new ExampleError('x');
    expect(e instanceof ExampleError).toBe(true);
    expect(e instanceof OtherError).toBe(false);
  });
});
