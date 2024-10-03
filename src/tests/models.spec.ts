import 'jest';
import { FolderTierInfo } from '../schema/types';
import { ServiceManager } from '@jupyterlab/services';
import { signalToPromise } from '@jupyterlab/testutils';

import { TierModel, TierBrowserModel } from '../models';
import { TreeManager, cassini } from '../core';

import { CassiniServer } from '../services';

import {
  HOME_TREE,
  WP1_TREE,
  TEST_HLT_CONTENT,
  TEST_META_CONTENT,
  WP1_INFO
} from './test_cases';
import { createTierFiles } from './tools';

describe('TierModel', () => {
  let theManager: ServiceManager.IManager;

  beforeEach(async () => {
    const { manager } = await createTierFiles([
      { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
      { path: WP1_INFO.hltsPath || '', content: TEST_HLT_CONTENT }
    ]);
    await manager.ready;
    theManager = manager;
  });

  describe('complete-meta', () => {
    test('meta', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;
      expect(tier.meta).toEqual(TEST_META_CONTENT);
    });

    test('name', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;
      expect(tier.name).toBe('WP1');
    });

    test('description', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;
      expect(tier.description).toBe(TEST_META_CONTENT['description']);

      tier.description = 'something new';

      expect(tier.description).toBe('something new');
      expect(tier.meta['description']).toBe('something new');
    });

    test('conclusion', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;
      expect(tier.conclusion).toBe(TEST_META_CONTENT['conclusion']);

      tier.conclusion = 'new conclusion';

      expect(tier.conclusion).toBe('new conclusion');
      expect(tier.meta['conclusion']).toBe('new conclusion');
    });

    test('additionalMeta', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;
      expect(tier.additionalMeta).toEqual({ temperature: 273 });
    });

    test('addingInvalidMeta', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;
      expect(tier.setMetaValue('description', 'new')).toEqual(true);
      expect(tier.setMetaValue('description', 15)).toEqual(false);
    });

    test('treeData', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;

      await cassini.treeManager.cacheTreeData(
        ['1'],
        TreeManager._treeResponseToData(WP1_TREE, ['1'])
      );

      await expect(tier.treeData).resolves.toEqual(
        TreeManager._treeResponseToData(WP1_TREE, ['1'])
      );
      await expect(tier.children).resolves.toEqual(
        TreeManager._treeResponseToData(WP1_TREE, ['1']).children
      );
    });
  });

  describe('missing meta', () => {
    test('no meta', () => {
      const { ids, children } = WP1_INFO;
      const noMeta: FolderTierInfo = {
        name: 'No meta Yoo',
        ids,
        children,
        tierType: 'folder'
      };

      const tier = new TierModel(noMeta);

      expect(tier.name).toBe('No meta Yoo');

      expect(tier.meta).toEqual({});

      expect(tier.description).toBe('');
      expect(tier.conclusion).toBe('');

      expect(() => {
        tier.description = 'new';
      }).toThrow('Tier has no meta, cannot store description');
      expect(tier.description).toBe('');

      expect(() => {
        tier.conclusion = 'new';
      }).toThrow('Tier has no meta, cannot store conclusion');
      expect(tier.conclusion).toBe('');
    });

    test('missing description', async () => {
      const { description, ...noDescription } = TEST_META_CONTENT;

      const tier = new TierModel(WP1_INFO);

      await tier.ready;

      tier.metaFile && tier.metaFile?.model.fromJSON(noDescription);
      expect(tier.description).toBe('');
    });
  });

  describe('hlts', () => {
    test('no-hlts', async () => {
      const tierInfo = Object.assign({}, WP1_INFO);
      delete tierInfo['hltsPath'];

      expect(tierInfo.hltsPath).toBeUndefined();

      const tier = new TierModel(tierInfo);
      await tier.ready;

      expect(tier.hltsFile).toBe(undefined);
      expect(tier.hltsOutputs).toEqual([]);
    });

    test('init', async () => {
      expect(WP1_INFO.hltsPath).toBeDefined();

      const tier = new TierModel(WP1_INFO);
      await tier.ready;

      expect(tier.hltsFile).not.toEqual(undefined);

      expect(tier.hltsOutputs).toEqual([
        {
          data: { 'text/markdown': '## cos' },
          metadata: {},
          output_type: 'display_data',
          transient: {}
        }
      ]);
    });
  });

  describe('io', () => {
    test('save', async () => {
      const tier = new TierModel(WP1_INFO);
      await tier.ready;

      expect(tier.dirty).toBe(false);

      tier.description = 'completely new thing';

      expect(tier.dirty).toBe(true);

      await tier.save();

      expect(tier.dirty).toBe(false);

      const contentModel = (await theManager.contents.get(
        tier.metaFile?.path as string,
        { content: true }
      )) as any;

      expect(contentModel.content).toContain('completely new thing');

      const newMeta = Object.assign({}, TEST_META_CONTENT);
      newMeta.description = 'load from file';
      contentModel['content'] = JSON.stringify(newMeta);

      expect(tier.description).toBe('completely new thing');

      tier.description = 'changing again';

      expect(tier.dirty).toBe(true);

      await tier.revert();

      expect(tier.description).toBe('load from file');
      expect(tier.dirty).toBe(false);
    });
  });
});

describe('TierBrowserModel', () => {
  let model: TierBrowserModel;

  beforeEach(() => {
    CassiniServer.tree = jest.fn(
      query => new Promise(resolve => resolve(HOME_TREE))
    ) as jest.Mocked<typeof CassiniServer.tree>;

    model = new TierBrowserModel();
    cassini.treeManager.cache = {};
  });

  test('initial', async () => {
    expect(Array.from(model.currentPath)).toEqual([]);
    expect(model.current).toBeNull();

    const changed = signalToPromise(model.currentUpdated);
    model.currentPath.clear();
    await changed;

    expect(model.current).toMatchObject(
      TreeManager._treeResponseToData(HOME_TREE, [])
    );

    expect(model.current?.children).toMatchObject(
      TreeManager._treeResponseToData(HOME_TREE, ['1']).children
    );
  });

  test('updating', async () => {
    const ids = ['1', '1'];

    const changed = signalToPromise(model.currentUpdated);
    model.currentPath.pushAll(ids);
    await changed;

    const childReponse = Object.assign(HOME_TREE);

    expect(model.current).toMatchObject(
      TreeManager._treeResponseToData(childReponse, ['1', '1'])
    );
    expect(CassiniServer.tree).lastCalledWith(ids);
  });

  test('additionalColumns', () => {
    expect(model.additionalColumns).toEqual(new Set());
    model.currentPath.push('a');

    expect(model.additionalColumns).toEqual(new Set());
    model.additionalColumns.add('new Col');

    expect(model.additionalColumns).toEqual(new Set(['new Col']));

    model.currentPath.clear();

    expect(model.additionalColumns).toEqual(new Set());

    model.currentPath.pushAll(['b', 'd']);

    expect(model.additionalColumns).toEqual(new Set());
  });

  test('childMetas', async () => {
    const changed = signalToPromise(model.currentUpdated);
    model.currentPath.clear();
    await changed;

    expect(model.childMetas).toEqual(new Set(['Fishes', 'Crabs']));
  });
});
