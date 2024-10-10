import {
  TreeResponse,
  FolderTierInfo,
  NotebookTierInfo,
  NewChildInfo,
  MetaSchema
} from '../schema/types';

export const HOME_TREE: TreeResponse = {
  name: 'Home',
  folder: 'WorkPackages',
  notebookPath: 'Home.ipynb',
  children: {
    '1': {
      name: 'WP1',
      metaPath: 'WorkPackages/.wps/WP1.json',
      additionalMeta: { Fishes: 17, Crabs: 100 },
      info: 'dfhdg dfgdfg',
      started: '2023-07-29T00:00:00Z',
      hltsPath: 'WorkPackages/.wps/WP1.hlts',
      notebookPath: 'WorkPackages/WP1.ipynb'
    },
    '2': {
      name: 'WP2',
      metaPath: 'WorkPackages/.wps/WP2.json',
      additionalMeta: { Crabs: '', Fishes: '' },
      info: 'fdsas',
      started: '2023-07-29T00:00:00Z',
      hltsPath: 'WorkPackages/.wps/WP2.hlts',
      notebookPath: 'WorkPackages/WP2.ipynb'
    },
    '3': {
      name: 'WP3',
      metaPath: 'WorkPackages/.wps/WP3.json',
      additionalMeta: { Fishes: '', Crabs: '' },
      info: 'Demonstration',
      started: '2023-07-31T00:00:00Z',
      hltsPath: 'WorkPackages/.wps/WP3.hlts',
      notebookPath: 'WorkPackages/WP3.ipynb'
    }
  },
  childClsInfo: {
    tierType: 'notebook',
    name: 'Experiment',
    templates: ['WorkPackage.tmplt.ipynb'],
    idRegex: '(\\d+)',
    namePartTemplate: 'WP{}',
    additionalMetaKeys: ['Fishes', 'Crabs'],
    metaSchema: {
      properties: {
        crabs: { type: 'string' },
        fishes: { type: 'string' }
      },
      additionalProperties: {},
      type: 'object'
    }
  }
};

export const WP1_TREE: TreeResponse = {
  name: 'WP1',
  folder: 'WorkPackages/WP1',
  metaPath: 'WorkPackages/.wps/WP1.json',
  additionalMeta: { Fishes: 17, Crabs: 100 },
  info: 'dfhdg dfgdfg',
  started: '2023-07-29T00:00:00Z',
  hltsPath: 'WorkPackages/.wps/WP1.hlts',
  notebookPath: 'WorkPackages/WP1.ipynb',
  children: {
    '1': {
      name: 'WP1.1',
      metaPath: 'WorkPackages/WP1/.exps/WP1.1.json',
      additionalMeta: {},
      info: 'Asdfdf dfgf',
      started: '2023-07-30T00:00:00Z',
      hltsPath: 'WorkPackages/WP1/.exps/WP1.1.hlts',
      notebookPath: 'WorkPackages/WP1/WP1.1.ipynb'
    }
  },
  childClsInfo: {
    tierType: 'notebook',
    name: 'Experiment',
    templates: ['Experiment.tmplt.ipynb'],
    idRegex: '(\\d+)',
    namePartTemplate: '.{}',
    additionalMetaKeys: [],
    metaSchema: {
      properties: {
        crabs: { type: 'string' },
        fishes: { type: 'string' }
      },
      additionalProperties: {},
      type: 'object'
    }
  }
};

