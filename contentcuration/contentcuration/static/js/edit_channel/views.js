var Backbone = require('backbone');
var _ = require('underscore');
const WorkspaceManager = require('./utils/workspace_manager');
var Models = require('./models');
var analytics = require('utils/analytics');
const State = require('edit_channel/state');
//var UndoManager = require("backbone-undo");

var TABINDEX = 1;

var NAMESPACE = 'shared';
var MESSAGES = {
  cancel: 'Cancel',
  delete: 'Delete',
  move: 'Move',
  edit: 'Edit',
  view: 'View',
  publish: 'PUBLISH',
  close: 'CLOSE',
  add: 'Add',
  remove: 'Remove',
  deploy_option: 'Deploy Channel?',
  view_summary: 'View Summary',
  keep_reviewing: 'Keep Reviewing',
  deploy: 'Deploy',
  copy: 'Copy',
  topic: 'Topic',
  exercise_title: 'Exercise',
  select_all: 'Select all',
  preview: 'Preview',
  deleting: 'Deleting...',
  archiving: 'Archiving Content...',
  moving_content: 'Moving Content...',
  moving_to_clipboard: 'Moving to Clipboard...',
  deleting_content: 'Deleting Content...',
  copying_to_clipboard: 'Copying to Clipboard...',
  making_copy: 'Making a Copy...',
  loading: 'Loading...',
  saving: 'Saving...',
  creating: 'Creating...',
  loading_content: 'Loading Content...',
  no_changes_detected: 'No changes detected',
  not_approved: 'Deploy Failed',
  no_items: 'No items found',
  empty: '(empty)',
  no_preview: 'No Preview Available',
  refresh_page: 'Error with asynchronous call. Please refresh the page',
  call_error: 'Error with asynchronous call',
  error_moving_content: 'Error Moving Content',
  error: 'ERROR',
  warning: 'WARNING',
  deploy_stats:
    'Deploying this topic tree will replace the live topic tree ({data, plural,\n =1 {# topic}\n other {# topics}}, ' +
    '{data2, plural,\n =1 {# resource}\n other {# resources}}) with this staged topic tree ' +
    '({data3, plural,\n =1 {# topic}\n other {# topics}}, {data4, plural,\n =1 {# resource}\n other {# resources}}). ' +
    'Are you sure you want to deploy this updated topic tree?',
  delete_item_warning:
    'Are you sure you want to PERMANENTLY delete this item? Changes cannot be undone!',
  delete_message:
    'Are you sure you want to delete these selected items PERMANENTLY? Changes cannot be undone!',
  unsaved_changes: 'Unsaved Changes!',
  unsaved_changes_text: 'Exiting now will undo any new changes. Are you sure you want to exit?',
  count: '{data, plural,\n =0 {}\n =1 {# item selected }\n other {# items selected }}',
  resource_count: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
  id: 'ID:',
  continue: 'Continue',
  related_content: 'RELATED CONTENT DETECTED',
  related_content_warning:
    'Any content associated with {data, plural,\n =1 {this item}\n other {these items}} ' +
    'will no longer reference {data, plural,\n =1 {it}\n other {them}} as related content. Are you sure you want to continue?',
  language: 'Language',
  select_language: 'Select a Language',
  make_copy: 'Make a Copy',
  topic_title: 'Topic',
  problem_creating_topics: 'Error Creating Topic',
  parenthesis: '({data})',
};

