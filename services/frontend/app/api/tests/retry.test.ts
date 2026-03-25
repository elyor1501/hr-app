import { withRetry } from '../utils/retry';
import { describe, it, expect } from 'vitest';

describe('withRetry', () => {
  it('retries failed request before succeeding', async () => {
    let attempts = 0;

    const request = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Network error');
      }
      return 'success';
    };

    const result = await withRetry(request, 2);

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('throws error after retries are exhausted', async () => {
    const request = async () => {
      throw new Error('Fail');
    };

    await expect(withRetry(request, 1)).rejects.toThrow('Fail');
  });
});
