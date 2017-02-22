var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Quill = require("quilljs");
var Dropzone = require("dropzone");
var get_cookie = require("utils/get_cookie");
var UndoManager = require("backbone-undo");
var JSZip = require("jszip");
var fileSaver = require("browser-filesaver");
var JSZipUtils = require("jszip-utils");
var Katex = require("katex");

require("quilljs/dist/quill.snow.css");
require("exercises.less");

require("dropzone/dist/dropzone.css");
require("../../../css/katex.min.css");

if (navigator.userAgent.indexOf('Chrome') > -1 || navigator.userAgent.indexOf("Safari") > -1){
    require("mathml.less");
}

var placeholder_text = "$1\${☣ CONTENTSTORAGE}/$3"
var regExp = /\${☣ CONTENTSTORAGE}\/([^)]+)/g;

var ExerciseModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/exercise_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "close_exercise_uploader", "close");
        this.render(this.close_exercise_uploader, {});
         this.exercise_view = new ExerciseView({
            el: this.$(".modal-body"),
            container: this,
            model:this.model,
            parentnode:options.parentnode,
            onclose: this.close_exercise_uploader,
            onsave: options.onsave,
        });
    },
    close_exercise_uploader:function(event){
        if(!event || !this.exercise_view.check_for_changes()){
            this.close();
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
        }else if(confirm("Unsaved Metadata Detected! Exiting now will"
            + " undo any new changes. \n\nAre you sure you want to exit?")){
            // this.exercise_view.reset();
            this.close();
        }else{
            event.stopPropagation();
            event.preventDefault();
        }
    }
});

var FileUploadView = BaseViews.BaseModalView.extend({

    initialize: function(options) {
        _.bindAll(this, "file_uploaded", "file_added", "file_removed", "file_failed", "submit_file", "file_complete", "set_alt_text");
        this.callback = options.callback;
        this.modal = options.modal;
        this.file = this.alt_text = null;
        this.render();
    },

    template: require("./hbtemplates/file_upload.handlebars"),
    dropzone_template : require("./hbtemplates/file_upload_dropzone.handlebars"),
    modal_template: require("./hbtemplates/file_upload_modal.handlebars"),

    events: {
        "click #submit_file": "submit_file",
        "change #alt_text_box": "set_alt_text"
    },

    render: function() {
        this.$el.html(this.modal_template());
        $("body").append(this.el);
        this.$(".modal").modal({show: true});
        this.$(".modal").on("hide.bs.modal", this.close);
        this.$(".modal").on("hidden.bs.modal", this.closed_modal);
        this.render_dropzone();
    },
    render_dropzone:function(){
        this.$(".modal-body").html(this.template({file: this.file, alt_text: this.alt_text}));
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            maxFiles: 1,
            clickable: ["#dropzone", "#dropzone_placeholder"],
            acceptedFiles: window.formatpresets.get({id:'exercise_image'}).get('associated_mimetypes').join(','),
            url: window.Urls.exercise_image_upload(),
            thumbnailWidth:null,
            thumbnailHeight:null,
            previewTemplate:this.dropzone_template(),
            previewsContainer: "#dropzone",
            headers: {"X-CSRFToken": get_cookie("csrftoken")}
        });
        this.dropzone.on("success", this.file_uploaded);
        this.dropzone.on("addedfile", this.file_added);
        this.dropzone.on("removedfile", this.file_removed);
        this.dropzone.on("error", this.file_failed);
        this.dropzone.on("queuecomplete", this.file_complete);
    },
    set_alt_text: function(event){
        this.alt_text = event.target.value;
    },
    submit_file:function(){
        this.callback(this.file.file_id, this.file.filename, this.alt_text);
        this.close();
    },
    file_uploaded: function(file) {
        this.file_error = null;
        this.file = JSON.parse(file.xhr.response);
    },
    file_added:function(file){
        this.file_error = "Error uploading file: connection interrupted";
        this.$("#dropzone_placeholder").css("display", "none");
    },
    file_removed:function(){
        this.file_error = null;
        this.file = null;
        this.render_dropzone();
    },
    file_failed:function(data, error){
        this.file_error = error;
    },
    file_complete:function(){
        if(this.file_error){
            alert(this.file_error);
        }
        this.render_dropzone();
    }
});

