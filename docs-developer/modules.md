
Front-end Modules
=============


Overview
--------------------------
Kolibri Studio uses the [Backbone.js](http://backbonejs.org/) framework, which is a model/view/router structure. Each module has a corresponding `hbtemplates` folder for the [handlebars](https://handlebarsjs.com/) templates, which are styled using the [less](http://lesscss.org/) files under `static/less`.  Strings are translated by wrapping them using the [handlebars-intl](https://formatjs.io/handlebars/) format and passing in corresponding `MESSAGES` through js.

Base Views
--------------------------
_static/js/edit_channel/views.js_
These views are used to subclass from in other modules and provides a variety of shared functions to reuse in other views.

### BaseView
This is the main view all views subclass from.

#### Methods

`get_translation_library` and `get_intl_data` are used to pass translations to the handlebars templates.

Example

    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
    }
--------------------------
`get_translation` is used to render dynamic translations (e.g. as an alert or changing ui text).

Example

    var MESSAGES = {
        "new_title": "Text goes here"
    }
    ...
    function: set_button_text() {
        $("button").prop("title", this.get_translation("new_title"));
    }

--------------------------
`loop_focus`, `set_initial_focus`, and `set_indices` are used to set tab navigation

Example

    In template:
        <div class="input-tab-control tab_item" data-next="#item2"></div>
            <input id="item1" type="text"class="tab_item first_focus_item"></input>
            <button id="item2" class="tab_item">Button</button>
        <div class="input-tab-control tab_item" data-next="#item1"></div>

    In view:
    events: {
        ...
        'focus .input-tab-control': 'loop_focus', // Sets focus on data-next item
    },
    render: function() {
        ...
        // After handlebars templates have been rendered
        this.set_indices();         // Loops through all items that have the
                                    //.tab_item class and gives a tabindex

        this.set_initial_focus();   // Automatically focus on the first item
                                    // with the .first_focus_item class
    }
--------------------------
 `display_load` shows a loading message that prevents other actions from taking place. Provides callback functions to dismiss message

Example

    save: function() {
        var self = this;
        this.display_load("Saving...", function(load_resolve, load_reject){
            self.save().then(load_resolve).catch(load_reject);
        });
    }

--------------------------
 `reload_ancestors` re-renders content nodes and their parents through the tree (e.g. if a node is added to a topic, the node and topic will re-render)

Example

    add_nodes: function(new_nodes) {
        // Assume new_nodesis a ContentNodeCollection
        this.collection.add(new_nodes.models);
        this.reload_ancestors(new_nodes);
    }



Channel List Page
--------------------------
_static/js/edit_channel/new_channel_
This module displays a list of channels that are public or the user has access to (edit or view-only). Here, users can create their own channels and open channel pages. They can also star any channels for easier access.

### ChannelListPage
This view renders the main channel list page

`render` loads all lists of channels that are relevant to the user (edit channels, view-only channels, starred channels, and public channels)

`new_channel` creates a new channel for the user to edit

`add_channel` adds a channel to a designated list based on the category (e.g. if a user stars a channel, the channel will be added to the starred_channel_list)

`delete_channel` deletes a given channel from all associated lists (e.g. if a user deletes a channel from the current_channel_list, it will also be deleted from the starred_channel_list)

`remove_star` removes the channel from the starred_channel_list

`set_all_models` sets attributes for a channel in all lists (e.g. updating the title in the current_channel_list will also update it in the starred_channel_list)