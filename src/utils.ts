import { TreeResponse, TreeChildResponse } from './schema/types';
import { ITreeData, ITreeChildData, TreeChildren } from './core';

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
