/* eslint-disable prettier/prettier */
import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

export interface ITreeChildResponse {
  name: string;
  info?: string;
  started?: string;
  hltsPath?: string;
  metaPath?: string;
  notebookPath?: string;
  additionalMeta: { [key: string]: JSON };
}

export interface ITreeResponse extends ITreeChildResponse {
  name: string;
  folder: string;
  childMetas: string[];
  childTemplates: string[];
  children: { [id: string]: ITreeChildResponse };
}

export interface ITierInfo {
  name: string;
  identifiers: string[];
  started: string;
  children: string[];
}

export interface INewChildInfo {
  id: string;
  parent: string;
  template: string;
  description: string;
}

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {},
  args = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();

  const requestUrl =
    URLExt.join(
      settings.baseUrl,
      'jupyter_cassini', // API Namespace
      endPoint
    ) + URLExt.objectToQueryString(args);

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as TypeError);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

export namespace CassiniServer {
  export function lookup(query: string): Promise<ITierInfo> {
    return requestAPI('lookup', {}, { id: query });
  }

  export function tree(identifiers: string[]): Promise<ITreeResponse> {
    return requestAPI('tree', {}, { identifiers: identifiers });
  }

  export function newChild(info: INewChildInfo): Promise<ITreeResponse> {
    return requestAPI('newChild', {
      body: JSON.stringify(info),
      method: 'POST'
    });
  }

  export function openTier(id: string): Promise<Boolean> {
    return requestAPI('open', {}, { id: id });
  }
}
