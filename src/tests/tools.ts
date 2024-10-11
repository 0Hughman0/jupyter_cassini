import { JSONObject } from '@lumino/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { ISignal } from '@lumino/signaling';

import { URLExt } from '@jupyterlab/coreutils';
import {
  Contents,
  ServiceManager,
  ServerConnection
} from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';
import { defaultRenderMime, signalToPromise } from '@jupyterlab/testutils';

import { Cassini, cassini } from '../core';
import { IModelChange } from '../models';
import { paths } from '../schema/schema';
import { CassiniServerError } from '../schema/types';

let cassiniMocked = false;

export function mockCassini(): Cassini {
  cassini.tierModelManager.cache = {};
  cassini.treeManager.cache = {};

  if (cassiniMocked) {
    return cassini;
  }

  cassini.contentService = new ServiceManagerMock();
  cassini.contentFactory = new CodeMirrorEditorFactory();
  cassini.rendermimeRegistry = defaultRenderMime();
  cassini.commandRegistry = new CommandRegistry();

  cassiniMocked = true;
  return cassini;
}

export interface IFile {
  path: string;
  content: JSONObject;
}

export async function createTierFiles(files: IFile[]): Promise<{
  manager: ServiceManager.IManager;
  files: Contents.IModel[];
}> {
  mockCassini();
  const manager = cassini.contentService;

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
  path?: undefined;
}

export interface MockAPIPathCall {
  path: string;
  response: CassiniServerError | any;
  status?: number;
}

export type MockAPICalls = {
  [endpoint in keyof paths]?: (MockAPICall | MockAPIPathCall)[];
};

export function mockServerAPI(calls: MockAPICalls): void {
  const pathResponses: { [path: string]: MockAPIPathCall } = {};

  for (const [endpoint, responses] of Object.entries(calls)) {
    if (endpoint.includes('{') && endpoint.includes('}')) {
      for (const response of responses) {
        if (response.path !== undefined) {
          const fullPath = endpoint.replace(/\{(.+)\}/, response.path);
          pathResponses[fullPath] = response;
        }
      }
    }
  }

  ServerConnection.makeRequest = jest.fn((url, init, settings) => {
    const { pathname, search } = URLExt.parse(url);
    const endpoint = decodeURIComponent(
      pathname.replace('/jupyter_cassini', '')
    ) as keyof MockAPICalls;

    const mockPathResponse = pathResponses[endpoint];

    if (mockPathResponse) {
      return Promise.resolve(
        new Response(JSON.stringify(mockPathResponse.response), {
          status: mockPathResponse.status ?? 200
        })
      );
    }
    const mockResponses = calls[endpoint] as MockAPICall[] | undefined;

    if (!mockResponses) {
      throw TypeError('No mocked responses found for this endpoint');
    }

    if (init.method == 'GET') {
      const query = search ? URLExt.queryStringToObject(search.slice(1)) : {};

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

    throw TypeError(`No mocked responses found for this query, ${url}`);
  }) as jest.Mocked<typeof ServerConnection.makeRequest>;
}

export async function awaitSignalType<C extends IModelChange>(
  signal: ISignal<any, C>,
  type: C['type']
): Promise<C> {
  let value: C | null = null;

  while (value?.type !== type) {
    const [_, payload] = await signalToPromise(signal);
    value = payload;
  }

  return value;
}