var BaseView = Backbone.View.extend({
  default_item: '.default-item',
  name: NAMESPACE,
  locale: navigator.language || navigator.browserLanguage,
  $trs: MESSAGES,
  globalMessageStore: require('utils/translations'),
  sharedTranslations: MESSAGES,
  get_translation_library: function() {
    return _.chain(this.sharedTranslations)
      .extend(this.$trs)
      .extend(this.globalMessageStore['shared'] || {})
      .extend(this.globalMessageStore[this.name] || {})
      .value();
  },
  get_intl_data: function() {
    var language = State.currentLanguage;
    return {
      intl: {
        locales: [(language && language.id) || 'en-US'],
        messages: this.get_translation_library(),
      },
    };
  },
  get_translation: function(message_id, data, data2, data3, data4) {
    // Get dynamically generated messages
    var messages = this.get_translation_library();
    if (data !== undefined) {
      var template = require('edit_channel/utils/hbtemplates/intl.handlebars');
      var div = document.createElement('DIV');
      div.id = 'intl_wrapper';
      $(div).html(
        template(
          {
            data: data,
            data2: data2,
            data3: data3,
            data4: data4,
            message_id: message_id,
          },
          {
            data: this.get_intl_data(),
          }
        )
      );
      var contents = div.innerHTML;
      div.remove();
      return contents;
    } else {
      return messages[message_id];
    }
  },
  loop_focus: function(event) {
    var element = $(event.target);
    if (element.data('next')) {
      this.$(element.data('next')).focus();
      this.$(element.data('next')).select();
    }
  },
  set_initial_focus: function() {
    $('.first_focus_item').focus();
    $('.first_focus_item').select();
  },
  set_indices: function() {
    this.$('.tab_item').each(function() {
      $(this).attr('tabindex', TABINDEX++);
    });
  },
  display_load: function(message, callback) {
    if (callback) {
      this.show_loading_modal(message);
      var promise = new Promise(function(resolve, reject) {
        callback(resolve, reject);
      });
      promise
        .then(() => {
          if (message.trim() != '') {
            $('#loading_modal').remove();
          }
        })
        .catch(() => {
          if (message != '') {
            $('#kolibri_load_text').text(this.get_translation('refresh_page'));
          }
        });
    } else {
      this.dismiss_loading_modal();
    }
  },
  show_loading_modal: function(message) {
    if ($('#loading_modal').length == 0 && message.trim() != '') {
      var load =
        '<div id="loading_modal" class="text-center fade">' +
        '<div id="kolibri_load_gif"></div>' +
        '<h4 id="kolibri_load_text" class="text-center">' +
        message +
        '</h4>' +
        '</div>';
      $(load).appendTo('body');
    }
  },
  dismiss_loading_modal: function() {
    $('#loading_modal').remove();
  },
  reload_ancestors: function(collection, include_collection, callback) {
    include_collection = include_collection == null || include_collection;
    var list_to_reload = collection
      .chain()
      .reduce(function(list, item) {
        return list.concat(item.get('ancestors'));
      }, [])
      .union(include_collection ? collection.pluck('id') : [])
      .union(State.current_channel ? [State.current_channel.get('main_tree').id] : [])
      .uniq()
      .value();
    var self = this;
    this.retrieve_nodes($.unique(list_to_reload), true).then(function(fetched) {
      fetched.forEach(function(model) {
        var object = WorkspaceManager.get(model.get('id'));
        if (object) {
          if (object.node) object.node.reload(model);
          if (object.list) object.list.set_root_model(model);
        }

        if (model.id === State.current_channel.get('main_tree').id) {
          State.current_channel.set('main_tree', model.toJSON());
          self.check_if_published(model);
          WorkspaceManager.get_main_view().handle_checked();
        }
        if (model.id === State.current_user.get('clipboard_tree').id) {
          State.current_user.set('clipboard_tree', model.toJSON());
        }

        if (model.id === State.current_channel.get('trash_tree').id) {
          State.current_channel.set('trash_tree', model.toJSON());
        }
      });
      callback && callback();
    });
  },
  retrieve_nodes: function(ids, force_fetch) {
    force_fetch = force_fetch ? true : false;
    return State.nodeCollection.get_all_fetch(ids, force_fetch);
  },
  fetch_model: function(model) {
    return new Promise(function(resolve, reject) {
      model.fetch({
        success: resolve,
        error: reject,
      });
    });
  },
  check_if_published: function() {
    var is_published = State.current_channel.get('main_tree').published;
    $('#hide-if-unpublished').css('display', is_published ? 'inline-block' : 'none');
    State.Store.commit('publish/SET_CHANNEL', State.current_channel.toJSON());
  },
  set_publishing: function() {
    $('#channel-publish-button')
      .attr('disabled', 'disabled')
      .attr('title', this.get_translation('publish_in_progress'))
      .addClass('disabled');
  },
  cancel_actions: function(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      WorkspaceManager.get_main_view().close_all_popups();
    } catch (e) {
      // do nothing?
    }
  },
  remove: function() {
    this.trigger('removed');
    Backbone.View.prototype.remove.call(this);
  },

  /**
   * Track an event to analytics providers (e.g. Google Analytics, Mixpanel).
   * @param {string} event_category Typically the object interacted with, e.g. 'Clipboard'
   * @param {string} event_action The type of interaction, e.g. 'Add item'
   * @param {object} event_data (Optional) Properties to include about the
   *     event, e.g. {title: 'Sparks Fly'}
   */
  track_analytics_event: function(event_category, event_action, event_data) {
    analytics.track(event_category, event_action, event_data);
  },

  track_event_for_nodes: function(event_category, event_action, nodes) {
    if (nodes instanceof Backbone.Model) {
      nodes = [nodes];
    }
    if (_.isArray(nodes)) {
      nodes = new Backbone.Collection(nodes);
    }
    var nodes_json = nodes.map(function(node) {
      return {
        title: node.get('title'),
        original_channel: node.get('original_channel'),
      };
    });
    analytics.track(event_category, event_action, { items: nodes_json });
  },
});

