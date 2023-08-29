import sys
import os
from pathlib import Path
import importlib
import logging

from cassini import env

from ._version import __version__
from .handlers import setup_handlers


def find_project(serverapp):
    """
    Gets ahold of the Project instance for this Jupyterlab server instance.

    If server was launched via `cassini.Project.launch()`, this will already be set.

    Otherwise, try using CASSINI_PROJECT environment variable to find the project.

    This should be of the form:

        CASSINI_PROJECT=path/to/module:project_obj

    By default, `project_obj` is assumed to be called `project`. This will be imported from `module`. 

    Note that for cassini to run with a regular jupyterlab instance, `ContentsManager.allow_hidden = True` must be set, either
     via a config, or passed as a command line argument e.g. `--ContentsManager.allow_hidden=True`
    """
    if env.project:
        serverapp.log.info(f"Found pre-set project, {env.project}")
        return env.project
    
    CASSINI_PROJECT = os.environ['CASSINI_PROJECT']
    
    path = Path(CASSINI_PROJECT).absolute()

    module = None
    obj = None

    if ':' in path.name:
        module, obj = path.name.split(':')
        module = module.replace('.py', '')
        directory = path.parent.as_posix()
    elif path.is_file() or path.with_suffix('.py').is_file():
        directory = path.parent.as_posix()
        module = path.stem
        obj = 'project'
    elif path.is_dir():
        directory = path.as_posix()
        module = 'project'
        obj = 'project'    
    else:
        raise RuntimeError(f"Cannot parse CASSINI_PROJECT environment variable {CASSINI_PROJECT}")

    sys.path.insert(0, directory)

    try:
        env.project = getattr(importlib.import_module(module), obj)
    finally:
        sys.path.remove(directory)
    
    serverapp.log(f"Found project {env.project} using CASSINI_PROJECT={CASSINI_PROJECT}")

    return env.project


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jupyter_cassini"
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "jupyter_cassini_server"
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    find_project(server_app)
    setup_handlers(server_app.web_app)
    server_app.log.info("Registered HelloWorld extension at URL path /jupyter_cassini_server")