var replace_image_paths = function(content){
    var matches = content.match(regExp);
    if(matches){
        matches.forEach(function(match){
            var filename = match.split("/").slice(-1)[0]
            var replace_str = "/content/storage/" + filename.charAt(0) + "/" + filename.charAt(1) + "/" + filename;
            content = content.replace(match, replace_str);
        })
    }
    return content;
};

var replace_mathjax = function(content){
    var mathJaxRegex = /\$\$(.+)\$\$/g;
    var matches = content.match(mathJaxRegex);
    if(matches){
        matches.forEach(function(match){
            var replace_str = Katex.renderToString(match.match(/\$\$(.+)\$\$/)[1]);
            content = content.replace(match, replace_str);
        });
    }
    return content;
};

var parse_content = function(content){
    parsed = replace_image_paths(content);
    parsed = replace_mathjax(parsed);
    return parsed.replace(/\\"/g, '"');
};

var exerciseSaveDispatcher = _.clone(Backbone.Events);

var EditorView = Backbone.View.extend({

    tagName: "div",

    initialize: function(options) {
        _.bindAll(this, "return_markdown", "resize_editor_container", "add_image", "deactivate_editor",
            "activate_editor", "save_and_close", "save", "render");
        this.edit_key = options.edit_key;
        this.editing = false;
        this.render();
        this.markdown = this.model.get(this.edit_key);
        this.listenTo(this.model, "change:" + this.edit_key, this.render);
    },

    events: {
        "click .ql-image": "add_image_popup"
    },

    add_image_popup: function() {
        var view = new FileUploadView({callback: this.add_image, modal: true, model: this.model});
    },

    add_image: function(file_id, filename, alt_text) {
        this.model.set('files', this.model.get('files')? this.model.get('files').concat(file_id) : [file_id]);
        // Using insertEmbed will throw an error as the placeholder isn't parsed correctly
        this.editor.insertText(this.editor.getSelection() !== null ? this.editor.getSelection().start : this.editor.getLength(), "![" + alt_text + "](" + filename + ")");
        this.save();
        this.render_editor();
    },

    edit_template: require("./hbtemplates/editor.handlebars"),

    view_template: require("./hbtemplates/editor_view.handlebars"),
    default_template: require("./hbtemplates/editor_view_default.handlebars"),

    render: function() {
        if (this.editing) {
            if (!this.setting_model) {
                /*
                * (rtibbles)
                * The view rerenders on model change. But, the save method below modifies the exact attribute that it is listening to.
                * If we don't stop the rerender, we needlessly reparse the markdown to HTML into the editor.
                * This led to some weird behaviour (due to race conditions) during manual testing, so I stopped it.
                *
                * The only other alternative would be to do the set in the save method with {silent: true} as an option,
                * but other behaviour relies on listening to the model's change events.
                */
                this.render_editor();
            }
        } else {
            this.render_content();
        }
        this.setting_model = false;
    },

    render_content: function() {
        if(this.model.get(this.edit_key)){
            this.$el.html(this.view_template({content: parse_content(this.model.get(this.edit_key))}));
        }else{
            this.$el.html(this.default_template({
                source_url: this.model.get('source_url')
            }));
        }
    },

    render_editor: function() {
        this.editor.setHTML(this.view_template({
            content: parse_content(this.model.get(this.edit_key))
        }));
    },

    activate_editor: function() {
        this.$el.html(this.edit_template({key: this.edit_key}));
        this.editor = new Quill(this.$(".editor")[0], {
            modules: {
                'toolbar': { container: this.$('.editor-toolbar')[0] }
            },
            placeholder: 'Enter ' + this.edit_key + "...",
            theme: 'snow',
            scrollingContainer: 'editor-container',
            styles: {
                'body': {
                  'background-color': "white",
                  'padding': '10px',
                  'min-height': "100px",
                  "overflow": "hidden",
                },
                '.editor-container': {
                    'display': 'block',
                    'clear': 'both',
                    'min-height': "100px",
                    "height": "auto",
                    "width": "100%"
                }
            }
        });
        this.render_editor();
        this.editor.on("text-change", _.debounce(this.save, 500));
        this.editor.on("text-change", _.debounce(this.resize_editor_container, 100));
        this.editing = true;

        var self = this;
        this.$(this.editor.root).ready(function(){
            self.$('.editor iframe').height(self.editor.root.ownerDocument.body.scrollHeight + 20);
            self.$('.editor').height(self.editor.root.ownerDocument.body.scrollHeight);
            self.editor.focus();
        });

    },
    resize_editor_container:function(){
        var height = this.$('.editor iframe').contents().find('.editor-container').height();
        this.$('.editor iframe, .editor').height(height);
    },

    deactivate_editor: function() {
        delete this.editor;
        this.editing = false;
        this.render();
    },

    toggle_editor: function() {
        if (this.editor) {
            this.deactivate_editor();
        } else {
            this.activate_editor();
        }
    },

    save: function(delta, source) {
        /*
        * This method can be triggered by a change event firing on the QuillJS
        * instance that we are using. As such, it supplies arguments delta and source.
        * Delta describes the change in the Editor instance, while source defines whether
        * those changes were user initiated or made via the API.
        * Doing this check prevents us from continually rerendering when a non-user source
        * modifies the contents of the editor (i.e. our own code).
        */
        if (typeof source !== "undefined" && source !== "user") {
            return;
        }
        this.setting_model = true;
        this.markdown = this.return_markdown().trim();
        if(this.validate()){
            this.model.set(this.edit_key, this.markdown);
        }else{
            this.markdown = this.model.get(this.edit_key);
        }
    },
    validate: function(){
        this.$(".quill-error").css("display", (this.markdown)? "none" : "inline-block");
        return this.markdown;
    },

    save_and_close: function() {
        this.save();
        this.deactivate_editor();
    },

    return_html: function() {
        return this.editor.getHTML();
    },

    return_markdown: function() {
        var contents = this.editor.getContents();
        var outputs = [];
        for (var i = 0; i < contents.ops.length; i++) {
            var insert = contents.ops[i].insert;
            var attributes = contents.ops[i].attributes;
            if (typeof attributes !== "undefined") {
                _.each(attributes, function(value, key) {
                    switch (key) {
                        case "bold":
                            if (value) {
                                insert = "**" + insert + "**";
                            }
                            break;
                        case "italic":
                            if (value) {
                                insert = "*" + insert + "*";
                            }
                            break;
                        case "image":
                            if (value && insert === 1) {
                                insert = "![](" + value + ")";
                            }
                            break;
                    }
                })
            }
            outputs.push(insert);
        }
        return outputs.join("");
    }
});

var ExerciseEditableListView = BaseViews.BaseEditableListView.extend({
    template: null,
    get_default_attributes: function(){
        return {};
    },
    add_item: function() {
        this.$(this.default_item).css('display', 'none');
        this.set_focus();
        this.collection.add(this.get_default_attributes());
        this.propagate_changes();
    },
    remove_item: function(model){
        this.collection.remove(model);
        this.render();
        this.propagate_changes();
    },
    propagate_changes:function(){
        this.container.propagate_changes();
    },
    add_item_view: function(model) {
        var view = this.create_new_view(model);
        this.$(this.list_selector).append(view.el);
        view.set_open();
    },
    set_focus:function(){
        this.views.forEach(function(view){
            if(view.open){
                view.validate();
                view.set_closed();
            }
        });
    },
    validate:function(){
        this.views.forEach(function(v){
            v.validate();
        });
    }
});

var ExerciseEditableItemView =  BaseViews.BaseListEditableItemView.extend({
    close_editors_on_focus: true,
    editor_el: null,
    content_field: null,
    undo: null,
    redo: null,
    open: false,
    error_template: require("./hbtemplates/assessment_item_errors.handlebars"),

    render_editor: function(){
        if (!this.editor_view) {
            this.editor_view = new EditorView({model: this.model, edit_key: this.content_field});
        }
        this.$(this.editor_el).html(this.editor_view.el);
        this.listenTo(this.model, "change:" + this.content_field, this.propagate_changes)
    },
    propagate_changes:function(){
        this.containing_list_view.propagate_changes();
    },
    toggle_editor: function() {
        this.open = !this.open;
        this.set_editor(true);
    },
    set_open:function(){
        if(this.close_editors_on_focus){
            this.containing_list_view.container.toggle_focus();
        }
        this.containing_list_view.set_focus();
        this.set_toolbar_open();
        this.editor_view.activate_editor();
        this.open = true;
    },
    set_closed:function(){
        this.set_toolbar_closed();
        this.editor_view.deactivate_editor();
        this.open = false;
    },
    toggle:function(event){
        event.stopPropagation();
        if(this.validate()){
            this.set_closed();
        }
    },
    set_editor: function(save) {
        if (this.open) {
            this.set_toolbar_open();
            this.editor_view.activate_editor();
        } else {
            this.set_closed();
        }
    },
    set_toolbar_open: function() {
        this.$(this.toolbar_el).html(this.open_toolbar_template({model: this.model.attributes, undo: this.undo, redo: this.redo}));
    },

    set_toolbar_closed: function() {
        this.$(this.toolbar_el).html(this.closed_toolbar_template({model: this.model.attributes}));
    },

    delete: function(event) {
        event.stopPropagation();
        this.containing_list_view.remove_item(this.model);
        this.remove();
    },
    validate:function(){
        var isValid = this.model.get(this.content_field);
        if(this.editor_view && this.editor_view.editing){
            isValid = this.editor_view.validate();
        }
        (isValid)? this.$el.removeClass('invalid') : this.$el.addClass('invalid');
        return isValid;
    }
});

var ExerciseView = ExerciseEditableListView.extend({
    list_selector:"#exercise_list",
    default_item:"#exercise_list .default-item",
    template: require("./hbtemplates/exercise_edit.handlebars"),
    get_default_attributes: function() {
        var max_order = 1;
        if(this.collection.length > 0){
            max_order = this.collection.max(function(i){ return i.get('order');}).get('order') + 1
        }
        return {
            order: max_order,
            contentnode: this.model.get('id')
        };
    },

    initialize: function(options) {
        _.bindAll(this, 'toggle_answers','add_item', "add_item_view");
        this.bind_edit_functions();
        this.parentnode = options.parentnode;
        this.onchange = options.onchange;
        this.listenTo(this.collection, "remove", this.render);
        this.listenTo(exerciseSaveDispatcher, "save", this.save);
        this.collection = new Models.AssessmentItemCollection(this.model.get("assessment_items"));
        this.render();
        this.listenTo(this.collection, "add", this.add_item_view);
    },
    events: {
        "click #addquestion": "add_item",
        "change #exercise_show_answers" : "toggle_answers",
    },
    toggle_answers:function(){
        this.$(this.list_selector).toggleClass("hide_answers");
    },
    propagate_changes:function(){
        this.onchange(this.collection.toJSON());
    },
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON()
        }));
        this.load_content(this.collection.where({'deleted': false}), "Click '+ QUESTION' to begin...");
    },
    create_new_view:function(model){
        var new_exercise_item = null;
        if(model.get('type') === "perseus_question"){
            new_exercise_item = new AssessmentItemDisplayView({
                model: model,
                containing_list_view : this
            });
        }else{
            new_exercise_item = new AssessmentItemView({
                model: model,
                containing_list_view : this,
                onchange: this.onchange,
            });
        }
        this.views.push(new_exercise_item);
        return new_exercise_item;
    },
    check_for_changes:function(){
        var is_changed = false;
        this.views.forEach(function(view){
            is_changed = is_changed || view.undo;
        });
        return is_changed;
    },
    validate: function(){
        return _.filter(this.views, function(view){return !view.validate();}).length === 0;
    },
    switch_view_order:function(view, new_order){
        var matches = _.filter(this.views, function(view){ return view.model.get('order') === new_order; });
        if(matches.length > 0){
            var previous_view = matches[0];
            previous_view.model.set('order', view.model.get('order'));
            previous_view.$el.detach();
            (view.model.get('order') < new_order)? view.$el.before(previous_view.el) : view.$el.after(previous_view.el);
            if(previous_view.open){
                previous_view.set_open();
            }
            view.model.set('order', new_order);
            this.propagate_changes();
        }
    }
});

