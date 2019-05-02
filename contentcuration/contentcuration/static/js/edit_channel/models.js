var Backbone = require('backbone');
var _ = require('underscore');
var PageableCollection = require('backbone.paginator');
const Constants = require('./constants/index');
var mail_helper = require('edit_channel/utils/mail');

const DEFAULT_ADMIN_PAGE_SIZE = 25;

/**** BASE MODELS ****/

var BaseModel = Backbone.Model.extend({
  root_list: null,
  model_name: 'Model',
  urlRoot: function() {
    return window.Urls[this.root_list]();
  },
  toJSON: function() {
    var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
    json.cid = this.cid;
    return json;
  },
  getName: function() {
    return this.model_name;
  },
});

var BaseCollection = Backbone.Collection.extend({
  list_name: null,
  model_name: 'Collection',
  url: function() {
    return window.Urls[this.list_name]();
  },
  save: function() {
    Backbone.sync('update', this, { url: this.model.prototype.urlRoot() });
  },
  set_comparator: function(comparator) {
    this.comparator = comparator;
  },
  get_all_fetch: function(ids, force_fetch) {
    force_fetch = force_fetch ? true : false;
    var self = this;
    var promise = new Promise(function(resolve) {
      var promises = [];
      ids.forEach(function(id) {
        promises.push(
          new Promise(function(modelResolve, modelReject) {
            var model = self.get({ id: id });
            if (force_fetch || !model) {
              model = self.add({ id: id });
              model.fetch({
                success: function(returned) {
                  modelResolve(returned);
                },
                error: function(obj, error) {
                  modelReject(error);
                },
              });
            } else {
              modelResolve(model);
            }
          })
        );
      });
      Promise.all(promises).then(function(fetchedModels) {
        var to_fetch = self.clone();
        to_fetch.reset();
        fetchedModels.forEach(function(entry) {
          to_fetch.add(entry);
        });
        resolve(to_fetch);
      });
    });
    return promise;
  },
  destroy: function() {
    var self = this;
    return new Promise(function(resolve) {
      var promise_list = [];
      self.forEach(function(model) {
        promise_list.push(
          new Promise(function(subresolve, subreject) {
            model.destroy({
              success: subresolve,
              error: subreject,
            });
          })
        );
      });
      Promise.all(promise_list).then(function() {
        resolve(true);
      });
    });
  },
  getName: function() {
    return this.model_name;
  },
});

var BasePageableCollection = PageableCollection.extend({
  save: function() {
    Backbone.sync('update', this, { url: this.model.prototype.urlRoot() });
  },
  set_comparator: function(comparator) {
    this.comparator = comparator;
  },
  get_all_fetch: function(ids, force_fetch) {
    force_fetch = force_fetch ? true : false;
    var self = this;
    var promise = new Promise(function(resolve) {
      var promises = [];
      ids.forEach(function(id) {
        promises.push(
          new Promise(function(modelResolve, modelReject) {
            var model = self.get({ id: id });
            if (force_fetch || !model) {
              model = self.add({ id: id });
              model.fetch({
                success: function(returned) {
                  modelResolve(returned);
                },
                error: function(obj, error) {
                  modelReject(error);
                },
              });
            } else {
              modelResolve(model);
            }
          })
        );
      });
      Promise.all(promises).then(function(fetchedModels) {
        var to_fetch = self.clone();
        to_fetch.reset();
        fetchedModels.forEach(function(entry) {
          to_fetch.add(entry);
        });
        resolve(to_fetch);
      });
    });
    return promise;
  },
  destroy: function() {
    var self = this;
    return new Promise(function(resolve) {
      var promise_list = [];
      self.forEach(function(model) {
        promise_list.push(
          new Promise(function(subresolve, subreject) {
            model.destroy({
              success: subresolve,
              error: subreject,
            });
          })
        );
      });
      Promise.all(promise_list).then(function() {
        resolve(true);
      });
    });
  },
  getName: function() {
    return this.model_name;
  },
  parseRecords: function(resp) {
    return resp.results;
  },
  parseState: function(resp, queryParams, state) {
    state.totalRecords = resp.count;
    state.totalPages = resp.total_pages;

    return state;
  },
  state: {
    pageSize: DEFAULT_ADMIN_PAGE_SIZE,
    firstPage: 1,
    currentPage: 1,
    filterQuery: {},
    order: -1,
  },
  baseQueryParams: {
    currentPage: 'page',
    pageSize: 'page_size',
    totalRecords: 'count',
    order: null,
    ordering: function() {
      var sortKey = this.state.sortKey,
        order = this.state.order;
      if (sortKey && order !== 0) {
        return (order === 1 ? '-' : '') + sortKey;
      }
      return null;
    },
  },
  fetch: function(options) {
    // Construct the queryParams
    this.queryParams = Object.assign({}, this.baseQueryParams);
    this.queryParams = Object.assign(this.queryParams, this.state.filterQuery);

    //Call PageableCollection's fetch
    return PageableCollection.prototype.fetch.call(this, options);
  },
});

