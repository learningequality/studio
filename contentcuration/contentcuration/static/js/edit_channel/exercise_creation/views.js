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

var FileUploadView = Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, "file_uploaded");
        this.callback = options.callback;
        this.nodeid = options.nodeid;
        this.modal = options.modal;
        this.render();
    },

    template: require("./hbtemplates/file_upload.handlebars"),

    modal_template: require("./hbtemplates/file_upload_modal.handlebars"),

    render: function() {

        if (this.modal) {
            this.$el.html(this.modal_template());
            this.$(".modal-body").append(this.template());
            $("body").append(this.el);
            this.$(".modal").modal({show: true});
            this.$(".modal").on("hide.bs.modal", this.close);
        } else {
            this.$el.html(this.template());
        }

        // TODO parameterize to allow different file uploads depending on initialization.
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            maxFiles: 1,
            clickable: ["#dropzone", ".fileinput-button"],
            acceptedFiles: "image/*",
            url: window.Urls.exercise_image_upload(),
            headers: {"X-CSRFToken": get_cookie("csrftoken"), "Node" : this.nodeid}
        });
        this.dropzone.on("success", this.file_uploaded);

    },

    file_uploaded: function(file) {
        console.log(JSON.parse(file.xhr.response))
        this.callback(JSON.parse(file.xhr.response).filename);
        this.close();
    },

    close: function() {
        if (this.modal) {
            this.$(".modal").modal('hide');
        }
        this.remove();
    }
});

/**
 * Replace local 'media' urls with 'web+local://'.
 * @param {string} Markdown containing image URLs.
 * Should take a string of markdown like:
 * "something![foo](/media/bar/baz)otherthings"
 * and turn it into:
 * "something![foo](web+local://bar/baz)otherthings"
 */
var set_image_urls_for_export = function(text) {
    return text.replace(/(\!\[[^\]]*\]\()(\/storage\/)([^\)]*\))/g, placeholder_text);
};


/**
 * Return all image URLs from Markdown.
 * @param {string} Markdown containing image URLs.
 * Should take a string of markdown like:
 * "something![foo](/media/bar/baz.png)otherthings something![foo](/media/bar/foo.jpg)otherthings"
 * and return:
 * ["/media/bar/baz.png", "/media/bar/foo.jpg"]
 */
var return_image_urls_for_export = function(text) {
    var match, output = [];
    var Re = /\!\[[^\]]*\]\((\/storage\/[^\)]*)\)/g;
    while (match = Re.exec(text)) {
        output.push(match[1]);
    }
    return output;
};

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
    return parsed;
};


/**
 * Return all image URLs from an assessment item.
 * @param {object} Backbone Model.
 * Should take a model with a "question" attribute that is a string of Markdown,
 * and an "answers" attribute that is a Backbone Collection, with each
 * model having an "answer" attribute that is also a string of markdown
 * and return all the image URLs embedded inside all the Markdown texts.
 */