var AssessmentItemDisplayView = ExerciseEditableItemView.extend({
    className:"assessment_li",
    toolbar_el : '.toolbar',
    content_field: 'question',
    editor_el: ".question",
    isdisplay: true,
    initialize: function(options) {
        _.bindAll(this, "update_hints", "show_hints");
        this.render();
    },
    template: require("./hbtemplates/assessment_item_edit.handlebars"),
    events: {
        "click .hint_link": "show_hints"
    },
    render: function() {
        this.$el.html(this.template({
            model: this.model.toJSON(),
            hint_count: this.model.get('hints').length,
            isdisplay:this.isdisplay,
            cid: this.cid
        }));
        this.render_editor();
        if (!this.answer_editor) {
            this.answer_editor = new AssessmentItemAnswerListView({
                collection: this.model.get("answers"),
                container:this,
                assessment_item: this.model,
                isdisplay:this.isdisplay,
            });
        }
        this.$(".answers").html(this.answer_editor.el);
        this.$(".question_type_select").val(this.model.get("type"));
    },
    show_hints:function(event){
        event.stopPropagation();
        if(!this.hint_editor){
            this.hint_editor = new HintModalView({
                collection: this.model.get("hints"),
                container: this,
                assessment_item: this.model,
                model: this.model,
                onupdate: this.update_hints,
                isdisplay: this.isdisplay
            });
        }
        this.hint_editor.show();
    },
    update_hints:function(){
        this.$(".hint_count").text(this.model.get("hints").length);
    }
});