Object.assign(PageableCollection.prototype, BaseCollection);
/**** USER-CENTERED MODELS ****/
var UserModel = BaseModel.extend({
  root_list: 'user-list',
  model_name: 'UserModel',
  defaults: {
    first_name: 'Guest',
  },
  send_invitation_email: function(email, channel, share_mode) {
    return mail_helper.send_mail(channel, email, share_mode);
  },
  get_clipboard: function() {
    return new ContentNodeModel(this.get('clipboard_tree'));
  },
  get_full_name: function() {
    return this.get('first_name') + ' ' + this.get('last_name');
  },
});

var UserCollection = BasePageableCollection.extend({
  model: UserModel,
  list_name: 'user-list',
  model_name: 'UserCollection',
  send_custom_email: function(subject, message) {
    return mail_helper.send_custom_email(this.pluck('email'), subject, message);
  },
  url: window.Urls.get_users(),
});

var InvitationModel = BaseModel.extend({
  root_list: 'invitation-list',
  model_name: 'InvitationModel',
  defaults: {
    first_name: 'Guest',
  },
  resend_invitation_email: function(channel) {
    return mail_helper.send_mail(channel, this.get('email'), this.get('share_mode'));
  },
  get_full_name: function() {
    return this.get('first_name') + ' ' + this.get('last_name');
  },
});

var InvitationCollection = BaseCollection.extend({
  model: InvitationModel,
  list_name: 'invitation-list',
  model_name: 'InvitationCollection',
});

var ChannelSetModel = BaseModel.extend({
  root_list: 'channelset-list',
  model_name: 'ChannelSetModel',
  defaults: {
    name: '',
    description: '',
  },
});

var ChannelSetCollection = BaseCollection.extend({
  model: ChannelSetModel,
  list_name: 'channelset-list',
  model_name: 'ChannelSetCollection',
});

/**** CHANNEL AND CONTENT MODELS ****/
function fetch_nodes(ids, url) {
  return new Promise(function(resolve) {
    // Getting "Request Line is too large" error on some channels, so chunk the requests
    var promises = _.chain(ids)
      .chunk(50)
      .map(function(id_list) {
        return new Promise(function(promise_resolve, promise_reject) {
          if (id_list.length === 0) {
            promise_resolve([]); // No need to make a call to the server
          }
          $.ajax({
            method: 'GET',
            url: url(id_list.join(',')),
            error: promise_reject,
            success: promise_resolve,
          });
        });
      })
      .value();
    Promise.all(promises).then(function(values) {
      resolve(new ContentNodeCollection(_.flatten(values)));
    });
  });
}
function fetch_nodes_by_ids(ids) {
  return fetch_nodes(ids, window.Urls.get_nodes_by_ids);
}

