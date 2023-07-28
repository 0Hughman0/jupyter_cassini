import { TierModel, TierBrowserModel } from '../models';
import { cassini, TreeManager } from '../core';
import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';

import { ITreeResponse, CassiniServer } from '../services';

import 'jest';
import { JSONObject } from '@lumino/coreutils';

const TEST_META_CONTENT: JSONObject = {
  description: 'this is a test',
  conclusion: 'concluded',
  started: '01/22/2023',
  temperature: 273
};

const HOME_RESPONSE: ITreeResponse = require('./test_home_branch.json');

test('context understanding', async () => {
  var manager = new ServiceManagerMock();
  const contents = manager.contents;

  const file = await contents.newUntitled({
    path: '/WorkPackages/WP1/.exps/',
    type: 'file'
  });

  let context = new Context<DocumentRegistry.ICodeModel>({
    manager: manager,
    factory: new TextModelFactory(),
    path: file.path
  });

  context.initialize(true);
  context.model.fromJSON(TEST_META_CONTENT);

  await new Promise((resolve, reject) => {
    context.ready.then(() => resolve(null));
  });

  expect(context.model.sharedModel.getSource()).toBe(
    JSON.stringify(TEST_META_CONTENT)
  );
});

describe('TierModel', () => {
  let manager = new ServiceManagerMock();
  let tier: TierModel;

  async function setupMeta(metaContent: JSONObject) {
    manager = new ServiceManagerMock();
    cassini.contentService = manager;
    const file = await manager.contents.newUntitled({
      path: '/WorkPackages/WP1/.exps/',
      type: 'file'
    });

    tier = new TierModel({
      name: 'WP1',
      metaPath: file.path,
      identifiers: ['1']
    });

    if (tier.metaFile) {
      tier.metaFile.model.fromJSON(metaContent);
    }

    return tier.ready;
  }

  describe('complete meta', () => {
    beforeEach(async () => {
      await setupMeta(TEST_META_CONTENT);
    });

    test('meta', () => {
      expect(tier.meta).toEqual(TEST_META_CONTENT);
    });

    test('name', () => {
      expect(tier.name).toBe('WP1');
    });

    test('description', () => {
      expect(tier.description).toBe(TEST_META_CONTENT['description']);

      tier.description = 'something new';

      expect(tier.description).toBe('something new');
      expect(tier.meta['description']).toBe('something new');
    });

    test('additionalMeta', () => {
      expect(tier.additionalMeta).toEqual({ temperature: 273 });
    });
  });

  describe('missing meta', () => {
    test('no meta', () => {
      tier = new TierModel({
        name: 'No meta Yoo', identifiers: ['1']
      });

      expect(tier.name).toBe('No meta Yoo');

      expect(tier.meta).toEqual({});

      expect(tier.description).toBe('');
      expect(tier.conclusion).toBe('');
    });

    test('missing description', async () => {
      const { description, ...noDescription } = TEST_META_CONTENT;
      await setupMeta(noDescription);

      expect(tier.description).toBe('');
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