var AssessmentItemView = AssessmentItemDisplayView.extend({
    isdisplay: false,
    errors: [],
    initialize: function(options) {
        _.bindAll(this, "set_toolbar_open", "toggle", "set_toolbar_closed",
                "set_undo_redo_listener", "unset_undo_redo_listener", "toggle_focus",
                "toggle_undo_redo", "update_hints", "set_type");
        this.originalData = this.model.toJSON();
        this.onchange = options.onchange;
        this.question = this.model.get('question');
        this.containing_list_view = options.containing_list_view;
        this.undo_manager = new UndoManager({
            track: true,
            register: [this.model, this.model.get("answers")]
        });
        this.toggle_undo_redo();
        this.render();
        this.set_toolbar_closed();
    },
    closed_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_open.handlebars"),

    events: {
        "click .cancel": "cancel",
        "click .undo": "undo",
        "click .redo": "redo",
        "click .delete": "delete",
        "click .toggle_exercise": "toggle_focus",
        "click .toggle" : "toggle",
        "click .hint_link": "show_hints",
        "change .question_type_select": "set_type",
        'change .random_order_check': 'set_random_order',
        'click .random_answers_order': 'stop_events',
        'click .move_up': 'move_up',
        'click .move_down': 'move_down',
    },
    move_up:function(event){
        event.stopPropagation();
        this.containing_list_view.switch_view_order(this, this.model.get('order') - 1);
    },
    move_down:function(event){
        event.stopPropagation();
        this.containing_list_view.switch_view_order(this, this.model.get('order') + 1);
    },
    delete: function(event) {
        event.stopPropagation();
        this.model.set('deleted', true);
        this.propagate_changes();
        this.remove();
    },
    stop_events:function(event){
        event.stopPropagation();
    },
    set_type:function(event){
        var new_type = event.target.value;
        if(new_type === "true_false"){
            if(this.model.get("answers").length === 0 || confirm("Switching to true or false will remove any current answers. Continue?")){
                new_type = "single_selection";
                var trueFalseCollection = new Backbone.Collection();
                trueFalseCollection.add({answer: "True", correct: true});
                trueFalseCollection.add({answer: "False", correct: false});
                this.model.set("answers", trueFalseCollection);
            }else{
               new_type = this.model.get('type');
            }
        } else if(new_type === "single_selection" && this.model.get("answers").where({'correct': true}).length > 1){
            if(confirm("Switching to single selection will set only one answer as correct. Continue?")){
                var correct_answer_set = false;
                this.model.get('answers').forEach(function(item){
                    if(correct_answer_set){
                        item.set('correct', false);
                    }
                    correct_answer_set = correct_answer_set || item.get('correct');
                });
            }else{
                new_type = this.model.get('type');
            }
        } else if(new_type === "input_question" && this.model.get("answers").where({'correct': false}).length > 0){
            if(confirm("Switching to input answer will set all answers as correct. Continue?")){
                this.model.get('answers').forEach(function(item){
                    item.set('correct', true);
                });
            }else{
               new_type = this.model.get('type');
            }
        }

        this.model.set('type', new_type);
        if(this.answer_editor){
            this.answer_editor.remove();
            this.answer_editor = null;
        }
        this.render();
        this.set_open();
        this.validate();
    },
    toggle:function(event){
        event.stopPropagation();
        if(this.validate()){
            this.set_closed()
            this.$(".closed_toolbar").css("display", "none");
            var self = this;
            setTimeout(function(){
                self.$(".closed_toolbar").css("display", "block")
            }, 1000);
        }
    },
    reset: function(){
        this.undo_manager.undoAll();
    },
    cancel: function(event) {
        this.undo_manager.undoAll();
        this.toggle(event)
    },
    undo: function() {
        this.undo_manager.undo();
    },
    redo: function() {
        this.undo_manager.redo();
    },
    toggle_undo_redo: function() {
        var undo = this.undo;
        var redo = this.redo;
        this.undo = this.undo_manager.isAvailable("undo");
        this.redo = this.undo_manager.isAvailable("redo");
        if (undo !== this.undo || redo !== this.redo) {
            this.set_toolbar_open();
        }
    },
    set_undo_redo_listener: function() {
        this.listenTo(this.undo_manager.stack, "add", this.toggle_undo_redo);
        this.listenTo(this.undo_manager, "all", this.toggle_undo_redo);
    },
    unset_undo_redo_listener: function() {
        this.stopListening(this.undo_manager.stack);
        this.stopListening(this.undo_manager);
    },
    toggle_focus:function(){
        if(!this.$(".assessment_item").hasClass("active")){
           this.containing_list_view.set_focus();
           this.set_open();
        }
    },
    set_open:function(){
        this.open = true;
        this.$(".assessment_item").addClass("active");
        this.editor_view.activate_editor();
        this.set_toolbar_open();
        this.set_undo_redo_listener();
    },
    set_closed:function(){
        this.open = false;
        this.$(".assessment_item").removeClass("active");
        this.set_toolbar_closed();
        this.editor_view.deactivate_editor();
        this.unset_undo_redo_listener();
        if (this.answer_editor) {
            this.answer_editor.set_focus();
        }
    },
    validate:function(){
        if(this.model.get("type") === 'perseus_question'){ // Validation rules don't apply to perseus questions
            return true;
        }
        this.errors = [];
        // Make sure different question types have valid answers
        if(this.model.get("type") === "input_question"){
            if(this.model.get('answers').filter(function(a){ return isNaN(a.get('answer'));}).length > 0){
                this.errors.push({error: "Answers must be numeric"});
            }else if(this.model.get('answers').length === 0){
                this.errors.push({error: "No answers provided"});
            }
        }else if(this.model.get('type') === 'multiple_selection'){
            if(this.model.get('answers').where({'correct': true}).length === 0){
                this.errors.push({error: "Question must have at least one correct answer"});
            }
        } else if(this.model.get('type') === 'single_selection'){
            if(this.model.get('answers').where({'correct': true}).length !== 1){
                this.errors.push({error: "Question must have one correct answer"});
            }
        }
        this.$(".error-list").html(this.error_template({errors: this.errors}));
        return this.errors.length === 0;
    },
    set_random_order:function(event){
        this.model.set("randomize", event.target.checked);
        this.propagate_changes();
    },
});

