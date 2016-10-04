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

require("exercises.less");
require("quilljs/dist/quill.snow.css");
require("dropzone/dist/dropzone.css");

var placeholder_text = "$1\${aronsfacehere}/$3"

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

/**
 * Return JSON object in Perseus format.
 * @param {object} Backbone Model - AssessmentItem.
 */
var convert_assessment_item_to_perseus = function(model) {
    var multiplechoice_template = require("./hbtemplates/assessment_item_multiple.handlebars");
    var freeresponse_template = require("./hbtemplates/assessment_item_free.handlebars");
    var output = "";
    var answers = model.get("answers").toJSON();
    answers.forEach(function(answer){
        answer.answer = set_image_urls_for_export(answer.answer);
    });
    switch (model.get("type")) {
        case "free_response":
            output = freeresponse_template(model.attributes);
            break;
        case "multiple_selection":
            output = multiplechoice_template({
                question: set_image_urls_for_export(model.get("question")),
                randomize: true,
                // multipleSelect: (model.get("answers").reduce(function(memo, model) {
                //     if (model.get("correct")) {
                //         memo += 1;
                //     }
                //     return memo;
                //     }, 0) || 0) > 1,
                answer: answers
            });
            break;
        case "single_selection":
            output = multiplechoice_template({
                question: set_image_urls_for_export(model.get("question")),
                randomize: true,
                answer: answers
            });
            break;
        case "input_question":
            output = multiplechoice_template({
                question: set_image_urls_for_export(model.get("question")),
                randomize: true,
                answer: answers
            });
            break;
    }
    console.log("EXERCISE", output);
    return $.parseJSON(output);
};


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
        _.bindAll(this, "save", "createexercise", 'toggle_answers','toggle_details');
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
        "click .multiple_selection": "multiplechoice",
        "click .true_false": "truefalse",
        "click .free_response": "freeresponse",
        "click .single_selection": "singleselection",
        "click .input_answer": "inputanswer",
        "change #exercise_title": "set_title",
        "change #exercise_description": "set_description",
        "click .save": "save",
        "click .download": "download",
        "click #createexercise": "createexercise",
        "change #exercise_show_answers" : "toggle_answers",
        "click .metadata_toggle": "toggle_details"
    },
    toggle_answers:function(){
        this.$(this.list_selector).toggleClass("hide_answers");
    },
    toggle_details:function(){
        if(this.$(".toggler_icon").hasClass("glyphicon-menu-up")){
            this.$(".metadata_toggle .text").text("Fewer Details");
            this.$(".toggler_icon").removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
            this.$("#exercise_extra_metadata").slideDown();
        }else{
            this.$(".metadata_toggle .text").text("More Details");
            this.$(".toggler_icon").removeClass("glyphicon-menu-down").addClass("glyphicon-menu-up");
            this.$("#exercise_extra_metadata").slideUp();
        }
    },
    download: function() {
        var self = this;
        var zip = new JSZip();
        zip.file("exercise.json", JSON.stringify({
            title: this.model.get("title"),
            description: this.model.get("description"),
            all_assessment_items: this.collection.map(function(model){return model.get("id");})
        }));
        zip.file("assessment_items.json", JSON.stringify(this.collection.map(function(model){
            return convert_assessment_item_to_perseus(model);
        })));
        var all_image_urls = this.collection.reduce(function(memo, model){
            memo = memo.concat(return_all_assessment_item_image_urls(model));
            return memo;
        }, []);

        var downloads = 0;

        if (all_image_urls.length > 0) {

            _.each(all_image_urls, function(item) {
                JSZipUtils.getBinaryContent(item.path, function(err, data) {
                    if (err) {
                        throw err
                    }
                    zip.file(item.name, data, {binary: true});
                    downloads += 1;
                    if (downloads === all_image_urls.length) {
                        var blob = zip.generate({type:"blob"});

                        fileSaver.saveAs(blob, slugify(self.model.get("title")) + ".zip");
                    }
                });
        });
        } else {
            var blob = zip.generate({type:"blob"});

            fileSaver.saveAs(blob, slugify(self.model.get("title")) + ".zip");
        }

    },

    save: function() {
        this.model.save();
        this.collection.save();
    },

    set_title: function(){
        this.model.set("title", this.$("#exercise_title").prop("value"));
    },

    set_description: function(){
        this.model.set("description", this.$("#exercise_description").prop("value"));
    },

    template: require("./hbtemplates/exercise_edit.handlebars"),

    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON(),
            show_metadata: this.parentnode
        }));
        this.load_content(this.collection, "Select a question type below");
        if(this.model.get("extra_fields")){
            this.$("#mastery_model_select").val(JSON.parse(this.model.get("extra_fields")).mastery_model)
        }
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

    add_assessment_item: function(type, data) {
        var model_data = {
            type: type,
            contentnode: this.model.get("id"),
            order: this.collection.length + 1,
        };
        if (data) {
            model_data = _.extend(model_data, data);
        }
        this.create_new_item(model_data, true, "").then(function(assessment_item){
            assessment_item.toggle_focus();
        });
    },

    multiplechoice: function() {
        this.add_assessment_item("multiple_selection");
    },

    truefalse: function() {
        this.add_assessment_item("multiple_selection", {
            answers: "[{\"answer\": \"True\", \"correct\": true}, {\"answer\": \"False\", \"correct\": false}]"
        });
    },
    singleselection: function() {
        this.add_assessment_item("single_selection");
    },
    inputanswer: function() {
        this.add_assessment_item("input_question");
    },

    freeresponse: function() {
        this.add_assessment_item("free_response");
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
                exerciseSaveDispatcher.trigger("save");
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
        this.nodeid=options.nodeid;
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
        this.$el.html(this.view_template({content: this.model.get(this.edit_key)}));
    },

    render_editor: function() {
        this.editor.setHTML(this.view_template({content: this.model.get(this.edit_key)}));
    },

    activate_editor: function() {
        this.$el.html(this.edit_template());
        this.editor = new Quill(this.$(".editor")[0], {
            modules: {
                'toolbar': { container: this.$('#toolbar')[0] }
            },
            theme: 'snow',
            styles: {
                'body': {
                  'background-color': "white",
                  'border': '1px #66afe9 solid',
                  'border-radius': "4px",
                  "box-shadow": "inset 0 1px 1px rgba(0,0,0,.075),0 0 8px rgba(102,175,233,.6)"
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

var AssessmentItemAnswerView = Backbone.View.extend({

    initialize: function(options) {
        _.bindAll(this, "render", "set_editor", "set_open", "toggle");
        this.open = options.open || false;
        this.containing_list_view = options.containing_list_view;
        this.assessment_item = options.assessment_item;
        this.nodeid=options.nodeid;
        this.render();
    },

    template: require("./hbtemplates/assessment_item_answer.handlebars"),
    closed_toolbar_template: require("./hbtemplates/assessment_item_answer_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_answer_toolbar_open.handlebars"),

    events: {
        "click .delete": "delete",
        "change .correct": "toggle_correct",
        "click .answer_item": "set_open",
        "click .toggle": "toggle"
    },

    render: function() {
        this.$el.html(this.template({
            answer: this.model.toJSON(),
            input_answer: this.assessment_item.get("type") === "input_question",
            single_selection: this.assessment_item.get("type") === "single_selection"
        }));
        if (!this.editor_view) {
            this.editor_view = new EditorView({model: this.model, edit_key: "answer", el: this.$(".answer"), nodeid:this.nodeid});
        } else {
            this.$(".answer").append(this.editor_view.el);
        }
        _.defer(this.set_editor);
    },

    toggle_editor: function() {
        this.open = !this.open;
        this.set_editor(true);
    },
    set_open:function(){
        this.containing_list_view.set_focus();
        this.set_toolbar_open();
        this.editor_view.activate_editor();
        this.containing_list_view.container.toggle_focus();
    },
    set_closed:function(){
        this.set_toolbar_closed();
        this.editor_view.deactivate_editor();
        exerciseSaveDispatcher.trigger("save");
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
            if (save) {
                // exerciseSaveDispatcher.trigger("save");
            }
        }
    },

    toggle_correct: function() {
        if(this.assessment_item.get("type") === "single_selection"){
            this.containing_list_view.set_all_correct(false);
        }
        this.set_correct(this.$(".correct").prop("checked"));
    },
    set_correct:function(is_correct){
        this.model.set("correct", is_correct);
    },

    set_toolbar_open: function() {
        this.$(".answer-toolbar").html(this.open_toolbar_template());
    },

    set_toolbar_closed: function() {
        this.$(".answer-toolbar").html(this.closed_toolbar_template());
    },

    delete: function(event) {
        event.stopPropagation();
        this.model.destroy();
        // exerciseSaveDispatcher.trigger("save");
        this.remove();
    }
});

var AssessmentItemAnswerListView = BaseViews.BaseEditableListView.extend({

    template: require("./hbtemplates/assessment_item_answer_list.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "render", "add_answer_view");
        this.bind_edit_functions();
        this.assessment_item = options.assessment_item;
        this.nodeid = options.nodeid;
        this.render();
        this.container = options.container;
        this.listenTo(this.collection, "add", this.add_answer_view);
        this.listenTo(this.collection, "remove", this.render);
    },

    events: {
        "click .addanswer": "add_answer"
    },

    render: function() {
        this.views=[];
        this.$el.html(this.template({
            input_answer: this.assessment_item.get("type") === "input_question"
        }));
        for (var i = 0; i < this.collection.length; i++) {
            this.add_answer_view(this.collection.at(i));
        }
    },

    add_answer: function() {
        this.set_focus();
        this.collection.add({answer: "", correct: false});
    },

    add_answer_view: function(model, open) {
        open = open ? true : false;
        var view = new AssessmentItemAnswerView({
            model: model,
            open: open,
            containing_list_view:this,
            assessment_item: this.assessment_item,
            nodeid:this.nodeid
        });
        this.views.push(view);
        this.$(".addanswer").before(view.el);

    },
    set_focus:function(){
        this.views.forEach(function(view){
            view.set_closed();
        });
    },
    set_all_correct:function(is_correct){
        this.views.forEach(function(view){
            view.set_correct(is_correct);
        })
    }
});

var AssessmentItemView = BaseViews.BaseListEditableItemView.extend({
    className:"assessment_li",
    initialize: function(options) {
        _.bindAll(this, "set_toolbar_open", "toggle", "set_toolbar_closed", "save", "set_undo_redo_listener", "unset_undo_redo_listener", "toggle_focus", "toggle_undo_redo", "add_focus", "remove_focus");
        this.number = options.number;
        this.nodeid=options.nodeid;
        this.containing_list_view = options.containing_list_view;
        this.undo_manager = new UndoManager({
            track: true,
            register: [this.model, this.model.get("answers")]
        });
        this.toggle_undo_redo();
        this.render();
    },
    template: require("./hbtemplates/assessment_item_edit.handlebars"),
    closed_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_open.handlebars"),

    events: {
        "click .cancel": "cancel",
        "click .undo": "undo",
        "click .redo": "redo",
        "click .delete": "delete",
        "click .toggle_exercise": "toggle_focus",
        "click .toggle" : "toggle"
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
    delete: function(event) {
        event.stopPropagation();
        this.model.destroy();
        exerciseSaveDispatcher.trigger("save");
        this.remove();
    },

    save: function() {
        exerciseSaveDispatcher.trigger("save");
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

    render: function() {
        this.$el.html(this.template({model: this.model.toJSON()}));
        this.set_toolbar_closed();
        if (this.model.get("type") !== "free_response") {
            if (!this.answer_editor) {
                this.answer_editor = new AssessmentItemAnswerListView({
                    collection: this.model.get("answers"),
                    container:this,
                    assessment_item: this.model,
                    nodeid:this.nodeid
                });
            }
            this.$(".answers").append(this.answer_editor.el);
        }
        if (!this.editor_view) {
            this.editor_view = new EditorView({model: this.model, edit_key: "question", el: this.$(".question"),nodeid:this.nodeid});
        } else {
            this.$(".question").append(this.editor_view.el);
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

    set_toolbar_open: function() {
        this.$(".toolbar").html(this.open_toolbar_template({model: this.model.attributes, undo: this.undo, redo: this.redo}));
    },

    set_toolbar_closed: function() {
        this.$(".toolbar").html(this.closed_toolbar_template({model: this.model.attributes}));
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
        // this.editor_view.save_and_close();
        this.editor_view.deactivate_editor();
        this.save();
        this.set_toolbar_closed();
        this.unset_undo_redo_listener();
        if (this.answer_editor) {
            this.answer_editor.set_focus();
        }
    }
});


module.exports = {
    ExerciseView:ExerciseView,
    ExerciseModalView:ExerciseModalView
}