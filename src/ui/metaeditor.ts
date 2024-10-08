import { Panel } from '@lumino/widgets';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { PathExt } from '@jupyterlab/coreutils';

import { FolderTierModel, NotebookTierModel } from '../models';
import { MetaTableWidget } from './metatable';
import { JSONObject, JSONValue } from '@lumino/coreutils';
import { Signal, ISignal } from '@lumino/signaling';

import { cassini } from '../core';
import {
  InputBooleanDialog,
  InputItemsDialog,
  InputNumberDialog,
  InputPasswordDialog,
  InputTextDialog,
  InputDateDialog,
  InputDatetimeDialog,
  InputJSONDialog,
  InputDialogBase,
  ValidatingInput
} from './dialogwidgets';
import { MetaSchema, ObjectDef } from '../schema/types';

export function createMetaInput(
  propertySchema: ObjectDef,
  currentValue: any | null,
  label: string | undefined
): InputDialogBase<any> {
  if (propertySchema.enum && propertySchema.type) {
    const items = propertySchema.enum as (typeof propertySchema.type)[];
    return new InputItemsDialog({
      label: label,
      current: items.indexOf(currentValue),
      items: items,
      title: '',
      editable: false
    });
  }

  switch (propertySchema.type) {
    case 'string': {
      const currentValueString = currentValue as string | undefined;

      if (!propertySchema.format) {
        return new InputTextDialog({
          label: label,
          text: currentValueString,
          title: ''
        });
      }

      switch (propertySchema.format) {
        case 'date':
          return new InputDateDialog({
            label: label,
            value: currentValueString
              ? new Date(currentValueString)
              : undefined,
            title: ''
          });
        case 'date-time':
          return new InputDatetimeDialog({
            label: label,
            value: currentValueString
              ? new Date(currentValueString)
              : undefined,
            title: ''
          });
        case 'password':
          return new InputPasswordDialog({
            label: label,
            text: currentValueString,
            title: ''
          });
        default:
          return new InputTextDialog({
            label: label,
            text: currentValueString,
            title: ''
          });
      }
    }

    case 'number': {
      const currentValueNumber = currentValue as number | undefined;

      return new InputNumberDialog({
        label: label,
        value: currentValueNumber,
        title: ''
      });
    }

    case 'integer': {
      const currentValueInteger = currentValue as number | undefined;
      return new InputNumberDialog({
        label: label,
        value: currentValueInteger,
        title: ''
      });
    }

    case 'boolean': {
      const currentValueBool = currentValue as boolean | undefined;

      return new InputBooleanDialog({
        label: label,
        value: currentValueBool,
        title: ''
      });
    }

    case 'array': {
      const currentValueArray = currentValue as JSONObject | undefined;

      return new InputJSONDialog({
        label: label,
        value: currentValueArray,
        title: ''
      });
    }

    case 'object': {
      const currentValueObject = currentValue as JSONObject | undefined;

      return new InputJSONDialog({
        label: label,
        value: currentValueObject,
        title: ''
      });
    }

    default: {
      const currentValueUnknown = currentValue as any;

      return new InputJSONDialog({
        label: label,
        value: currentValueUnknown,
        title: ''
      });
    }
  }
}

export function createValidatedInput(
  propertySchema: ObjectDef,
  currentVal: any,
  label: string | undefined
): ValidatingInput<any> {
  const input = createMetaInput(propertySchema, currentVal, label);

  let validator: (value: any) => boolean;
  let postProcessor;

  if (input instanceof InputJSONDialog) {
    validator = (value: JSONObject) => value !== undefined;
  } else {
    validator = (value: any) => cassini.ajv.validate(propertySchema, value);
  }

  if (input instanceof InputDateDialog) {
    postProcessor = (value: Date | undefined) => {
      if (value === undefined || isNaN(value.getTime())) {
        return undefined;
      } else {
        return value.toISOString().slice(0, 10);
      }
    };
  } else if (input instanceof InputDatetimeDialog) {
    postProcessor = (value: Date | undefined) => {
      if (value === undefined || isNaN(value.getTime())) {
        return undefined;
      } else {
        return value.toISOString();
      }
    };
  } else {
    postProcessor = undefined;
  }

  const validatedInput = new ValidatingInput(input, validator, postProcessor);

  return validatedInput;
}

/**
 * Widget for modifying the meta of a TierModel.
 */
export class MetaEditor extends Panel {
  protected _model: NotebookTierModel | null;
  table: MetaTableWidget | null;

  _onlyDisplay: string[] | null;

  constructor(tierModel: NotebookTierModel | null, onlyDisplay?: string[]) {
    super();
    this.table = null;
    this._onlyDisplay = onlyDisplay || null;
    
    this._model = tierModel;
    this.handleModelChanged(null, tierModel);
  }

  get model(): NotebookTierModel | null {
    return this._model;
  }

  get onlyDisplay(): string[] | null {
    return this._onlyDisplay
  }

  set onlyDisplay(value: string[] | null) {
    this._onlyDisplay = value
    if (this.model) {
      this.handleModelUpdate(this.model);
    }
  }

  set model(newModel: NotebookTierModel | null) {
    const oldModel = this._model;
    this._model = newModel;
    this.handleModelChanged(oldModel, newModel);
  }

  handleModelUpdate(model: NotebookTierModel): void {
    if (this.table) {
      this._updateTableWidget(this.table, model);
    }
  }