var ContentNodeModel = BaseModel.extend({
  root_list: 'contentnode-list',
  model_name: 'ContentNodeModel',
  defaults: {
    title: 'Untitled',
    children: [],
    tags: [],
    assessment_items: [],
    metadata: { resource_size: 0, resource_count: 0 },
    created: new Date(),
    ancestors: [],
    extra_fields: {},
  },
  generate_thumbnail: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        url: window.Urls.generate_thumbnail(self.id),
        success: function(result) {
          result = JSON.parse(result);
          result.file = new FileModel(JSON.parse(result.file));
          resolve(result);
        },
        error: reject,
      });
    });
  },
  fetch_details: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_topic_details(self.id),
        success: function(result) {
          self.set('metadata', JSON.parse(result));
          resolve(self);
        },
        error: reject,
      });
    });
  },
  has_related_content: function() {
    return this.get('prerequisite').length || this.get('is_prerequisite_of').length;
  },
  get_original_channel_id: function() {
    var original_channel = this.get('original_channel');
    return original_channel ? original_channel['id'] : 'unknown_channel_id';
  },
  get_original_channel_title: function() {
    var original_channel = this.get('original_channel');
    return original_channel ? original_channel['name'] : '';
  },
  get_original_channel_thumbnail: function() {
    var original_channel = this.get('original_channel');
    return original_channel ? original_channel['thumbnail_url'] : '';
  },
  initialize: function() {
    if (this.get('extra_fields') && typeof this.get('extra_fields') !== 'object') {
      this.set('extra_fields', JSON.parse(this.get('extra_fields')));
    }
    if (this.get('thumbnail_encoding') && typeof this.get('thumbnail_encoding') !== 'object') {
      this.set('thumbnail_encoding', JSON.parse(this.get('thumbnail_encoding')));
    }
  },
  parse: function(response) {
    if (response !== undefined && response.extra_fields) {
      response.extra_fields = JSON.parse(response.extra_fields);
    }
    if (response !== undefined && response.thumbnail_encoding) {
      response.thumbnail_encoding = JSON.parse(response.thumbnail_encoding);
    }
    return response;
  },
  toJSON: function() {
    var attributes = _.clone(this.attributes);
    if (typeof attributes.extra_fields !== 'string') {
      attributes.extra_fields = JSON.stringify(attributes.extra_fields);
    }
    if (
      attributes.thumbnail_encoding !== null &&
      typeof attributes.thumbnail_encoding !== 'string'
    ) {
      attributes.thumbnail_encoding = JSON.stringify(attributes.thumbnail_encoding);
    }
    return attributes;
  },
  setExtraFields: function() {
    const State = require('./state');
    if (typeof this.get('extra_fields') === 'string') {
      this.set('extra_fields', JSON.parse(this.get('extra_fields')));
    }
    if (this.get('kind') === 'exercise') {
      var data = this.get('extra_fields') ? this.get('extra_fields') : {};
      data['mastery_model'] = data['mastery_model']
        ? data['mastery_model']
        : State.preferences.mastery_model;
      data['m'] = data['m'] ? data['m'] : State.preferences.m_value;
      data['n'] = data['n'] ? data['n'] : State.preferences.n_value;
      data['randomize'] =
        data['randomize'] !== undefined
          ? data['randomize']
          : State.preferences.auto_randomize_questions;
      this.set('extra_fields', data);
    }
  },
  make_copy: function(target_parent) {
    const State = require('./state');
    var self = this;
    return new Promise(function(resolve, reject) {
      var data = {
        node_id: self.id,
        target_parent: target_parent.get('id'),
        channel_id: State.current_channel.id,
      };
      $.ajax({
        method: 'POST',
        url: window.Urls.duplicate_node_inline(),
        data: JSON.stringify(data),
        success: function(data) {
          resolve(new ContentNodeCollection(JSON.parse(data)));
        },
        error: reject,
      });
    });
  },
});

