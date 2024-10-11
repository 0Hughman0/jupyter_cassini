/* eslint-disable prettier/prettier */
import React, { useMemo } from 'react';
import { useState } from 'react';

import { CommandRegistry } from '@lumino/commands';
import { Menu } from '@lumino/widgets';

import { ReactWidget } from '@jupyterlab/apputils';
import {
  InputGroup,
  caretRightIcon,
  caretUpIcon,
  caretDownIcon,
  launcherIcon,
  checkIcon,
  editIcon,
  addIcon,
  refreshIcon,
  ToolbarButtonComponent
} from '@jupyterlab/ui-components';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';

import { ITreeData, ITreeChildData, ILaunchable, TreeChildren } from '../core';
import { TierBrowserModel } from '../models';
import { CassiniServer } from '../services';
import { homeIcon } from './icons';
import { ObservableList } from '@jupyterlab/observables';

export interface ICasSearchProps {
  model: TierBrowserModel;
}

/**
 * Widget for searching through tiers. Currently can only get a tier by name.
 *
 * Would like to be able to do more.
 *
 * @param props
 * @returns
 */
const CasSearch = (props: ICasSearchProps) => {
  const [query, setQuery] = useState('');

  const model = props.model;

  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    setQuery((e.target as HTMLInputElement).value);
  };

  const handleSubmit = (e: React.KeyboardEvent<any>) => {
    if (e.key === 'Enter') {
      CassiniServer.lookup(query).then(tierInfo => {
        model.currentPath.clear();
        model.currentPath.pushAll(tierInfo.ids);
      });
    }
  };
  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      placeholder="Search by name"
      onChange={handleChange}
      onKeyDown={handleSubmit}
    />
  );
};

interface ICrumbsProps {
  currentPath: ObservableList<string>;
  currentTier: ITreeData | null;
  onRefreshTree: () => void;
  onTierSelected: (casPath: string[], name: string) => void;
  onTierLaunched: (tierData: ILaunchable) => void;
  onCreateChild: (currentTier: ITreeData) => void;
}

/**
 * Crumbs are like a visual representation of the currentPath
 */
export class CassiniCrumbs extends React.Component<ICrumbsProps> {
  constructor(props: ICrumbsProps) {
    super(props);
  }

  render(): JSX.Element {
    const elements = [];
    const path = this.props.currentPath;
    const tier = this.props.currentTier;
    const refresh = this.props.onRefreshTree;

    const onTierLaunched = this.props.onTierLaunched;
    const onTierSelected = this.props.onTierSelected;
    const onCreateChild = this.props.onCreateChild;

    for (let i = 0; i < path.length - 1; i++) {
      elements.push(
        <span>
          <span
            className="jp-BreadCrumbs-item"
            onClick={() => {
              path.removeRange(i + 1, path.length);
            }}
          >
            {path.get(i)}
          </span>
          <span>/</span>
        </span>
      );
    }
    return (
      <div className="cas-CassiniCrumbs-box">
        <div className="jp-BreadCrumbs jp-FileBrowser-crumbs cas-CassiniCrumbs-row">
          <span className="jp-BreadCrumbs-home">
            <ToolbarButtonComponent
              icon={homeIcon}
              onClick={() => path.clear()}
              tooltip="Go Home"
            />
          </span>
          <span>/</span>
          {elements}
          <div className="cas-icon-area">
            <span onClick={() => refresh()}>
              <ToolbarButtonComponent
                icon={refreshIcon}
                onClick={() => refresh()}
                tooltip="Refresh tree (will fetch changes from server)"
              />
            </span>
          </div>
        </div>
        <div className="jp-BreadCrumbs jp-FileBrowser-crumbs cas-CassiniCrumbs-row">
          <span className="cas-tier-name">{tier?.name}</span>
          <span>/</span>
          <span>
            <ToolbarButtonComponent
              icon={addIcon}
              className="jp-BreadCrumbs-home jp-ToolbarButtonComponent-icon"
              onClick={() => {
                tier && onCreateChild(tier);
              }}
              tooltip={`Add new child of ${tier?.name}`}
            />
          </span>
          <div className="cas-icon-area">
            <ToolbarButtonComponent
              icon={launcherIcon}
              className="jp-BreadCrumbs-home jp-ToolbarButtonComponent-icon"
              onClick={() => {
                tier && onTierLaunched(tier);
              }}
              tooltip={`Open ${tier?.name}`}
            />
            <span>
              <ToolbarButtonComponent
                icon={caretRightIcon}
                className="jp-BreadCrumbs-home jp-ToolbarButtonComponent-icon"
                onClick={() => {
                  tier && onTierSelected([...path], tier.name);
                }}
                enabled={Boolean(tier?.metaPath)}
                tooltip={`Preview ${tier?.name}`}
              />
            </span>
          </div>
        </div>
      </div>
    );
  }
}

