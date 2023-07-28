import { JSONObject } from '@lumino/coreutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { Contents } from '@jupyterlab/services';

import { cassini, ITreeData, TreeManager, TierModelTreeManager } from '../core';
import { TierModel } from '../models';
import { ITreeResponse, CassiniServer } from '../services';

import 'jest';

const HOME_RESPONSE: ITreeResponse = require('./test_home_branch.json');

describe('TreeManager', () => {
  const treeManager = cassini.treeManager;

  beforeEach(() => {
    CassiniServer.tree = jest.fn(
      query => new Promise(resolve => resolve(HOME_RESPONSE))
    ) as jest.Mocked<typeof CassiniServer.tree>;
  });

  test('conversion', () => {
    const treeData: ITreeData = TreeManager._treeResponseToData(
      HOME_RESPONSE as ITreeResponse, ['1', '1', 'a']
    );

    expect(treeData.started).toEqual(
      HOME_RESPONSE.started === undefined
        ? null
        : new Date(HOME_RESPONSE.started)
    );

    expect(treeData.identifiers).toEqual( ['1', '1', 'a'])

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
    const homeData = TreeManager._treeResponseToData(HOME_RESPONSE, []);

    await expect(treeManager.initialize()).resolves.toMatchObject(homeData);

    expect(treeManager.cache).toMatchObject(homeData);

    await expect(treeManager.get([])).resolves.toMatchObject(homeData);

    expect(CassiniServer.tree).lastCalledWith([]);
  });

  test('caching', async () => {
    const homeData = TreeManager._treeResponseToData(HOME_RESPONSE, ['1']);
    expect(treeManager.cache.children['1']).not.toBe(homeData); // children... of children not fetched

    await expect(treeManager.get(['1'])).resolves.toMatchObject(homeData); // get ['1'], will fetch 1's children

    expect(CassiniServer.tree).lastCalledWith(['1']);

    const first = await treeManager.get(['1'])

    expect(treeManager.cache.children['1']).toMatchObject(first as ITreeData) ;
    expect(treeManager.cache.children['1']).toBe(first);
    expect(treeManager.cache.children['1'].children['1'].children).toBe(
      undefined
    );
  });
});

describe('TreeModelManager', () => {
  let manager = new ServiceManagerMock();
  let modelManager: TierModelTreeManager;

  async function setupMeta(metaContent: JSONObject): Promise<Contents.IModel> {
    manager = new ServiceManagerMock();
    cassini.contentService = manager;
    return manager.contents.newUntitled({
      path: '/WorkPackages/WP1/.exps/',
      type: 'file'
    });
  }

  beforeEach(async () => {
    modelManager = new TierModelTreeManager();
  });

  test('initialise', async () => {
    const file = await setupMeta({
      name: 'WP1',
      description: 'heyo'
    });

    const first = modelManager.get('WP1')({ name: 'WP1', metaPath: file.path, identifiers: ['1'] });

    expect(first).toBeInstanceOf(TierModel);

    const cachedFirst = modelManager.get('WP1')({
      name: 'WP1',
      metaPath: file.path,
      identifiers: ['1']
    });

    expect(first).toBe(cachedFirst);

    const second = modelManager.get('WP1.2')({
      name: 'WP1.2',
      metaPath: file.path,
      identifiers: ['1', '2']
    });

    expect(second).not.toBe(first);

    const cachedSecond = modelManager.get('WP1.2')({
      name: 'WP1.2',
      metaPath: file.path,
      identifiers: ['1', '2']
    });

    expect(second).toBe(cachedSecond);

    expect(modelManager.cache['WP1']).toBe(first);
    expect(modelManager.cache['WP1.2']).toBe(second);
  });
});
