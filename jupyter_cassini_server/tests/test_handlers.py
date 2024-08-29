import shutil
import os
from unittest.mock import MagicMock
import itertools
import importlib
import sys

import pytest
from cassini import env, Project


CWD = os.getcwd()


@pytest.fixture
def refresh_project():
    def wrapped():
        env._reset()

        if 'project' in sys.modules:
            del sys.modules['project']
        if 'my_project' in sys.modules:
            del sys.modules['cas_project']
    
        importlib.invalidate_caches()

        if os.environ.get('CASSINI_PROJECT'):
            del os.environ['CASSINI_PROJECT']

    return wrapped


@pytest.fixture
def project_via_env(refresh_project, tmp_path):

    refresh_project()    
    project_file = shutil.copy('jupyter_cassini_server/tests/project_cases/basic.py', tmp_path / 'my_project.py')
    
    os.environ['CASSINI_PROJECT'] = project_file.as_posix()


async def test_server_ready(project_via_env, jp_fetch):
    reponse = await jp_fetch('jupyter_cassini', 'lookup')

    assert reponse.code == 200