var return_all_assessment_item_image_urls = function(model) {
    var output = return_image_urls_for_export(model.get("question"));
    var output = model.get("answers").reduce(function(memo, model) {
        memo = memo.concat(return_image_urls_for_export(model.get("answer")));
        return memo;
    }, output);

    output = _.map(output, function(item) {
        return {
            name: item.replace(/\/storage\//g, ""),
            path: item
        }
    });
    return output;
}

var slugify = function(text) {
    // https://gist.github.com/mathewbyrne/1280286
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
    }


var exerciseSaveDispatcher = _.clone(Backbone.Events);

var ExerciseView = BaseViews.BaseEditableListView.extend({
    list_selector:"#exercise_list",
    default_item:"#exercise_list .default-item",

    initialize: function(options) {
        _.bindAll(this, "save", "createexercise", 'toggle_answers','add_assessment_item');
        this.bind_edit_functions();
        this.parentnode = options.parentnode;
        this.onclose = options.onclose;
        this.onsave = options.onsave;
        this.listenTo(this.collection, "remove", this.render);
        this.listenTo(exerciseSaveDispatcher, "save", this.save);
        this.collection = new Models.AssessmentItemCollection();
        var self = this;
        this.collection.get_all_fetch(this.model.get("assessment_items")).then(function(fetched){
            this.collection = fetched;
            self.render();
        });
    },

    events: {
        "click .addquestion": "add_assessment_item",
        "click .save": "save",
        "click .download": "download",
        "click #createexercise": "createexercise",
        "change #exercise_show_answers" : "toggle_answers",
    },
    validate:function(){

    },
    toggle_answers:function(){
        console.log("TOGGLING")
        this.$(this.list_selector).toggleClass("hide_answers");
    },
    save: function() {
        console.log("SAVING")
        // this.model.save();
        // this.collection.save();
    },
    template: require("./hbtemplates/exercise_edit.handlebars"),

    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON()
        }));
        this.load_content(this.collection, "Click '+ QUESTION' to begin...");
    },
    create_new_view:function(model){
        var new_exercise_item = new AssessmentItemView({
            model: model,
            containing_list_view : this,
            nodeid:this.model.get("id")
        });
        this.views.push(new_exercise_item);
        return new_exercise_item;
    },

    add_assessment_item: function() {
        var model_data = {
            contentnode: this.model.get("id"),
            order: this.collection.length + 1
        };
        this.create_new_item(model_data, true, "").then(function(assessment_item){
            assessment_item.toggle_focus();

        });
    },

    set_focus:function(){
        this.views.forEach(function(view){
            view.remove_focus();
        })
    },
    createexercise:function(){
        var self = this;
        this.model.set({
            parent: (this.parentnode)? this.parentnode.get("id") : this.model.get("parent"),
            extra_fields:JSON.stringify({
                mastery_model:$("#mastery_model_select").val(),
                randomize:$("#randomize_exercise").is(":checked")
            })
        });
        this.model.save(this.model.toJSON(), {
            success:function(new_model){
                var new_collection = new Models.ContentNodeCollection(self.model);
                self.onsave(new_collection);
                self.onclose();
            }
        });
    },
    check_for_changes:function(){
        var is_changed = false;
        this.views.forEach(function(view){
            is_changed = is_changed || view.undo;
        });
        return is_changed;
    }
});

var EditorView = Backbone.View.extend({

    tagName: "div",

    initialize: function(options) {
        _.bindAll(this, "return_markdown", "add_image", "deactivate_editor", "activate_editor", "save_and_close", "save", "render");
        this.edit_key = options.edit_key;
        this.editing = false;
        this.render();
        this.listenTo(this.model, "change:" + this.edit_key, this.render);
        this.nodeid = options.nodeid;
    },

    events: {
        "click .ql-image": "add_image_popup"
    },

    add_image_popup: function() {
        var view = new FileUploadView({callback: this.add_image, modal: true, nodeid: this.nodeid});
    },

    add_image: function(filename) {
        this.editor.insertEmbed(this.editor.getSelection() !== null ? this.editor.getSelection().start : this.editor.getLength(), "image", "/" + filename);
        this.save();
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

    parse_content:function(content){
        parsed = replace_image_paths(this.model.get(this.edit_key));
        parsed = Katex.renderToString(parsed);
        return parsed;
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
            theme: 'snow',
            styles: {
                'body': {
                  'background-color': "white",
                  'padding': "10px",
                }
            }
        });
        this.render_editor();
        this.editor.on("text-change", _.debounce(this.save, 500));
        this.editing = true;
        this.editor.focus();
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
        this.model.set(this.edit_key, this.return_markdown());
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
    add_el_wrapper: null,
    default_attributes: {},

    add_item: function() {
        this.set_focus();
        this.collection.add(this.default_attributes);
    },
    add_item_view: function(model) {
        var view = this.create_new_view(model);
        this.$(this.add_el_wrapper).before(view.el);
        view.set_open();
    },
    set_focus:function(){
        this.views.forEach(function(view){
            view.set_closed();
        });
    },
    validate: function(){
        var isValid = true;
        this.views.forEach(function(view){
            isValid = isValid && view.validate();
        });
        return isValid;
    }
});

