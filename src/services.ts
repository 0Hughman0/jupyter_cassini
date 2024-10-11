/* eslint-disable prettier/prettier */
import createClient from 'openapi-fetch';

import { URLExt } from '@jupyterlab/coreutils';
import { Notification } from '@jupyterlab/apputils';

import { ServerConnection } from '@jupyterlab/services';
import { paths } from './schema/schema';
import {
  TierInfo,
  TreeResponse,
  NewChildInfo,
  Status,
  CassiniServerError
} from './schema/types';

const JLfetch = async (info: Request) => {
  const url = info.url;
  const { method, body } = info;
  const init: RequestInit = { method, body };

  // seems in some browsers, body is turned into a stream, which causes chaos when used to make a new request object
  // see https://issues.chromium.org/issues/40237822#makechanges
  try {
    if (body instanceof ReadableStream) {
      init.body = await info.text();
    }
  } catch (ReferenceError) {
    init;
  }

  const settings = ServerConnection.makeSettings();
  return ServerConnection.makeRequest(url, init, settings);
};

const settings = ServerConnection.makeSettings();

export const client = createClient<paths>({
  baseUrl: URLExt.join(settings.baseUrl, 'jupyter_cassini'),
  fetch: JLfetch
});

export function handleServerError(
  response: Response,
  error: CassiniServerError
): string {
  const { pathname, search } = URLExt.parse(response.url);
  Notification.error(
    `${pathname}${search}, returned ${error?.reason}, check out browser and server log for more details.`
  );
  console.warn(
    `Cassini server error ${error.reason} at ${pathname}${search}, caused by: \n\n ${error.message}`
  );
  return error.reason;
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
  export function lookup(query: string): Promise<TierInfo> {
    return client
      .GET('/lookup', {
        params: {
          query: { name: query }
        }
      })
      .then(val => {
        const { data, error, response } = val;
        if (data) {
          return val.data;
        } else {
          const reason = handleServerError(response, error);
          throw Error(reason);
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
      .GET('/tree/{ids}', {
        params: {
          path: { ids: ids.join('/') }
        }
      })
      .then(val => {
        const { data, error, response } = val;
        if (data) {
          return val.data;
        } else {
          const reason = handleServerError(response, error);
          throw Error(reason);
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
        const { data, error, response } = val;
        if (data) {
          return val.data;
        } else {
          const reason = handleServerError(response, error);
          throw Error(reason);
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
        const { data, error, response } = val;
        if (data) {
          return val.data;
        } else {
          const reason = handleServerError(response, error);
          throw Error(reason);
        }
      });
  }
}
