import {
  InputBooleanDialog,
  InputDateDialog,
  InputDatetimeDialog,
  InputJSONDialog,
  InputNumberDialog,
  InputPasswordDialog,
  InputTextDialog
} from '../../ui/dialogwidgets';
import { createMetaInput, createValidatedInput } from '../../ui/metaeditor';

describe('createMetaInput', () => {
  test('string MetaInput', () => {
    const initial = 'intial';
    const input = createMetaInput({ type: 'string' }, initial, '');
    expect(input).toBeInstanceOf(InputTextDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('date MetaInput', () => {
    const initial = '2000-12-25';
    const input = createMetaInput(
      { type: 'string', format: 'date' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputDateDialog);
    expect(input.getValue()).toEqual(new Date(initial));
  });

  test('date-time MetaInput', () => {
    const initial = new Date('2000-12-25').toISOString();
    const input = createMetaInput(
      { type: 'string', format: 'date-time' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputDatetimeDialog);
    expect(input.getValue()).toEqual(new Date(initial));
  });

  test('password MetaInput', () => {
    const initial = 'a secret';
    const input = createMetaInput(
      { type: 'string', format: 'password' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputPasswordDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('unknown string format MetaInput', () => {
    const initial = 'a secret';
    const input = createMetaInput(
      { type: 'string', format: 'byte' },
      initial,
      ''
    );
    expect(input).toBeInstanceOf(InputTextDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('number MetaInput', () => {
    const initial = 1.5;
    const input = createMetaInput({ type: 'number' }, initial, '');
    expect(input).toBeInstanceOf(InputNumberDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('integer MetaInput', () => {
    const initial = 1;
    const input = createMetaInput({ type: 'integer' }, initial, '');
    expect(input).toBeInstanceOf(InputNumberDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('boolean MetaInput', () => {
    const initial = true;
    const input = createMetaInput({ type: 'boolean' }, initial, '');
    expect(input).toBeInstanceOf(InputBooleanDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('array MetaInput', () => {
    const initial = ['a', 'b', 'c'];
    const input = createMetaInput({ type: 'array' }, initial, '');
    expect(input).toBeInstanceOf(InputJSONDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('object MetaInput', () => {
    const initial = { a: 1, b: 2, c: 3 };
    const input = createMetaInput({ type: 'object' }, initial, '');
    expect(input).toBeInstanceOf(InputJSONDialog);
    expect(input.getValue()).toEqual(initial);
  });

  test('unkown type MetaInput', () => {
    const initial = -1;
    const input = createMetaInput({ type: 'unknown' }, initial, '');
    expect(input).toBeInstanceOf(InputJSONDialog);
    expect(input.getValue()).toEqual(initial);
  });
});

describe('createValidatedInput', () => {
  test('basic schema validation', () => {
    const intial = 1;
    const validated = createValidatedInput({ type: 'integer' }, intial, '');

    expect(validated.wrappedInput).toBeInstanceOf(InputNumberDialog);
    expect(validated.getValue()).toEqual(intial);
    expect(validated.handleInput()).toEqual(true);

    validated.input.value = '1.5';

    expect(validated.getValue()).toEqual(1.5);
    expect(validated.handleInput()).toEqual(false);
  });

  test('json validation', () => {
    const intial = { a: 1, b: 2 };
    const validated = createValidatedInput({ type: 'object' }, intial, '');

    expect(validated.wrappedInput).toBeInstanceOf(InputJSONDialog);
    expect(validated.getValue()).toEqual(intial);
    expect(validated.handleInput()).toEqual(true);

    validated.input.value = '{"a": 1, "b": 2'; // no closing }

    expect(validated.getValue()).toEqual(undefined);
    expect(validated.handleInput()).toEqual(false);
  });

  test('date postProcessing', () => {
    const intial = '2000-12-25';
    const validated = createValidatedInput(
      { type: 'string', format: 'date' },
      intial,
      ''
    );

    expect(validated.wrappedInput).toBeInstanceOf(InputDateDialog);
    expect(validated.getValue()).toEqual(intial);
    expect(validated.handleInput()).toEqual(true);

    validated.input.value = '2000-12-50'; // december doesn't have 50 days

    expect(validated.getValue()).toEqual('an invalid date');
    expect(validated.handleInput()).toEqual(false);
  });

  test('additional schema validation', () => {
    const intial = 5;
    const validated = createValidatedInput(
      { type: 'integer', multipleOf: 5 },
      intial,
      ''
    );

    expect(validated.wrappedInput).toBeInstanceOf(InputNumberDialog);
    expect(validated.getValue()).toEqual(intial);
    expect(validated.handleInput()).toEqual(true);

    validated.input.value = '20';

    expect(validated.getValue()).toEqual(20);
    expect(validated.handleInput()).toEqual(true);

    validated.input.value = '13';

    expect(validated.getValue()).toEqual(13);
    expect(validated.handleInput()).toEqual(false);
  });
});
