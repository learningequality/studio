var _ = require('underscore');
var BaseViews = require('edit_channel/views');
var Models = require('edit_channel/models');
var stringHelper = require('edit_channel/utils/string_helper');
const State = require('edit_channel/state');
const Constants = require('edit_channel/constants/index');
require('sync.less');

var NAMESPACE = 'sync';
var MESSAGES = {
  files: 'Files',
  tags: 'Tags',
  check_changes: 'Checking for changes...',
  sync: 'SYNC',
  details: 'Details',
  sync_header: 'Syncing Content',
  syncing_content: 'Syncing Content...',
  select_fields_prompt:
    'Syncing content will update any imported content with their original source content. Select which fields to sync...',
  details_text: 'Title, description, etc.',
  files_text: 'Replace files with source',
  tags_text: 'Replace tags with source',
  assessment_items: 'Assessment Items',
  assessment_items_text: 'Questions, answers, etc.',
  syncing_items: 'Syncing {data, plural,\n =1 {# item}\n other {# items}}...',
  question_order: 'Question Order',
  randomized: 'Randomized',
  ordered: 'Ordered',
  previewing: 'Previewing {data}',
  previewing_exercise: 'Previewing Exercise',
  questions_field: 'Questions',
  answer_order_changed: 'Answer Order Changed',
  randomized_answers: 'Randomized Answer Order',
  ordered_answers: 'Ordered Answers',
  url: 'Url: ',
  source: 'Source: ',
  field: 'FIELD',
  update: 'UPDATE',
  question_deleted: 'Question Deleted',
  deleted: 'Deleted',
  question_modified: 'Question Modified',
  changed: 'Changed',
  answer: 'Answer',
  hint: 'Hint',
  properties: 'Properties',
  question_added: 'Question Added',
  added: 'Added',
  loading_changes: 'Loading changes...',
  select_item_prompt: 'Select an item to view updates',
  updated_content: 'Updated Content',
  updated_content_text: 'Select content to sync',
  preview_content_text: 'Review changes made to original content',
  preview_exercise: 'Preview this exercise on the source website',
  video_error: 'Your browser does not support the video tag.',
  image_error: 'Image failed to load',
  ans_hint_count:
    '({data, plural,\n =1 {# answer}\n other {# answers}}, {data2, plural,\n =1 {# hint}\n other {# hints}})',
  license: 'License',
  language: 'Language',
  same_as_topic: 'Same as Topic',
};

/*********** MODAL CONTAINER FOR SYNC OPERATION ***********/
var TempSyncModalView = BaseViews.BaseModalView.extend({
  template: require('./hbtemplates/temp_sync_modal.handlebars'),
  modal: true,
  name: NAMESPACE,
  $trs: MESSAGES,

  initialize: function(options) {
    _.bindAll(this, 'init_focus', 'closed_modal');
    this.onsync = options.onsync;
    this.collection = options.collection;
    this.selected_options = {};
    this.render(this.close, {});
    this.$('#temp_sync_modal').on('shown.bs.modal', this.init_focus);
    this.$('.modal').on('hidden.bs.modal', this.closed_modal);
  },
  events: {
    'click .category_check': 'handle_selection',
    'click #sync_content_button': 'sync_content',
    'focus .input-tab-control': 'loop_focus',
  },
  init_focus: function() {
    this.set_indices();
    this.set_initial_focus();
  },
  sync_content: function() {
    var self = this;
    State.current_channel.sync_channel(self.selected_options).then(function(synced) {
      self.onsync(synced);
    });
    this.close();
  },
  get_selected_options: function() {
    this.selected_options.details = this.$('#check_details').is(':checked');
    this.selected_options.files = this.$('#check_files').is(':checked');
    this.selected_options.tags = this.$('#check_tags').is(':checked');
    this.selected_options.assessment_items = this.$('#check_assessment_items').is(':checked');
  },
  handle_selection: function() {
    this.get_selected_options();
    if (
      _.chain(this.selected_options)
        .values()
        .some(function(v) {
          return v;
        })
        .value()
    ) {
      this.$('#sync_content_button').prop('disabled', false);
      this.$('#sync_content_button').removeClass('disabled');
    } else {
      this.$('#sync_content_button').prop('disabled', true);
      this.$('#sync_content_button').addClass('disabled');
    }
  },
});

