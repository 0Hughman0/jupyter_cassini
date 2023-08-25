import { InputTextDialog, InputNumberDialog } from '../../ui/dialogwidgets';
import { NewChildWidget } from '../../ui/newchilddialog';
import { ITreeData, cassini } from '../../core';

import { mockServer } from '../tools';

import 'jest';

describe('newChildDialog', () => {
  beforeEach(() => {
    mockServer();
  });

  test('init', async () => {
    const tier = (await cassini.treeManager.get([])) as Required<ITreeData>;

    const widget = new NewChildWidget(tier);

    const idInput = widget.identifierInput;

    expect(idInput.previewBox.textContent).toEqual('Preview: WP?');

    const inputNode = idInput['_input']; // not sure what best practice is here, surely this shouldn't be protected!

    idInput.validateInput();

    inputNode.value = 'x';
    idInput.validateInput();

    expect(inputNode.classList.values()).toContain('cas-invalid-id');
    expect(idInput.previewBox.textContent).toEqual('Preview: WPx');

    inputNode.value = '1';
    idInput.validateInput();

    expect(inputNode.classList.values()).not.toContain('cas-invalid-id');
    expect(idInput.previewBox.textContent).toEqual('Preview: WP1');

    const getLabelText = (input: InputTextDialog | InputNumberDialog) =>
      input.node.childNodes[0].textContent;

    expect(widget.metaInputs.map(getLabelText)).toEqual(['Crabs', 'Fishes']);
  });
});
