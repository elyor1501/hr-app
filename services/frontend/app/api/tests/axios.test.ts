import MockAdapter from 'axios-mock-adapter';
import { api } from '../axios';
import * as authUtils from '../utils/auth';
import { describe, it, expect, vi } from 'vitest';

describe('API client configuration', () => {
  it('uses configured base URL', () => {
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('uses configured timeout', () => {
    expect(api.defaults.timeout).toBe(10000);
  });

  it('handles 401 responses by triggering auth flow', async () => {
    const mock = new MockAdapter(api);
    mock.onGet('/secure').reply(401);

    const spy = vi.spyOn(authUtils, 'redirectToLogin');

    try {
      await api.get('/secure');
    } catch (_) {}

    expect(spy).toHaveBeenCalled();
  });
});