var ExerciseEditableItemView =  BaseViews.BaseListEditableItemView.extend({
    close_editors_on_focus: true,
    content_field: null,
    undo: null,
    redo: null,

    toggle_editor: function() {
        this.open = !this.open;
        this.set_editor(true);
    },
    set_open:function(){
        this.containing_list_view.set_focus();
        this.set_toolbar_open();
        this.editor_view.activate_editor();
        if(this.close_editors_on_focus){
            this.containing_list_view.container.toggle_focus();
        }
    },
    set_closed:function(){
        this.set_toolbar_closed();
        this.editor_view.deactivate_editor();
    },
    toggle:function(event){
        event.stopPropagation();
        this.set_closed();
    },
    set_editor: function(save) {
        if (this.open) {
            this.set_toolbar_open();
            this.editor_view.activate_editor();
        } else {
            this.set_toolbar_closed();
            this.editor_view.deactivate_editor();
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
        // this.model.destroy();
        this.remove();
        console.log("NEED TO BE TEMPORARY UNTIL SAVE!")
    },
    validate: function(){
        console.log(this.model.get(this.content_field))
        return true;
    }
});

var AssessmentItemAnswerView = ExerciseEditableItemView.extend({
    toolbar_el : '.answer-toolbar',
    content_field: 'answer',
    template: require("./hbtemplates/assessment_item_answer.handlebars"),
    closed_toolbar_template: require("./hbtemplates/assessment_item_answer_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_answer_toolbar_open.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "render", "set_editor", "set_open", "toggle");
        this.open = options.open || false;
        this.containing_list_view = options.containing_list_view;
        this.assessment_item = options.assessment_item;
        this.nodeid = options.nodeid;
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
            groupName: this.assessment_item.get("id"),
            allow_toggle: !this.isdisplay
        }));
        if (!this.editor_view) {
            this.editor_view = new EditorView({model: this.model, edit_key: "answer", el: this.$(".answer"), nodeid:this.nodeid});
        } else {
            this.$(".answer").append(this.editor_view.el);
        }
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
    }
});

var AssessmentItemAnswerListView = ExerciseEditableListView.extend({
    list_selector:">.answer_list",
    default_item:">.answer_list .default-item",
    template: require("./hbtemplates/assessment_item_answer_list.handlebars"),
    add_el_wrapper: ".addanswer",
    default_attributes: {answer: "", correct: false},

    initialize: function(options) {
        _.bindAll(this, "render", "add_item", "add_item_view");
        this.bind_edit_functions();
        this.assessment_item = options.assessment_item;
        this.nodeid = options.nodeid;
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
        this.load_content();
    },
    create_new_view: function(model) {
        var view = new AssessmentItemAnswerView({
            model: model,
            containing_list_view:this,
            assessment_item: this.assessment_item,
            nodeid:this.nodeid,
            isdisplay:this.isdisplay
        });
        this.views.push(view);
        return view;
    },
    set_all_correct:function(is_correct){
        this.views.forEach(function(view){
            view.set_correct(is_correct);
        })
    },
    validate: function(){
        var isValid = true;
        if(this.assessment_item.get("type") === "input_question"){
            isValid = this.collection.length >= 0;
        }else if(this.assessment_item.get('type') === 'multiple_selection'){
            isValid = this.collection.length >= 0;
            isValid = isValid && this.collection.where({'correct': true}).length > 0;
        } else if(this.assessment_item.get('type') === 'single_selection'){
            isValid = this.collection.length >= 0;
            isValid = isValid && this.collection.where({'correct': true}).length === 1;
        }
        this.views.forEach(function(view){
            isValid = isValid && view.validate();
        });
        return isValid;
    }
});

var AssessmentItemDisplayView = ExerciseEditableItemView.extend({
    className:"assessment_li",
    toolbar_el : '.toolbar',
    content_field: 'question',
    isdisplay: true,
    initialize: function(options) {
        _.bindAll(this, "update_hints");
        this.nodeid = options.nodeid;
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
        }));
        if (!this.editor_view) {
            this.editor_view = new EditorView({
                model: this.model,
                edit_key: "question",
                nodeid: this.nodeid
            });
        }
        this.$(".question").html(this.editor_view.el);
        if (!this.answer_editor) {
            this.answer_editor = new AssessmentItemAnswerListView({
                collection: this.model.get("answers"),
                container:this,
                assessment_item: this.model,
                nodeid:this.nodeid,
                isdisplay:this.isdisplay,
            });
        }
        this.$(".answers").html(this.answer_editor.el);
        this.answer_editor.validate();
        this.$(".question_type_select").val(this.model.get("type"));
    },
    show_hints:function(event){
        event.stopPropagation();
        this.hint_editor = new HintModalView({
            collection: this.model.get("hints"),
            container: this,
            assessment_item: this.model,
            model: this.model,
            nodeid: this.nodeid,
            onupdate: this.update_hints,
            isdisplay: this.isdisplay
        });
    },
    update_hints:function(){
        console.log("updating hints", this.model.get("hints"))
    }
});

