import { InputTextDialog, InputNumberDialog } from '../../ui/dialogwidgets';
import { NewChildWidget } from '../../ui/newchilddialog';
import { ITreeData, cassini } from '../../core';

import { mockServer } from '../tools';

import 'jest';

describe('newChildDialog', () => {
  beforeEach(() => {
    mockServer();
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
    tier.childClsInfo.templates = ['Template 1', 'Template 2'];

    const widget = new NewChildWidget(tier);

    expect(
      Array.from(widget.templateSelector.list.childNodes).map(
        node => node.textContent
      )
    ).toEqual(tier.childClsInfo.templates);

    widget.templateSelector.list.selectedIndex = 0;

    expect(widget.templateSelector.getValue()).toEqual(
      tier.childClsInfo.templates[0]
    );
  });

  test('meta-inputs', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;
    tier.childClsInfo.metaNames = ['Crabs', 'Fishes'];

    const widget = new NewChildWidget(tier);

    const getLabelText = (input: InputTextDialog | InputNumberDialog) =>
      input.node.childNodes[0].textContent;

    expect(widget.metaInputs.map(getLabelText)).toEqual(['Crabs', 'Fishes']);
  });

  test('serialisation', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;

    tier.childClsInfo.metaNames = ['Crabs', 'Fishes'];
    tier.childClsInfo.templates = ['Template 1', 'Template 2'];

    const widget = new NewChildWidget(tier);

    widget.identifierInput.input.value = '1';
    widget.descriptionInput.input.value = 'Description';
    widget.templateSelector.list.selectedIndex = 1;
    widget.metaInputs[0].input.value = 'A';
    widget.metaInputs[1].input.value = 'B';

    expect(widget.getValue()).toMatchObject({
      id: '1',
      description: 'Description',
      template: 'Template 2',
      Crabs: 'A',
      Fishes: 'B'
    });
  });
});