  handleModelChanged(
    oldModel: NotebookTierModel | null,
    newModel: NotebookTierModel | null
  ): void {
    if (oldModel) {
      Signal.disconnectBetween(oldModel, this);
    }

    if (!newModel) {
      if (this.table) {
        this.table.values = {};
        this.table.schema = {properties: {}, additionalProperties: {}}; // find a way!
        this.table.update();
      }

      return;
    }

    if (this.table) {
      this._updateTableWidget(this.table, newModel);
    } else {
      this.table = this._createTableWidget(newModel);

      if (this.table) {
        this.addWidget(this.table);
      }
    }

    newModel.changed.connect(this.handleModelUpdate, this);
  }

  private static _getSelectMeta(schema: MetaSchema, values: JSONObject, includes: string[]): {schema: MetaSchema, values: JSONObject} {
    const newSchema: MetaSchema = { properties: {}, additionalProperties: schema.additionalProperties, $defs: schema.$defs};
    const newValues: JSONObject = {}

    for (const include of includes) {
      if (Object.keys(schema.properties).includes(include)) {
        newSchema.properties[include] = schema.properties[include]
      }

      newValues[include] = values[include]
    }

    return {schema: newSchema, values: newValues}
  }

  private _createTableWidget(model: NotebookTierModel): MetaTableWidget | null {
    if (!model) {
      return null;
    }
    

    const onSetMetaValue = (
      attribute: string,
      newValue: JSONValue | undefined
    ) => {
      newValue && model.setMetaValue(attribute, newValue);
    };

    const onRemoveMetaKey = (attribute: string) => {
      model.removeMeta(attribute);
    };

    let newSchema: MetaSchema = model.publicMetaSchema;
    let additionalMeta: JSONObject = model.additionalMeta;

    if (this.onlyDisplay !== null) {
      const { schema, values } = MetaEditor._getSelectMeta(
        model.publicMetaSchema, model.additionalMeta, this.onlyDisplay
      )
      
      newSchema = schema;
      additionalMeta = values;
    }

    return new MetaTableWidget(
      newSchema,
      additionalMeta,
      onSetMetaValue.bind(this),
      onRemoveMetaKey.bind(this)
    );
  }

  private _updateTableWidget(
    table: MetaTableWidget,
    model: NotebookTierModel
  ): void {
    const onSetMetaValue = (
      attribute: string,
      newValue: JSONValue | undefined
    ) => {
      newValue && model.setMetaValue(attribute, newValue);
    };
    const onRemoveMetaKey = (attribute: string) => {
      model.removeMeta(attribute);
    };

    let newSchema: MetaSchema = model.publicMetaSchema;
    let additionalMeta: JSONObject = model.additionalMeta;

    if (this.onlyDisplay !== null) {
      const { schema, values } = MetaEditor._getSelectMeta(
        model.publicMetaSchema, model.additionalMeta, this.onlyDisplay
      )
      
      newSchema = schema;
      additionalMeta = values;
    }

    table.values = additionalMeta;
    table.schema = newSchema;

    table.handleSetMetaValue = onSetMetaValue.bind(this);
    table.handleRemoveMetaKey = onRemoveMetaKey.bind(this);

    table.update();
  }
}

export interface IMetaEditorRendorMimeData {
  values: string[];
}

/**
 * Version of MetaEditor that works as a RenderMime Renderer i.e. implements a renderModel method.
 */
export class RenderMimeMetaEditor
  extends Panel
  implements IRenderMime.IRenderer
{
  protected _path: string;
  protected _model: NotebookTierModel | null;
  protected editor: MetaEditor;
  private fetchModel: Promise<NotebookTierModel | undefined>;

  /**
   * Strange thing is that the data from the rendermime are not passed at initialisation, but during renderModel, hence we have to be ready for that.
   *
   * The widget needs to know what tier it is creating an editor for. Because tier names are unique. Extracting the name from the provided URLResolver is the
   * solution I've gone with.
   *
   * TODO there should probably be a check that the whole path to the notebook matches that expected for the widget, to avoid name clashing documents from tricking
   * cassini into thinking its a tier notebook. (or maybe that's a helpful hack) - the issue is and remains that the notebook intepretter can think a notebook corresponds
   * to a tier that it doesn't.
   *
   * @param options
   *
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();

    this._mimeType = options.mimeType;

    const resolver = options.resolver as RenderMimeRegistry.UrlResolver; // uhoh this could be unstable!
    this._path = resolver.path;

    this.fetchModel = cassini.tierModelManager
      .get(this.name)
      .then(tierModel => {
        if (!tierModel || tierModel instanceof FolderTierModel) {
          return;
        }

        this.model = tierModel;
        return this.model;
      });

    this.fetchModel.then(model => {
      if (model) {
        this.editor = new MetaEditor(model);
        this.addWidget(this.editor);
      }
    });
  }

  get modelChanged(): ISignal<this, NotebookTierModel | null> {
    return this._modelChanged;
  }

  private _modelChanged = new Signal<this, NotebookTierModel | null>(this);

  get model(): NotebookTierModel | null {
    return this._model;
  }

  set model(model: NotebookTierModel | null) {
    this._model = model;
    this._modelChanged.emit(model);
  }

  /**
   * Is the widget model ready?
   */
  ready(): Promise<void> {
    return this.fetchModel.then(model => model?.ready.then());
  }

  get path(): string {
    return this._path;
  }

  get name(): string {
    return PathExt.basename(this.path, '.ipynb');
  }

  /**
   * Is called by the notebook to actually update the contents of the widget.
   *
   * In theory this can be called multiple times by the notebook, after the widget instance has been created.
   *
   * @param model
   * @returns
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // mimedata seems to have to be an Object, or it won't be save properly
    const data = model.data[this._mimeType] as any as IMetaEditorRendorMimeData;

    let attributes = data['values'];

    if (typeof attributes === 'string') {
      attributes = [attributes];
    }

    this.ready().then(() => {
      this.editor.onlyDisplay = attributes;
    });

    return Promise.resolve();
  }

  private _mimeType: string;
}