var BaseWorkspaceView = BaseView.extend({
  lists: [],
  isclipboard: false,
  bind_workspace_functions: function() {
    _.bindAll(
      this,
      'reload_ancestors',
      'edit_permissions',
      'handle_published',
      'handle_move',
      'handle_changed_settings',
      'activate_channel',
      'edit_selected',
      'add_to_trash',
      'add_to_clipboard',
      'get_selected',
      'cancel_actions',
      'delete_items_permanently',
      'sync_content'
    );
  },
  activate_channel: function() {
    var dialog = require('edit_channel/utils/dialog');
    var original_resource_count = State.current_channel.get('main_tree').metadata.resource_count;
    var original_topic_count =
      State.current_channel.get('main_tree').metadata.total_count - original_resource_count;
    var staged_resource_count = State.current_channel.get('staging_tree').metadata.resource_count;
    var staged_topic_count =
      State.current_channel.get('staging_tree').metadata.total_count - staged_resource_count;
    var self = this;
    dialog.dialog(
      this.get_translation('deploy_option'),
      this.get_translation(
        'deploy_stats',
        original_topic_count,
        original_resource_count,
        staged_topic_count,
        staged_resource_count
      ),
      {
        [self.get_translation('view_summary')]: function() {
          var treeViews = require('edit_channel/tree_edit/views');
          new treeViews.DiffModalView();
        },
        [self.get_translation('keep_reviewing')]: function() {},
        [self.get_translation('deploy')]: function() {
          State.current_channel
            .activate_channel()
            .then(function() {
              window.location.href = '/channels/' + State.current_channel.id + '/edit';
            })
            .catch(function(error) {
              dialog.alert(self.get_translation('not_approved'), error);
            });
        },
      },
      null
    );
  },
  handle_published: function() {
    var dialog = require('edit_channel/utils/dialog');
    this.set_publishing();
    var self = this;
    State.current_channel.fetch({
      success: function(channel) {
        var new_channel = new Models.ChannelCollection();
        new_channel.reset(channel.toJSON());
        $('#publish_id_text').val(State.current_channel.get('primary_token'));
        dialog.alert(
          self.get_translation('publish_in_progress'),
          self.get_translation('publishing_prompt')
        );
      },
    });
  },
  get_channel_id: function() {
    var staticModal = require('edit_channel/information/views');
    new staticModal.PublishedModalView({ channel: State.current_channel, published: false });
  },
  edit_permissions: function() {
    var ShareViews = require('edit_channel/share/views');
    State.Store.dispatch('usePrimaryModal', () => {
      return new ShareViews.ShareModalView({
        model: State.current_channel,
        current_user: State.current_user,
      });
    });
  },
  edit_selected: function(allow_edit) {
    var list = this.get_selected();
    var edit_collection = new Models.ContentNodeCollection();
    /* Create list of nodes to edit */
    for (var i = 0; i < list.length; i++) {
      var model = list[i].model;
      model.view = list[i];
      edit_collection.add(model);
    }
    var parent = null;
    if (edit_collection.length == 1) {
      parent = edit_collection.models[0];
    }
    this.edit_nodes(allow_edit, edit_collection, this.isclipboard, parent);
  },
  edit_nodes: function(allow_edit, collection, is_clipboard, parent) {
    var UploaderViews = require('edit_channel/uploader/views');
    State.Store.dispatch('usePrimaryModal', () => {
      return new UploaderViews.MetadataModalView({
        collection: collection,
        model: parent,
        new_content: false,
        onsave: this.reload_ancestors,
        allow_edit: allow_edit,
        isclipboard: is_clipboard,
        onnew: (collection, message) => {
          return this.add_to_clipboard(collection, message, 'MetadataModalView');
        },
      });
    });
  },
  add_to_trash: function(collection) {
    var self = this;
    var promise = new Promise(function(resolve) {
      var reloadCollection = collection.clone();
      var trash_node = State.current_channel.get_root('trash_tree');
      collection.move(trash_node, trash_node.get('metadata').max_sort_order).then(function() {
        self.reload_ancestors(reloadCollection, false);
        trash_node.fetch({
          success: function(fetched) {
            State.current_channel.set('trash_tree', fetched.attributes);
            resolve(collection);
          },
        });
      });
    });
    return promise;
  },
  add_to_clipboard: function(collection, message, source) {
    this.track_event_for_nodes('Clipboard', `Add item from ${source}`, collection);
    message = message != null ? message : this.get_translation('moving_to_clipboard');
    return this.move_to_queue_list(
      collection,
      WorkspaceManager.get_queue_view().clipboard_queue,
      message
    );
  },
  move_to_queue_list: function(collection, list_view, message) {
    message = message != null ? message : this.get_translation('moving_content');
    var self = this;
    var promise = new Promise(function(resolve) {
      self.display_load(message, function(resolve_load) {
        var reloadCollection = collection.clone();
        collection
          .move(list_view.model, null, list_view.model.get('metadata').max_sort_order + 1)
          .then(function() {
            list_view.add_nodes(collection);
            self.reload_ancestors(reloadCollection, false);
            resolve(collection);
            resolve_load(true);
          });
      });
    });
    return promise;
  },
  get_selected: function(exclude_descendants) {
    var selected_list = [];
    // Use for loop to break if needed
    for (var i = 0; i < this.lists.length; ++i) {
      selected_list = $.merge(selected_list, this.lists[i].get_selected());
      var open_topic = this.lists[i].get_opened_topic();
      if (exclude_descendants && (!open_topic || open_topic.checked) && selected_list.length > 0) {
        break;
      }
    }
    return selected_list;
  },
  open_archive: function() {
    var ArchiveView = require('edit_channel/archive/views');
    State.Store.dispatch('usePrimaryModal', () => {
      return new ArchiveView.ArchiveModalView({
        model: new Models.ContentNodeModel(State.current_channel.get('trash_tree')),
      });
    });
  },
  move_content: function(move_collection, source) {
    var MoveView = require('edit_channel/move/views');
    if (!move_collection) {
      var list = this.get_selected(true);
      move_collection = new Models.ContentNodeCollection(_.pluck(list, 'model'));
    }
    return new MoveView.MoveModalView({
      collection: move_collection,
      onmove: (target, moved, original_parents) => {
        if (source === 'clipboard') {
          this.track_event_for_nodes('Clipboard', 'Move items', moved);
        }
        this.handle_move(target, moved, original_parents);
      },
      model: State.current_channel.get_root('main_tree'),
    });
  },
  handle_move: function(target, moved, original_parents) {
    var reloadCollection = new Models.ContentNodeCollection();
    reloadCollection.add(original_parents.models);
    reloadCollection.add(moved.models);

    // Remove where nodes originally were
    moved.forEach(function(node) {
      WorkspaceManager.remove(node.id);
    });

    // Add nodes to correct place
    var content = WorkspaceManager.get(target.id);
    if (content && content.list) {
      content.list.add_nodes(moved);
    }
    // Recalculate counts
    this.reload_ancestors(original_parents, true);
  },
  sync_content: function() {
    var SyncView = require('edit_channel/sync/views');
    State.Store.dispatch('usePrimaryModal', () => {
      return new SyncView.TempSyncModalView({
        onsync: this.reload_ancestors,
        model: State.current_channel.get_root('main_tree'),
      });
    });
  },
  delete_items_permanently: function(message, list, callback) {
    message = message != null ? message : this.get_translation('deleting');
    var self = this;
    this.display_load(message, function(resolve_load, reject_load) {
      var promise_list = [];
      var reload = new Models.ContentNodeCollection();
      for (var i = 0; i < list.length; i++) {
        var view = list[i];
        if (view) {
          promise_list.push(
            new Promise(function(resolve, reject) {
              reload.add(view.model);
              if (view.containing_list_view) {
                reload.add(view.containing_list_view.model);
              }
              view.model.destroy({
                success: function(data) {
                  WorkspaceManager.remove(data.id);
                  resolve(data);
                },
                error: function(obj, error) {
                  reject(error);
                },
              });
            })
          );
        }
      }
      Promise.all(promise_list)
        .then(function() {
          self.lists.forEach(function(list) {
            list.handle_if_empty();
          });
          self.reload_ancestors(reload, true);
          if (callback) {
            callback();
          }
          resolve_load(true);
        })
        .catch(function(error) {
          reject_load(error);
        });
    });
  },
  open_channel_settings: function() {
    var settings = require('edit_channel/channel_settings/views');
    State.Store.dispatch('usePrimaryModal', () => {
      return new settings.SettingsModalView({
        model: State.current_channel,
        onsave: this.handle_changed_settings,
      });
    });
  },
  handle_changed_settings: function(data) {
    $('#channel_selection_dropdown').text(data.get('name'));
    WorkspaceManager.get_main_view().model.set('title', data.get('name'));
    State.preferences = data.get('content_defaults');
  },
});

