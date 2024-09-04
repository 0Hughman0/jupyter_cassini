import 'jest';
//import { ServiceManager } from '@jupyterlab/services';

import { ITreeData, TreeManager, TierModelTreeManager, Cassini } from '../core';
import { TierModel } from '../models';
import { TreeResponse } from '../schema/types';

import {
  HOME_TREE,
  WP1_TREE,
  WP1_1_TREE,
  //TEST_HLT_CONTENT,
  TEST_META_CONTENT,
  WP1_INFO,
  WP1_1_INFO,
  TEST_HLT_CONTENT
} from './test_cases';
import { mockServerAPI, createTierFiles } from './tools';

describe('TreeManager', () => {
  beforeEach(() => {
    mockServerAPI({
      '/tree': [
        { query: { 'ids[]': '' }, response: HOME_TREE },
        { query: { 'ids[]': '1' }, response: WP1_TREE },
        { query: { 'ids[]': '1,1' }, response: WP1_1_TREE },
        { query: { 'ids[]': '1,1,a' }, response: WP1_1_TREE } // cheeky
      ],
      '/lookup': [
        { query: { name: 'WP1' }, response: WP1_INFO },
        { query: { name: 'WP1.1' }, response: WP1_1_INFO }
      ]
    });
  });

  test('conversion', () => {
    const treeData: ITreeData = TreeManager._treeResponseToData(
      HOME_TREE as TreeResponse,
      ['1', '1', 'a']
    );

    expect(treeData.started).toEqual(
      HOME_TREE.started === undefined ? null : new Date(HOME_TREE.started)
    );

    expect(treeData.ids).toEqual(['1', '1', 'a']);

    for (const id of Object.keys(treeData.children)) {
      const dataChild = treeData.children[id];
      const responseChild = HOME_TREE.children[id];

      expect(dataChild.started).toEqual(
        responseChild.started === undefined
          ? null
          : new Date(responseChild.started)
      );
    }
  });

  test('initial', async () => {
    const treeManager = new TreeManager();

    const homeData = TreeManager._treeResponseToData(HOME_TREE, []);

    const first = await treeManager.initialize();
    expect(first).toMatchObject(homeData);

    expect(treeManager.cache).toMatchObject(homeData);

    expect(treeManager.get([])).resolves.toBe(first);
  });

  test('forcing-fetch', async () => {
    let treeManager = new TreeManager();

    const homeData = TreeManager._treeResponseToData(HOME_TREE, []);

    const first = await treeManager.initialize();

    expect(first).toMatchObject(homeData);

    // outdate it
    treeManager.cache.name = 'Homey';

    expect(first?.name).toBe('Homey');

    const second = await treeManager.get([]);

    expect(second?.name).toBe('Homey');

    const third = await treeManager.get([], true);

    expect(third?.name).toBe('Home');
  });

  test('shallow-cache', async () => {
    let treeManager = new TreeManager();
    await treeManager.initialize();

    const wp1_Data = TreeManager._treeResponseToData(WP1_TREE, ['1']);

    expect(treeManager.cache['children']['1']).not.toHaveProperty('children');

    const first = await treeManager.get(['1']);
    expect(first).toMatchObject(wp1_Data);

    // fetching will add children because we need to see one level below
    expect(treeManager.cache['children']['1']).toHaveProperty('children');

    expect(first).toHaveProperty('children');

    const second = await treeManager.get(['1']);
    const third = await treeManager.get(['1']);
    expect(second).toBe(third);
    expect(second).toBe(first);
  });

  test('caching deep', async () => {
    let treeManager = new TreeManager();
    await treeManager.initialize();

    const wp1_1_Data = TreeManager._treeResponseToData(WP1_1_TREE, ['1', '1']);

    const first = await treeManager.get(['1', '1']);
    expect(first).toMatchObject(wp1_1_Data);

    const second = await treeManager.get(['1', '1']);

    expect(second).toBe(first);
  });

  test('lookup', async () => {
    const treeManager = new TreeManager();
    await treeManager.initialize();

    const first = await treeManager.lookup('WP1');

    const wp1_1_Data = TreeManager._treeResponseToData(WP1_TREE, ['1']);

    expect(first).toMatchObject(wp1_1_Data);

    expect(Object.keys(treeManager.nameCache)).toContain(wp1_1_Data.name);

    const second = await treeManager.lookup('WP1');

    expect(first).toBe(second);

    // cached via get

    const thirdGet = await treeManager.get(['1', '1']);
    const thirdLookup = await treeManager.lookup('WP1.1');

    expect(thirdLookup).toBe(thirdGet);
  });
});

describe('TreeModelManager', () => {
  let modelManager: TierModelTreeManager;

  beforeEach(async () => {
    mockServerAPI({
      '/lookup': [
        { query: { name: 'WP1' }, response: WP1_INFO },
        { query: { name: 'WP1.1' }, response: WP1_INFO } // cheeky
      ]
    });

    await createTierFiles([
      { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
      { path: WP1_1_INFO.metaPath, content: TEST_META_CONTENT },
      { path: WP1_INFO.hltsPath || '', content: TEST_HLT_CONTENT },
      { path: WP1_1_INFO.hltsPath || '', content: TEST_HLT_CONTENT }
    ]);

    modelManager = new TierModelTreeManager();
  });

  test('initialise', async () => {
    const first = await modelManager.get('WP1');

    expect(first).toBeInstanceOf(TierModel);

    const cachedFirst = await modelManager.get('WP1');

    expect(first).toBe(cachedFirst);

    const second = await modelManager.get('WP1.1');

    expect(second).not.toBe(first);

    const cachedSecond = await modelManager.get('WP1.1');

    expect(second).toBe(cachedSecond);

    expect(modelManager.cache['WP1']).toBe(first);
    expect(modelManager.cache['WP1.1']).toBe(second);
  });
});

describe('cassini', () => {
  test('init', async () => {
    const cassini = new Cassini();
    expect(cassini.ready).toBeDefined();

    const { manager } = await createTierFiles([]);

    await cassini.initialize(
      null as any,
      manager,
      null as any,
      null as any,
      null as any
    );

    expect(cassini.ready).resolves.toBe(undefined);
  });
});
