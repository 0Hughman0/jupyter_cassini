import { CassiniServer } from '../services';
import {  mockServer } from './tools';
import { WP1_TREE } from './test_cases'

import 'jest';

describe('lookup', () => {
  beforeEach(() => mockServer());

  test('valid', async () => {
    const out = await CassiniServer.tree(['1']);

    expect(out).toEqual(WP1_TREE);
  });
});