export interface IBrowserProps {
  currentTier: ITreeData;
  currentPath: ObservableList<string>;
  children: TreeChildren;
  childMetas: Set<string>;
  additionalColumns: Set<string>;
  onAdditionalColumnsSet: (names: Set<string>) => void;
  onTierSelected: (casPath: string[], name: string) => void;
  onTierLaunched: (tierData: ILaunchable) => void;
  onCreateChild: (currentTier: ITreeData) => void;
}

/**
 * Widget for navigating the tier tree. Wraps the ChildrenTable
 *
 *
 */
export class BrowserComponent extends React.Component<IBrowserProps> {
  constructor(props: IBrowserProps) {
    super(props);
  }

  /**
   * Opens a right click menu to modify the additional columns in the table.
   * @param event
   * @returns
   */
  openContextMenu(event: React.MouseEvent | null): void {
    const allColumns = new Set([
      ...this.props.additionalColumns,
      ...this.props.childMetas
    ]);

    if (!allColumns.size) {
      return;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const commands = new CommandRegistry();

    for (const columnName of allColumns) {
      const icon = this.props.additionalColumns.has(columnName)
        ? checkIcon
        : undefined;
      commands.addCommand(columnName, {
        label: columnName,
        icon: icon,
        execute: args =>
          this.setState((state, props) => {
            const newColumns = props.additionalColumns;

            if (newColumns.has(columnName)) {
              newColumns.delete(columnName);

              this.props.onAdditionalColumnsSet(newColumns);

              return { additionalColumns: newColumns };
            } else {
              newColumns.add(columnName);

              this.props.onAdditionalColumnsSet(newColumns);

              return { additionalColumns: newColumns };
            }
          })
      });
    }

    const menu = new Menu({ commands: commands });
    menu.addItem({ command: 'Add Meta', type: 'separator' });

    for (const columnName of allColumns) {
      menu.addItem({ command: columnName });
    }
    if (event) {
      menu.open(event.clientX, event.clientY);
    }
  }

  render(): JSX.Element {
    const onTierSelected = this.props.onTierSelected;
    const onTierLaunched = this.props.onTierLaunched;
    const onCreateChild = this.props.onCreateChild;
    const openContextMenu = this.openContextMenu.bind(this);

    const additionalColumns = this.props.additionalColumns;

    return (
      <div data-jp-suppress-context-menu>
        <ChildrenTable
          currentTier={this.props.currentTier}
          currentPath={this.props.currentPath}
          children={this.props.children}
          onTierLaunched={onTierLaunched}
          onTierSelected={onTierSelected}
          onCreateChild={onCreateChild}
          onSelectMetas={openContextMenu}
          additionalColumns={additionalColumns}
        ></ChildrenTable>
      </div>
    );
  }
}

interface IChildrenTableProps {
  currentTier: ITreeData;
  currentPath: ObservableList<string>;
  children: { [id: string]: ITreeChildData };
  additionalColumns: Set<string>;
  onTierLaunched: (tier: ILaunchable) => void;
  onTierSelected: (casPath: string[], name: string) => void;
  onCreateChild: (currentTier: ITreeData) => void;
  onSelectMetas: (event: React.MouseEvent) => void;
}

/**
 * Component that renders a tiers children.
 * @param props
 * @returns
 */
export function ChildrenTable(props: IChildrenTableProps) {
  const onTierLaunched = props.onTierLaunched;
  const onTierSelected = props.onTierSelected;
  const onCreateChild = props.onCreateChild;
  const path = props.currentPath;
  const currentTier = props.currentTier;

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'started', desc: true }
  ]);

  const data = useMemo(
    () => Object.entries(props.children),
    [props.children, props.additionalColumns]
  );

  const columnHelper = createColumnHelper<[string, ITreeChildData]>();
  type columnsType = ColumnDef<[string, ITreeChildData], any>[];

  const createColumns = () => {
    let columns: columnsType = [
      columnHelper.accessor(
        (row: [string, ITreeChildData], index: number) => row[1].name,
        {
          id: 'name',
          header: 'Name',
          size: 45,
          cell: props => {
            let id: string | null;
            try {
              id = data[props.row.index][0];
            } catch {
              id = null;
            }
            return (
              <span
                className="cas-tier-name jp-BreadCrumbs-item"
                onClick={() => (id ? path.push(id) : null)}
              >
                <span>{props.getValue()}</span>
              </span>
            );
          }
        }
      ),
      columnHelper.accessor(
        (row: [string, ITreeChildData], index: number): Date | null => {
          return row[1].started || null;
        },
        {
          id: 'started',
          header: 'Started',
          size: 50,
          cell: props => {
            const started = props.getValue();
            return (
              started && (
                <span>
                  <span>{started.toLocaleDateString()}</span>
                </span>
              )
            );
          }
        }
      ),
      columnHelper.accessor(
        (row: [string, ITreeChildData], index: number) => {
          return row[1].info || '';
        },
        {
          id: 'info',
          header: 'Info',
          cell: props => {
            const info = props.getValue();
            return (
              <span>
                <span>{info}</span>
              </span>
            );
          }
        }
      ),
      columnHelper.accessor(
        (row: [string, ITreeChildData], index: number) => {
          return row[1].outcome || '';
        },
        {
          id: 'outcome',
          header: 'Outcome',
          cell: props => {
            const info = props.getValue();
            return (
              <span>
                <span>{info}</span>
              </span>
            );
          }
        }
      )
    ];

    for (const additionalColumn of props.additionalColumns) {
      columns.push(
        columnHelper.accessor(
          (row: [string, ITreeChildData], index: number) => {
            const additionalMeta = row[1]?.additionalMeta;
            if (additionalMeta) {
              return additionalMeta[additionalColumn];
            }
          },
          {
            id: additionalColumn,
            header: additionalColumn,
            cell: props => {
              return (
                <span>
                  <span>{props.getValue()}</span>
                </span>
              );
            }
          }
        )
      );
    }

    columns = columns.concat([
      columnHelper.display({
        id: 'addColumn',
        header: () => (
          <span onClick={event => props.onSelectMetas(event)}>
            <ToolbarButtonComponent icon={editIcon} tooltip="Edit columns" />
          </span>
        ),
        enableResizing: false,
        size: 20
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        enableResizing: false,
        size: 40,
        cell: props => {
          let child: ITreeChildData | null;
          try {
            child = data[props.row.index][1];
          } catch {
            child = null;
          }

          const tierChildData = data[props.row.index][1];
          const id = data[props.row.index][0];
          const tierLaunchData = {
            ...tierChildData,
            ids: [...path, id]
          };
          return (
            <div className="cas-row-icon-area">
              <span>
                <ToolbarButtonComponent
                  icon={caretRightIcon}
                  onClick={() => {
                    child
                      ? onTierSelected([...path, id], tierLaunchData.name)
                      : null;
                  }}
                  enabled={Boolean(
                    currentTier.childClsInfo?.tierType === 'notebook'
                  )}
                  tooltip={`Preview ${tierLaunchData.name}`}
                />
              </span>
              <span>
                <ToolbarButtonComponent
                  icon={launcherIcon}
                  onClick={() => {
                    data ? onTierLaunched(tierLaunchData) : null;
                  }}
                  tooltip={`Open ${tierLaunchData.name}`}
                />
              </span>
            </div>
          );
        }
      })
    ]);

    return columns as columnsType;
  };

  // const columns = useMemo<columnsType> (createColumns, [props.children, props.additionalColumns]) // for reasons I don't understand, this doesn't recalculate when additionalColumns changes...?
  const columns = createColumns();

  const table = useReactTable({
    data: data,
    columns: columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    state: {
      sorting
    }
  });

  return (
    <div>
      <h1>{props.currentTier.name}</h1>
      <table
        className="cas-ChildrenTable-table"
        // style={{width: table.getCenterTotalSize()}}
      >
        <thead onContextMenu={event => props.onSelectMetas(event)}>
          <tr>
            {table.getFlatHeaders().map(header => (
              <th
                key={header.id}
                className={
                  ['addColumns', 'launch', 'select'].includes(header.id)
                    ? ''
                    : 'jp-DirListing-headerItem jp-id-name'
                }
                style={{
                  width: `${
                    (header.getSize() / table.getCenterTotalSize()) * 100
                  }%`
                }}
              >
                <span
                  className={
                    header.column.getCanSort()
                      ? 'cursor-pointer select-none'
                      : ''
                  }
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {{
                    asc: <caretUpIcon.react tag="span" />,
                    desc: <caretDownIcon.react tag="span" />
                  }[header.column.getIsSorted() as string] ?? null}
                </span>
                {header.column.getCanResize() ? (
                  <div
                    {...{
                      onMouseDown: header.getResizeHandler(),
                      onTouchStart: header.getResizeHandler(),
                      className: 'cas-table-resizer'
                    }}
                  />
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr className="cas-ChildrenTable-row">
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
                  onClick={() => onCreateChild(props.currentTier)}
                  tooltip={`Create new child of ${props.currentTier.name}`}
                  enabled={Boolean(props.currentTier.childClsInfo)}
                />
              </td>
            </tr>
          </span>
        </tfoot>
      </table>
    </div>
  );
}

export interface ITierSelectedSignal {
  path: string[];
  name: string;
}

/**
 * Widget for navigating the tier tree. Should probably be called TierNavigator or something.
 *
 * Has a search box for going to a tier by name.
 *
 * Has the crumbs to indicate where we currently are and allow a bit of naviation back up the tree.
 *
 * Has the children table for heading into the tree.
 */
export class TierTreeBrowser extends ReactWidget {
  model: TierBrowserModel;

  currentPath: ObservableList<string>;
  currentTier: ITreeData | null;
  additionalColumns: Set<string>;
  onTierSelected: (path: string[], name: string) => void;
  onTierLaunched: (branch: ILaunchable) => void;
  onCreateChild: (currentTier: ITreeData) => Promise<ITreeData | null>;

  constructor(
    model: TierBrowserModel,
    onTierSelected: (path: string[], name: string) => void,
    onTierLaunched: (branch: ILaunchable) => void,
    onCreateChild: (currentTier: ITreeData) => Promise<ITreeData | null>
  ) {
    super();
    this.model = model;
    this.currentPath = model.currentPath;
    this.currentTier = model.current;

    this.onTierSelected = onTierSelected;
    this.onTierLaunched = onTierLaunched;
    this.onCreateChild = onCreateChild;

    this.addClass('cas-TierBrowser');

    model.changed.connect(this.handleModelChanged, this);
  }

  get tierChildren(): TreeChildren {
    return this.model?.current?.children || {};
  }

  get childMetas(): Set<string> {
    return this.model.childMetas;
  }

  handleModelChanged(
    model: TierBrowserModel,
    change: TierBrowserModel.ModelChange
  ) {
    switch (change.type) {
      case 'current': {
        this.currentTier = change.current;
        break;
      }
      case 'path': {
        this.currentPath = change.path;
        break;
      }
      case 'children': {
        this.additionalColumns = model.additionalColumns;
        break;
      }
    }
    this.update();
  }

  handleAdditionalColumnsSet(additionalColumns: Set<string>): void {
    const newColumns = new Set(additionalColumns);

    this.model.additionalColumns.clear();

    for (const column of newColumns) {
      this.model.additionalColumns.add(column);
    }

    this.additionalColumns = newColumns;

    this.update();
  }

  handleRefreshTree() {
    this.model.refresh();
    this.update();
  }

  render(): JSX.Element {
    if (!this.currentTier) {
      return (
        <div>
          <a>Loading</a>
        </div>
      );
    }

    const onCreateChild = (currentTier: ITreeData) => {
      this.onCreateChild(currentTier).then(() => this.model.refresh());
    };

    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <CasSearch model={this.model}></CasSearch>
        <CassiniCrumbs
          currentPath={this.currentPath}
          currentTier={this.currentTier}
          onRefreshTree={this.handleRefreshTree.bind(this)}
          onTierSelected={this.onTierSelected}
          onTierLaunched={this.onTierLaunched}
          onCreateChild={onCreateChild}
        ></CassiniCrumbs>
        <BrowserComponent
          currentTier={this.currentTier}
          currentPath={this.currentPath}
          children={this.tierChildren}
          childMetas={this.childMetas}
          additionalColumns={this.additionalColumns}
          onAdditionalColumnsSet={this.handleAdditionalColumnsSet.bind(this)}
          onTierSelected={this.onTierSelected}
          onTierLaunched={this.onTierLaunched}
          onCreateChild={onCreateChild}
        ></BrowserComponent>
      </div>
    );
  }
}