/*********** MODAL CONTAINER FOR SYNC OPERATION ***********/
var SyncModalView = BaseViews.BaseModalView.extend({
  template: require('./hbtemplates/sync_modal.handlebars'),
  modal: true,
  name: NAMESPACE,
  $trs: MESSAGES,

  initialize: function(options) {
    this.render(this.close, {});
    this.move_view = new SyncView({
      el: this.$('.modal-body'),
      onsync: options.onsync,
      collection: options.collection,
      modal: this,
      model: this.model,
    });
  },
});

/*********** VIEW FOR SYNC OPERATION ***********/
var SyncView = BaseViews.BaseListView.extend({
  template: require('./hbtemplates/sync_dialog.handlebars'),
  onsync: null,
  lists: [],
  name: NAMESPACE,
  $trs: MESSAGES,

  initialize: function(options) {
    _.bindAll(this, 'sync_content');
    this.modal = options.modal;
    this.onsync = options.onsync;
    this.collection = new Models.ContentNodeCollection();
    this.changed_collection = new Models.ContentNodeCollection();
    this.selected_collection = new Models.ContentNodeCollection();
    this.render();
  },
  events: {
    'click #sync_content_button': 'sync_content',
  },
  close_sync: function() {
    this.modal ? this.modal.close() : this.remove();
  },

  /*********** LOADING METHODS ***********/
  render: function() {
    var self = this;
    this.$el.html(
      this.template(null, {
        data: this.get_intl_data(),
      })
    );
    State.current_channel.get_node_diff().then(function(difference) {
      self.collection = difference.original;
      self.changed_collection = difference.changed;

      self.synclist = new SyncList({
        el: self.$('#changed_list_area'),
        collection: self.collection,
        changed: self.changed_collection,
        container: self,
      });
      self.preview = new SyncPreviewView({
        el: self.$('#sync_preview_section'),
        model: null,
        changed: null,
      });
    });
  },

  /*********** SYNCING METHODS ***********/
  sync_content: function() {
    var self = this;
    this.display_load(this.get_translation('syncing_content'), function(resolve, reject) {
      var selected_models = _.chain(self.synclist.views)
        .where({ checked: true })
        .pluck('model')
        .value();
      self.collection
        .sync_nodes(selected_models)
        .then(function(synced) {
          self.onsync(synced);
          self.close_sync();
          resolve(true);
        })
        .catch(reject);
    });
  },
  handle_selection: function() {
    this.selected_collection.reset(
      _.chain(this.synclist.views)
        .where({ checked: true })
        .pluck('model')
        .value()
    );
    if (this.selected_collection.length) {
      this.$('#sync_content_button').prop('disabled', false);
      this.$('#sync_content_button').removeClass('disabled');
      this.$('#sync_status').text(
        this.get_translation('syncing_items', this.selected_collection.length)
      );
    } else {
      this.$('#sync_content_button').prop('disabled', true);
      this.$('#sync_content_button').addClass('disabled');
      this.$('#sync_status').text('');
    }
  },
  set_selected(model, changed) {
    this.preview.set_selected(model, changed);
  },
});

