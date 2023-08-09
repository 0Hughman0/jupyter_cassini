# Models

The data you want to represent has a model, particularly if this data is 'high level' i.e. represented in different parts of the application.

There are widgets that have a reference to this model and they represent the data within the model in some way.

The model is _Observable_ so when things change, the widget should update to reflect this.

There is some guidance from the devs on how to implement the model:

https://jupyterlab.readthedocs.io/en/stable/developer/patterns.html#models

They want the model to be initialisable outside the widget and to also be possible to be null.

They also recommend having a modelChanged signal that widgets can emit when they host a new model!

## Executing code on the kernel

So a NotebookPanel widget has a sessionContext https://jupyterlab.readthedocs.io/en/latest/api/classes/notebook.NotebookPanel-1.html

from sessionContext.session.kernel.requestExecute

I can execute some code i.e. project.env(name) to implicitly set the environment up.

# Context

1. Create a context object, pass a ModelFactory and a ModelDB factory.
2. If you pass a model factory, the model factory is called, with the appropriate path... if you don't provide one, it isn't!
   No model factory: 3. To get your model to actually be populated you call initialize... if you say it's new, then it will create a model and then save over the file! using Context.\_save! 4. Then it'll check if the model is truthy... presumably checking it exists. if it does exist and modelDB.isPrepopulated... it will once again save and overwrite its contents to the file using Context.\_save. if not... 5. It'll call Context.\_revert(true), whose purpose is to rebuild the model from the file contents. This uses the values set in ModelFactory to craft a get request to the content api to ask for the file contents! In theory, if your modelfactory.fileFormat is set to JSON it will get the JSON and then call Model.fromJSON() on the JSON... however! It seems that the API raises an exception if you try to use any other fileFormat than 'text'...

   if the fileFormat is set to 'text' it will call Model.fromString and try to populate it that way.

# Layouts

Laying out things is a bit of a nightmare.

It seems like BoxPanel is really only if you want to divide an area up into widgets, where some take up different proportions. Honestly looks a lot like flex display...

AccordianPanel only works if your widgets have a title attribute... which is readonly.

StackedPanel stacks them in the z direction!

Panel plus some css seems to be ok.

If you combine addWidget with node.appendChild, things generally seem to go badly...

I think actually, node.appendChild(widget.node) is not the done thing, and in-fact I should use Widget.attach(widget, node)... yes because according to

https://github.com/jupyterlab/lumino/blob/c90d19e7a4706c37c31961052206aa2a0d5144b9/packages/widgets/src/widget.ts#L1081

This otherwise fails to call onAttach and beforeAttach, which could do bad things with Widget lifecycle.

# Shared State Idea

    - create an _editors attribute... or something. This is a map of attribute names -> widget instances... this should probably be observable
    - When we start editing a value in a widget, we set the value to this instance.
    - We set up listeners for the update, if you are not the editor, you go readonly.

Widgets need a dirty attribute, to say they've deviated from the model. When they're dirty, the circle thingy is empty.

When when someone else is editing, their edit button disables.

... Orrrr I don't allow editing in the browser, which is what browsers usually are like... given how good the render mimetype works, I am still tempted to go back and make the header a rendermime? The tricky part is it won't work with the templates... but then again nor will meta editor!

## Testing

Something strange happens if the check value of a jest test is an observable...

# Todo

## Core

- In notebooks, the only way to know identity is to lookup the tier name derived from the file. It would be good to provide a cache of these so I don't need to ping the server every time to work out what model to load. It's not clear if this cache should live in the TierModelManager or the TreeManager.

## Cassini Python side

tier.setup_files() needs to take new/ default meta values as an argument, so these can be passed into the template renderer.

This is currently not possible.

I think serialization should really be handled by tiers themselves.

Switch to pydantic for Meta. Then we can use schema to send up the shape of meta allowing the appropriate field input to be used.

There's an issue with the server not serving 'hidden' files i.e. ones in `.folders`.

For editing meta, we call `display({'application/cassini.metaeditor': {'values': ['temperature', 'caslib_version']}}, raw=True)` which renders the editing widget. In code, we can only get the value and maybe provide an no warranty way to do it... yes because I think it can still be useful, for example you analyse data and store some metadata as a result. But can direct users to store important data in datasets.

# DONE

# Ideas

## TreeView

- Could also add the last modified attribute, basing it either on the notebook or the meta.
- ... maybe _outcome_ should be the equivalent of `info`, i.e. the first line of `conclusion`. - could be a default.

## Configuration loading

jupyter_cassini needs to have some information about the project:

- What are the valid id regexes - not essential, but probably useful for checking ids.
  _I think all of this can be returned by the server and can be stored in treeManager_

## TierView

- Add a lock and unlock button, unlocking it makes it stay in sync with the treeview, locking it means this tier always shows.

## New Child Dialog

- Get regex from treeManager, use to indicate if id is valid.

## Meta Editor

## Understanding of OG Document -> Model -> Listeners

Widget -> (Context) -> Model -> ModelDB

Widgets have a state that is stored in a model object. The model object sends out signals when it updates.

This means if you sync up your model objects, then widgets can stay in sync with one another.

The model doesn't actually store the data. It's stored in a separate object called the ModelDB. I think the reason for this is so that
you can have multiple models sharing parts of the same DB object, but I'm really not sure.

The model can handle serialisation and deserialisation and sends out the signals when the modelDB changes.

In some cases you might want an object/ widget that reflects the state of some file on the disk, e.g. a notebook! In this case
theres another layer to the onion - a Context! The context is meant to know where the file is and also how to turn that file into
a model and how to write that model back to the file. From what I've read of the source, if the context type is json, it will try and
use toJSON to serialise the data, and if it's a text, then it will use toString.

What's odd is that in the source I can only find an implementation of a DocumentModel, which uses the type string.

To actually construct a context is super elaborate.

_Since I wrote this, in 4.0 they've moved away from modelDBs_ instead you just pass the big ol model to everything and tie all the bits together, which is a bit tricky but ok...

## Architecture

For widgets that host other widgets or components that display content from their model, to keep general, these components should take data on a need to know basis. If these widgets need to make changes to the model, they should be provided with callbacks from the 'model host' that handle this for them.

Where models are comprised of other objects inside, these should be interfaced such that widgets that rely on that model don't access the model's children.
