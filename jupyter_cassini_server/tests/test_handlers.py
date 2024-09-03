import shutil
import os

import pytest
from cassini import env
from cassini.utils import find_project


CWD = os.getcwd()


@pytest.fixture
def project_via_env(tmp_path):
    env._reset()

    project_file = shutil.copy(
        "jupyter_cassini_server/tests/project/cas_project.py",
        tmp_path / "cas_project.py",
    )

    os.environ["CASSINI_PROJECT"] = project_file.as_posix()
    project = find_project()
    project.setup_files()


async def test_server_ready(project_via_env, jp_fetch):
    reponse = await jp_fetch("jupyter_cassini", "tree")

    assert reponse.code == 200