var AssessmentItemAnswerListView = ExerciseEditableListView.extend({
    list_selector:">.answer_list",
    default_item:">.answer_list .default-item",
    template: require("./hbtemplates/assessment_item_answer_list.handlebars"),
    get_default_attributes: function() {
        return {answer: "", correct: this.assessment_item.get('type') === "input_question"};
    },

    initialize: function(options) {
        _.bindAll(this, "render", "add_item", "add_item_view");
        this.bind_edit_functions();
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.render();
        this.container = options.container;
        this.listenTo(this.collection, "add", this.add_item_view);
        this.listenTo(this.collection, "remove", this.render);
    },

    events: {
        "click .addanswer": "add_item"
    },

    render: function() {
        this.views = [];
        this.$el.html(this.template({
            input_answer: this.assessment_item.get("type") === "input_question"
        }));
        this.load_content(this.collection, "No answers provided.");
        this.validate();
    },
    create_new_view: function(model) {
        var view = new AssessmentItemAnswerView({
            model: model,
            containing_list_view:this,
            assessment_item: this.assessment_item,
            isdisplay:this.isdisplay
        });
        this.views.push(view);
        return view;
    },
    set_all_correct:function(is_correct){
        this.views.forEach(function(view){
            view.set_correct(is_correct);
        })
    }
});

