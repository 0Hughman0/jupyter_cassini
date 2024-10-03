import { signalToPromise } from '@jupyterlab/testutils';

import { TierBrowserModel, TierModel } from '../models';
import { createTierFiles, mockServerAPI } from './tools';
import {
  TEST_HLT_CONTENT,
  TEST_META_CONTENT,
  WP1_INFO,
  WP1_TREE,
  HOME_TREE
} from './test_cases';

import 'jest';

describe('tier-model', () => {
  //let metaFile: any;
  //let hltsFile: any;

  beforeEach(async () => {
    await createTierFiles([
      { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
      { path: WP1_INFO.hltsPath || '', content: TEST_HLT_CONTENT }
    ]);
  });

  test('model-ready-no-hlts', async () => {
    const tier = new TierModel(WP1_INFO);
    expect(tier.metaFile?.isReady).toBe(false);

    expect(tier.description).toBe('');

    await tier.ready;

    expect(tier.metaFile?.isReady).toBe(true);

    expect(tier.description).toBe(TEST_META_CONTENT.description);
  });

  test('model-ready-hlts', async () => {
    const tier = new TierModel(WP1_INFO);
    expect(tier.metaFile?.isReady).toBe(false);
    // expect(tier.hltsFile?.isReady).toBe(false) // doesn't work because hlts file is set in a callback... hmmm

    expect(tier.description).toBe('');
    expect(tier.hltsOutputs).toEqual([]);

    await tier.ready;

    expect(tier.metaFile?.isReady).toBe(true);
    expect(tier.hltsFile?.isReady).toBe(true);

    expect(tier.description).toBe(TEST_META_CONTENT.description);
    expect(tier.hltsOutputs).not.toEqual([]);
  });

  test('changed', async () => {
    const tier = await new TierModel(WP1_INFO).ready;
    const sentinal = jest.fn();

    tier.changed.connect(sentinal);

    let calls = sentinal.mock.calls.length;

    expect(tier.dirty).toBe(false);
    tier.description = 'new value';
    expect(tier.dirty).toBe(true);

    expect(sentinal).toBeCalledTimes(calls + 3); // once for meta contents and once for making dirty

    calls = sentinal.mock.calls.length;

    tier.hltsFile?.model.fromJSON({});
    expect(sentinal).toBeCalledTimes(calls + 1);

    calls = sentinal.mock.calls.length;

    await tier.revert();
    expect(tier.dirty).toBe(false);

    expect(sentinal).toBeCalledTimes(calls + 3); // 1x hlts update, 1x meta update, 1x meta.dirty update

    tier.description = 'new value 2';

    expect(tier.dirty).toBe(true);

    calls = sentinal.mock.calls.length;

    await tier.save();

    expect(tier.dirty).toBe(false);

    expect(sentinal).toBeCalledTimes(calls + 1); // apparently saving causes an update(?)
  });
});

describe('tree-model', () => {
  beforeEach(() => {
    mockServerAPI({
      '/tree': [
        { query: { 'ids[]': '' }, response: HOME_TREE },
        { query: { 'ids[]': '1' }, response: WP1_TREE }
      ]
    });
  });

  test('currentPath', async () => {
    const browserModel = new TierBrowserModel();

    const childrenSentinal = jest.fn();
    browserModel.childrenUpdated.connect(childrenSentinal);

    const pathSentinal = jest.fn();

    browserModel.currentPath.changed.connect(pathSentinal);

    const pathChanged = signalToPromise(browserModel.currentPath.changed);
    const childrenChanged = signalToPromise(browserModel.childrenUpdated);
    browserModel.currentPath.push('1');

    await pathChanged;
    await childrenChanged;

    expect(pathSentinal).toBeCalledTimes(1);
    expect(childrenSentinal).toBeCalledTimes(1);

    await browserModel.refresh();

    expect(childrenSentinal).toBeCalledTimes(2);
    expect(pathSentinal).toBeCalledTimes(1);
  });
});