var SyncPreviewView = BaseViews.BaseView.extend({
  template: require('./hbtemplates/sync_preview.handlebars'),
  name: NAMESPACE,
  $trs: MESSAGES,

  initialize: function(options) {
    _.bindAll(this, 'generate_diff_item', 'compare_field', 'render_diff');
    this.changed = options.changed;
    this.loading = false;
    this.previewed_collection = new Models.ContentNodeCollection();
    this.render();
  },
  events: {
    'click .file_subitem': 'load_preview',
    'click .exercise_subitem': 'load_exercise',
  },
  /*********** LOADING METHODS ***********/
  render: function() {
    this.$el.html(
      this.template(
        { loading: this.loading },
        {
          data: this.get_intl_data(),
        }
      )
    );
    this.render_diff();
  },
  render_diff: function() {
    var self = this;
    if (this.model && this.changed) {
      this.previewed_collection
        .fetch_nodes_by_ids_complete([this.model.id, this.changed.id])
        .then(function(fetched) {
          self.set_loading(false);
          self.model = fetched.get(self.model.id);
          self.changed = fetched.get(self.changed.id);
          self.$el.html(
            self.template(
              {
                node: self.model.toJSON(),
                diff_items: self.get_diff(),
              },
              {
                data: self.get_intl_data(),
              }
            )
          );
        });
    }
  },
  set_loading: function(loading) {
    this.loading = loading;
    $('.sync_item_wrapper').prop('disabled', loading);
    loading
      ? $('.sync_item_wrapper').addClass('disabled')
      : $('.sync_item_wrapper').removeClass('disabled');
  },
  load_preview: function(event) {
    var subtitles = [];
    var file = $(event.currentTarget).data('model');
    if (file.preset.subtitle) {
      subtitles.push(file);
      var file_to_parse = $(event.currentTarget).data('current')
        ? this.model.get('files')
        : this.changed.get('files');
      file = _.find(file_to_parse, function(f) {
        return !f.preset.supplementary;
      });
    }
    new SyncPreviewFileView({
      node: this.model,
      model: file,
      subtitles: subtitles,
    });
  },
  load_exercise: function(event) {
    var selected = $(event.currentTarget);
    var exercises = {
      current: selected.data('model')
        ? new Models.AssessmentItemModel(selected.data('model'))
        : null,
      source: selected.data('source')
        ? new Models.AssessmentItemModel(selected.data('source'))
        : null,
    };
    new SyncPreviewExerciseView({ exercises: exercises });
  },
  set_selected: function(selected_item, changed) {
    this.model = selected_item;
    this.changed = changed;
    this.set_loading(true);
    this.render();
  },
  get_diff: function() {
    var diff = [];
    if (this.model && this.changed) {
      diff = this.generate_metadata_diff(); // Get diff on metadata
      diff.push(this.generate_tag_diff()); // Get diff on tags
      diff.push(this.generate_file_diff()); // Get diff on files
      if (this.model.get('kind') == 'exercise') {
        diff.push(this.generate_assessment_item_diff()); // Get diff on assessment items
      }
    }
    return _.reject(diff, function(item) {
      return !item;
    });
  },
  generate_metadata_diff: function() {
    var self = this;
    var fields_to_check = [
      'title',
      'description',
      'license',
      'language',
      'license_description',
      'copyright_holder',
      'author',
      'extra_fields',
      'role_visibility',
    ];
    return _.chain(fields_to_check)
      .filter(function(f) {
        return self.compare_field(f);
      })
      .reduce(function(a, f) {
        return a.concat(self.generate_diff_item(f));
      }, [])
      .value();
  },
  compare_field: function(field) {
    var val1 = this.model.get(field) === '' ? null : this.model.get(field);
    var val2 = this.changed.get(field) === '' ? null : this.changed.get(field);
    return val1 !== val2;
  },
  generate_diff_item: function(field) {
    switch (field) {
      case 'license':
        return {
          field: this.get_translation('license'),
          current: stringHelper.translate(
            Constants.Licenses.find(license => license.id === parseInt(this.model.get(field), 10))
              .license_name
          ),
          source: stringHelper.translate(
            Constants.Licenses.find(license => license.id === parseInt(this.changed.get(field), 10))
              .license_name
          ),
        };
      case 'language':
        var current_lang = this.model.get(field)
          ? Constants.Languages.find(lang => lang.id === this.model.get(field)).native_name
          : this.get_translation('same_as_topic');
        var source_lang = this.changed.get(field)
          ? Constants.Languages.find(lang => lang.id === this.model.get(field)).native_name
          : this.get_translation('same_as_topic');
        return {
          field: this.get_translation('language'),
          current: current_lang.charAt(0).toUpperCase() + current_lang.slice(1),
          source: source_lang.charAt(0).toUpperCase() + source_lang.slice(1),
        };
      case 'extra_fields':
        if (this.model.get('kind') === 'exercise') {
          var current_mastery = this.generate_mastery_model_string(this.model.get('extra_fields'));
          var source_mastery = this.generate_mastery_model_string(this.changed.get('extra_fields'));
          var changes = [];
          if (current_mastery !== source_mastery) {
            changes.push({
              field: this.get_translation('mastery_criteria'),
              current: current_mastery,
              source: source_mastery,
            });
          }
          if (
            this.model.get('extra_fields').randomize !== this.changed.get('extra_fields').randomize
          ) {
            changes.push({
              field: this.get_translation('question_order'),
              current: this.model.get('extra_fields').randomize
                ? this.get_translation('randomized')
                : this.get_translation('ordered'),
              source: this.changed.get('extra_fields').randomize
                ? this.get_translation('randomized')
                : this.get_translation('ordered'),
            });
          }
          return changes;
        }
        return null;
      case 'role_visibility':
        return {
          field: stringHelper.translate(field),
          current: stringHelper.translate(this.model.get(field)),
          source: stringHelper.translate(this.changed.get(field)),
        };
      default:
        return {
          field: stringHelper.translate(field),
          current: this.model.get(field),
          source: this.changed.get(field),
        };
    }
  },
  generate_mastery_model_string: function(criteria) {
    if (criteria.mastery_model === 'm_of_n') {
      return criteria.m + ' of ' + criteria.n;
    }
    return stringHelper.translate(criteria.mastery_model);
  },
  generate_tag_diff: function() {
    var current_tags = _.pluck(this.model.get('tags'), 'tag_name');
    var source_tags = _.pluck(this.changed.get('tags'), 'tag_name');
    if (_.difference(current_tags, source_tags).length) {
      return {
        field: this.get_translation('tags'),
        current: current_tags.join(', '),
        source: source_tags.join(', '),
      };
    }
  },
  generate_file_diff: function() {
    var self = this;
    var current_files = _.reject(this.model.get('files'), function(f) {
      return _.some(self.changed.get('files'), function(c) {
        return (
          c.preset.id === f.preset.id &&
          c.checksum === f.checksum &&
          (f.preset.display || f.preset.subtitle)
        );
      });
    });
    var source_files = _.reject(this.changed.get('files'), function(f) {
      return _.some(self.model.get('files'), function(c) {
        return (
          c.preset.id === f.preset.id &&
          c.checksum === f.checksum &&
          (f.preset.display || f.preset.subtitle)
        );
      });
    });
    if (current_files.length || source_files.length) {
      var current_return = _.chain(current_files)
        .filter(function(f) {
          return f.preset.display || f.preset.subtitle;
        })
        .sortBy(function(f) {
          return f.preset.order;
        })
        .value();
      var source_return = _.chain(source_files)
        .filter(function(f) {
          return f.preset.display || f.preset.subtitle;
        })
        .sortBy(function(f) {
          return f.preset.order;
        })
        .value();
      if (current_return.length || source_return.length) {
        return {
          field: this.get_translation('files'),
          current: current_return,
          source: source_return,
          is_file: true,
        };
      }
    }
  },
  generate_assessment_item_diff: function() {
    var self = this;
    var current_questions = _.reject(this.model.get('assessment_items'), function(a) {
      return _.some(self.changed.get('assessment_items'), function(c) {
        return self.compare_assessment_items(a, c);
      });
    });
    var source_questions = _.reject(this.changed.get('assessment_items'), function(a) {
      return _.some(self.model.get('assessment_items'), function(c) {
        return self.compare_assessment_items(a, c);
      });
    });
    if (current_questions.length || source_questions.length) {
      var current_ids = _.pluck(current_questions, 'assessment_id');
      var source_ids = _.pluck(source_questions, 'assessment_id');
      var partition = _.groupBy(current_questions.concat(source_questions), function(q) {
        if (_.contains(source_ids, q.assessment_id) && _.contains(current_ids, q.assessment_id)) {
          return 'changed';
        } else if (_.contains(source_ids, q.assessment_id)) {
          return 'source';
        } else return 'current';
      });
      var common_ids = _.pluck(partition.changed, 'assessment_id');
      partition.changed = _.chain(current_questions)
        .filter(function(q) {
          return _.contains(common_ids, q.assessment_id);
        })
        .map(function(q) {
          return {
            current: q,
            source: _.findWhere(source_questions, { assessment_id: q.assessment_id }),
          };
        })
        .value();
      return {
        field: this.get_translation('questions_field'),
        current: _.map(partition.current, function(q) {
          return self.generate_question_object(q);
        }),
        source: _.map(partition.source, function(q) {
          return self.generate_question_object(q);
        }),
        is_exercise: true,
        changed: _.map(partition.changed, function(q) {
          return self.generate_question_comparison(q.current, q.source);
        }),
      };
    }
  },
  compare_assessment_items: function(ai1, ai2) {
    return (
      this.compare_list_objects(
        [ai1],
        [ai2],
        ['assessment_id', 'question', 'order', 'randomize', 'source_url', 'type']
      ) &&
      this.compare_list_objects(JSON.parse(ai1.answers), JSON.parse(ai2.answers), [
        'answer',
        'correct',
        'order',
      ]) &&
      this.compare_list_objects(JSON.parse(ai1.hints), JSON.parse(ai2.hints), ['hint', 'order']) &&
      this.compare_list_objects(JSON.parse(ai1.raw_data), JSON.parse(ai2.raw_data))
    );
  },
  compare_list_objects: function(list1, list2, fields_to_check) {
    var self = this;
    return (
      list1.length === list2.length &&
      _.every(list1, function(li1) {
        return _.find(list2, function(li2) {
          return _.every(fields_to_check || _.keys(li1), function(f) {
            if (typeof li1[f] === 'object' && typeof li2[f] === 'object') {
              return self.compare_list_objects([].concat(li1[f]), [].concat(li2[f]));
            }
            return li1[f] === li2[f];
          });
        });
      })
    );
  },
  generate_question_object: function(question) {
    var hints = JSON.parse(question.hints) || [];
    var answers = JSON.parse(question.answers) || [];
    return {
      id: question.assessment_id,
      model: question,
      question: question.question || (question.raw_data && 'Perseus Question'),
      answers: answers,
      hints: hints,
      ans_hint_count: this.get_translation('ans_hint_count', answers.length, hints.length),
    };
  },
  generate_question_comparison: function(q1, q2) {
    var question1 = q1.question || (q1.raw_data && 'Perseus Question');
    var question2 = q2.question || (q2.raw_data && 'Perseus Question');

    var a1 = JSON.parse(q1.answers) || [];
    var a2 = JSON.parse(q2.answers) || [];
    var answers1 = _.chain(a1)
      .reject(function(a) {
        return _.some(a2, function(cmp) {
          return _.isEqual(a, cmp);
        });
      })
      .sortBy('order')
      .value();
    var answers2 = _.chain(a2)
      .reject(function(a) {
        return _.some(a1, function(cmp) {
          return _.isEqual(a, cmp);
        });
      })
      .sortBy('order')
      .value();

    var h1 = JSON.parse(q1.hints) || [];
    var h2 = JSON.parse(q2.hints) || [];
    var hints1 = _.chain(h1)
      .reject(function(h) {
        return _.some(h2, function(cmp) {
          return _.isEqual(h, cmp);
        });
      })
      .sortBy('order')
      .value();
    var hints2 = _.chain(h2)
      .reject(function(h) {
        return _.some(h1, function(cmp) {
          return _.isEqual(h, cmp);
        });
      })
      .sortBy('order')
      .value();

    var metadata1 = [];
    var metadata2 = [];
    if (q1.type !== q2.type) {
      metadata1.push(stringHelper.translate(q1.type));
      metadata2.push(stringHelper.translate(q2.type));
    }
    if (q1.order !== q2.order) {
      metadata2.push(this.get_translation('answer_order_changed'));
    }
    if (q1.randomize !== q2.randomize) {
      metadata1.push(
        q1.randomize
          ? this.get_translation('randomized_answers')
          : this.get_translation('ordered_answers')
      );
      metadata2.push(
        q2.randomize
          ? this.get_translation('randomized_answers')
          : this.get_translation('ordered_answers')
      );
    }
    if (q1.source_url !== q2.source_url) {
      metadata1.push(this.get_translation('url') + q1.source_url);
      metadata2.push(this.get_translation('url') + q2.source_url);
    }
    metadata1 = metadata1.join(', ');
    metadata2 = metadata2.join(', ');

    return {
      id: q1.assessment_id,
      model1: q1,
      model2: q2,
      question: {
        current: question1,
        source: question2,
        changed: q1.question !== q2.question || q1.raw_data !== q2.raw_data,
      },
      answers: { current: answers1, source: answers2 },
      hints: { current: hints1, source: hints2 },
      data: { current: metadata1, source: metadata2, changed: metadata1 !== metadata2 },
    };
  },
});

