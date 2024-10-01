/* eslint-disable prettier/prettier */
import React, { useMemo } from 'react';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper
} from '@tanstack/react-table';

import { JSONObject } from '@lumino/coreutils';

import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { ReactWidget, InputDialog } from '@jupyterlab/apputils';
import {
  checkIcon,
  ToolbarButtonComponent,
  addIcon,
  closeIcon
} from '@jupyterlab/ui-components';

import { MetaSchema } from '../schema/types';
import { ValidatingInput } from './dialogwidgets';
import { createValidatedInput } from './metaeditor';

export type MetaTableCallback = { name: string; editor: CodeEditorWrapper };

export type MetaTableRow = {
  name: string;
  editor: () => ValidatingInput<any, any>;
};

export interface IMetaTableProps {
  metas: MetaTableRow[];
  onMetaUpdate: (attribute: string, newValue: string) => void;
  onNewMetaKey: ((attribute: string) => void) | null;
  onRemoveMeta: ((attribute: string) => void) | null;
}

/**
 * Table that displays meta of a tier.
 *
 * Also allows editing and adding of new meta.
 *
 * @param props
 * @returns
 */
export function MetaTable(props: IMetaTableProps) {
  const onMetaUpdate = props.onMetaUpdate;
  const onRemoveMeta = props.onRemoveMeta;
  const onNewMetaKey = props.onNewMetaKey;

  const data = useMemo(() => props.metas, [props.metas]);

  const askNewAttribute = () =>
    InputDialog.getText({
      title: 'New meta attribute',
      label: 'name'
    }).then(outcome => {
      if (outcome.value) {
        onNewMetaKey && onNewMetaKey(outcome.value);
      }
    });

  const columnHelper = createColumnHelper<MetaTableRow>();

  const createColumns = () => {
    const columns = [
      columnHelper.accessor('name', {
        cell: props => props.getValue(),
        header: 'Name'
      }),
      columnHelper.accessor('editor', {
        cell: props => {
          const validator = props.getValue()();
          const widget = validator.wrappedInput;
          // I have no idea what this means or how it works: https://stackoverflow.com/questions/69185915/how-to-cast-an-htmlelement-to-a-react-element
          return (
            <span
              ref={ref => {
                if (ref && !widget.isAttached) {
                  ref.appendChild(widget.node);
                }
                if (ref === null && widget.isAttached) {
                  widget.dispose();
                }
              }}
            />
          );
        },
        header: 'Value'
      }),
      columnHelper.display({
        id: 'edit',
        cell: props => {
          const row = data[props.row.index];
          return (
            <span className="cas-row-icon-area">
              {onRemoveMeta && (
                <ToolbarButtonComponent
                  icon={closeIcon}
                  onClick={() => onRemoveMeta(row.name)}
                  tooltip={`Delete (${row.name})`}
                />
              )}
              <ToolbarButtonComponent
                icon={checkIcon}
                onClick={() => onMetaUpdate(row.name, row.editor().getValue())}
                tooltip="Apply changes"
              />
            </span>
          );
        }
      })
    ];
    return columns;
  };

  const columns = createColumns();

  const table = useReactTable({
    columns: columns,
    data: data,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div>
      <table className="cas-ChildrenTable-table">
        <thead>
          <tr>
            {table.getFlatHeaders().map(header => (
              <th key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <span>
            <tr>
              <td colSpan={3}>
                {onNewMetaKey && (
                  <ToolbarButtonComponent
                    icon={addIcon}
                    onClick={askNewAttribute}
                    tooltip={'Add a new meta attribute'}
                  />
                )}
              </td>
            </tr>
          </span>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Widget wrapper to MetaTable Component.
 *
 * TODO: Should probably use signals really. This would allow multiple objects to listen out for changes, plus the names are confusing.
 *
 * @property { ((attribute: string, newValue: string) => void) | null } onMetaUpdate - callback that's called when an entry in the TierTable is updated.
 * @property { ((attribute: string) => void) | null } - onRemoveMeta callback that's when an entry is removed from the TierTable.
 *
 */
export class MetaTableWidget extends ReactWidget {
  schema: MetaSchema;
  values: JSONObject;
  handleSetMetaValue: (attribute: string, newValue: string) => void;
  handleRemoveMetaKey: ((attribute: string) => void) | null;

  constructor(
    schema: MetaSchema,
    values: JSONObject,
    onSetMetaValue: (attribute: string, newValue: string) => void,
    onRemoveMetaKey: ((attribute: string) => void) | null
  ) {
    super();
    this.schema = schema;
    this.values = values;
    this.handleSetMetaValue = onSetMetaValue;
    this.handleRemoveMetaKey = onRemoveMetaKey;
  }

  /**
   * Adds a new entry on the meta table.
   *
   * onMetaUpdate is only called if a value is subsequently set.
   *
   * @param key
   */
  handleNewMetaKey(key: string) {
    this.values[key] = null;
    this.update();
  }

  render() {
    const metas = [];

    const allKeys = new Set(Object.keys(this.values));

    for (const [name, info] of Object.entries(this.schema.properties)) {
      const value = this.values[name];
      allKeys.delete(name);
      const input = createValidatedInput(info, value, undefined);
      metas.push({ name: name, editor: () => input });
    }

    for (const extraKey of allKeys) {
      const value = this.values[extraKey];
      const additionalInfo = this.schema.additionalProperties;

      if (additionalInfo.$ref) {
        additionalInfo['$defs'] = this.schema.$defs;
      }

      const input = createValidatedInput(additionalInfo, value, undefined);
      metas.push({ name: extraKey, editor: () => input });
    }

    const onNewMetaKey = this.handleNewMetaKey.bind(this);

    return (
      <div>
        <MetaTable
          metas={metas}
          onMetaUpdate={this.handleSetMetaValue}
          onNewMetaKey={onNewMetaKey}
          onRemoveMeta={this.handleRemoveMetaKey}
        />
      </div>
    );
  }
}
