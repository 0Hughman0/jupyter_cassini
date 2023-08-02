import { JSONObject } from '@lumino/coreutils'

import { Contents, ServiceManager } from '@jupyterlab/services'
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';


import { cassini } from '../core';
import { CassiniServer, ITreeResponse } from '../services';

export const TEST_META_CONTENT: JSONObject = {
    description: 'this is a test',
    conclusion: 'concluded',
    started: '01/22/2023',
    temperature: 273
};
  
export const TEST_HLT_CONTENT = {"cos": [{"data": {"text/markdown": "## cos"}, "metadata": {}, "transient": {}}]}
  
export const HOME_RESPONSE: ITreeResponse = require('./test_home_branch.json');
export const WP1_RESPONSE: ITreeResponse = require('./test_WP1_branch.json');
export const WP1_1_RESPONSE: ITreeResponse = require('./test_WP1_1_branch.json');


export async function createTierFiles(metaContent: JSONObject, hltsContent?: JSONObject): Promise<{manager: ServiceManager.IManager, metaFile: Contents.IModel, hltsFile: Contents.IModel}> {
    const manager = new ServiceManagerMock();
    cassini.contentService = manager;
    
    const metaFile = await manager.contents.newUntitled({
      path: '/WorkPackages/WP1/.exps/',
      type: 'file'
    }) as any;

    (metaFile as any)['content'] = JSON.stringify(metaContent)
    
    const hltsFile = await manager.contents.newUntitled({
        path: '/WorkPackages/WP1/.exps/', // filename is set as unique
        type: 'file'
      });

    (hltsFile as any)['content'] = JSON.stringify(hltsContent)
    
    return {manager, metaFile, hltsFile}
}

export function mockServer() {
    CassiniServer.tree = jest.fn(
        query => new Promise(resolve => {
            switch (query.toString()) {
                case [].toString(): {
                resolve(Object.assign({}, HOME_RESPONSE)) // ensures requests to server return new objects
                }
                case ['1'].toString(): {
                resolve(Object.assign({}, WP1_RESPONSE))
                }

                case ['1', '1'].toString(): {
                resolve(Object.assign({}, WP1_1_RESPONSE))
                }
                default: {
                throw "No mock data for request"
                }
            }
        })
    ) as jest.Mocked<typeof CassiniServer.tree>;
}