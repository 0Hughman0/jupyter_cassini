from cassini import Project, DEFAULT_TIERS

import shutil
from tempfile import mkdtemp
import os

project_folder = os.environ.get('JUPYTERLAB_GALATA_ROOT_DIR')

if project_folder is None:
    project_folder = mkdtemp(prefix='cassini-testing')
    os.environ['JUPYTERLAB_GALATA_ROOT_DIR'] = project_folder
    
    shutil.copy(__file__, os.path.join(project_folder, 'project.py')) # put the project.py into the temp folder.

project = Project(DEFAULT_TIERS, project_folder)



if __name__ == '__main__':
    project.launch()