var ContentNodeCollection = BaseCollection.extend({
  model: ContentNodeModel,
  list_name: 'contentnode-list',
  highest_sort_order: 1,
  model_name: 'ContentNodeCollection',

  save: function() {
    var self = this;
    return new Promise(function(saveResolve, saveReject) {
      var numParser = require('edit_channel/utils/number_parser');
      var fileCollection = new FileCollection();
      var assessmentCollection = new AssessmentItemCollection();
      self.forEach(function(node) {
        node.get('files').forEach(function(file) {
          var to_add = new FileModel(file);
          var preset_data = to_add.get('preset');
          preset_data.id = file.preset.name || file.preset.id;
          fileCollection.add(to_add);
        });
        node.get('assessment_items').forEach(function(item) {
          item = new AssessmentItemModel(item);
          item.set('contentnode', node.id);
          if (item.get('type') === 'input_question') {
            item.get('answers').each(function(a) {
              var answer = a.get('answer');
              if (answer) {
                var value = numParser.parse(answer);
                a.set('answer', value !== null && value.toString());
              }
            });
          }
          assessmentCollection.add(item);
        });
      });
      Promise.all([fileCollection.save(), assessmentCollection.save()])
        .then(function() {
          Backbone.sync('update', self, {
            url: self.model.prototype.urlRoot(),
            success: function(data) {
              saveResolve(new ContentNodeCollection(data));
            },
            error: function(obj, error) {
              saveReject(error);
            },
          });
        })
        .catch(saveReject);
    });
  },
  has_prerequisites: function() {
    return this.some(function(model) {
      return model.get('prerequisite').length;
    });
  },
  has_postrequisites: function() {
    return this.some(function(model) {
      return model.get('is_prerequisite_of').length;
    });
  },
  has_related_content: function() {
    return this.has_prerequisites() || this.has_postrequisites();
  },
  get_prerequisites: function(ids, get_postrequisites) {
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_prerequisites((get_postrequisites || false).toString(), ids.join(',')),
        success: function(data) {
          var nodes = JSON.parse(data);
          resolve({
            prerequisite_mapping: nodes.prerequisite_mapping,
            postrequisite_mapping: nodes.postrequisite_mapping,
            prerequisite_tree_nodes: new ContentNodeCollection(
              JSON.parse(nodes.prerequisite_tree_nodes)
            ),
          });
        },
        error: reject,
      });
    });
  },
  get_node_path: function(topic_id, tree_id, node_id) {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_node_path(topic_id, tree_id, node_id),
        success: function(result) {
          var data = JSON.parse(result);
          var returnCollection = new ContentNodeCollection(JSON.parse(data.path));
          self.add(returnCollection.toJSON());

          var node = null;
          if (data.node) {
            node = new ContentNodeModel(JSON.parse(data.node));
            self.add(node);
          }
          resolve({
            collection: returnCollection,
            node: node,
            parent_node_id: data.parent_node_id,
          });
        },
        error: reject,
      });
    });
  },
  calculate_size: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_total_size(self.pluck('id').join(',')),
        success: function(data) {
          resolve(JSON.parse(data).size);
        },
        error: reject,
      });
    });
  },
  create_new_node: function(data) {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        url: window.Urls.create_new_node(),
        data: JSON.stringify(data),
        success: function(data) {
          var new_node = new ContentNodeModel(JSON.parse(data));
          self.add(new_node);
          resolve(new_node);
        },
        error: reject,
      });
    });
  },
  has_all_data: function() {
    return this.every(function(node) {
      var files_objects = _.every(node.get('files'), function(file) {
        return typeof file == 'object';
      });
      var ai_objects = _.every(node.get('assessment_items'), function(ai) {
        return typeof ai == 'object';
      });
      return files_objects && ai_objects;
    });
  },
  get_all_fetch: function(ids, force_fetch) {
    return this.get_fetch_nodes(ids, window.Urls.get_nodes_by_ids, force_fetch);
  },
  get_all_fetch_simplified: function(ids, force_fetch) {
    return this.get_fetch_nodes(ids, window.Urls.get_nodes_by_ids_simplified, force_fetch);
  },
  fetch_nodes_by_ids_complete: function(ids, force_fetch) {
    return this.get_fetch_nodes(ids, window.Urls.get_nodes_by_ids_complete, force_fetch);
  },
  get_fetch_nodes: function(ids, url, force_fetch) {
    force_fetch = force_fetch ? true : false;
    var self = this;
    return new Promise(function(resolve) {
      var idlists = _.partition(ids, function(id) {
        return force_fetch || !self.get({ id: id });
      });
      var returnCollection = new ContentNodeCollection(
        self.filter(function(n) {
          return idlists[1].indexOf(n.id) >= 0;
        })
      );
      fetch_nodes(idlists[0], url).then(function(fetched) {
        returnCollection.add(fetched.toJSON());
        self.add(fetched.toJSON());
        self.sort();
        resolve(returnCollection);
      });
    });
  },
  comparator: function(node) {
    return node.get('sort_order');
  },
  sort_by_order: function() {
    this.sort();
    this.highest_sort_order = this.length > 0 ? this.at(this.length - 1).get('sort_order') : 1;
  },
  duplicate: function(target_parent) {
    const State = require('./state');
    var self = this;
    return new Promise(function(resolve, reject) {
      var sort_order = target_parent ? target_parent.get('metadata').max_sort_order + 1 : 1;
      var parent_id = target_parent.get('id');

      var data = {
        node_ids: self.models.map(node => node.id),
        sort_order: sort_order,
        target_parent: parent_id,
        channel_id: State.current_channel.id,
      };
      $.ajax({
        method: 'POST',
        url: window.Urls.duplicate_nodes(),
        data: JSON.stringify(data),
        success: function(data) {
          resolve(State.Store.dispatch('startTask', data));
        },
        error: reject,
      });
    });
  },
  move: function(target_parent, max_order, min_order) {
    const State = require('./state');
    var self = this;
    return new Promise(function(resolve, reject) {
      var data = {
        nodes: self.toJSON(),
        target_parent: target_parent.get('id'),
        channel_id: State.current_channel.id,
        max_order: max_order,
        min_order: min_order,
      };
      $.ajax({
        method: 'POST',
        url: window.Urls.move_nodes(),
        data: JSON.stringify(data),
        error: reject,
        success: function(moved) {
          resolve(new ContentNodeCollection(JSON.parse(moved)));
        },
      });
    });
  },
  delete: function() {
    const State = require('./state');
    var self = this;
    return new Promise(function(resolve, reject) {
      var data = {
        nodes: self.pluck('id'),
        channel_id: State.current_channel.id,
      };
      $.ajax({
        method: 'POST',
        url: window.Urls.delete_nodes(),
        data: JSON.stringify(data),
        success: resolve,
        error: reject,
      });
    });
  },
  sync_nodes: function(models) {
    const State = require('./state');
    return new Promise(function(resolve, reject) {
      var data = { nodes: _.pluck(models, 'id'), channel_id: State.current_channel.id };
      $.ajax({
        method: 'POST',
        url: window.Urls.sync_nodes(),
        data: JSON.stringify(data),
        error: reject,
        success: function(synced) {
          resolve(new ContentNodeCollection(JSON.parse(synced)));
        },
      });
    });
  },
});

