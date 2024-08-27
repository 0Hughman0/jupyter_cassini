from cassini import Project, DEFAULT_TIERS

import shutil
from tempfile import mkdtemp
import os

print("First")
project_folder = os.environ.get('JUPYTERLAB_GALATA_ROOT_DIR')
print(os.environ.get('JUPYTERLAB_GALATA_ROOT_DIR'))

if project_folder is None:
    project_folder = mkdtemp(prefix='cassini-testing')
    os.environ['JUPYTERLAB_GALATA_ROOT_DIR'] = project_folder

    print("Made test directory", project_folder)
    print("Set to JUPYTERLAB_GALATA_ROOT_DIR End")

    print("Moving in template project file")
    shutil.copy(__file__, os.path.join(project_folder, 'cas_project.py'))  # put the project.py into the temp folder.
    print("Done")

project = Project(DEFAULT_TIERS, project_folder)

if __name__ == '__main__':
    project.launch()
