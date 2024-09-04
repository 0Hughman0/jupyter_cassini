import sys
import os
from pathlib import Path
import importlib
import logging

from cassini import env
from cassini.utils import find_project

from ._version import __version__
from .handlers import setup_handlers


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "jupyter_cassini"}]


def _jupyter_server_extension_points():
    return [{"module": "jupyter_cassini_server"}]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    if env.project:
        server_app.log.info(f"Found pre-set project, {env.project}")
    else:
        find_project()
        server_app.log.info(
            f"Found project {env.project} using CASSINI_PROJECT={os.environ.get('CASSINI_PROJECT')}"
        )

    setup_handlers(server_app.web_app)
    server_app.log.info(
        "Registered HelloWorld extension at URL path /jupyter_cassini_server"
    )