var ChannelModel = BaseModel.extend({
  //idAttribute: "channel_id",
  root_list: 'channel-list',
  defaults: {
    name: '',
    description: '',
    thumbnail_url: '/static/img/kolibri_placeholder.png',
    count: 0,
    size: 0,
    published: false,
    view_only: false,
    viewers: [],
    modified: new Date(),
  },
  model_name: 'ChannelModel',
  get_root: function(tree_name) {
    var root_node = new ContentNodeModel(this.get(tree_name));
    root_node.set({ title: this.get('name') });
    return root_node;
  },
  get_accessible_channel_roots: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.accessible_channels(self.id),
        success: function(data) {
          resolve(new ContentNodeCollection(data));
        },
        error: function(e) {
          reject(e);
        },
      });
    });
  },
  get_node_diff: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_node_diff(self.id),
        success: function(data) {
          var nodes = JSON.parse(data);
          resolve({
            original: new ContentNodeCollection(JSON.parse(nodes.original)),
            changed: new ContentNodeCollection(JSON.parse(nodes.changed)),
          });
        },
        error: reject,
      });
    });
  },
  sync_channel: function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var data = {
        channel_id: self.id,
        attributes: options.attributes,
        tags: options.tags,
        files: options.files,
        assessment_items: options.assessment_items,
        sort: options.sort,
      };
      $.ajax({
        method: 'POST',
        url: window.Urls.sync_channel(),
        data: JSON.stringify(data),
        success: function(data) {
          resolve(new ContentNodeCollection(JSON.parse(data)));
        },
        error: reject,
      });
    });
  },
  activate_channel: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        data: JSON.stringify({ channel_id: self.id }),
        url: window.Urls.activate_channel(),
        success: resolve,
        error: function(error) {
          reject(error.responseText);
        },
      });
    });
  },
  get_staged_diff: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        data: JSON.stringify({ channel_id: self.id }),
        url: window.Urls.get_staged_diff(),
        success: function(data) {
          resolve(JSON.parse(data));
        },
        error: function(error) {
          reject(error.responseText);
        },
      });
    });
  },
  add_editor: function(user_id) {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        data: JSON.stringify({
          channel_id: self.id,
          user_id: user_id,
        }),
        url: window.Urls.make_editor(),
        success: resolve,
        error: function(error) {
          reject(error.responseText);
        },
      });
    });
  },
  remove_editor: function(user_id) {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        data: JSON.stringify({
          channel_id: self.id,
          user_id: user_id,
        }),
        url: window.Urls.remove_editor(),
        success: resolve,
        error: function(error) {
          reject(error.responseText);
        },
      });
    });
  },
  get_channel_counts: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_channel_kind_count(self.id),
        error: reject,
        success: function(data) {
          resolve(JSON.parse(data));
        },
      });
    });
  },
  set_priority: function(priority) {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'POST',
        data: JSON.stringify({
          channel_id: self.id,
          priority: priority,
        }),
        url: window.Urls.set_channel_priority(),
        success: resolve,
        error: function(error) {
          reject(error.responseText);
        },
      });
    });
  },
  fetch_editors: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      $.ajax({
        method: 'GET',
        url: window.Urls.get_editors(self.id),
        success: function(editors) {
          self.set('editors', editors);
          resolve(self);
        },
        error: function(error) {
          reject(error.responseText);
        },
      });
    });
  },
});

