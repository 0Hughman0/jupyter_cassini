import { NewChildWidget } from '../../ui/newchilddialog';
import { ITreeData, cassini } from '../../core';

import { mockServerAPI } from '../tools';
import { HOME_TREE, WP1_TREE } from '../test_cases';

import 'jest';
import { ChildClsNotebookInfo } from '../../schema/types';

describe('newChildDialog', () => {
  beforeEach(() => {
    mockServerAPI({
      '/tree': [
        { query: { 'ids[]': '' }, response: HOME_TREE },
        { query: { 'ids[]': '1' }, response: WP1_TREE }
      ]
    });
  });

  test('idInput', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;
    tier.childClsInfo.idRegex = '(\\d+)';
    tier.childClsInfo.namePartTemplate = 'Test{}';

    const widget = new NewChildWidget(tier);

    const idInput = widget.identifierInput;

    expect(idInput.previewBox.textContent).toEqual('Preview: Test?');

    const inputNode = idInput.input;

    idInput.validateInput();

    inputNode.value = 'x';
    idInput.validateInput();

    expect(inputNode.classList.values()).toContain('cas-invalid-id');
    expect(idInput.previewBox.textContent).toEqual('Preview: Testx');

    inputNode.value = '1';
    idInput.validateInput();

    expect(inputNode.classList.values()).not.toContain('cas-invalid-id');
    expect(idInput.previewBox.textContent).toEqual('Preview: Test1');

    expect(idInput.getValue()).toEqual('1');
  });

  test('description', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;

    const widget = new NewChildWidget(tier);

    const test_description = 'One line\nTwo line';

    widget.descriptionInput.input.value = test_description;

    expect(widget.descriptionInput.getValue()).toEqual(test_description);
  });

  test('templates', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;

    const clsInfo = tier.childClsInfo as ChildClsNotebookInfo;

    clsInfo.templates = ['Template 1', 'Template 2'];

    const widget = new NewChildWidget(tier);

    expect(
      Array.from(widget.templateSelector.list.childNodes).map(
        node => node.textContent
      )
    ).toEqual(clsInfo.templates);

    widget.templateSelector.list.selectedIndex = 0;

    expect(widget.templateSelector.getValue()).toEqual(clsInfo.templates[0]);
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
          type: 'string'
        }
      },
      additionalProperties: {}
    };

    const widget = new NewChildWidget(tier);

    expect(Object.keys(widget.subInputs)).toContain('Crabs')
    expect(Object.keys(widget.subInputs)).toContain('Fishes')
  });

  test('serialisation', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;
    const clsInfo = tier.childClsInfo as ChildClsNotebookInfo;

    clsInfo.metaSchema = {
      properties: {
        Crabs: {
          type: 'string'
        },
        Fishes: {
          type: 'string'
        }
      },
      additionalProperties: {}
    };

    clsInfo.templates = ['Template 1', 'Template 2'];

    const widget = new NewChildWidget(tier);

    widget.identifierInput.input.value = '1';
    widget.descriptionInput.input.value = 'Description';
    widget.templateSelector.list.selectedIndex = 1;
    widget.subInputs['Crabs'].input.value = 'A';
    widget.subInputs['Fishes'].input.value = 'B';

    expect(widget.getValue()).toMatchObject({
      id: '1',
      description: 'Description',
      template: 'Template 2',
      Crabs: 'A',
      Fishes: 'B'
    });
  });
});
