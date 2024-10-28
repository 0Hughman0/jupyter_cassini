import { Notification } from '@jupyterlab/apputils';

import { TreeResponse, TreeChildResponse } from './schema/types';
import { ITreeData, ITreeChildData, TreeChildren } from './core';
import { URLExt } from '@jupyterlab/coreutils';

export function treeChildrenToData(children: {
  [id: string]: TreeChildResponse;
}): TreeChildren {
  const newChildren: TreeChildren = {};

  for (const id of Object.keys(children)) {
    const child = children[id];

    const { started, ...rest } = child;

    const newChild: ITreeChildData = {
      started: null,
      ...rest
    };

    if (child.started) {
      newChild['started'] = new Date(child.started);
    }

    newChildren[id] = newChild;
  }

  return newChildren;
}

/**
 * Convenience method for converting between ITreeRepsonse to ITreeData.
 *
 * This does a bit of basic parsing of the ITreeReponse, which can only be JSON, into an Object.
 *
 * Currently just parses started into an actual Date object.
 */
export function treeResponseToData(
  treeResponse: TreeResponse,
  ids: string[]
): ITreeData {
  const { started, children, ...rest } = treeResponse;

  const newTree: ITreeData = {
    started: null,
    children: {},
    ids: ids,
    ...rest
  };

  if (started) {
    newTree.started = new Date(started);
  }

  newTree.children = treeChildrenToData(treeResponse.children);

  return newTree;
}


export function warnError(notifyMessage: string, logMessage?: string): void {
  Notification.error('Cassini - ' + notifyMessage);

  if (!logMessage) {
    logMessage = notifyMessage;
  }

  console.warn('Cassini - ' + logMessage);
}


export class CasServerError extends Error {
  endpoint: string;
  query: string | null;
  info: string | null;

  constructor(reason: string, url: string, info?: string ) {
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
}