var BaseModalView = BaseView.extend({
  callback: null,
  className: 'dialog',
  default_focus_button_selector: null,
  initialize: function() {
    _.bindAll(this, 'closed_modal', 'close');
  },
  render: function(closeFunction, renderData) {
    this.$el.html(
      this.template(renderData, {
        data: this.get_intl_data(),
      })
    );
    $('body').append(this.el);
    this.$('.modal').modal({ show: true });
    this.$('.modal').on('hide.bs.modal', closeFunction);
  },
  focus: function() {
    this.$(this.default_focus_button_selector).focus();
  },
  close: function() {
    if (this.modal) {
      this.$('.modal').modal('hide');
    } else {
      this.remove();
    }
  },
  closed_modal: function() {
    $('body').addClass('modal-open'); //Make sure modal-open class persists
    $('.modal-backdrop')
      .slice(1)
      .remove();
    this.remove();
  },
});

var BaseListView = BaseView.extend({
  /* Properties to overwrite */
  collection: null, //Collection to be used for data
  template: null,
  list_selector: null,
  default_item: null,
  selectedClass: 'content-selected',
  item_class_selector: null,

  /* Functions to overwrite */
  create_new_view: null,

  views: [], //List of item views to help with garbage collection

  bind_list_functions: function() {
    _.bindAll(
      this,
      'load_content',
      'close',
      'handle_if_empty',
      'check_all',
      'get_selected',
      'set_root_model',
      'update_views',
      'cancel_actions'
    );
  },
  is_segment: function() {
    // Used for clipboard channel segmenting
    return false;
  },
  set_root_model: function(model) {
    this.model.set(model.toJSON());
  },
  update_views: function() {
    this.retrieve_nodes(this.model.get('children'), true).then(this.load_content);
  },
  get_opened_topic: function() {
    return null; // Overload in subclasses
  },
  load_content: function(collection, default_text) {
    collection = collection ? collection : this.collection;
    default_text = default_text ? default_text : this.get_translation('no_items');
    this.views = [];
    var default_element = this.$(this.default_item);
    default_element.text(default_text);
    this.$(this.list_selector)
      .html('')
      .append(default_element);
    var self = this;
    collection.forEach(function(entry) {
      var item_view = self.create_new_view(entry);
      self.$(self.list_selector).append(item_view.el);
    });
    this.handle_if_empty();
  },
  handle_if_empty: function() {
    this.$(this.default_item).css('display', this.views.length > 0 ? 'none' : 'block');
  },
  check_all: function(event) {
    var is_checked = event ? event.currentTarget.checked : true;
    this.$el.find(':checkbox').prop('checked', is_checked);
    this.recurse_check_all(this.views);
  },
  recurse_check_all: function(views) {
    var self = this;
    views.forEach(function(view) {
      view.handle_checked();
      if (view.subcontent_view) {
        self.recurse_check_all(view.subcontent_view.views);
      }
    });
  },
  get_selected: function() {
    var selected_views = [];
    this.views.forEach(function(view) {
      if (view.checked) {
        selected_views.push(view);
      } else if (view.subcontent_view) {
        selected_views = _.union(selected_views, view.subcontent_view.get_selected());
      }
    });
    return selected_views;
  },
  close: function() {
    this.remove();
  },
});

