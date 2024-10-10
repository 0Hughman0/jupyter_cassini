import { NotebookTierModel } from '../../models';
import { TierNotebookHeader } from '../../ui/nbheader';
import { treeChildrenToData } from '../../utils';
import { WP1_INFO, TEST_META_CONTENT, TEST_HLT_CONTENT } from '../test_cases';
import {
  mockCassini,
  mockServerAPI,
  createTierFiles,
  awaitSignalType
} from '../tools';

beforeEach(() => {
  mockCassini();
  mockServerAPI({
    '/lookup': [
      { query: { name: 'WP1' }, response: WP1_INFO },
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
  createTierFiles([
    { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
    { path: WP1_INFO.hltsPath as string, content: TEST_HLT_CONTENT }
  ]);
});

describe('nb header', () => {
  test('construct', async () => {
    const model = new NotebookTierModel(WP1_INFO);
    const widget = new TierNotebookHeader(model);

    await model.ready;

    expect(widget.descriptionEditor.source).toEqual(
      TEST_META_CONTENT.description
    );
    expect(widget.conclusionEditor.source).toEqual(
      TEST_META_CONTENT.conclusion
    );

    expect(Array.from(widget.children())[0].node.textContent).toEqual('WP1');
    expect(widget.childrenSummary.data).toEqual(
      Object.entries(treeChildrenToData(WP1_INFO.children || {}))
    );
  });

  test('update description', async () => {
    const model = new NotebookTierModel(WP1_INFO);
    const widget = new TierNotebookHeader(model);

    await model.ready;

    expect(widget.descriptionEditor.source).toEqual(
      TEST_META_CONTENT.description
    );

    let set = awaitSignalType(model.changed, 'meta');
    model.setMetaValue('description', 'new description');
    await set;

    expect(widget.descriptionEditor.source).toEqual('new description');

    set = awaitSignalType(model.changed, 'meta');
    model.setMetaValue('conclusion', 'new conclusion');
    await set;

    expect(widget.conclusionEditor.source).toEqual('new conclusion');
  });

  test('update children', async () => {
    const model = new NotebookTierModel(WP1_INFO);
    const widget = new TierNotebookHeader(model);

    await model.ready;

    expect(widget.childrenSummary.data).toEqual(
      Object.entries(treeChildrenToData(WP1_INFO.children || {}))
    );

    const newChildren = structuredClone(WP1_INFO.children || {});
    newChildren['2'] = newChildren['1'];

    model.refresh({
      children: newChildren
    });

    expect(widget.childrenSummary.data).toEqual(
      Object.entries(treeChildrenToData(newChildren))
    );
    expect(widget.childrenSummary.data.map(row => row[0])).toContain('2');
  });

  test('can update meta', async () => {
    const model = new NotebookTierModel(WP1_INFO);
    const widget = new TierNotebookHeader(model);

    await model.ready;

    widget.descriptionEditor.source = 'new description';
    widget.descriptionEditor.setRendered(true);
    expect(model.description).toEqual('new description');

    widget.conclusionEditor.source = 'new conclusion';
    widget.conclusionEditor.setRendered(true);
    expect(model.conclusion).toEqual('new conclusion');
  });
});
