import { JSONObject } from '@lumino/coreutils';

import { URLExt } from '@jupyterlab/coreutils';
import {
  Contents,
  ServiceManager,
  ServerConnection
} from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';

import { cassini } from '../core';
import { ITreeResponse, ITierInfo } from '../services';

export const TEST_META_CONTENT: JSONObject = {
  description: 'this is a test',
  conclusion: 'concluded',
  started: '01/22/2023',
  temperature: 273
};

export const TEST_HLT_CONTENT = {
  cos: [{ data: { 'text/markdown': '## cos' }, metadata: {}, transient: {} }]
};

export const HOME_RESPONSE: ITreeResponse = require('./test_home_branch.json');
export const WP1_RESPONSE: ITreeResponse = require('./test_WP1_branch.json');
export const WP1_1_RESPONSE: ITreeResponse = require('./test_WP1_1_branch.json');

export async function createTierFiles(
  metaContent: JSONObject,
  hltsContent?: JSONObject
): Promise<{
  manager: ServiceManager.IManager;
  metaFile: Contents.IModel;
  hltsFile: Contents.IModel;
}> {
  const manager = new ServiceManagerMock();
  cassini.contentService = manager;

  const metaFile = (await manager.contents.newUntitled({
    path: '/WorkPackages/WP1/.exps/',
    type: 'file'
  })) as any;

  (metaFile as any)['content'] = JSON.stringify(metaContent);

  const hltsFile = await manager.contents.newUntitled({
    path: '/WorkPackages/WP1/.exps/', // filename is set as unique
    type: 'file'
  });

  (hltsFile as any)['content'] = JSON.stringify(hltsContent);

  return { manager, metaFile, hltsFile };
}

export function mockServer() {
  ServerConnection.makeRequest = jest.fn((url, init, settings) => {
    const { pathname, search } = URLExt.parse(url);

    const query = search ? URLExt.queryStringToObject(search.slice(1)) : {};

    switch (pathname) {
      case '/jupyter_cassini/tree': {
        let responseData: ITreeResponse;

        switch (query.identifiers?.toString()) {
          case [].toString(): {
            responseData = HOME_RESPONSE;
            break;
          }
          case ['1'].toString(): {
            responseData = WP1_RESPONSE;
            break;
          }
          case ['1', '1'].toString(): {
            responseData = WP1_1_RESPONSE;
            break;
          }
          default: {
            throw 'No mock data for request';
          }
        }
        return new Promise(resolve =>
          resolve(new Response(JSON.stringify(responseData)))
        );
      }

      case '/jupyter_cassini/lookup': {
        let responseData: ITierInfo;

        switch (query.id) {
          case 'Home': {
            responseData = { identifiers: [], ...(HOME_RESPONSE as any) };
            break;
          }
          case 'WP1': {
            responseData = { identifiers: ['1'], ...(WP1_RESPONSE as any) };
            break;
          }
          case 'WP1.1': {
            responseData = {
              identifiers: ['1', '1'],
              ...(WP1_1_RESPONSE as any)
            };
            break;
          }
          default: {
            throw 'No mock data for request';
          }
        }
        return new Promise(resolve =>
          resolve(new Response(JSON.stringify(responseData)))
        );
      }
    }
  }) as jest.Mocked<typeof ServerConnection.makeRequest>;
}