var SyncPreviewModalView = BaseViews.BaseModalView.extend({
  modal: true,
  header: null,
  template: require('./hbtemplates/sync_preview_modal.handlebars'),
  name: NAMESPACE,
  $trs: MESSAGES,
  render: function() {
    this.$el.html(
      this.template(
        { header: this.header() },
        {
          data: this.get_intl_data(),
        }
      )
    );
    $('body').append(this.el);
    this.$('#sync_preview_modal').modal({ show: true });
    this.$('#sync_preview_modal').on('hidden.bs.modal', this.closed_modal);
  },
});

var SyncPreviewFileView = SyncPreviewModalView.extend({
  header: function() {
    return this.get_translation('previewing', this.model.display_name);
  },
  initialize: function(options) {
    _.bindAll(this, 'create_preview');
    this.subtitles = options.subtitles;
    this.node = options.node;
    this.render();
    _.defer(this.create_preview);
  },
  create_preview: function() {
    var previewer = require('edit_channel/preview/views');
    previewer.render_preview(
      this.$('#preview_window'),
      this.model,
      this.subtitles,
      true,
      this.node.get('thumbnail_encoding') && this.node.get('thumbnail_encoding').base64,
      this.get_intl_data()
    );
    if (this.subtitles.length) {
      this.$('#preview_window video').get(0).textTracks[0].mode = 'showing';
    }
  },
});