var ChannelCollection = BasePageableCollection.extend({
  model: ChannelModel,
  list_name: 'channel-list',
  model_name: 'ChannelCollection',
  url: window.Urls.get_channels(),
});

var TagModel = BaseModel.extend({
  root_list: 'contenttag-list',
  model_name: 'TagModel',
  defaults: {
    tag_name: 'Untagged',
  },
});

var TagCollection = BaseCollection.extend({
  model: TagModel,
  list_name: 'contenttag-list',
  model_name: 'TagCollection',
  get_all_fetch: function(ids) {
    var self = this;
    var fetched_collection = new TagCollection();
    ids.forEach(function(id) {
      var tag = self.get(id);
      if (!tag) {
        tag = new TagModel({ id: id });
        tag.fetch({ async: false });
        if (tag) {
          self.add(tag);
        }
      }
      fetched_collection.add(tag);
    });
    return fetched_collection;
  },
});

/**** MODELS SPECIFIC TO FILE NODES ****/
var FileModel = BaseModel.extend({
  root_list: 'file-list',
  model_name: 'FileModel',
  get_preset: function() {
    return Constants.FormatPresets.find(preset => preset.id === this.get('id'));
  },
  initialize: function() {
    this.set_preset(this.get('preset'), this.get('language'));
  },
  set_preset: function(preset, language) {
    if (preset && language && !preset.id.endsWith('_' + language.id)) {
      var preset_data = preset;
      preset_data.name = preset_data.id;
      preset_data.id = preset_data.id + '_' + language.id;
      preset_data.readable_name = language.readable_name;
      this.set('preset', preset_data);
    }
  },
});

