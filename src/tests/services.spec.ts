import { CassiniServer } from '../services';
import { WP1_RESPONSE, mockServer } from './tools';

import 'jest';

describe('lookup', () => {
  beforeEach(() => mockServer());

  test('valid', async () => {
    const out = await CassiniServer.tree(['1']);

    expect(out).toEqual(WP1_RESPONSE);
  });
});
