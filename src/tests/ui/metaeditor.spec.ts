import { cassini } from '../../core';
import {
  InputBooleanDialog,
  InputDateDialog,
  InputDatetimeDialog,
  InputJSONDialog,
  InputNumberDialog,
  InputPasswordDialog,
  InputTextDialog
} from '../../ui/dialogwidgets';
import {
  createMetaInput,
  createValidatedInput,
  MetaEditor
} from '../../ui/metaeditor';

import { mockServerAPI, createTierFiles } from '../tools';
import { WP1_INFO, TEST_META_CONTENT, WP1_1_INFO } from '../test_cases';
import { MetaTableWidget } from '../../ui/metatable';
import { MetaSchema } from '../../schema/types';

describe('createMetaInput', () => {
  test('string MetaInput', () => {
    const initial = 'intial';
    const input = createMetaInput({ type: 'string' }, initial, '');
    expect(input).toBeInstanceOf(InputTextDialog);
  });

  test('date MetaInput', () => {
    const initial = '2000-12-25';
    const input = createMetaInput(
      { type: 'string', format: 'date' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputDateDialog);
  });

  test('date-time MetaInput', () => {
    const initial = new Date('2000-12-25').toISOString();
    const input = createMetaInput(
      { type: 'string', format: 'date-time' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputDatetimeDialog);
  });

  test('password MetaInput', () => {
    const initial = 'a secret';
    const input = createMetaInput(
      { type: 'string', format: 'password' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputPasswordDialog);
  });

  test('number MetaInput', () => {
    const initial = 1.5;
    const input = createMetaInput({ type: 'number' }, initial, '');
    expect(input).toBeInstanceOf(InputNumberDialog);
  });

  test('integer MetaInput', () => {
    const initial = 1;
    const input = createMetaInput({ type: 'integer' }, initial, '');
    expect(input).toBeInstanceOf(InputNumberDialog);
  });

  test('boolean MetaInput', () => {
    const initial = true;
    const input = createMetaInput({ type: 'boolean' }, initial, '');
    expect(input).toBeInstanceOf(InputBooleanDialog);
  });

  test('array MetaInput', () => {
    const initial = ['a', 'b', 'c'];
    const input = createMetaInput({ type: 'array' }, initial, '');
    expect(input).toBeInstanceOf(InputJSONDialog);
  });

  test('object MetaInput', () => {
    const initial = { a: 1, b: 2, c: 3 };
    const input = createMetaInput({ type: 'object' }, initial, '');
    expect(input).toBeInstanceOf(InputJSONDialog);
  });

  test('unkown type MetaInput', () => {
    const initial = -1;
    const input = createMetaInput({ type: 'unknown' }, initial, '');
    expect(input).toBeInstanceOf(InputJSONDialog);
  });
});

describe('createValidatedInput', () => {
  test('basic schema validation', () => {
    const intial = 1;
    const validated = createValidatedInput({ type: 'integer' }, intial, '');
    validated.input.dispatchEvent(new Event('input'));

    expect(validated.wrappedInput).toBeInstanceOf(InputNumberDialog);

    expect(validated.getValue()).toEqual(intial);
    expect(validated.validate()).toEqual(true);

    const input = validated.wrappedInput.input as HTMLInputElement;

    input.value = '1.5';

    expect(validated.getValue()).toEqual(1.5);
    expect(validated.validate()).toEqual(false);
  });

  test('json validation', () => {
    const intial = { a: 1, b: 2 };
    const validated = createValidatedInput({ type: 'object' }, intial, '');
    validated.input.dispatchEvent(new Event('input'));

    expect(validated.wrappedInput).toBeInstanceOf(InputJSONDialog);

    expect(validated.getValue()).toEqual(intial);
    expect(validated.validate()).toEqual(true);

    const input = validated.wrappedInput as InputJSONDialog;

    input.editor.model.sharedModel.setSource('{"a": 1, "b": 2'); // no closing }

    expect(validated.getValue()).toEqual(undefined);
    expect(validated.validate()).toEqual(false);
  });

  test('date postProcessing', () => {
    const intial = '2000-12-25';
    const validated = createValidatedInput(
      { type: 'string', format: 'date' },
      intial,
      ''
    );
    expect(validated.getValue()).toEqual(undefined);
    validated.input.dispatchEvent(new Event('input'));

    expect(validated.wrappedInput).toBeInstanceOf(InputDateDialog);
    expect(validated.getValue()).toEqual(intial);
    expect(validated.validate()).toEqual(true);

    const input = validated.wrappedInput.input as HTMLInputElement;

    input.value = '2000-12-50'; // december doesn't have 50 days

    expect(validated.getValue()).toEqual(undefined);
    expect(validated.validate()).toEqual(false);
  });

  test('date-time postProcessing', () => {
    const intial = '2000-12-25T00:00:00.000Z';
    const validated = createValidatedInput(
      { type: 'string', format: 'date-time' },
      intial,
      ''
    );
    expect(validated.wrappedInput).toBeInstanceOf(InputDatetimeDialog);
    expect(validated.getValue()).toEqual(undefined);

    validated.input.dispatchEvent(new Event('input'));

    expect(validated.getValue()).toEqual(intial);
    expect(validated.validate()).toEqual(true);

    const input = validated.wrappedInput.input as HTMLInputElement;

    input.value = '2000-12-50T00:00'; // december doesn't have 50 days

    expect(validated.getValue()).toEqual(undefined);
    expect(validated.validate()).toEqual(false);
  });

  test('additional schema validation', () => {
    const intial = 5;
    const validated = createValidatedInput(
      { type: 'integer', multipleOf: 5 },
      intial,
      ''
    );
    validated.input.dispatchEvent(new Event('input'));

    expect(validated.wrappedInput).toBeInstanceOf(InputNumberDialog);
    expect(validated.getValue()).toEqual(intial);
    expect(validated.validate()).toEqual(true);

    const input = validated.input as HTMLInputElement;

    input.value = '20';

    expect(validated.getValue()).toEqual(20);
    expect(validated.validate()).toEqual(true);

    input.value = '13';

    expect(validated.getValue()).toEqual(13);
    expect(validated.validate()).toEqual(false);
  });
});

describe('metaeditor widget', () => {
  beforeEach(async () => {
    const WP1_NO_HLTS = structuredClone(WP1_INFO);
    delete WP1_NO_HLTS['hltsPath'];

    const WP1_1_NO_HLTS = structuredClone(WP1_1_INFO);
    delete WP1_1_NO_HLTS['hltsPath'];

    mockServerAPI({
      '/lookup': [
        { query: { name: 'WP1' }, response: WP1_NO_HLTS },
        { query: { name: 'WP1.1' }, response: WP1_1_NO_HLTS }
      ]
    });

    const WP1_1_META = structuredClone(TEST_META_CONTENT) as any;
    WP1_1_META['WP1.1Meta'] = 'WP1.1MetaValue';

    await createTierFiles([
      { path: WP1_INFO.metaPath, content: TEST_META_CONTENT },
      { path: WP1_1_INFO.metaPath, content: WP1_1_META }
    ]);
  });

  afterEach(async () => {
    cassini.tierModelManager.cache = {};
    cassini.treeManager.cache = {};
  });

  test('construct', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    expect(model.publicMetaSchema).not.toBeUndefined();
    const publicMetaSchema = model.publicMetaSchema as MetaSchema;

    const widget = new MetaEditor(model);

    const table = widget.table as MetaTableWidget;

    expect(table).not.toBeNull();

    expect(table.values).toEqual(model.additionalMeta);

    const schema = table.schema as MetaSchema;
    expect(schema).toEqual(publicMetaSchema);
  });

  test('model changes content', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);

    const table = widget.table as MetaTableWidget;
    expect(Object.keys(table.values)).not.toContain('newKey');
    model.setMetaValue('newKey', 100);
    expect(Object.keys(model.additionalMeta)).toContain('newKey');

    expect(Object.keys(table.values)).toContain('newKey');
  });

  test('new model', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);

    const table = widget.table as MetaTableWidget;
    expect(Object.keys(table.values)).not.toContain('WP1.1Meta');

    const newModel = await cassini.tierModelManager.get('WP1.1');
    await newModel.ready;

    widget.model = newModel;

    expect(Object.keys(table.values)).toContain('WP1.1Meta');
  });

  test('old model events disconnected', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);

    const table = widget.table as MetaTableWidget;
    expect(Object.keys(table.values)).not.toContain('WP1.1Meta');

    const newModel = await cassini.tierModelManager.get('WP1.1');
    await newModel.ready;

    widget.model = newModel;

    expect(Object.keys(table.values)).toContain('WP1.1Meta');

    model.setMetaValue('newValue', 100);

    expect(Object.keys(table.values)).not.toContain('newValue');
  });

  test('from null model', async () => {
    const widget = new MetaEditor(null);

    expect(widget.table).toBeNull();

    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    widget.model = model;

    expect(widget.table).not.toBeNull();
    expect(Object.keys((widget.table as MetaTableWidget).values)).toContain(
      'temperature'
    );
  });

  test('to null model', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);

    const table = widget.table as MetaTableWidget;
    expect(table.values).toEqual(model.additionalMeta);

    widget.model = null;

    expect(table.values).toEqual({});
  });

  test('update meta value', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);
    const table = widget.table as MetaTableWidget;

    expect(table.values['temperature']).toEqual(
      TEST_META_CONTENT['temperature']
    );

    table.handleSetMetaValue('temperature', 500);

    expect(table.values['temperature']).toEqual(500);
    expect(model.meta['temperature']).toEqual(500);
  });

  test('delete meta key', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);
    const table = widget.table as MetaTableWidget;

    expect(Object.keys(table.values)).toContain('temperature');

    table.handleRemoveMetaKey('temperature');

    expect(Object.keys(table.values)).not.toContain('temperature');
  });

  test('add a new meta key', async () => {
    const model = await cassini.tierModelManager.get('WP1');
    await model.ready;

    const widget = new MetaEditor(model);
    const table = widget.table as MetaTableWidget;

    expect(Object.keys(table.values)).not.toContain('newKey');

    table.handleNewMetaKey('newKey');

    expect(Object.keys(table.values)).toContain('newKey');
  });
});
