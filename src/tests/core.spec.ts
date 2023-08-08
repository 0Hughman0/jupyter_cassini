import { Contents } from '@jupyterlab/services';

import { ITreeData, TreeManager, TierModelTreeManager, Cassini } from '../core';
import { TierModel } from '../models';
import { ITreeResponse } from '../services';

import {
  HOME_RESPONSE,
  WP1_RESPONSE,
  WP1_1_RESPONSE,
  mockServer,
  TEST_HLT_CONTENT,
  TEST_META_CONTENT,
  createTierFiles
} from './tools';

import 'jest';

describe('TreeManager', () => {
  beforeEach(() => {
    mockServer();
  });

  test('conversion', () => {
    const treeData: ITreeData = TreeManager._treeResponseToData(
      HOME_RESPONSE as ITreeResponse,
      ['1', '1', 'a']
    );

    expect(treeData.started).toEqual(
      HOME_RESPONSE.started === undefined
        ? null
        : new Date(HOME_RESPONSE.started)
    );

    expect(treeData.identifiers).toEqual(['1', '1', 'a']);

    for (const id of Object.keys(treeData.children)) {
      const dataChild = treeData.children[id];
      const responseChild = HOME_RESPONSE.children[id];

      expect(dataChild.started).toEqual(
        responseChild.started === undefined
          ? null
          : new Date(responseChild.started)
      );
    }
  });

  test('initial', async () => {
    const treeManager = new TreeManager();

    const homeData = TreeManager._treeResponseToData(HOME_RESPONSE, []);

    const first = await treeManager.initialize();
    expect(first).toMatchObject(homeData);

    expect(treeManager.cache).toMatchObject(homeData);

    expect(treeManager.get([])).resolves.toBe(first);
  });

  test('forcing-fetch', async () => {
    let treeManager = new TreeManager();

    const homeData = TreeManager._treeResponseToData(HOME_RESPONSE, []);

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

    const wp1_Data = TreeManager._treeResponseToData(WP1_RESPONSE, ['1']);

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

    const wp1_1_Data = TreeManager._treeResponseToData(WP1_1_RESPONSE, [
      '1',
      '1'
    ]);

    const first = await treeManager.get(['1', '1']);
    expect(first).toMatchObject(wp1_1_Data);

    const second = await treeManager.get(['1', '1']);

    expect(second).toBe(first);
  });

  test('lookup', async () => {
    const treeManager = new TreeManager();
    await treeManager.initialize();

    const first = await treeManager.lookup('WP1');

    const wp1_1_Data = TreeManager._treeResponseToData(WP1_RESPONSE, ['1']);

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
  let metaFile: Contents.IModel;

  beforeEach(async () => {
    ({ metaFile } = await createTierFiles(TEST_META_CONTENT, TEST_HLT_CONTENT));

    modelManager = new TierModelTreeManager();
  });

  test('initialise', async () => {
    const first = modelManager.get('WP1')({
      name: 'WP1',
      metaPath: metaFile.path,
      identifiers: ['1']
    });

    expect(first).toBeInstanceOf(TierModel);

    const cachedFirst = modelManager.get('WP1')({
      name: 'WP1',
      metaPath: metaFile.path,
      identifiers: ['1']
    });

    expect(first).toBe(cachedFirst);

    const second = modelManager.get('WP1.2')({
      name: 'WP1.2',
      metaPath: metaFile.path,
      identifiers: ['1', '2']
    });

    expect(second).not.toBe(first);

    const cachedSecond = modelManager.get('WP1.2')({
      name: 'WP1.2',
      metaPath: metaFile.path,
      identifiers: ['1', '2']
    });

    expect(second).toBe(cachedSecond);

    expect(modelManager.cache['WP1']).toBe(first);
    expect(modelManager.cache['WP1.2']).toBe(second);
  });
});

describe('cassini', () => {
  test('init', async () => {
    const cassini = new Cassini();
    expect(cassini.ready).toBeDefined();

    const { manager } = await createTierFiles(
      TEST_META_CONTENT,
      TEST_HLT_CONTENT
    );

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