var AssessmentItemView = AssessmentItemDisplayView.extend({
    isdisplay: false,
    initialize: function(options) {
        _.bindAll(this, "set_toolbar_open", "toggle", "set_toolbar_closed", "save",
                "set_undo_redo_listener", "unset_undo_redo_listener", "toggle_focus",
                "toggle_undo_redo", "add_focus", "remove_focus", "update_hints", "set_type");
        this.originalData = this.model.toJSON();
        this.nodeid = options.nodeid;
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
        "change .question_type_select": "set_type"
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
        } else if(new_type === "free_response" && this.model.get("answers").length > 0){
            if(confirm("Switching to free response will remove all answers. Continue?")){
                this.model.set("answers", new Backbone.Collection());
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
        this.add_focus();
    },
    toggle:function(event){
        event.stopPropagation();
        this.remove_focus();
        this.$(".delete").css("display", "none");
        var self = this;
        setTimeout(function(){
            self.$(".delete").css("display", "block")
        }, 1000);
    },
    save: function() {
        this.set_toolbar_closed();
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
           this.add_focus();
        }
    },
    add_focus:function(){
        this.$(".assessment_item").addClass("active");
        this.editor_view.activate_editor();
        this.set_toolbar_open();
        this.set_undo_redo_listener();
    },
    remove_focus:function(){
        this.$(".assessment_item").removeClass("active");
        this.save();
        this.set_closed();
        this.unset_undo_redo_listener();
        if (this.answer_editor) {
            this.answer_editor.set_focus();
        }
    }
});

var AssessmentItemHintView = ExerciseEditableItemView.extend({
    content_field: 'hint',
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
        this.nodeid = options.nodeid;
        this.isdisplay = options.isdisplay;
        this.render();
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
        if (!this.editor_view) {
            this.editor_view = new EditorView({model: this.model, edit_key: "hint", el: this.$(".hint"), nodeid:this.nodeid});
        } else {
            this.$(".hint").append(this.editor_view.el);
        }
    }
});

var AssessmentItemHintListView = ExerciseEditableListView.extend({
    list_selector:">.hint_list",
    default_item:">.hint_list .default-item",
    template: require("./hbtemplates/assessment_item_hint_list.handlebars"),
    add_el_wrapper: ".addhint_wrapper",
    default_attributes: {hint: ""},

    initialize: function(options) {
        _.bindAll(this, "render", "add_item", "add_item_view");
        this.bind_edit_functions();
        this.assessment_item = options.assessment_item;
        this.nodeid = options.nodeid;
        this.isdisplay = options.isdisplay;
        this.render();
        this.container = options.container;
        this.listenTo(this.collection, "add", this.add_item_view);
        this.listenTo(this.collection, "remove", this.render);
    },

    events: {
        "click .addhint": "add_item"
    },
    render: function() {
        this.views = [];
        this.$el.html(this.template({isdisplay: this.isdisplay}));
        this.load_content();
    },
    create_new_view: function(model) {
        var view = new AssessmentItemHintView({
            model: model,
            containing_list_view:this,
            assessment_item: this.assessment_item,
            nodeid:this.nodeid,
            isdisplay: this.isdisplay
        });
        this.views.push(view);
        return view;
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
    template: require("./hbtemplates/assessment_item_hint_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "close_hints");
        this.data = options;
        this.onupdate = options.onupdate;
        this.render();
    },
    close_hints:function(){
        if(!this.data.isdisplay){
            this.onupdate(this.model);
        }
        $('.modal-backdrop').slice(1).remove();
        this.remove();
    },
    render: function() {
        this.$el.html(this.template());
        var question_preview = new HintQuestionDisplayView({
            model: this.data.assessment_item,
            el: this.$(".question_preview")
        });

        var hint_editor = new AssessmentItemHintListView(this.data);
        this.$(".hints").append(hint_editor.el);
        $("body").append(this.el);
        this.$(".hint_modal").modal({show: true});
        this.$(".hint_modal").on("hide.bs.modal", this.close_hints);
    }
});


module.exports = {
    ExerciseView:ExerciseView,
    ExerciseModalView:ExerciseModalView,
    AssessmentItemDisplayView:AssessmentItemDisplayView
}
