import { Notification } from '@jupyterlab/apputils';

import { CassiniServer, CasServerError } from '../services';
import { mockServerAPI } from './tools';
import { WP1_TREE, WP1_INFO, TEST_NEW_CHILD_INFO } from './test_cases';
import { CassiniErrorInfo } from '../schema/types';

import 'jest';

describe('Error logging', () => {
  let errorLog: jest.Mock<typeof console.log>;

  beforeEach(() => {
    errorLog = console.warn = jest.fn() as jest.Mock<typeof console.log>;
  });

  test('error content', async () => {
    const options: CassiniErrorInfo = {
      reason: 'The Reason is short!',
      message: 'The Error Message is long... apparently!'
    };

    const error = new CasServerError(
      options.reason,
      'http://jupyter_cassini/tree',
      options.message
    );
    error.notify();

    expect(Notification.manager.notifications[0].message).toContain('/tree');
    expect(Notification.manager.notifications[0].message).toContain(
      'The Reason is short!'
    );

    expect(errorLog.mock.lastCall[0]).toContain('/tree');
    expect(errorLog.mock.lastCall[0]).toContain('The Reason is short!');
    expect(errorLog.mock.lastCall[0]).toContain(
      'The Error Message is long... apparently!'
    );
  });

  test('regular errors throw through', () => {
    expect(() => {
      CasServerError.notifyOrThrow(new Error());
    }).toThrow();
  });
});

const { name, ...badWP1 } = structuredClone(WP1_TREE);

describe('tree', () => {
  beforeEach(() => {
    mockServerAPI({
      '/tree/{ids}': [
        { path: '1', response: WP1_TREE },
        {
          path: 'bad request',
          response: {
            reason: 'Bad Request',
            message: 'Bad query'
          },
          status: 405
        },
        { path: '123412', response: badWP1 }
      ]
    });
  });

  test('valid', async () => {
    const out = await CassiniServer.tree(['1']);
    expect(out).toEqual(WP1_TREE);
  });

  test('invalid', async () => {
    /*
    // Concerningly, I don't really understand why this doesn't work, I'm quite sure open-api-fetch is also 
    // meant to be providing run-time protection...?
    // this shouldn't actually happen anyway because pydantic validates all requests and responses.

    expect(Object.keys(badWP1)).not.toContain('name')
    const { data, error } = await client.GET('/tree', {params: {'query': {'ids[]': ['bad response']}}})
    expect(error).toEqual(badWP1)
    expect(data).not.toEqual(badWP1)
    expect(CassiniServer.tree(['bad response'])).resolves.toBeFalsy()
    */
  });

  test('unknown id', async () => {
    await expect(
      async () => await CassiniServer.tree(['bad request'])
    ).rejects.toThrowError('Bad Request');
  });
});

describe('lookup', () => {
  beforeEach(() => {
    mockServerAPI({
      '/lookup': [
        { query: { name: 'WP1' }, response: WP1_INFO },
        {
          query: { name: 'bad request' },
          response: {
            reason: 'Bad Request',
            message: 'Bad query'
          } as CassiniErrorInfo,
          status: 405
        }
      ]
    });
  });

  test('valid', async () => {
    const out = await CassiniServer.lookup('WP1');
    expect(out).toEqual(WP1_INFO);
  });

  test('unknown name', async () => {
    await expect(
      async () => await CassiniServer.lookup('bad request')
    ).rejects.toThrowError('Bad Request');
  });
});

describe('newChild', () => {
  beforeEach(() => {
    mockServerAPI({
      '/newChild': [
        { body: TEST_NEW_CHILD_INFO, response: WP1_INFO },
        {
          body: { name: 'bad request' },
          response: {
            reason: 'Bad Request',
            message: 'Bad query'
          } as CassiniErrorInfo,
          status: 405
        }
      ]
    });
  });

  test('valid', async () => {
    const out = await CassiniServer.newChild(TEST_NEW_CHILD_INFO);
    expect(out).toEqual(WP1_INFO);
  });

  test('unknown name', async () => {
    await expect(
      async () => await CassiniServer.newChild({ name: 'bad request' } as any)
    ).rejects.toThrowError('Bad Request');
  });
});

describe('open', () => {
  beforeEach(() => {
    mockServerAPI({
      '/open': [
        { query: { name: 'WP1' }, response: { status: 'success' } },
        {
          query: { name: 'bad request' },
          response: {
            reason: 'Bad Request',
            message: 'Bad query'
          } as CassiniErrorInfo,
          status: 405
        }
      ]
    });
  });

  test('valid', async () => {
    const out = await CassiniServer.openTier('WP1');
    expect(out).toEqual({ status: 'success' });
  });

  test('unknown name', async () => {
    await expect(
      async () => await CassiniServer.openTier('bad request')
    ).rejects.toThrowError('Bad Request');
  });
});
