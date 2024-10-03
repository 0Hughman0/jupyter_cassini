import * as React from 'react';
import { signalToPromise } from '@jupyterlab/testutils';

import { TierBrowser } from '../../ui/browser';
import { TierTreeBrowser } from '../../ui/treeview';
import { TierBrowserModel } from '../../models';
import { TreeManager } from '../../core';

import { mockServerAPI, createTierFiles, mockCassini } from '../tools';
import {
  HOME_TREE,
  WP1_TREE,
  WP1_INFO,
  TEST_META_CONTENT
} from '../test_cases';
import { TreeResponse } from '../../schema/types';
import { TierViewer } from '../../ui/tierviewer';

let home_tree: TreeResponse;
let wp1_tree: TreeResponse;

beforeEach(async () => {
  mockCassini();

  const INFO = WP1_INFO;
  delete INFO['hltsPath'];

  home_tree = structuredClone(HOME_TREE);
  wp1_tree = structuredClone(WP1_TREE);

  mockServerAPI({
    '/tree': [
      { query: { 'ids[]': '' }, response: home_tree },
      { query: { 'ids[]': '1' }, response: wp1_tree }
    ],
    '/lookup': [
      { query: { name: 'WP1' }, response: INFO },
      {
        query: { name: 'Home' },
        response: {
          name: 'Home',
          ids: [],
          children: ['WP1', 'WP2'],
          tierType: 'folder'
        }
      }
    ]
  });
  createTierFiles([{ path: WP1_INFO.metaPath, content: TEST_META_CONTENT }]);
});

describe('tier browser', () => {
  test('construct', async () => {
    const widget = new TierBrowser(['1']);

    expect(widget.browser).toBeInstanceOf(TierTreeBrowser);
    expect(widget.viewer).toBeInstanceOf(TierViewer);

    await signalToPromise(widget.model.childrenUpdated);
    expect(widget.browser.currentTier?.name).toEqual('WP1');

    await signalToPromise(widget.viewer.modelChanged);
    expect(widget.viewer.tierTitle.node.textContent).toEqual('WP1');
    
  })
})

describe('tree browser', () => {
  test('construct', async () => {
    const model = new TierBrowserModel();

    const widget = new TierTreeBrowser(model, jest.fn(), jest.fn(), jest.fn());
    expect(widget.render()).toEqual(
      <div>
        <a>Loading</a>
      </div>
    );

    const updated = signalToPromise(model.currentPath.changed);
    const childrenUpdated = signalToPromise(model.childrenUpdated);
    model.currentPath.clear();

    await childrenUpdated;
    await updated;

    expect(widget.render()).not.toEqual(
      <div>
        <a>Loading</a>
      </div>
    );

    expect(widget?.currentTier?.name).toBe('Home');
    expect(widget.currentTier).toBe(model.current);
    expect(widget.tierChildren).toMatchObject(
      TreeManager._treeResponseToData(HOME_TREE, []).children
    );
    expect(widget.currentPath).toBe(model.currentPath);
    expect(widget.childMetas).toEqual(new Set(['Fishes', 'Crabs']));
    expect(widget.additionalColumns).toEqual(new Set());
  });

  test('current path update', async () => {
    const model = new TierBrowserModel();
    const widget = new TierTreeBrowser(model, jest.fn(), jest.fn(), jest.fn());

    const first = signalToPromise(model.currentUpdated);
    model.currentPath.clear();
    await first;

    const updated = signalToPromise(model.currentUpdated);
    model.currentPath.push('1');
    await updated;

    expect(Array.from(widget.currentPath)).toEqual(['1']);
    expect(widget.currentTier?.name).toEqual('WP1');
    expect(widget.currentTier).toEqual(
      TreeManager._treeResponseToData(WP1_TREE, ['1'])
    );
    expect(widget.tierChildren).toEqual(
      TreeManager._treeResponseToData(WP1_TREE, ['1']).children
    );
    expect(widget.childMetas).toEqual(new Set());
  });

  test('children updated and refresh', async () => {
    const model = new TierBrowserModel();
    const widget = new TierTreeBrowser(model, jest.fn(), jest.fn(), jest.fn());

    const first = signalToPromise(model.currentUpdated);
    model.currentPath.clear();
    await first;

    expect(widget.tierChildren).toEqual(
      TreeManager._treeResponseToData(HOME_TREE, []).children
    );
    expect(widget.childMetas).toEqual(new Set(['Fishes', 'Crabs']));

    home_tree['children']['3'] = {
      name: 'WP3',
      additionalMeta: { x: 'y' },
      metaPath: 'ignore'
    };

    await model.refresh();

    expect(widget.tierChildren).not.toEqual(
      TreeManager._treeResponseToData(HOME_TREE, []).children
    );

    expect(Object.keys(widget.tierChildren)).toContain('3');
    expect(widget.childMetas).toEqual(new Set(['Fishes', 'Crabs', 'x']));
  });
});
