import 'jest';
import { ServiceManager } from '@jupyterlab/services';
import { Notification } from '@jupyterlab/apputils';
import { signalToPromise } from '@jupyterlab/testutils';

import {
  TierBrowserModel,
  NotebookTierModel,
  FolderTierModel
} from '../models';
import { cassini } from '../core';
import { treeChildrenToData, treeResponseToData } from '../utils';
import { FolderTierInfo } from '../schema/types';

import {
  HOME_TREE,
  WP1_TREE,
  TEST_HLT_CONTENT,
  TEST_META_CONTENT,
  WP1_INFO
} from './test_cases';
import {
  createTierFiles,
  awaitSignalType,
  mockServerAPI,
  mockCassini
} from './tools';

describe('TierModel', () => {
  let theManager: ServiceManager.IManager;

  beforeEach(async () => {
    const { manager } = await createTierFiles([
      { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
      { path: WP1_INFO.hltsPath || '', content: TEST_HLT_CONTENT }
    ]);

    mockServerAPI({
      '/tree/{ids}': [
        { path: '', response: HOME_TREE },
        { path: '1', response: WP1_TREE },
        {
          path: '1/1',
          response: {
            reason: 'Not Found',
            message: 'Could not find'
          },
          status: 404
        }
      ]
    });

    await manager.ready;
    theManager = manager;
  });

  describe('complete-meta', () => {
    test('meta', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;
      expect(tier.meta).toEqual(TEST_META_CONTENT);
    });

    test('name', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;
      expect(tier.name).toBe('WP1');
    });

    test('description', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;
      expect(tier.description).toBe(TEST_META_CONTENT['description']);

      tier.description = 'something new';

      expect(tier.description).toBe('something new');
      expect(tier.meta['description']).toBe('something new');
    });

    test('conclusion', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;
      expect(tier.conclusion).toBe(TEST_META_CONTENT['conclusion']);

      tier.conclusion = 'new conclusion';

      expect(tier.conclusion).toBe('new conclusion');
      expect(tier.meta['conclusion']).toBe('new conclusion');
    });

    test('additionalMeta', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;
      expect(tier.additionalMeta).toEqual({ temperature: 273 });
    });

    test('addingInvalidMeta', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;
      expect(tier.setMetaValue('description', 'new')).toEqual(true);
      expect(tier.setMetaValue('description', 15)).toEqual(false);
    });

    test('treeData', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;

      await cassini.treeManager.cacheTreeData(
        ['1'],
        treeResponseToData(WP1_TREE, ['1'])
      );

      await expect(tier.treeData).resolves.toEqual(
        treeResponseToData(WP1_TREE, ['1'])
      );
    });

    test('children updates from tree manager', async () => {
      const tier = new NotebookTierModel(WP1_INFO);
      await tier.ready;

      const sentinal = jest.fn();
      tier.changed.connect((sender, change) => {
        if (change.type === 'children') {
          sentinal(change);
        }
      });

      const oldChildren = tier.children;

      expect(tier.children).toEqual(
        treeChildrenToData(WP1_INFO.children || {})
      );

      await cassini.treeManager.get(['1'], true);

      expect(sentinal).toBeCalled();
      expect(tier.children).not.toBe(oldChildren);
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

      const tier = new FolderTierModel(noMeta);

      expect(tier.name).toBe('No meta Yoo');
    });

    test('missing description', async () => {
      const { description, ...noDescription } = TEST_META_CONTENT;

      const tier = new NotebookTierModel(WP1_INFO);

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

      const tier = new NotebookTierModel(tierInfo);
      await tier.ready;

      expect(tier.hltsFile).toBe(undefined);
      expect(tier.hltsOutputs).toEqual([]);
    });

    test('init', async () => {
      expect(WP1_INFO.hltsPath).toBeDefined();

      const tier = new NotebookTierModel(WP1_INFO);
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
      const tier = new NotebookTierModel(WP1_INFO);
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
    mockCassini();

    mockServerAPI({
      '/tree/{ids}': [
        { path: '', response: HOME_TREE },
        { path: '1', response: WP1_TREE },
        { path: '1/1', response: WP1_TREE },
        {
          path: '1/throws',
          response: {
            reason: 'Not Found',
            message: 'Could not find'
          },
          status: 404
        }
      ]
    });

    model = new TierBrowserModel();
  });

  test('initial', async () => {
    expect(Array.from(model.currentPath)).toEqual([]);
    expect(model.current).toBeNull();

    model.currentPath.clear();
    await awaitSignalType(model.changed, 'current');

    expect(model.current).toMatchObject(treeResponseToData(HOME_TREE, []));

    expect(model.current?.children).toMatchObject(
      treeResponseToData(HOME_TREE, ['1']).children
    );
  });

  test('updating', async () => {
    const ids = ['1', '1'];

    model.currentPath.pushAll(ids);
    await awaitSignalType(model.changed, 'current');

    const childReponse = Object.assign(WP1_TREE);

    expect(model.current).toMatchObject(
      treeResponseToData(childReponse, ['1', '1'])
    );
  });

  test('updating with server error reports', async () => {
    Notification.dismiss();

    model.currentPath.push('1');
    model.currentPath.push('throws');

    await signalToPromise(Notification.manager.changed);

    expect(Notification.manager.notifications[0]?.message).toContain(
      'Not Found'
    );
  });

  test('updating invalid path reverts', async () => {
    model.currentPath.push('1');
    model.currentPath.push('throws');

    expect(model.sCurrentPath).toEqual(['1', 'throws']);

    await awaitSignalType(model.changed, 'path');
    // reverted
    expect(model.sCurrentPath).toEqual(['1']);
  });

  test('additionalColumns', () => {
    expect(model.additionalColumns).toEqual(new Set());
    model.currentPath.push('1');

    expect(model.additionalColumns).toEqual(new Set());
    model.additionalColumns.add('new Col');

    expect(model.additionalColumns).toEqual(new Set(['new Col']));

    model.currentPath.clear();

    expect(model.additionalColumns).toEqual(new Set());

    model.currentPath.pushAll(['1', '1']);

    expect(model.additionalColumns).toEqual(new Set());

    model.currentPath.clear();
    model.currentPath.pushAll(['1']);

    // should remember.
    expect(model.additionalColumns).toEqual(new Set(['new Col']));
  });

  test('childMetas', async () => {
    model.currentPath.clear();

    await awaitSignalType(model.changed, 'current');

    expect(model.childMetas).toEqual(new Set(['Fishes', 'Crabs']));
  });
});