var BaseEditableListView = BaseListView.extend({
  collection: null, //Collection to be used for data
  template: null,
  list_selector: null,
  default_item: null,
  selectedClass: 'content-selected',
  item_class_selector: null,

  /* Functions to overwrite */
  create_new_view: null,

  views: [], //List of item views to help with garbage collection
  bind_edit_functions: function() {
    this.bind_list_functions();
    _.bindAll(this, 'create_new_item', 'reset', 'save', 'delete');
  },
  create_new_item: function(newModelData, appendToList, message) {
    appendToList = appendToList ? appendToList : false;
    message = message != null ? message : this.get_translation('creating');
    var self = this;
    var promise = new Promise(function(resolve, reject) {
      self.display_load(message, function(resolve_load, reject_load) {
        self.collection.create(newModelData, {
          success: function(newModel) {
            var new_view = self.create_new_view(newModel);
            if (appendToList) {
              self.$(self.list_selector).append(new_view.el);
            }
            self.handle_if_empty();
            resolve(new_view);
            resolve_load(true);
          },
          error: function(obj, error) {
            // eslint-disable-next-line no-console
            console.warn(self.get_translation('error'), error);
            reject(error);
            reject_load(error);
          },
        });
      });
    });
    return promise;
  },
  reset: function() {
    this.views.forEach(function(entry) {
      entry.model.unset();
    });
  },
  save: function(message, beforeSave, onerror) {
    message = message != null ? message : this.get_translation('saving');
    var self = this;
    return new Promise(function(resolve, reject) {
      if (beforeSave) {
        beforeSave();
      }
      self.display_load(message, function(load_resolve, load_reject) {
        self.collection
          .save()
          .then(function(data) {
            resolve(data);
            load_resolve(true);
          })
          .catch(function(error) {
            if (onerror) {
              onerror(error);
              load_resolve(true);
            } else {
              load_reject(error);
            }
            reject(error);
          });
      });
    });
  },
  delete_items_permanently: function(message) {
    message = message != null ? message : this.get_translation('deleting');
    var self = this;
    this.display_load(message, function(resolve_load, reject_load) {
      var list = self.get_selected();
      var deleteCollection = new Models.ContentNodeCollection();
      for (var i = 0; i < list.length; i++) {
        var view = list[i];
        if (view) {
          deleteCollection.add(view.model);
          self.collection.remove(view.model);
          self.views.splice(view, 1);
          view.remove();
        }
      }
      deleteCollection
        .delete()
        .then(function() {
          self.handle_if_empty();
          resolve_load(true);
        })
        .catch(function(error) {
          reject_load(error);
        });
    });
  },
  delete: function(view) {
    this.collection.remove(view.model);
    this.views = _.reject(this.views, function(el) {
      return el.model.id === view.model.id;
    });
    this.handle_if_empty();
    // this.update_views();
  },
  remove_view: function(view) {
    this.views = _.reject(this.views, function(v) {
      return v.cid === view.cid;
    });
  },
});