var SyncPreviewExerciseView = SyncPreviewModalView.extend({
  exercise_template: require('./hbtemplates/sync_exercise.handlebars'),
  header: function() {
    return this.get_translation('previewing_exercise');
  },
  initialize: function(options) {
    _.bindAll(this, 'create_exercise');
    this.exercises = options.exercises;
    this.render();
    _.defer(this.create_exercise);
  },
  create_exercise: function() {
    this.$('#preview_window').html(this.exercise_template({ exercises: this.exercises }));
    var exerciseView = require('edit_channel/exercise_creation/views');
    if (this.exercises.current) {
      this.$('#assessment_item_current').append(
        new exerciseView.AssessmentItemDisplayView({ model: this.exercises.current }).el
      );
    }
    if (this.exercises.source) {
      this.$('#assessment_item_source').append(
        new exerciseView.AssessmentItemDisplayView({ model: this.exercises.source }).el
      );
    }
  },
});

/*********** VIEW FOR SYNC LIST ***********/
var SyncList = BaseViews.BaseListView.extend({
  template: require('./hbtemplates/sync_list.handlebars'),
  default_item: '.sync-list .default-item',
  list_selector: '.sync-list',
  name: NAMESPACE,
  $trs: MESSAGES,
  initialize: function(options) {
    this.container = options.container;
    this.collection = options.collection;
    this.changed = options.changed;
    this.render();
  },
  render: function() {
    this.$el.html(
      this.template(
        { node: this.model },
        {
          data: this.get_intl_data(),
        }
      )
    );
    this.load_content();
  },
  create_new_view: function(model) {
    var new_view = new SyncItem({
      container: this.container,
      containing_list_view: this,
      model: model,
      changed: this.changed.findWhere({ content_id: model.get('content_id') }),
    });
    this.views.push(new_view);
    return new_view;
  },
  set_selected: function(model, changed) {
    this.views.forEach(function(v) {
      v.$el.removeClass('selected');
    });
    this.container.set_selected(model, changed);
  },
});

