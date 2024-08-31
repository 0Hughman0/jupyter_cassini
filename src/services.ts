/* eslint-disable prettier/prettier */
import createClient from 'openapi-fetch';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';
import { paths } from './schema/schema';
import { TierInfo, TreeResponse, NewChildInfo, Status } from './schema/types'


const JLfetch = async (info: Request) => {
  const url = info.url;
  const { method, body } = info;
  const init: RequestInit = { method, body };

  // seems in some browsers, body is turned into a stream, which causes chaos.
  if (body instanceof ReadableStream ) {
    init.body = await info.text()
  }
  
  const settings = ServerConnection.makeSettings();  
  return ServerConnection.makeRequest(url, init, settings);
};

const settings = ServerConnection.makeSettings();
const {fetch, baseUrl, ...fetchSettings} = settings

export const client = createClient<paths>({
  baseUrl: URLExt.join(settings.baseUrl, 'jupyter_cassini'),
  fetch: JLfetch, ...fetchSettings
});

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
  /*
  export function lookup(query: string): Promise<ITierInfo> {
    return requestAPI('lookup', {}, { id: query });
  }
  */

  export function lookup(query: string): Promise<TierInfo> {
    return client
      .GET('/lookup', {
        params: {
          query: { name: query }
        }
      })
      .then(val => {
        if (val.data) {
          return val.data;
        } else {
          throw Error();
        }
      });
  }

  /**
   * Gets the 'tree' reprentation of a tier. This includes enough info to display a TierViewer, but also information about the tier's children
   * such that the TierBrowser TierTree or whatever can be rendered.
   *
   * @param ids the identifiers or casPath or path or ids of the tier you want to view tree data for
   * @returns
   */
  export function tree(ids: string[]): Promise<TreeResponse> {
    return client
      .GET('/tree', {
        params: {
          query: { 'ids[]': ids }
        },
        querySerializer: { array: { explode: false, style: 'form' } } // don't like that this is necessary!
      })
      .then(val => {
        if (val.data) {
          return val.data;
        } else {
          throw Error();
        }
      });
  }

  /**
   * Ask the cassini server to call setup_files on the parent's child.
   *
   * @param info Parameters to pass to the new_child.setup_files() server-side method
   * @returns the tree response for the new child.
   */
  export function newChild(info: NewChildInfo): Promise<TreeResponse> {
    return client
      .POST('/newChild', {
        body: info
      })
      .then(val => {
        if (val.data) {
          return val.data;
        } else {
          throw Error();
        }
      });
  }

  export function openTier(name: string): Promise<Status> {
    return client
      .GET('/open', {
        params: {
          query: { name: name }
        }
      })
      .then(val => {
        if (val.data) {
          return val.data;
        } else {
          throw Error();
        }
      });
  }
}
