import { JSONObject } from '@lumino/coreutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { Contents } from '@jupyterlab/services';

import { cassini, ITreeData, TreeManager, TierModelTreeManager } from '../core';
import { TierModel } from '../models';
import { ITreeResponse, CassiniServer } from '../services';

import 'jest';

const HOME_RESPONSE: ITreeResponse = require('./test_home_branch.json');
const WP1_RESPONSE: ITreeResponse = require('./test_WP1_branch.json');
const WP1_1_RESPONSE: ITreeResponse = require('./test_WP1_1_branch.json');

describe('TreeManager', () => {

  beforeEach(() => {
    CassiniServer.tree = jest.fn(
      query => new Promise(resolve => {
        switch (query.toString()) {
          case [].toString(): {
            resolve(Object.assign({}, HOME_RESPONSE)) // ensures requests to server return new objects
          }
          case ['1'].toString(): {
            resolve(Object.assign({}, WP1_RESPONSE))
          }

          case ['1', '1'].toString(): {
            resolve(Object.assign({}, WP1_1_RESPONSE))
          }
          default: {
            throw "No mock data for request"
          }

        }
      })
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
    const treeManager = new TreeManager()

    const homeData = TreeManager._treeResponseToData(HOME_RESPONSE, []);

    const first = await treeManager.initialize() 
    expect(first).toMatchObject(homeData);

    expect(treeManager.cache).toMatchObject(homeData);

    expect(treeManager.get([])).resolves.toBe(first);

    expect(CassiniServer.tree).lastCalledWith([]);
  });

  test('forcing-fetch', async () => {
    let treeManager = new TreeManager()

    const homeData = TreeManager._treeResponseToData(HOME_RESPONSE, []);

    const first = await treeManager.initialize()

    expect(first).toMatchObject(homeData);

    // outdate it
    treeManager.cache.name = 'Homey'

    expect(first?.name).toBe('Homey')
    
    const second = await treeManager.get([])
    
    expect(second?.name).toBe('Homey')

    const third = await treeManager.get([], true)

    expect(third?.name).toBe('Home')
  });

  test('shallow-cache', async () => {
    let treeManager = new TreeManager()
    await treeManager.initialize()

    const wp1_Data = TreeManager._treeResponseToData(WP1_RESPONSE, ['1']);

    expect(treeManager.cache['children']['1']).not.toHaveProperty('children')

    const first = await treeManager.get(['1'])
    expect(first).toMatchObject(wp1_Data);

    // fetching will add children because we need to see one level below
    expect(treeManager.cache['children']['1']).toHaveProperty('children')

    expect(first).toHaveProperty('children')
    
    const second = await treeManager.get(['1'])
    const third = await treeManager.get(['1'])
    expect(second).toBe(third)
    expect(second).toBe(first)
  });

  test('caching deep', async () => {
    let treeManager = new TreeManager()
    await treeManager.initialize()

    const wp1_1_Data = TreeManager._treeResponseToData(WP1_1_RESPONSE, ['1', '1']);

    const first = await treeManager.get(['1', '1'])
    expect(first).toMatchObject(wp1_1_Data);
    
    const second = await treeManager.get(['1', '1'])

    expect(second).toBe(first)
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
