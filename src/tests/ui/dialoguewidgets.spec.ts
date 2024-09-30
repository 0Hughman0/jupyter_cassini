import 'jest';

import {
  InputBooleanDialog,
  InputNumberDialog,
  InputTextDialog,
  InputPasswordDialog,
  InputItemsDialog,
  InputTextAreaDialog,
  InputDateDialog,
  InputDatetimeDialog,
  InputJSONDialog,
  ValidatingInput
} from '../../ui/dialogwidgets';

test('InputBooleanDialog', () => {
  let dialog = new InputBooleanDialog({ title: '', value: false });
  expect(dialog.input.type).toEqual('checkbox');
  expect(dialog.input.checked).toEqual(false)
  expect(dialog.getValue()).toEqual(undefined);
  expect(dialog.dirty).toBeFalsy()
  
  dialog.input.checked = true;
  dialog.input.dispatchEvent(new Event('input'))
  expect(dialog.dirty).toBeTruthy()

  expect(dialog.getValue()).toEqual(true);

  dialog = new InputBooleanDialog({ title: '', value: true });
  expect(dialog.input.checked).toEqual(true)  
  expect(dialog.getValue()).toBeUndefined()
});


test('InputNumberDialogue', () => {
  let dialog = new InputNumberDialog({ title: '', value: 1.5 });
  expect(dialog.input.type).toEqual('number');
  expect(dialog.input.value).toEqual("1.5")
  expect(dialog.getValue()).toEqual(undefined);

  dialog.input.value = '2.5';
  dialog.input.dispatchEvent(new Event('input'))

  expect(dialog.getValue()).toEqual(2.5);
});

test('InputTextDialog', () => {
  let dialog = new InputTextDialog({ title: '', text: 'initial' });
  expect(dialog.input.type).toEqual('text');
  expect(dialog.input.value).toEqual('initial');
  expect(dialog.getValue()).toEqual(undefined);

  dialog.input.value = 'new';
  dialog.input.dispatchEvent(new Event('input'));

  expect(dialog.getValue()).toEqual('new');
});

test('InputPasswordDialog', () => {
  let dialog = new InputPasswordDialog({ title: '', text: 'initial' });
  expect(dialog.input.type).toEqual('password');
  expect(dialog.input.value).toEqual('initial');
  expect(dialog.getValue()).toEqual(undefined);

  dialog.input.value = 'new';
  dialog.input.dispatchEvent(new Event('input'))

  expect(dialog.getValue()).toEqual('new');
});

test('InputItemsDialog', () => {
  let dialog = new InputItemsDialog({
    title: '',
    items: ['one', 'two'],
    current: 1,
    editable: true
  });
  expect(dialog.input.type).toEqual('text');
  expect(dialog.list.type).toEqual('select-one');
  expect(dialog.input.value).toEqual('two');
  expect(dialog.getValue()).toEqual(undefined);

  dialog.input.value = 'one';
  dialog.input.dispatchEvent(new Event('input'))

  expect(dialog.getValue()).toEqual('one');
});

test('InputTextAreaDialog', () => {
  let dialog = new InputTextAreaDialog({ title: '', text: 'initial' });
  expect(dialog.input.type).toEqual('textarea');
  expect(dialog.input.value).toEqual('initial');
  expect(dialog.getValue()).toEqual(undefined);

  dialog.input.value = 'new';
  dialog.input.dispatchEvent(new Event('input'))

  expect(dialog.getValue()).toEqual('new');
});

test('InputDateDialog', () => {
  const dateToDateString = (date: Date) => date.toISOString().slice(0, 10);
  const initial = new Date(2000, 11, 25); // wth

  let dialog = new InputDateDialog({ title: '', value: initial });
  expect(dialog.input.type).toEqual('date');
  expect(dialog.input.value).toEqual(initial.toISOString().split('T')[0]);
  expect(dialog.getValue()).toEqual(undefined);

  const newValue = new Date(initial);
  newValue.setMonth(1);

  dialog.input.value = dateToDateString(newValue);
  dialog.input.dispatchEvent(new Event('input'));
  
  expect(dialog.getValue()).toEqual(newValue);
});

test('InputDatetimeDialog', () => {
  const initial = new Date(2000, 11, 25, 10, 30);

  let dialog = new InputDatetimeDialog({ title: '', value: initial });
  expect(dialog.input.type).toEqual('datetime-local');
  expect(new Date(dialog.input.value)).toEqual(initial)
  expect(dialog.getValue()).toEqual(undefined);

  const newValue = new Date(initial);
  newValue.setMonth(1);

  dialog.input.value = newValue.toISOString().split('.')[0];
  dialog.input.dispatchEvent(new Event('input'));

  expect(dialog.getValue()).toEqual(newValue);
});

test('InputJSONDialog', () => {
  const initial = { 'a list': [] };
  let dialog = new InputJSONDialog({ title: '', value: initial });
  expect(dialog.editor.model.sharedModel.getSource()).toEqual(JSON.stringify(initial));
  expect(dialog.dirty).toBeFalsy()
  expect(dialog.getValue()).toEqual(undefined);

  const newValue = { 'new list': ['content'] };

  dialog.editor.model.sharedModel.setSource(JSON.stringify(newValue));
  expect(dialog.dirty).toBeTruthy()
  expect(dialog.getValue()).toEqual(newValue);

  dialog.editor.model.sharedModel.setSource('invalid json');
  expect(dialog.getValue()).toEqual(undefined);
});

describe('ValidatedInput', () => {
  test('construction no postprocess', () => {
    const initial = 'initial';
    const input = new InputTextDialog({ text: initial, title: '' });

    const validated = new ValidatingInput(input, value => value == 'valid');

    validated.input.dispatchEvent(new Event('input'));
    expect(validated.getValue()).toEqual(initial);
    expect(validated.validate()).toEqual(false);
    expect(validated.input.classList).toContain('cas-invalid-id');

    input.input.value = 'valid';

    expect(validated.validate()).toEqual(true);
    expect(validated.input.classList).not.toContain('cas-invalid-id');
  });

  test('construction with postprocess', () => {
    const initial = 'initial';
    const input = new InputTextDialog({ text: initial, title: '' });
    const validated = new ValidatingInput(
      input,
      value => value == 'valid',
      value => value + 'lid'
    );

    validated.input.dispatchEvent(new Event('input'));

    expect(validated.getValue()).toEqual(initial + 'lid');
    expect(validated.validate()).toEqual(false);
    expect(validated.input.classList).toContain('cas-invalid-id');

    input.input.value = 'va';

    expect(validated.validate()).toEqual(true);
    expect(validated.input.classList).not.toContain('cas-invalid-id');
  });
});
