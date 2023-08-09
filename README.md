# jupyter_cassini_server

Jupyterlab extension for interacting with Cassini projects

This project creates a GUI for [Cassini](https://github.com/0Hughman0/Cassini) that runs inside jupyterlab. This allows the gui to be more performant and gives more flexiblity in terms of what it can do.

Once installed, head to the `demo` folder and run `launch.bat` (or equivalent commands) to try cassini and jupyter_cassini out.

Scroll to the bottom of the launcher to launch the Cassini browser and start your project.

See the [Cassini](https://github.com/0Hughman0/Cassini) repo for some information on the Python-side of things.

Try creating highlights for a 'tier' by using the magic `%%hlt Highlight name`, the captured out will be displayed in the cassini browser.

In this repo there is a Python package named `jupyter_cassini_server`
for the server extension and a NPM package named `jupyter_cassini`
for the frontend extension.

The server serves up information about the contents of a users project. The frontend extension then renders nice widgets to interface with this.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyter_cassini_server
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyter_cassini_server
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyter_cassini_server directory
# Install package in development mode
pip install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyter_cassini_server
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable jupyter_cassini_server
pip uninstall jupyter_cassini_server
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyter_cassini` within that folder.

### Testing the extension

#### Server tests

This extension is using [Pytest](https://docs.pytest.org/) for Python code testing.

Install test dependencies (needed only once):

```sh
pip install -e ".[test]"
# Each time you install the Python package, you need to restore the front-end extension link
jupyter labextension develop . --overwrite
```

To execute them, run:

```sh
pytest -vv -r ap --cov jupyter_cassini_server
```

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses Playwright for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)

## More Information

# MileStones

1. Get equivalent to gui.header() but based on native widget working. ✅
2. Create a specific edit meta widget ✅
3. Convert cassini meta to using pydantic.
4. Move monkeypatching from server application moved into cassini
5. Get create child to pass on meta values for rendering.
6. Document better.
7. Refactoring

- Implement null model, then update paradigm. e.g. MetaEditor is a mess.
- IOptions rather than options...?

Then share with the world!

# Todo

## Testing

- consider how best to configure playwright? Do I build the app up from scratch each time, could be very slow!

## TreeBrowser

- Resizable columns. Layout should be remembered per tier and per browser instance.

## Meta editor:

- Copy JSON validation from JSONEditor https://github.com/jupyterlab/jupyterlab/blob/25e52500908e3237006f5f9dc7588ae68b1927e9/packages/codeeditor/src/jsoneditor.ts#L228
- Worry about what should the save button do? If there are pending changes in other widgets e.g. the TierViewer and save forces a metaFile.save(), side-effects could occur. Really, one might expect the meta save to only save the current data. Not sure what to do there. I can use dirty! https://jupyterlab.readthedocs.io/en/latest/api/interfaces/docregistry.DocumentRegistry.ICodeModel.html#dirty only offer a save button if the model is not dirty...
  SOLUTION?
  - create an \_editors attribute... or something. This is a map of attribute names -> widget instances... this should probably be observable
  - When we start editing a value in a widget, we set the value to this instance.
  - We set up listeners for the update, if you are not the editor, you go readonly.
