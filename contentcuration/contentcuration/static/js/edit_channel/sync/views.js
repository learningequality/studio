var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("sync.less");

/*********** MODAL CONTAINER FOR MOVE OPERATION ***********/
var SyncModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/sync_modal.handlebars"),
    modal: true,

    initialize: function(options) {
        this.render(this.close, {});
        this.move_view = new SyncView({
            el: this.$(".modal-body"),
            onsync: options.onsync,
            collection : options.collection,
            modal : this,
            model:this.model
        });
    }
});

/*********** VIEW FOR MOVE OPERATION ***********/
var SyncView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/sync_dialog.handlebars"),
    onsync:null,
    lists: [],

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
      "click #sync_content_button" : "sync_content"
    },
    close_sync:function(){
        (this.modal)? this.modal.close() : this.remove();
    },

    /*********** LOADING METHODS ***********/
    render: function() {
        var self = this;
        this.$el.html(this.template());
        window.current_channel.get_node_diff().then(function(difference){
            self.collection = difference.original;
            self.changed_collection = difference.changed;

            self.synclist = new SyncList({
                el: self.$("#changed_list_area"),
                collection: self.collection,
                changed: self.changed_collection,
                container: self
            });
            self.preview = new SyncPreviewView({
                el: self.$("#sync_preview_section"),
                model: null,
                changed: null
            });
        });

    },

    /*********** SYNCING METHODS ***********/
    sync_content:function(){
        var self = this;
        this.display_load("Syncing Content...", function(resolve, reject){
            self.collection.sync().then(function(synced){
                self.onsync(synced);
                self.close_sync();
            }).catch(reject);
        });
    },
    handle_selection: function(){
        this.selected_collection.reset(_.chain(this.synclist.views).where({checked : true}).pluck('model').value());
        if(this.selected_collection.length){
            this.$("#sync_content_button").prop("disabled", false);
            this.$("#sync_content_button").removeClass("disabled");
            this.$("#sync_status").text("Syncing " + this.selected_collection.length + (this.selected_collection.length===1? " item..." : " items..."));
        } else {
            this.$("#sync_content_button").prop("disabled", true);
            this.$("#sync_content_button").addClass("disabled");
            this.$("#sync_status").text("");
        }
    },
    set_selected(model, changed){
        this.preview.set_selected(model, changed);
    }
});

