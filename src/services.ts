/* eslint-disable prettier/prettier */
import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

export interface IChildClsInfo {
  name: string;
  idRegex: string;
  namePartTemplate: string;
  templates: string[];
  metaNames: string[];
}

export interface ITreeChildResponse {
  name: string;
  info?: string;
  outcome?: string;
  started?: string;
  hltsPath?: string;
  metaPath?: string;
  notebookPath?: string;
  additionalMeta: { [key: string]: JSON };
}

export interface ITreeResponse extends ITreeChildResponse {
  name: string;
  folder: string;

  childClsInfo?: IChildClsInfo; // undefined when no child class.

  children: { [id: string]: ITreeChildResponse };
}

export interface ITierInfo {
  name: string;
  identifiers: string[];
  started: string;
  children: string[];
}

/**
 * @property { string } id - this is the id that is appended to parent.identifiers to make the new identifiers for that child!
 */
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

/**
 * Wrapper for the requestAPI.
 */
export namespace CassiniServer {
  /**
   * Lookup ITierInfo by name.
   *
   * @param query the name of the tier
   * @returns Promise that resolves with the info of the tier you lookup.
   */
  export function lookup(query: string): Promise<ITierInfo> {
    return requestAPI('lookup', {}, { id: query });
  }

  /**
   * Gets the 'tree' reprentation of a tier. This includes enough info to display a TierViewer, but also information about the tier's children
   * such that the TierBrowser TierTree or whatever can be rendered.
   *
   * @param identifiers the identifiers or casPath or path or ids of the tier you want to view tree data for
   * @returns
   */
  export function tree(identifiers: string[]): Promise<ITreeResponse> {
    return requestAPI('tree', {}, { identifiers: identifiers });
  }

  /**
   * Ask the cassini server to call setup_files on the parent's child.
   *
   * @param info Parameters to pass to the new_child.setup_files() server-side method
   * @returns the tree response for the new child.
   */
  export function newChild(info: INewChildInfo): Promise<ITreeResponse> {
    return requestAPI('newChild', {
      body: JSON.stringify(info),
      method: 'POST'
    });
  }

  export function openTier(id: string): Promise<boolean> {
    return requestAPI('open', {}, { id: id });
  }
}