var FileCollection = BaseCollection.extend({
  model: FileModel,
  list_name: 'file-list',
  model_name: 'FileCollection',
  get_or_fetch: function(data) {
    var newCollection = new FileCollection();
    newCollection.fetch({
      traditional: true,
      data: data,
    });
    var file = newCollection.findWhere(data);
    return file;
  },
  save: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      Backbone.sync('update', self, {
        url: self.model.prototype.urlRoot(),
        success: function(data) {
          resolve(new FileCollection(data));
        },
        error: reject,
      });
    });
  },
});

var FormatPresetModel = BaseModel.extend({
  root_list: 'formatpreset-list',
  attached_format: null,
  model_name: 'FormatPresetModel',
});

var FormatPresetCollection = BaseCollection.extend({
  model: FormatPresetModel,
  list_name: 'formatpreset-list',
  model_name: 'FormatPresetCollection',
  comparator: function(preset) {
    return [preset.get('order'), preset.get('readable_name')];
  },
});

/**** PRESETS AUTOMATICALLY GENERATED UPON FIRST USE ****/
var FileFormatModel = Backbone.Model.extend({
  root_list: 'fileformat-list',
  model_name: 'FileFormatModel',
  defaults: {
    extension: 'invalid',
  },
});

var FileFormatCollection = BaseCollection.extend({
  model: FileFormatModel,
  list_name: 'fileformat-list',
  model_name: 'FileFormatCollection',
});

var LicenseModel = BaseModel.extend({
  root_list: 'license-list',
  model_name: 'LicenseModel',
  defaults: {
    license_name: 'Unlicensed',
    exists: false,
  },
});

var LicenseCollection = BaseCollection.extend({
  model: LicenseModel,
  list_name: 'license-list',
  model_name: 'LicenseCollection',

  get_default: function() {
    return this.findWhere({ license_name: 'CC-BY' });
  },
  comparator: function(license) {
    return license.id;
  },
});

var LanguageModel = BaseModel.extend({
  root_list: 'language-list',
  model_name: 'LanguageModel',
});

var LanguageCollection = BaseCollection.extend({
  model: LanguageModel,
  list_name: 'language-list',
  model_name: 'LanguageCollection',
  comparator: function(language) {
    return language.readable_name;
  },
});

var ContentKindModel = BaseModel.extend({
  root_list: 'contentkind-list',
  model_name: 'ContentKindModel',
  defaults: {
    kind: 'topic',
  },
  get_presets: function() {
    Constants.FormatPresets.filter(preset => preset.kind_id === this.get('kind'));
  },
});

var ContentKindCollection = BaseCollection.extend({
  model: ContentKindModel,
  list_name: 'contentkind-list',
  model_name: 'ContentKindCollection',
  get_default: function() {
    return this.findWhere({ kind: 'topic' });
  },
});

var ExerciseModel = BaseModel.extend({
  root_list: 'exercise-list',
  model_name: 'ExerciseModel',
});

var ExerciseCollection = BaseCollection.extend({
  model: ExerciseModel,
  list_name: 'exercise-list',
  model_name: 'ExerciseCollection',
});

var ExerciseItemCollection = Backbone.Collection.extend({
  comparator: function(item) {
    return item.get('order');
  },
});

