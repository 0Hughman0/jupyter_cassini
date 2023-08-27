import sys
import os
from pathlib import Path
import importlib
import logging

from cassini import env

from ._version import __version__
from .handlers import setup_handlers


def find_project(serverapp):   
    if env.project:
        serverapp.log.info(f"Found pre-set project, {env.project}")
        return env.project
    
    path = Path(os.environ['CASSINI_PROJECT']).resolve()

    if path.is_file():
        directory = path.parent.as_posix()
        module = path.stem
        obj = 'project'
    elif path.is_dir():
        directory = path.as_posix()
        module = 'project'
        obj = 'project'    
    else:
        try:
            directory = path.parent.as_posix()
            module, obj = path.name.split(':')
            module = module.replace('.py', '')
        except ValueError:
            raise RuntimeError("Cannot parse CASSINI_PROJECT environment variable")

    sys.path.append(directory)
    env.project = getattr(importlib.import_module(module), obj)
    
    serverapp.log(f"Found project {env.project} using CASSINI_PROJECT={os.environ['CASSINI_PROJECT']}")

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

