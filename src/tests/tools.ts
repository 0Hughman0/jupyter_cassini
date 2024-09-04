import { JSONObject } from '@lumino/coreutils';

import { URLExt } from '@jupyterlab/coreutils';
import {
  Contents,
  ServiceManager,
  ServerConnection
} from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';

import { cassini } from '../core';
import { paths } from '../schema/schema';

export interface IFile {
  path: string;
  content: JSONObject;
}

export async function createTierFiles(files: IFile[]): Promise<{
  manager: ServiceManager.IManager;
  files: Contents.IModel[];
}> {
  const manager = new ServiceManagerMock();
  cassini.contentService = manager;

  const filesOut: Contents.IModel[] = [];

  for (const file of files) {
    const newFile = await manager.contents.newUntitled({
      path: file.path,
      type: 'file'
    });

    (newFile as any)['content'] = JSON.stringify(file.content);
    await manager.contents.rename(newFile.path, file.path);

    filesOut.push(newFile);
  }

  return { manager: manager, files: filesOut };
}


export interface MockAPICall {
  query: { [key: string]: string };
  response: any;
}

export type MockAPICalls = { [endpoint in keyof paths]?: MockAPICall[] };

export function mockServerAPI(calls: MockAPICalls): void {
  ServerConnection.makeRequest = jest.fn((url, init, settings) => {
    const { pathname, search } = URLExt.parse(url);

    const query = search ? URLExt.queryStringToObject(search.slice(1)) : {};

    const mockResponses = calls[
      pathname.replace('/jupyter_cassini', '') as keyof MockAPICalls
    ] as MockAPICall[] | undefined;

    if (!mockResponses) {
      throw TypeError(`Could not find endpoint ${pathname}`);
    }

    for (const response of mockResponses) {
      if (JSON.stringify(response.query) == JSON.stringify(query)) {
        return Promise.resolve(new Response(JSON.stringify(response.response)));
      }
    }

    throw TypeError(
      `Couldn't find matching mock response to query ${JSON.stringify(query)}`
    );
  }) as jest.Mocked<typeof ServerConnection.makeRequest>;
}
