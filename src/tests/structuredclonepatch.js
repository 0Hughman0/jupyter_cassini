// see https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
// and https://github.com/jsdom/jsdom/issues/3363
// This patch is bad, it is not a one-to-one fill in for structuredClone
global.structuredClone = v => JSON.parse(JSON.stringify(v));
