import { JSONObject } from '@lumino/coreutils';

import { URLExt } from '@jupyterlab/coreutils';
import {
  Contents,
  ServiceManager,
  ServerConnection
} from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';

import { cassini } from '../core';
import { TreeResponse, TierInfo } from '../schema/types';
import { HOME_TREE, WP1_TREE, WP1_1_TREE, TEST_META_CONTENT, TEST_HLT_CONTENT, HOME_INFO, WP1_INFO, WP1_1_INFO } from './test_cases';


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
        let responseData: TreeResponse;

        switch (query['ids[]']?.toString()) {
          case [].toString(): {
            responseData = HOME_TREE;
            break;
          }
          case ['1'].toString(): {
            responseData = WP1_TREE;
            break;
          }
          case ['1', '1'].toString(): {
            responseData = WP1_1_TREE;
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
        let responseData: TierInfo;

        switch (query.name) {
          case 'Home': {
            responseData = HOME_INFO;
            break;
          }
          case 'WP1': {
            responseData = WP1_INFO;
            break;
          }
          case 'WP1.1': {
            responseData = WP1_1_INFO
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