var BaseWorkspaceListView = BaseEditableListView.extend({
  /* Properties to overwrite */
  collection: null, //Collection to be used for data
  item_view: null,
  template: null,
  list_selector: null,
  default_item: null,
  content_node_view: null,
  isclipboard: false,

  /* Functions to overwrite */
  create_new_view: null,

  views: [], //List of item views to help with garbage collection

  bind_workspace_functions: function() {
    this.bind_edit_functions();
    _.bindAll(
      this,
      'copy_selected',
      'delete_selected',
      'add_topic',
      'add_nodes',
      'drop_in_container',
      'handle_drop',
      'refresh_droppable',
      'import_content',
      'add_files',
      'add_to_clipboard',
      'add_to_trash',
      'make_droppable',
      'copy_collection',
      'add_exercise'
    );
  },

  copy_selected: function() {
    var list = this.get_selected();
    var copyCollection = new Models.ContentNodeCollection();
    for (var i = 0; i < list.length; i++) {
      copyCollection.add(list[i].model);
    }
    return this.copy_collection(copyCollection);
  },
  copy_collection: function(copyCollection) {
    var clipboard = WorkspaceManager.get_queue_view();
    clipboard.open_queue();
    return copyCollection.duplicate(clipboard.clipboard_queue.model);
  },
  delete_selected: function() {
    var list = this.get_selected();
    var deleteCollection = new Models.ContentNodeCollection();
    for (var i = 0; i < list.length; i++) {
      var view = list[i];
      if (view) {
        deleteCollection.add(view.model);
        view.remove();
      }
    }
    this.add_to_trash(deleteCollection, this.get_translation('deleting_content'));
  },
  make_droppable: function() {
    var DragHelper = require('edit_channel/utils/drag_drop');
    DragHelper.addSortable(this, this.selectedClass, this.drop_in_container);
  },
  refresh_droppable: function() {
    var self = this;
    _.defer(function() {
      $(self.list_selector).sortable('enable');
      $(self.list_selector).sortable('refresh');
    }, 100);
  },
  drop_in_container: function(moved_item, selected_items, orders) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (_.contains(orders, moved_item)) {
        self
          .handle_drop(selected_items)
          .then(function(collection) {
            var ids = collection.pluck('id');
            var pivot = orders.indexOf(moved_item);
            var min = _.chain(orders.slice(0, pivot))
              .reject(function(item) {
                return _.contains(ids, item.id);
              })
              .map(function(item) {
                return item.get('sort_order');
              })
              .max()
              .value();
            var max = _.chain(orders.slice(pivot, orders.length))
              .reject(function(item) {
                return _.contains(ids, item.id);
              })
              .map(function(item) {
                return item.get('sort_order');
              })
              .min()
              .value();
            min = _.isFinite(min) ? min : 0;
            max = _.isFinite(max) ? max : min + selected_items.length * 2;

            var reload_list = new Models.ContentNodeCollection();
            var last_elem = $('#' + moved_item.id);
            collection.forEach(function(node) {
              if (node.get('parent') !== self.model.get('id')) {
                var new_node =
                  self.collection.get({ id: node.get('parent') }) ||
                  new Models.ContentNodeModel({ id: node.get('parent') });
                reload_list.add(new_node);
              }
              var to_delete = $('#' + node.id);
              var item_view = self.create_new_view(node);
              last_elem.after(item_view.el);
              last_elem = item_view.$el;
              to_delete.remove();
            });
            collection
              .move(self.model, max, min)
              .then(function() {
                self.reload_ancestors(reload_list, true, resolve);
              })
              .catch(function(error) {
                var dialog = require('edit_channel/utils/dialog');
                dialog.alert(
                  self.get_translation('error_moving_content'),
                  error.responseText,
                  function() {
                    $('.content-list').sortable('cancel');
                    $('.content-list').sortable('enable');
                    $('.content-list').sortable('refresh');
                    $('#saving-spinner').css('display', 'none');
                    // Revert back to original positions
                    self.retrieve_nodes($.unique(reload_list), true).then(function(fetched) {
                      self.reload_ancestors(fetched, true);
                      self.render();
                    });
                  }
                );
              });
          })
          .catch(reject);
      }
    });
  },
  handle_drop: function(collection) {
    this.$(this.default_item).css('display', 'none');
    var promise = new Promise(function(resolve) {
      resolve(collection);
    });
    return promise;
  },
  add_nodes: function(collection) {
    var item_map = _.object(
      _.map(this.views, function(view) {
        return [view.id(), view];
      })
    );

    var self = this;
    collection.forEach(function(node) {
      self.add_single_node(node, item_map);
    });

    this.model.set('children', this.model.get('children').concat(collection.pluck('id')));
    this.reload_ancestors(collection, true);
    this.handle_if_empty();
  },
  add_single_node: function(node) {
    var new_view = this.create_new_view(node);
    this.$(this.list_selector).append(new_view.el);
  },
  add_topic: function() {
    var UploaderViews = require('edit_channel/uploader/views');
    var self = this;
    State.Store.dispatch('usePrimaryModal', () => {
      var metadata_modal = new UploaderViews.MetadataModalView({
        collection: new Models.ContentNodeCollection([]),
        model: self.model,
        new_content: true,
        new_topic: true,
        onsave: self.reload_ancestors,
        onnew: self.add_nodes,
        allow_edit: true,
      });

      this.collection
        .create_new_node({
          kind: 'topic',
          title: this.model.get('parent')
            ? this.model.get('title') + ' ' + this.get_translation('topic')
            : this.get_translation('topic'),
        })
        .then(function(new_topic) {
          metadata_modal.collection.add(new_topic);
          metadata_modal.metadata_view.render();
        })
        .catch(function(error) {
          var dialog = require('edit_channel/utils/dialog');
          dialog.alert(self.get_translation('problem_creating_topics'), error.responseText);
        });

      return metadata_modal;
    });
  },
  import_content: function() {
    var Import = require('edit_channel/import/views');
    State.Store.dispatch('usePrimaryModal', () => {
      return new Import.ImportModalView({
        modal: true,
        onimport: this.add_nodes,
        model: this.model,
      });
    });
  },
  add_files: function() {
    var FileUploader = require('edit_channel/file_upload/views');
    this.file_upload_view = new FileUploader.FileModalView({
      parent_view: this,
      model: this.model,
      onsave: this.reload_ancestors,
      onnew: this.add_nodes,
      isclipboard: this.isclipboard,
    });
  },
  add_to_clipboard: function(collection, message, source) {
    message = message != null ? message : this.get_translation('moving_to_clipboard');
    var self = this;
    this.container.add_to_clipboard(collection, message, source).then(function() {
      self.handle_if_empty();
    });
  },
  add_to_trash: function(collection, message) {
    message = message != null ? message : this.get_translation('deleting_content');
    var self = this;
    this.container.add_to_trash(collection, message).then(function() {
      self.handle_if_empty();
    });
  },
  add_exercise: function() {
    var UploaderViews = require('edit_channel/uploader/views');
    var self = this;
    State.Store.dispatch('usePrimaryModal', () => {
      var metadata_modal = new UploaderViews.MetadataModalView({
        collection: new Models.ContentNodeCollection([]),
        model: self.model,
        new_content: true,
        new_exercise: true,
        onsave: self.reload_ancestors,
        onnew: self.add_nodes,
        allow_edit: true,
        isclipboard: self.isclipboard,
      });
      this.collection
        .create_new_node({
          kind: 'exercise',
          title: this.model.get('parent')
            ? this.model.get('title') + ' ' + this.get_translation('exercise_title')
            : this.get_translation('exercise_title'), // Avoid having exercises prefilled with 'email clipboard'
          author: State.preferences.author || '',
          aggregator: State.preferences.aggregator || '',
          provider: State.preferences.provider || '',
          copyright_holder: State.preferences.copyright_holder || '',
          license_name: State.preferences.license,
          license_description: State.preferences.license_description || '',
        })
        .then(function(new_exercise) {
          metadata_modal.collection.add(new_exercise);
          metadata_modal.metadata_view.render();
        });

      return metadata_modal;
    });
  },
});

var BaseListItemView = BaseView.extend({
  containing_list_view: null,
  template: null,
  id: null,
  className: null,
  model: null,
  tagName: 'li',
  selectedClass: null,
  checked: false,

  bind_list_functions: function() {
    _.bindAll(this, 'handle_checked', 'cancel_actions');
  },
  handle_checked: function() {
    this.checked = this.$el.find('>input[type=checkbox]').is(':checked');
    this.checked ? this.$el.addClass(this.selectedClass) : this.$el.removeClass(this.selectedClass);
  },
});