var AssessmentItemAnswerView = ExerciseEditableItemView.extend({
    toolbar_el : '.answer-toolbar',
    editor_el: ".answer",
    content_field: 'answer',
    template: require("./hbtemplates/assessment_item_answer.handlebars"),
    closed_toolbar_template: require("./hbtemplates/assessment_item_answer_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_answer_toolbar_open.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "render", "set_editor", "set_open", "toggle");
        this.open = options.open || false;
        this.containing_list_view = options.containing_list_view;
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.render();
    },

    events: {
        "click .delete": "delete",
        "click .correct": "toggle_correct",
        "click .toggle_answer": "set_open",
        "click .toggle": "toggle"
    },

    render: function() {
        this.$el.html(this.template({
            answer: this.model.toJSON(),
            input_answer: this.assessment_item.get("type") === "input_question",
            single_selection: this.assessment_item.get("type") === "single_selection",
            groupName: this.assessment_item.cid,
            allow_toggle: !this.isdisplay
        }));
        this.render_editor();
        _.defer(this.set_editor);
    },
    toggle_correct: function(event) {
        event.stopPropagation();
        if(this.assessment_item.get("type") === "single_selection"){
            this.containing_list_view.set_all_correct(false);
        }
        this.set_correct(this.$(".correct").prop("checked"));
    },
    set_correct:function(is_correct){
        this.model.set("correct", is_correct);
        this.propagate_changes();
    }
});

