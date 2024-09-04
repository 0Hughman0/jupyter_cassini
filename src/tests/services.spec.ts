import { CassiniServer } from '../services';
import { mockServerAPI } from './tools';
import { WP1_TREE } from './test_cases';

import 'jest';

describe('lookup', () => {
  beforeEach(
    () => {
      mockServerAPI({
        '/tree': [
          { query: { 'ids[]': '1' }, response: WP1_TREE },
        ]
      })
  });

  test('valid', async () => {
    const out = await CassiniServer.tree(['1']);

    expect(out).toEqual(WP1_TREE);
  });
});