var AssessmentItemModel = BaseModel.extend({
  root_list: 'assessmentitem-list',
  model_name: 'AssessmentItemModel',
  defaults: {
    type: 'single_selection',
    question: '',
    answers: '[]',
    hints: '[]',
    files: [],
  },

  initialize: function() {
    if (typeof this.get('answers') !== 'object') {
      this.set('answers', new ExerciseItemCollection(JSON.parse(this.get('answers'))), {
        silent: true,
      });
    }
    if (typeof this.get('hints') !== 'object') {
      this.set('hints', new ExerciseItemCollection(JSON.parse(this.get('hints'))), {
        silent: true,
      });
    }
  },

  parse: function(response) {
    if (response !== undefined) {
      if (response.answers) {
        response.answers = new ExerciseItemCollection(JSON.parse(response.answers));
      }
      if (response.hints) {
        response.hints = new ExerciseItemCollection(JSON.parse(response.hints));
      }
    }
    return response;
  },

  toJSON: function() {
    var attributes = _.clone(this.attributes);
    if (typeof attributes.answers !== 'string') {
      // Add answer images to the files list
      attributes.files = _.chain(attributes.answers.models)
        .map(function(item) {
          return item.get('files');
        })
        .flatten()
        .filter(function(item) {
          return item;
        })
        .union(attributes.files)
        .value();
      attributes.answers = JSON.stringify(attributes.answers.toJSON());
    }
    if (typeof attributes.hints !== 'string') {
      // Add hint images to the files list
      attributes.files = _.chain(attributes.hints.models)
        .map(function(item) {
          return item.get('files');
        })
        .flatten()
        .filter(function(item) {
          return item;
        })
        .union(attributes.files)
        .value();
      attributes.hints = JSON.stringify(attributes.hints.toJSON());
    }
    return attributes;
  },
});

var AssessmentItemCollection = BaseCollection.extend({
  model: AssessmentItemModel,
  model_name: 'AssessmentItemCollection',
  comparator: function(assessment_item) {
    return assessment_item.get('order');
  },
  get_all_fetch: function(ids, force_fetch) {
    force_fetch = force_fetch ? true : false;
    var self = this;
    var promise = new Promise(function(resolve) {
      var promises = [];
      ids.forEach(function(id) {
        promises.push(
          new Promise(function(modelResolve, modelReject) {
            var model = self.get(id);
            if (force_fetch || !model) {
              model = self.add(id);
              model.fetch({
                success: function(returned) {
                  modelResolve(returned);
                },
                error: function(obj, error) {
                  modelReject(error);
                },
              });
            } else {
              modelResolve(model);
            }
          })
        );
      });
      Promise.all(promises).then(function(fetchedModels) {
        var to_fetch = self.clone();
        to_fetch.reset();
        fetchedModels.forEach(function(entry) {
          to_fetch.add(entry);
        });
        resolve(to_fetch);
      });
    });
    return promise;
  },
  save: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      Backbone.sync('update', self, {
        url: self.model.prototype.urlRoot(),
        success: function(data) {
          resolve(new AssessmentItemCollection(data));
        },
        error: function(error) {
          reject(error);
        },
      });
    });
  },
});

module.exports = {
  fetch_nodes_by_ids: fetch_nodes_by_ids,
  ContentNodeModel: ContentNodeModel,
  ContentNodeCollection: ContentNodeCollection,
  ChannelModel: ChannelModel,
  ChannelCollection: ChannelCollection,
  TagModel: TagModel,
  TagCollection: TagCollection,
  FileFormatCollection: FileFormatCollection,
  LicenseCollection: LicenseCollection,
  FileCollection: FileCollection,
  FileModel: FileModel,
  FormatPresetModel: FormatPresetModel,
  FormatPresetCollection: FormatPresetCollection,
  LanguageModel: LanguageModel,
  LanguageCollection: LanguageCollection,
  ContentKindModel: ContentKindModel,
  ContentKindCollection: ContentKindCollection,
  UserModel: UserModel,
  UserCollection: UserCollection,
  InvitationModel: InvitationModel,
  InvitationCollection: InvitationCollection,
  ExerciseModel: ExerciseModel,
  ExerciseCollection: ExerciseCollection,
  AssessmentItemModel: AssessmentItemModel,
  AssessmentItemCollection: AssessmentItemCollection,
  ChannelSetModel: ChannelSetModel,
  ChannelSetCollection: ChannelSetCollection,
};
