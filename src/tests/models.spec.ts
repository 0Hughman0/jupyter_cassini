import { Contents } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';

import { TierModel, TierBrowserModel } from '../models';
import { TreeManager, cassini } from '../core';

import { CassiniServer } from '../services';

import {
  HOME_RESPONSE,
  WP1_RESPONSE,
  createTierFiles,
  TEST_META_CONTENT,
  TEST_HLT_CONTENT
} from './tools';

import 'jest';

describe('TierModel', () => {
  let manager = new ServiceManagerMock();
  let metaFile: Contents.IModel;
  let hltsFile: Contents.IModel;

  beforeEach(async () => {
    ({ manager, metaFile, hltsFile } = await createTierFiles(
      TEST_META_CONTENT,
      TEST_HLT_CONTENT
    ));
  });

  describe('complete-meta', () => {
    test('meta', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;
      expect(tier.meta).toEqual(TEST_META_CONTENT);
    });

    test('name', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;
      expect(tier.name).toBe('WP1');
    });

    test('description', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;
      expect(tier.description).toBe(TEST_META_CONTENT['description']);

      tier.description = 'something new';

      expect(tier.description).toBe('something new');
      expect(tier.meta['description']).toBe('something new');
    });

    test('conclusion', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;
      expect(tier.conclusion).toBe(TEST_META_CONTENT['conclusion']);

      tier.conclusion = 'new conclusion';

      expect(tier.conclusion).toBe('new conclusion');
      expect(tier.meta['conclusion']).toBe('new conclusion');
    });

    test('additionalMeta', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;
      expect(tier.additionalMeta).toEqual({ temperature: 273 });
    });

    test('treeData', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;

      //cassini.treeManager.cache = {}

      await cassini.treeManager.cacheTreeData(
        ['1'],
        TreeManager._treeResponseToData(WP1_RESPONSE, ['1'])
      );

      await expect(tier.treeData).resolves.toEqual(
        TreeManager._treeResponseToData(WP1_RESPONSE, ['1'])
      );
      await expect(tier.children).resolves.toEqual(
        TreeManager._treeResponseToData(WP1_RESPONSE, ['1']).children
      );

      //cassini.treeManager.cache = {}
    });
  });

  describe('missing meta', () => {
    test('no meta', () => {
      const tier = new TierModel({ name: 'No meta Yoo', identifiers: ['1'] });

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

      (metaFile.content as any) = JSON.stringify(noDescription);

      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;

      expect(tier.description).toBe('');
    });
  });

  describe('hlts', () => {
    test('no-hlts', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path
      });
      await tier.ready;

      expect(tier.hltsFile).toBe(undefined);
      expect(tier.hltsOutputs).toEqual([]);
    });

    test('init', async () => {
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path,
        hltsPath: hltsFile.path
      });
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

    test('later-load-hlts', async () => {
      manager.contents.delete(hltsFile.path);

      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path,
        hltsPath: hltsFile.path
      });
      await tier.ready;

      expect(tier.hltsFile).toBe(undefined);

      const newHlts = await manager.contents.newUntitled({
        path: '/WorkPackages/WP1/.exps/', // filename is set as unique
        type: 'file'
      });

      (newHlts as any).content = JSON.stringify(TEST_HLT_CONTENT);

      (tier as any).hltsPath = newHlts.path;

      await tier.revert();

      expect(tier.hltsFile?.isReady).toBe(true);

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
      const tier = new TierModel({
        name: 'WP1',
        identifiers: ['1'],
        metaPath: metaFile.path,
        hltsPath: hltsFile.path
      });
      await tier.ready;

      expect(tier.dirty).toBe(false);

      tier.description = 'completely new thing';

      expect(tier.dirty).toBe(true);

      await tier.save();

      expect(tier.dirty).toBe(false);

      const contentModel = (await manager.contents.get(
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
      query => new Promise(resolve => resolve(HOME_RESPONSE))
    ) as jest.Mocked<typeof CassiniServer.tree>;

    model = new TierBrowserModel();
    cassini.treeManager.cache = {};
  });

  test('initial', async () => {
    await expect(model.current).resolves.toMatchObject(
      TreeManager._treeResponseToData(HOME_RESPONSE, [])
    );

    await expect(model.getChildren()).resolves.toMatchObject(
      TreeManager._treeResponseToData(HOME_RESPONSE, ['1']).children
    );
  });

  test('updating', () => {
    const ids = ['1', '1'];
    model.currentPath.pushAll(ids);

    const childReponse = Object.assign(HOME_RESPONSE);
    childReponse.name = 'WP1.1';

    expect(model.current).resolves.toMatchObject(
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
});
