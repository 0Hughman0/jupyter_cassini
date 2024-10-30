/* eslint-disable prettier/prettier */
import createClient from 'openapi-fetch';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';
import { paths } from './schema/schema';
import { TierInfo, TreeResponse, NewChildInfo, Status } from './schema/types';
import { warnError } from './utils';

export class CasServerError extends Error {
  endpoint: string;
  query: string | null;
  info: string | null;

  constructor(reason: string, url: string, info?: string) {
    super(reason);
    const { pathname, search } = URLExt.parse(url);

    this.endpoint = pathname;
    this.query = search || null;
    this.info = info || null;
  }

  notify(): void {
    const notifyMessage = `${this.endpoint}${this.query}, returned ${this.message}, check out browser and server log for more details.`;
    const logMessage = `Cassini server error ${this.message} at ${this.endpoint}${this.query}, caused by: \n\n ${this.info}`;
    warnError(notifyMessage, logMessage);
  }

  static notifyOrThrow(error: CasServerError | Error) {
    if (error instanceof CasServerError) {
      error.notify();
    } else {
      throw error;
    }
  }
}

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
          throw new CasServerError(error.reason, response.url, error.message);
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
          throw new CasServerError(error.reason, response.url, error.message);
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
          throw new CasServerError(error.reason, response.url, error.message);
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
          throw new CasServerError(error.reason, response.url, error.message);
        }
      });
  }
}
