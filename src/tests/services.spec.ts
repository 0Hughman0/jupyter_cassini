import { Notification } from '@jupyterlab/apputils';

import { CassiniServer, handleServerError, client } from '../services';
import { mockServerAPI } from './tools';
import { WP1_TREE } from './test_cases';
import { CassiniServerError } from '../schema/types';


import 'jest';

describe('Error logging', () => {
  let errorLog: jest.Mock<typeof console.log>

  beforeEach(() => {
    errorLog = console.error = jest.fn() as jest.Mock<typeof console.log>;
  })

  test('error content', async () => {
    const response = {url: 'http://jupyter_cassini/tree'} as Response

    handleServerError(response, {
      reason: "The Reason is short!",
      message: "The Error Message is long... apparently!"
    })

    expect(Notification.manager.notifications[0].message).toContain('/tree')
    expect(Notification.manager.notifications[0].message).toContain('The Reason is short!')

    expect(errorLog.mock.lastCall[0]).toContain('/tree')
    expect(errorLog.mock.lastCall[0]).toContain('The Reason is short!')
    expect(errorLog.mock.lastCall[0]).toContain("The Error Message is long... apparently!")
  })
})

const {name, ...badWP1} = structuredClone(WP1_TREE)

describe('lookup', () => {  
  let errorLog: jest.Mock<typeof console.log>

  beforeEach(() => {
    errorLog = console.error = jest.fn() as jest.Mock<typeof console.log>;

    mockServerAPI({
      '/tree': [
        { query: { 'ids[]': '1' }, response: WP1_TREE }, 
        { query: { 'ids[]': 'bad request' }, response: {reason: "Bad Request", message: "Bad query"} as CassiniServerError , status: 405},
        { query: { 'ids[]': 'bad response' }, response: badWP1 }, 
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
    await expect(async () => await CassiniServer.tree(['bad request'])).rejects.toThrowError("Bad Request");
    expect(Notification.manager.notifications[0].message).toMatch('Bad Request')
    expect(errorLog.mock.lastCall[0]).toContain('Bad Request')    
  })
});
