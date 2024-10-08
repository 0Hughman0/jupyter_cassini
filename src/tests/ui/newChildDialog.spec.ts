import { NewChildWidget } from '../../ui/newchilddialog';
import { ITreeData, cassini } from '../../core';

import { mockServerAPI } from '../tools';
import { HOME_TREE, WP1_TREE } from '../test_cases';

import 'jest';
import { ChildClsNotebookInfo } from '../../schema/types';
import {
  InputItemsDialog,
  InputTextAreaDialog,
  InputTextDialog,
  ValidatingInput
} from '../../ui/dialogwidgets';

describe('newChildDialog', () => {
  beforeEach(() => {
    mockServerAPI({
      '/tree': [
        { query: { 'ids[]': '' }, response: HOME_TREE },
        { query: { 'ids[]': '1' }, response: WP1_TREE }
      ]
    });
  });

  test('meta-inputs', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;
    const clsInfo = tier.childClsInfo as ChildClsNotebookInfo;

    clsInfo.metaSchema = {
      properties: {
        Crabs: {
          type: 'string'
        },
        Fishes: {
          type: 'integer'
        }
      },
      additionalProperties: {},
      type: 'object'
    };

    const widget = new NewChildWidget(tier);

    expect(Object.keys(widget.subInputs)).toEqual([
      'id',
      'description',
      'template'
    ]);

    expect(widget.metaTable?.values).toMatchObject({'Crabs': undefined, 'Fishes': undefined})
    
    expect(
      (widget.identifierInput).wrappedInput
    ).toBeInstanceOf(InputTextDialog);
    expect(widget.descriptionInput).toBeInstanceOf(InputTextAreaDialog);
    expect(widget.templateSelector).toBeInstanceOf(InputItemsDialog);
  });

  test('full-serialisation', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;
    const clsInfo = tier.childClsInfo as ChildClsNotebookInfo;

    clsInfo.metaSchema = {
      properties: {
        Crabs: {
          type: 'string'
        },
        Fishes: {
          type: 'integer'
        }
      },
      additionalProperties: {},
      type: 'object'
    };

    clsInfo.templates = ['Template 1', 'Template 2'];

    const widget = new NewChildWidget(tier);
    widget.metaTable?.render()  // inputs not set until render called!
  
    widget.identifierInput.wrappedInput._setValue('1');
    widget.descriptionInput._setValue('Description');
    widget.templateSelector._setValue('Template 2');

    (
      widget.metaTable?.inputs['Crabs'] as ValidatingInput<string>
    ).wrappedInput._setValue('A');
    (
      widget.metaTable?.inputs['Fishes'] as ValidatingInput<number>
    ).wrappedInput._setValue('10');

    expect(widget.getValue()).toMatchObject({
      id: '1',
      description: 'Description',
      template: 'Template 2',
      Crabs: 'A',
      Fishes: 10
    });
  });

  test('partial-serialisation', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;
    const clsInfo = tier.childClsInfo as ChildClsNotebookInfo;

    clsInfo.metaSchema = {
      properties: {
        Crabs: {
          type: 'string'
        },
        Fishes: {
          type: 'integer'
        }
      },
      additionalProperties: {},
      type: 'object'
    };

    clsInfo.templates = ['Template 1', 'Template 2'];

    const widget = new NewChildWidget(tier);

    widget.identifierInput.wrappedInput._setValue('1');
    widget.descriptionInput._setValue('Description');

    expect(widget.getValue()).toMatchObject({
      id: '1',
      description: 'Description'
    });

    expect(Object.keys(widget.getValue())).not.toContain('Crabs');
    expect(Object.keys(widget.getValue())).not.toContain('template');
    expect(Object.keys(widget.getValue())).not.toContain('Fishes');
  });
});
