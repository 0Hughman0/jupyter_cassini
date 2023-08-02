from cassini import Project, DEFAULT_TIERS

import shutil
from tempfile import mkdtemp
import os

from IPython.display import display

project_folder = os.environ.get('JUPYTERLAB_GALATA_ROOT_DIR')

if project_folder is None:
    project_folder = mkdtemp(prefix='cassini-testing')
    os.environ['JUPYTERLAB_GALATA_ROOT_DIR'] = project_folder
    
    shutil.copy(__file__, os.path.join(project_folder, 'project.py')) # put the project.py into the temp folder.

class JLGui:

    def __init__(self, tier):
        self.tier = tier
        
    def header(self):
        display({'application/cassini.header+json': {}}, raw=True)


for Tier in DEFAULT_TIERS:
    Tier.gui_cls = JLGui

project = Project(DEFAULT_TIERS, project_folder)



if __name__ == '__main__':
    project.launch()