var HintQuestionDisplayView = Backbone.View.extend({
    className:"assessment_li",
    initialize: function(options) {
        this.render();
    },
    template: require("./hbtemplates/assessment_item_display.handlebars"),
    render: function() {
        this.$el.html(this.template({model: this.model.toJSON()}));
        var editor_view = new EditorView({
            model: this.model,
            edit_key: "question",
            el: this.$(".question")
        });
    },
});

var HintModalView = BaseViews.BaseModalView.extend({
    error_template: require("./hbtemplates/assessment_item_errors.handlebars"),
    template: require("./hbtemplates/assessment_item_hint_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "closing_hints", "show");
        this.data = options;
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.onupdate = options.onupdate;
        this.container = options.container;
        this.render();
    },
    closing_hints:function(){
        this.$(".hint-errors").css('display', 'none');
        if(!this.isdisplay){
            this.onupdate(this.model);
        }
    },
    render: function() {
        this.$el.html(this.template({isdisplay: this.isdisplay}));
        if(!this.isdisplay){
            var question_preview = new HintQuestionDisplayView({
                model: this.assessment_item,
                el: this.$(".question_preview")
            });
        }
        $("body").append(this.el);
        this.hint_editor = new AssessmentItemHintListView({
            collection: this.model.get("hints"),
            container: this.container,
            assessment_item: this.model,
            model: this.model,
            onupdate: this.onupdate,
            isdisplay: this.isdisplay
        });
        this.$(".hints").append(this.hint_editor.el);
        this.$(".hint_modal").on("hide.bs.modal", this.closing_hints);
    },
    show: function(){
        this.$(".hint_modal").modal({show: true});
    }
});

