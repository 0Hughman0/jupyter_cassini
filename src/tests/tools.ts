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
import { CassiniServerError } from '../schema/types';

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
  query?: { [key: string]: string };
  body?: any;
  response: CassiniServerError | any;
  status?: number;
}

export type MockAPICalls = { [endpoint in keyof paths]?: MockAPICall[] };

export function mockServerAPI(calls: MockAPICalls): void {
  ServerConnection.makeRequest = jest.fn((url, init, settings) => {
    const { pathname, search } = URLExt.parse(url);

    const mockResponses = calls[
      pathname.replace('/jupyter_cassini', '') as keyof MockAPICalls
    ] as MockAPICall[] | undefined;

    if (!mockResponses) {
      throw TypeError('No mocked responses found for this endpoint');
    }

    if (init.method == 'GET') {
      let query = search ? URLExt.queryStringToObject(search.slice(1)) : {};

      for (const response of mockResponses) {
        if (JSON.stringify(response.query) == JSON.stringify(query)) {
          return Promise.resolve(
            new Response(JSON.stringify(response.response), {
              status: response.status ?? 200
            })
          );
        }
      }
    } else if (init.method == 'POST' && init.body) {
      for (const response of mockResponses) {
        if (
          JSON.stringify(response.body) ==
          new TextDecoder().decode(init.body as any)
        ) {
          return Promise.resolve(
            new Response(JSON.stringify(response.response), {
              status: response.status ?? 200
            })
          );
        }
      }
    }

    throw TypeError('No mocked responses found for this query');
  }) as jest.Mocked<typeof ServerConnection.makeRequest>;
}