var BaseListEditableItemView = BaseListItemView.extend({
  containing_list_view: null,
  originalData: null,

  bind_edit_functions: function() {
    _.bindAll(this, 'set', 'unset', 'save', 'delete', 'reload');
    this.bind_list_functions();
  },
  set: function(data) {
    if (this.model) {
      this.model.set(data);
    }
  },
  unset: function() {
    this.model.set(this.originalData);
  },
  save: function(data, message) {
    message = message != null ? message : this.get_translation('saving');
    var self = this;
    return new Promise(function(resolve, reject) {
      self.originalData = data;
      if (self.model.isNew() && self.containing_list_view) {
        self.containing_list_view
          .create_new_item(data)
          .then(function(newView) {
            resolve(newView.model);
          })
          .catch(function(error) {
            // eslint-disable-next-line no-console
            console.warn(self.get_translation('error'), error);
            reject(error);
          });
      } else {
        self.display_load(message, function(resolve_load, reject_load) {
          self.model.save(data, {
            patch: true,
            success: function(savedModel) {
              resolve(savedModel);
              resolve_load(true);
            },
            error: function(obj, error) {
              // eslint-disable-next-line no-console
              console.warn(self.get_translation('error'), error);
              reject(error);
              reject_load(error);
            },
          });
        });
      }
    });
  },
  delete: function(destroy_model, message, callback) {
    message = message != null ? message : this.get_translation('deleting');
    var self = this;
    if (destroy_model) {
      this.display_load(message, function(resolve_load, reject_load) {
        self.containing_list_view.delete(self);
        var model_id = self.model.id;
        self.model.destroy({
          success: function() {
            WorkspaceManager.remove(model_id);
            if (self.containing_list_view) {
              var reload = new Models.ContentNodeCollection();
              reload.add(self.containing_list_view.model);
              self.reload_ancestors(reload);
            }
            if (callback) {
              callback();
            }
            resolve_load(true);
          },
          error: function(obj, error) {
            reject_load(error);
          },
        });
      });
    }
  },
  destroy: function(message, callback) {
    message = message != null ? message : this.get_translation('deleting');
    var self = this;
    this.display_load(message, function(resolve_load, reject_load) {
      self.model.destroy({
        success: function() {
          if (callback) {
            callback();
          }
          resolve_load(true);
        },
        error: function(obj, error) {
          reject_load(error);
        },
      });
    });
  },
  reload: function(model) {
    this.model.set(model.attributes);
    this.render();
  },
});

var BaseListNodeItemView = BaseListEditableItemView.extend({
  containing_list_view: null,
  originalData: null,
  template: null,
  id: null,
  className: null,
  model: null,
  tagName: 'li',
  selectedClass: null,
  expandedIcon: null,
  collapsedIcon: null,

  getToggler: null,
  getSubdirectory: null,
  load_subfiles: null,

  bind_node_functions: function() {
    _.bindAll(this, 'toggle', 'open_folder', 'close_folder');
    this.bind_edit_functions();
  },
  toggle: function(event) {
    this.cancel_actions(event);
    this.getToggler().text() === this.collapsedIcon ? this.open_folder() : this.close_folder();
  },
  open_folder: function(open_speed) {
    open_speed = _.isNumber(open_speed) ? open_speed : 200;
    this.getSubdirectory().slideDown(open_speed);
    if (!this.subcontent_view) {
      this.load_subfiles();
    }
    this.getToggler().text(this.expandedIcon);
  },
  close_folder: function(close_speed) {
    close_speed = close_speed ? close_speed : 200;
    this.getSubdirectory().slideUp(close_speed);
    this.getToggler().text(this.collapsedIcon);
  },
});