var SyncPreviewView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/sync_preview.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'generate_diff_item', 'compare_field');
        this.changed = options.changed;
        this.render();
    },
    events: {
        'click .file_subitem' : 'load_preview'
    },
    /*********** LOADING METHODS ***********/
    render: function() {
        this.$el.html(this.template({
            'node': this.model && this.model.toJSON(),
            'diff_items': this.get_diff()
        }));
    },
    load_preview: function(event){
        var subtitles = [];
        var file = $(event.target).data('model');
        if(file.preset.subtitle){
            subtitles.push(file);
            var file_to_parse = $(event.target).data('current')? this.model.get('files') : this.changed.get('files');
            file = _.find(file_to_parse, function(f){ return !f.preset.supplementary; });
        }
        new SyncPreviewFileView({
            model: file,
            subtitles: subtitles
        });
    },
    set_selected: function(selected_item, changed){
        this.model = selected_item;
        this.changed = changed;

        this.render();
    },
    get_diff: function(){
        var diff = [];
        if(this.model && this.changed){
            diff = (this.generate_metadata_diff());            // Get diff on metadata
            diff.push(this.generate_tag_diff());                 // Get diff on tags
            diff.push(this.generate_file_diff());                // Get diff on files
            diff.push(this.generate_assessment_item_diff());     // Get diff on assessment items
        }
        console.log(_.reject(diff, function(item) { return !item; }))
        return _.reject(diff, function(item) { return !item; });
    },
    generate_metadata_diff: function(){
        var fields_to_check = ['title', 'description', 'license', 'license_description', 'copyright_holder', 'author', 'extra_fields'];
        return _.chain(fields_to_check).filter(this.compare_field).map(this.generate_diff_item).value();
    },
    compare_field: function(field){
        var val1 = (this.model.get(field)==="")? null : this.model.get(field);
        var val2 = (this.changed.get(field)==="")? null : this.changed.get(field);
        return val1 !== val2;
    },
    generate_diff_item: function(field){
        switch(field){
            case "license":
                return {
                    "field" : "License",
                    "current": window.licenses.get(this.model.get(field)).get('license_name'),
                    "source": window.licenses.get(this.changed.get(field)).get('license_name')
                }
            case "extra_fields":
                if(this.model.get('kind') === 'exercise'){
                    var current_mastery = this.generate_mastery_model_string(this.model.get('extra_fields'));
                    var source_mastery = this.generate_mastery_model_string(this.changed.get('extra_fields'));
                    if(current_mastery !== source_mastery){
                        return {
                            "field" : "Mastery Criteria",
                            "current": current_mastery,
                            "source": source_mastery
                        }
                    }
                }
                return null;
            default:
                return {
                    "field" : this.generate_readable_field_name(field),
                    "current": this.model.get(field),
                    "source": this.changed.get(field)
                }
        }
    },
    generate_readable_field_name: function(field){
        return _.reduce(field.split('_'), function(s, w) { return s + w.charAt(0).toUpperCase() + w.slice(1) + " "; }, "").trim();
    },
    generate_mastery_model_string: function(criteria){
        switch(criteria.mastery_model){
            case 'm_of_n':
                return criteria.m + " of " + criteria.n;
            case 'do_all':
                return '100% Correct';
            default:
                return criteria.mastery_model.charAt(criteria.mastery_model.length - 1) + " in a Row";
        }
    },
    generate_tag_diff: function(){
        var current_tags = _.pluck(this.model.get('tags'), 'tag_name');
        var source_tags = _.pluck(this.changed.get('tags'), 'tag_name');
        if(_.difference(current_tags, source_tags).length){
            return {
                "field": "Tags",
                "current": current_tags.join(', '),
                "source": source_tags.join(', ')
            }
        }
    },
    generate_file_diff: function(){
        var self = this;
        var current_files = _.reject(this.model.get('files'), function(f) {
            return _.some(self.changed.get('files'), function(c){ return c.preset.id === f.preset.id && c.checksum === f.checksum});
        });
        var source_files = _.reject(this.changed.get('files'), function(f) {
            return _.some(self.model.get('files'), function(c){ return c.preset.id === f.preset.id && c.checksum === f.checksum});
        });

        if(current_files.length || source_files.length){
            return {
                "field": "Files",
                "current": _.sortBy(current_files, function(f) {return f.preset.order;}),
                "source": _.sortBy(source_files, function(f) {return f.preset.order;}),
                "is_file": true
            }
        }
    },
    generate_assessment_item_diff: function(){
        var self = this;
        var current_questions = _.reject(this.model.get('assessment_items'), function(a) {
            return _.some(self.changed.get('assessment_items'), function(c){ return self.compare_assessment_items(a, c); });
        });
        var source_questions = _.reject(this.changed.get('assessment_items'), function(a) {
            return _.some(self.model.get('assessment_items'), function(c){ return self.compare_assessment_items(a, c); });
        });

        if(current_questions.length || source_questions.length){
            var current_ids = _.pluck(current_questions, 'assessment_id');
            var source_ids = _.pluck(source_questions, 'assessment_id');
            var partition = _.groupBy(current_questions.concat(source_questions), function(q){
                if(_.contains(source_ids, q.assessment_id) && _.contains(current_ids, q.assessment_id)){ return "changed"; }
                else if (_.contains(source_ids, q.assessment_id)){ return "source"; }
                else return "current";
            });

            var common_ids = _.pluck(partition.changed, 'assessment_id');
            partition.changed = _.chain(current_questions).filter(function(q){return _.contains(common_ids, q.assessment_id);})
                    .map(function(q){return {'current': q, 'source': _.findWhere(source_questions, {'assessment_id': q.assessment_id})};}).value();
            console.log(partition)

            return {
                "field": "Questions",
                "current": _.map(partition.current, function(q) { return self.generate_question_object(q); }),
                "source": _.map(partition.source, function(q) { return self.generate_question_object(q); }),
                "is_exercise": true,
                "changed" :_.map(partition.changed, function(q) { return self.generate_question_comparison(q.current, q.source); })
            }
        }
    },
    compare_assessment_items: function(ai1, ai2){
        var self = this;
        var fields_to_check = ['assessment_id', 'question', 'answers', 'hints', 'order', 'randomize', 'raw_data', 'source_url', 'type'];
        return _.reject(fields_to_check, function(f){ return ai1[f] === ai2[f]; }).length === 0;
    },
    generate_question_object: function(question){
        return {
            "id": question.assessment_id,
            "question": question.question || (question.raw_data && "Perseus Question"),
            "answers": JSON.parse(question.answers) || [],
            "hints": JSON.parse(question.hints) || []
        }
    },
    generate_question_comparison: function(q1, q2){
        var question1 = q1.question || (q1.raw_data && "Perseus Question");
        var question2 = q2.question || (q2.raw_data && "Perseus Question");

        var a1 = JSON.parse(q1.answers) || [];
        var a2 = JSON.parse(q2.answers) || [];
        var answers1 = _.chain(a1).reject(function(a){ return _.some(a2, function(cmp){ return _.isEqual(a, cmp); });}).sortBy("order").value();
        var answers2 = _.chain(a2).reject(function(a){return _.some(a1, function(cmp){ return _.isEqual(a, cmp); });}).sortBy("order").value();

        var h1 = JSON.parse(q1.hints) || [];
        var h2 = JSON.parse(q2.hints) || [];
        var hints1 = _.chain(h1).reject(function(h){return _.some(h2, function(cmp){ return _.isEqual(h, cmp);});}).sortBy("order").value();
        var hints2 = _.chain(h2).reject(function(h){return _.some(h1, function(cmp){ return _.isEqual(h, cmp);});}).sortBy("order").value();

        return {
            "id": q1.assessment_id,
            "question": {"current" : question1, "source": question2, "changed" : q1.question!==q2.question || q1.raw_data!==q2.raw_data},
            "answers": {"current": answers1, "source": answers2},
            "hints": {"current": hints1, "source": hints2},
        }
    }
});

var SyncPreviewModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/sync_preview_modal.handlebars"),
    render: function() {
        this.$el.html(this.template({file: this.model}));
        $("body").append(this.el);
        this.$("#sync_preview_modal").modal({show: true});
        this.$("#sync_preview_modal").on("hidden.bs.modal", this.closed_modal);
        _.defer(this.create_preview);
    }
});

var SyncPreviewFileView = SyncPreviewModalView.extend({
    initialize: function(options) {
        _.bindAll(this, 'create_preview');
        this.modal = true;
        this.subtitles = options.subtitles;
        this.render();
    },
    create_preview: function(){
        var previewer = require('edit_channel/preview/views');
        previewer.render_preview(this.$("#preview_window"), this.model, this.subtitles);
        if(this.subtitles.length){
            this.$("#preview_window video").get(0).textTracks[0].mode = "showing";
        }
    }
});


/*********** VIEW FOR SYNC LIST ***********/
var SyncList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/sync_list.handlebars"),
    default_item:".sync-list .default-item",
    list_selector: ".sync-list",
    initialize: function(options) {
        this.container = options.container;
        this.collection = options.collection;
        this.changed = options.changed;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({ node : this.model }));
        this.load_content();
    },
    create_new_view:function(model){
        var new_view = new SyncItem({
            container: this.container,
            containing_list_view : this,
            model : model,
            changed : this.changed.findWhere({'content_id': model.get('content_id')})
        });
        this.views.push(new_view);
        return new_view;
    },
    set_selected: function(model, changed){
        this.views.forEach(function(v){ v.$el.removeClass('selected'); })
        this.container.set_selected(model, changed);
    }
});

/*********** ITEM TO MOVE OR DESTINATION ITEM ***********/
var SyncItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/sync_list_item.handlebars"),
    tagName: "li",
    className: "sync_list_item",
    selectedClass: "sync-selected",

    'id': function() {
        return "sync_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, "render");
        this.bind_node_functions();
        this.containing_list_view = options.containing_list_view;
        this.changed = options.changed;
        this.container = options.container;
        this.checked = false;
        this.render();
    },
    events: {
        'change .sync_checkbox' : 'handle_checked',
        'click .sync_item_wrapper' : 'set_selected'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model && this.model.toJSON(),
            isfolder: this.model && this.model.get("kind") === "topic"
        }));
    },
    handle_checked:function(event){
        event.stopPropagation();
        this.checked = this.$(".sync_checkbox").is(":checked");
        this.container.handle_selection();
    },
    set_selected: function(event){
        this.containing_list_view.set_selected(this.model, this.changed);
        this.$el.addClass('selected');
    }
});

module.exports = {
    SyncModalView: SyncModalView,
    SyncView:SyncView
}
