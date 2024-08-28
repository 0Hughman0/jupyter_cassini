/* eslint-disable prettier/prettier */
import createClient from "openapi-fetch";

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';
import { paths, components } from './schema/schema';

export type IChildClsInfo = components["schemas"]["ChildClsInfo"]
export type ITreeChildResponse = components["schemas"]["TreeChildResponse"]
export type ITreeResponse = components["schemas"]["TreeResponse"]
export type ITierInfo = components["schemas"]["TierInfo"]
export type INewChildInfo = components["schemas"]["NewChildInfo"]

type fetchType = typeof fetch

const JLfetch: fetchType = (info: RequestInfo | URL, init?: RequestInit) => {
  let url: string
  
  if (typeof info === "string") {
    url = info
  } else if (info instanceof Request) {
    url = info.url
  } else if (info instanceof URL) {
    url = info.href
    
  } else {
    throw Error("Cannot parse info parameter")
  }

  if (!init && info instanceof Request) {
    const { method, body } = info
    init = { method, body }
  } else if (!init) {
    init = {}
  }

  const settings = ServerConnection.makeSettings();
  return ServerConnection.makeRequest(url, init, settings);
}

const setting = ServerConnection.makeSettings()
export const client = createClient<paths>({ 
  baseUrl: URLExt.join(setting.baseUrl, 'jupyter_cassini'),
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
  /*
  export function lookup(query: string): Promise<ITierInfo> {
    return requestAPI('lookup', {}, { id: query });
  }
  */

  export function lookup(query: string): Promise<ITierInfo> {
    return client.GET("/lookup", {
      params: {
        query: {name: query}
      }
    }).then(val => {
      if (val.data) {
        return val.data
      } else {
        throw Error()
      }})
  }

  /**
   * Gets the 'tree' reprentation of a tier. This includes enough info to display a TierViewer, but also information about the tier's children
   * such that the TierBrowser TierTree or whatever can be rendered.
   *
   * @param identifiers the identifiers or casPath or path or ids of the tier you want to view tree data for
   * @returns
   */
  export function tree(identifiers: string[]): Promise<ITreeResponse> {
    return client.GET("/tree", {
      params: {
        query: {identifiers: identifiers}
      }
    }).then(val => {
      if (val.data) {
        return val.data
      } else {
        throw Error()
      }})
  }

  /**
   * Ask the cassini server to call setup_files on the parent's child.
   *
   * @param info Parameters to pass to the new_child.setup_files() server-side method
   * @returns the tree response for the new child.
   */
  export function newChild(info: INewChildInfo): Promise<ITreeResponse> {
    return client.POST("/newChild", {
      body: info
    }).then(val => {
      if (val.data) {
        return val.data
      } else {
        throw Error()
      }})
  }

  export function openTier(name: string): Promise<boolean> {
    return client.GET("/open", {
      params: {
        query: {name: name}
      }
    }).then(val => {
      if (val.data) {
        return val.data
      } else {
        throw Error()
      }})
  }
}