/*********** ITEM TO SYNC ***********/
var SyncItem = BaseViews.BaseListNodeItemView.extend({
  template: require('./hbtemplates/sync_list_item.handlebars'),
  tagName: 'li',
  className: 'sync_list_item',
  selectedClass: 'sync-selected',
  name: NAMESPACE,
  $trs: MESSAGES,

  id: function() {
    return 'sync_item_' + this.model.get('id');
  },
  initialize: function(options) {
    _.bindAll(this, 'render');
    this.bind_node_functions();
    this.containing_list_view = options.containing_list_view;
    this.changed = options.changed;
    this.container = options.container;
    this.checked = false;
    this.render();
  },
  events: {
    'change .sync_checkbox': 'handle_checked',
    'click .sync_item_wrapper': 'set_selected',
  },
  render: function() {
    this.$el.html(
      this.template(
        {
          node: this.model && this.model.toJSON(),
        },
        {
          data: this.get_intl_data(),
        }
      )
    );
  },
  handle_checked: function(event) {
    event.stopPropagation();
    this.checked = this.$('.sync_checkbox').is(':checked');
    this.container.handle_selection();
  },
  set_selected: function() {
    this.containing_list_view.set_selected(this.model, this.changed);
    this.$el.addClass('selected');
  },
});

module.exports = {
  TempSyncModalView: TempSyncModalView,
  SyncModalView: SyncModalView,
  SyncView: SyncView,
};