export const WP1_1_TREE: TreeResponse = {
  name: 'WP1.1',
  folder: 'WorkPackages/WP1/WP1.1',
  metaPath: 'WorkPackages/WP1/.exps/WP1.1.json',
  additionalMeta: {},
  info: 'Asdfdf dfgf',
  started: '2023-07-30T00:00:00Z',
  hltsPath: 'WorkPackages/WP1/.exps/WP1.1.hlts',
  notebookPath: 'WorkPackages/WP1/WP1.1.ipynb',
  children: {
    a: {
      name: 'WP1.1a',
      metaPath: 'WorkPackages/WP1/WP1.1/.smpls/WP1.1a.json',
      additionalMeta: {},
      info: "It's a",
      started: '2023-08-01T00:00:00Z',
      hltsPath: 'WorkPackages/WP1/WP1.1/.smpls/WP1.1a.hlts',
      notebookPath: 'WorkPackages/WP1/WP1.1/WP1.1a.ipynb'
    }
  },
  childClsInfo: {
    tierType: 'notebook',
    name: 'Sample',
    templates: ['Sample.tmplt.ipynb'],
    idRegex: '([^0-9^-][^-]*)',
    namePartTemplate: '{}',
    additionalMetaKeys: [],
    metaSchema: {
      properties: {},
      additionalProperties: {},
      type: 'object'
    }
  }
};

export const HOME_INFO: FolderTierInfo = {
  name: 'Home',
  ids: [],
  children: HOME_TREE.children,
  tierType: 'folder'
};

export const WP1_INFO: NotebookTierInfo = {
  name: 'WP1',
  ids: ['1'],
  children: WP1_TREE.children,
  started: '2024-08-31T19:36:58.587310Z',
  notebookPath: 'WorkPackages/WP1.ipynb',
  metaPath: 'WorkPackages/.wps/WP1.json',
  hltsPath: 'WorkPackages/.wps/WP1.hlts',
  metaSchema: {
    properties: {
      conclusion: {
        title: 'Conclusion',
        type: 'string',
        'x-cas-field': 'core'
      },
      description: {
        title: 'Description',
        type: 'string',
        'x-cas-field': 'core'
      },
      started: {
        title: 'Started',
        type: 'string',
        format: 'date-time',
        'x-cas-field': 'core'
      },
      cas_lib_version: {
        title: 'Cas Lib Version',
        type: 'string',
        'x-cas-field': 'private'
      }
    },
    $defs: { JsonValue: {} },
    additionalProperties: { $ref: '#/$defs/JsonValue' },
    type: 'object'
  },
  tierType: 'notebook'
};
export const WP1_1_INFO: NotebookTierInfo = {
  name: 'WP1.1',
  ids: ['1', '1'],
  children: {},
  started: '2024-08-31T20:54:15.719157Z',
  notebookPath: 'WorkPackages/WP1/WP1.1.ipynb',
  metaPath: 'WorkPackages/WP1/.exps/WP1.1.json',
  hltsPath: 'WorkPackages/WP1/.exps/WP1.1.hlts',
  metaSchema: {
    properties: {
      conclusion: {
        title: 'Conclusion',
        type: 'string',
        'x-cas-field': 'core'
      },
      cas_lib_version: {
        title: 'Cas Lib Version',
        type: 'string',
        'x-cas-field': 'private'
      },
      started: {
        title: 'Started',
        type: 'string',
        format: 'date-time',
        'x-cas-field': 'core'
      },
      description: {
        title: 'Description',
        type: 'string',
        'x-cas-field': 'core'
      }
    },
    $defs: { JsonValue: {} },
    additionalProperties: { $ref: '#/$defs/JsonValue' },
    type: 'object'
  },
  tierType: 'notebook'
};

export const TEST_NEW_CHILD_INFO: NewChildInfo = {
  id: '1',
  parent: 'WP1',
  template: 'my template'
};

export const TEST_META_CONTENT = {
  description: 'this is a test',
  conclusion: 'concluded',
  started: '2024-08-31T18:36:58.587310Z',
  temperature: 273
};

export const TEST_HLT_CONTENT = {
  cos: [{ data: { 'text/markdown': '## cos' }, metadata: {}, transient: {} }]
};

export const BLANK_META_SCHEMA: MetaSchema = {
  properties: {},
  $defs: { JsonValue: {} },
  additionalProperties: { $ref: '#/$defs/JsonValue' },
  type: 'object'
};