var BaseWorkspaceListNodeItemView = BaseListNodeItemView.extend({
  containing_list_view: null,
  originalData: null,
  template: null,
  id: null,
  className: null,
  model: null,
  tagName: 'li',
  selectedClass: 'content-selected',
  isclipboard: false,

  bind_workspace_functions: function() {
    this.bind_node_functions();
    _.bindAll(
      this,
      'copy_item',
      'open_preview',
      'open_edit',
      'handle_drop',
      'handle_checked',
      'add_to_clipboard',
      'add_to_trash',
      'make_droppable',
      'add_nodes',
      'add_topic',
      'open_move',
      'handle_move',
      'make_copy'
    );
  },
  make_droppable: function() {
    // Temporarily disable dropping onto topics for now
    // if(this.model.get("kind") === "topic"){
    // 	var DragHelper = require("edit_channel/utils/drag_drop");
    // 	DragHelper.addTopicDragDrop(this, this.open_folder, this.handle_drop);
    // }
  },
  open_preview: function() {
    var Previewer = require('edit_channel/preview/views');
    State.Store.dispatch('usePrimaryModal', () => {
      var data = {
        model: this.model,
      };
      return new Previewer.PreviewModalView(data);
    });
  },
  open_move: function(source) {
    var MoveView = require('edit_channel/move/views');
    var move_collection = new Models.ContentNodeCollection();
    move_collection.add(this.model);
    State.Store.dispatch('usePrimaryModal', () => {
      return new MoveView.MoveModalView({
        collection: move_collection,
        onmove: (target, moved, original_parents) => {
          if (source === 'clipboard') {
            this.track_event_for_nodes('Clipboard', 'Move item', moved);
          }
          this.handle_move(target, moved, original_parents);
        },
        model: State.current_channel.get_root('main_tree'),
      });
    });
  },
  handle_move: function(target, moved, original_parents) {
    // Recalculate counts
    this.reload_ancestors(original_parents, true);

    // Remove where node originally was
    WorkspaceManager.remove(this.model.id);

    // Add nodes to correct place
    var content = WorkspaceManager.get(target.id);
    if (content && content.list) {
      content.list.add_nodes(moved);
    }
  },
  open_edit: function(allow_edit) {
    var UploaderViews = require('edit_channel/uploader/views');
    State.Store.dispatch('usePrimaryModal', () => {
      var editCollection = new Models.ContentNodeCollection([this.model]);
      return new UploaderViews.MetadataModalView({
        collection: editCollection,
        new_content: false,
        model: this.containing_list_view.model,
        onsave: this.reload_ancestors,
        allow_edit: allow_edit,
        isclipboard: this.isclipboard,
        onnew: !this.allow_edit
          ? (collection, message) => {
              return this.containing_list_view.add_to_clipboard(
                collection,
                message,
                'preview modal'
              );
            }
          : null,
      });
    });
  },
  handle_drop: function(models) {
    var self = this;
    var promise = new Promise(function(resolve) {
      var tempCollection = new Models.ContentNodeCollection();
      var sort_order = self.model.get('metadata').max_sort_order;
      var reload_list = [self.model.get('id')];
      models.forEach(function(node) {
        reload_list.push(node.get('parent'));
        reload_list.push(node.get('id'));
        node.set({
          sort_order: ++sort_order,
        });
        tempCollection.add(node);
      });
      tempCollection.move(self.model.id).then(function() {
        self.retrieve_nodes(reload_list, true).then(function(fetched) {
          self.reload_ancestors(fetched);
          resolve(true);
        });
      });
    });
    return promise;
  },
  add_to_trash: function(message) {
    message = message != null ? message : this.get_translation('deleting_content');
    this.containing_list_view.add_to_trash(new Models.ContentNodeCollection([this.model]), message);
    this.remove();
  },
  add_to_clipboard: function(message, source) {
    message = message != null ? message : this.get_translation('moving_to_clipboard');
    this.containing_list_view.add_to_clipboard(
      new Models.ContentNodeCollection([this.model]),
      message,
      source
    );
  },
  copy_item: function(message, source) {
    message = message != null ? message : this.get_translation('copying_to_clipboard');
    var copyCollection = new Models.ContentNodeCollection();
    copyCollection.add(this.model);
    var self = this;
    this.display_load(message, function(resolve, reject) {
      self.containing_list_view
        .copy_collection(copyCollection)
        .then(function(collection) {
          self.containing_list_view.add_to_clipboard(collection, message, source);
          resolve(collection);
        })
        .catch(function(error) {
          reject(error);
        });
    });
  },
  make_copy: function(message) {
    // Makes inline copy
    message = message != null ? message : this.get_translation('making_copy');
    var copyCollection = new Models.ContentNodeCollection();
    copyCollection.add(this.model);
    var self = this;
    this.display_load(message, function(resolve) {
      var target_parent = self.containing_list_view.model;
      // If the target parent is a UI segment, go up a level to its parent to
      // get the collection to make a copy into.
      if (self.containing_list_view.is_segment()) {
        target_parent = self.containing_list_view.content_node_view.containing_list_view.model;
      }
      self.model.make_copy(target_parent).then(function(collection) {
        var new_view = self.containing_list_view.create_new_view(collection.at(0));
        self.$el.after(new_view.el);
        self.reload_ancestors(collection, true, resolve);
      });
    });
  },
  add_topic: function() {
    // Is this function ever actually used?
    var UploaderViews = require('edit_channel/uploader/views');
    var self = this;

    State.Store.dispatch('usePrimaryModal', () => {
      var metadata_modal = new UploaderViews.MetadataModalView({
        collection: new Models.ContentNodeCollection([]),
        model: self.model,
        new_content: true,
        new_topic: true,
        onsave: self.reload_ancestors,
        onnew: self.add_nodes,
        allow_edit: true,
      });

      this.containing_list_view.collection
        .create_new_node({
          kind: 'topic',
          title: this.model.get('parent')
            ? this.model.get('title') + ' ' + this.get_translation('topic_title')
            : this.get_translation('topic_title'),
          sort_order: this.model.get('metadata').max_sort_order,
        })
        .then(function(new_topic) {
          metadata_modal.collection.add(new_topic);
          metadata_modal.metadata_view.render();
        })
        .catch(function(error) {
          var dialog = require('edit_channel/utils/dialog');
          dialog.alert(self.get_translation('problem_creating_topics'), error.responseText);
        });

      return metadata_modal;
    });
  },
  add_nodes: function(collection) {
    if (this.subcontent_view) {
      this.subcontent_view.add_nodes(collection);
    } else {
      this.fetch_model(this.model).then(function(fetched) {
        this.reload(fetched);
      });
    }
  },
});

module.exports = {
  BaseView: BaseView,
  BaseWorkspaceView: BaseWorkspaceView,
  BaseModalView: BaseModalView,
  BaseListView: BaseListView,
  BaseEditableListView: BaseEditableListView,
  BaseWorkspaceListView: BaseWorkspaceListView,
  BaseListItemView: BaseListItemView,
  BaseListNodeItemView: BaseListNodeItemView,
  BaseListEditableItemView: BaseListEditableItemView,
  BaseWorkspaceListNodeItemView: BaseWorkspaceListNodeItemView,
};
