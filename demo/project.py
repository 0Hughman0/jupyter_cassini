from cassini import Project, DEFAULT_TIERS
from IPython.display import display


# Hacking in the jl gui.
class JLGui:

    def __init__(self, tier):
        self.tier = tier
        
    def header(self):
        display({'application/cassini.header+json': {}}, raw=True)


for Tier in DEFAULT_TIERS:
    Tier.gui_cls = JLGui

project = Project(DEFAULT_TIERS, __file__)

if __name__ == '__main__':
    project.launch()
