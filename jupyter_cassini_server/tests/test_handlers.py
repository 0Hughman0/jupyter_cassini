import shutil
import os
from unittest.mock import MagicMock

import pytest
from cassini import env, Project

from .. import find_project


@pytest.fixture
def refresh_project():
    def wrapped():
        Project._instance = None
        env.project = None

    return wrapped


def test_find_project(tmp_path, refresh_project):
    project = shutil.copy('jupyter_cassini_server/tests/project_cases/basic.py', tmp_path / 'project.py')

    refresh_project()

    assert 'CASSINI_PROJECT' not in os.environ
    
    assert not env.project

    with pytest.raises(KeyError):
        find_project(MagicMock())

    os.environ['CASSINI_PROJECT'] = str(project.parent)
    
    just_directory = find_project(MagicMock())

    assert just_directory.project_folder == tmp_path

    os.environ['CASSINI_PROJECT'] = str(project)

    refresh_project()

    with_file = find_project(MagicMock())

    assert with_file.project_folder == tmp_path

    assert just_directory == with_file

    not_called_project = shutil.copy('jupyter_cassini_server/tests/project_cases/basic.py', tmp_path / 'a_project_file.py')

    refresh_project()

    os.environ['CASSINI_PROJECT'] = str(not_called_project)

    different_module = find_project(MagicMock())

    assert different_module.hierarchy == \
           just_directory.hierarchy == \
           with_file.hierarchy
    
    not_called_project_and_diff_obj = shutil.copy('jupyter_cassini_server/tests/project_cases/not_project.py', tmp_path / 'a_project_file_diff_obj.py')

    refresh_project()

    os.environ['CASSINI_PROJECT'] = f'{str(not_called_project_and_diff_obj)}:my_project'

    different_module_and_obj = find_project(MagicMock())

    assert different_module_and_obj.hierarchy == \
           different_module.hierarchy == \
           just_directory.hierarchy == \
           with_file.hierarchy
