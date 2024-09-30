import { NewChildWidget } from '../../ui/newchilddialog';
import { ITreeData, cassini } from '../../core';

import { mockServerAPI } from '../tools';
import { HOME_TREE, WP1_TREE } from '../test_cases';

import 'jest';
import { ChildClsNotebookInfo } from '../../schema/types';
import { InputItemsDialog, InputNumberDialog, InputTextAreaDialog, InputTextDialog, ValidatingInput } from '../../ui/dialogwidgets';

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

    expect(Object.keys(widget.subInputs)).toEqual(['id', 'description', 'template', 'Crabs', 'Fishes'])
    expect((widget.subInputs['id'] as ValidatingInput<string>).wrappedInput).toBeInstanceOf(InputTextDialog);
    expect(widget.subInputs['description']).toBeInstanceOf(InputTextAreaDialog);
    expect(widget.subInputs['template']).toBeInstanceOf(InputItemsDialog);
    expect((widget.subInputs['Crabs'] as ValidatingInput<string>).wrappedInput).toBeInstanceOf(InputTextDialog);
    expect((widget.subInputs['Fishes'] as ValidatingInput<number>).wrappedInput).toBeInstanceOf(InputNumberDialog);
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

    widget.identifierInput.wrappedInput._setValue('1');
    widget.descriptionInput._setValue('Description');
    widget.templateSelector._setValue('Template 2');

    (widget.subInputs['Crabs'] as ValidatingInput<string>).wrappedInput._setValue('A');
    (widget.subInputs['Fishes'] as ValidatingInput<number>).wrappedInput._setValue('10');

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

    expect(Object.keys(widget.getValue())).not.toContain('Crabs')
    expect(Object.keys(widget.getValue())).not.toContain('template')
    expect(Object.keys(widget.getValue())).not.toContain('Fishes')
  });
});