var AssessmentItemHintListView = ExerciseEditableListView.extend({
    list_selector:">.hint_list",
    default_item:">.hint_list .default-item",
    template: require("./hbtemplates/assessment_item_hint_list.handlebars"),
    get_default_attributes: function() {
        return {hint: ""};
    },

    initialize: function(options) {
        _.bindAll(this, "render", "add_item", "add_item_view", "check_valid");
        this.bind_edit_functions();
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.render();
        this.container = options.container;
        this.listenTo(this.collection, "add", this.add_item_view);
        this.listenTo(this.collection, "sync", this.check_valid);
        this.listenTo(this.collection, "remove", this.render);
    },

    events: {
        "click .addhint": "add_item"
    },
    render: function() {
        this.views = [];
        this.$el.html(this.template({isdisplay: this.isdisplay}));
        this.load_content(this.collection, "No hints provided.");
        if(!this.isdisplay){
            this.validate();
        }
    },
    check_valid: function(){
        if(this.validate()){
            this.$(".hint-errors").css('display', 'none');
        }else{
            this.$(".hint-errors").css('display', 'block');
        }
    },
    create_new_view: function(model) {
        var view = new AssessmentItemHintView({
            model: model,
            containing_list_view:this,
            assessment_item: this.assessment_item,
            isdisplay: this.isdisplay
        });
        this.views.push(view);
        return view;
    }
});

var AssessmentItemHintView = ExerciseEditableItemView.extend({
    content_field: 'hint',
    editor_el: ".hint",
    toolbar_el : '.hint-toolbar',
    template: require("./hbtemplates/assessment_item_hint.handlebars"),
    closed_toolbar_template: require("./hbtemplates/assessment_item_hint_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_hint_toolbar_open.handlebars"),
    close_editors_on_focus: false,

    initialize: function(options) {
        _.bindAll(this, "render", "set_editor", "set_open", "toggle");
        this.open = options.open || false;
        this.containing_list_view = options.containing_list_view;
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.render();
        this.set_toolbar_closed();
    },

    events: {
        "click .delete": "delete",
        "click .hint_toggle": "set_open",
        "click .toggle": "toggle"
    },

    render: function() {
        this.$el.html(this.template({
            hint: this.model.toJSON(),
            allow_toggle: !this.isdisplay
        }));
        this.render_editor();
    }
});


module.exports = {
    ExerciseView:ExerciseView,
    ExerciseModalView:ExerciseModalView,
    AssessmentItemDisplayView:AssessmentItemDisplayView
}
