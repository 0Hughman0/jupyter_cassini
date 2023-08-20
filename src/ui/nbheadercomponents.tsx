/* eslint-disable prettier/prettier */
import React, { useMemo } from 'react';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper
} from '@tanstack/react-table';

import { ReactWidget } from '@jupyterlab/apputils';
import {
  launchIcon,
  treeViewIcon,
  addIcon,
  ToolbarButtonComponent
} from '@jupyterlab/ui-components';

import { ITreeChildData } from '../core';

export type childTableData = [id: string, child: ITreeChildData][];

/**
 * @property onChildLaunch - callback for when the launch button is pressed for a child
 * @property onChildView - callback for when the child view button is pressed.
 */
export interface IMetaTableProps {
  children: childTableData;
  onChildLaunch: (child: ITreeChildData) => void;
  onChildView: (child: ITreeChildData, id: string) => void;
  onCreateChild: () => void;
}

/**
 * Component that creates a table that summarises children, like a less detailed version of the ChildrenTable.
 *
 * @param props { IMetaTableProps }
 * @returns
 */
export function ChildrenSummary(props: IMetaTableProps) {
  const onChildLaunch = props.onChildLaunch;
  const onChildView = props.onChildView;

  const data = useMemo(() => props.children, [props.children]);

  // openNewChildDialog()
  const columnHelper = createColumnHelper<childTableData[0]>();

  const createColumns = () => {
    const columns = [
      columnHelper.display({
        id: 'name',
        cell: props => {
          const [_, child] = data[props.row.index];
          return <span className="cas-tier-name">{child.name}</span>;
        },
        header: 'Name'
      }),
      columnHelper.display({
        id: 'info',
        cell: props => {
          const [_, child] = data[props.row.index];

          return <span>{child.info}</span>;
        },
        header: 'Info'
      }),
      columnHelper.display({
        id: 'actions',
        cell: props => {
          const [id, child] = data[props.row.index];
          return (
            <div className="cas-row-icon-area">
              <ToolbarButtonComponent
                icon={launchIcon}
                onClick={() => onChildLaunch(child)}
                tooltip={`Open ${child.name}`}
              />
              <ToolbarButtonComponent
                icon={treeViewIcon}
                onClick={() => onChildView(child, id)}
                tooltip={`Show ${child.name} in browser`}
              />
            </div>
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
    <table className="cas-ChildrenTable-table">
      <thead>
        <tr>
          {table.getFlatHeaders().map(header => (
            <th key={header.id}>
              {flexRender(header.column.columnDef.header, header.getContext())}
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
              <ToolbarButtonComponent
                icon={addIcon}
                onClick={() => props.onCreateChild()}
                tooltip="Create new child"
              />
            </td>
          </tr>
        </span>
      </tfoot>
    </table>
  );
}

/**
 * ReactWidget wrapper of ChildrenSummary component.
 */
export class ChildrenSummaryWidget extends ReactWidget {
  _data: childTableData;
  onChildLaunch: (child: ITreeChildData) => void;
  onChildView: (child: ITreeChildData, id: string) => void;
  onCreateChild: () => void;

  constructor(
    data: childTableData,
    onChildLaunch: (child: ITreeChildData) => void,
    onChildView: (child: ITreeChildData, id: string) => void,
    onCreateChild: () => void
  ) {
    super();
    this.addClass('cas-ChildrenSummaryWidget');
    this._data = data;
    this.onChildLaunch = onChildLaunch;
    this.onChildView = onChildView;
    this.onCreateChild = onCreateChild;
  }

  get data(): childTableData {
    return this._data;
  }
  set data(val: childTableData) {
    this._data = val;
    this.update();
  }

  render() {
    return (
      <div>
        <ChildrenSummary
          children={this.data}
          onChildLaunch={this.onChildLaunch}
          onChildView={this.onChildView}
          onCreateChild={this.onCreateChild}
        />
      </div>
    );
  }
}
