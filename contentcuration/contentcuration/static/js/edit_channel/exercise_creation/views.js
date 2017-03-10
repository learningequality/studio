var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("summernote");
var Dropzone = require("dropzone");
var get_cookie = require("utils/get_cookie");
var UndoManager = require("backbone-undo");
var JSZip = require("jszip");
var fileSaver = require("browser-filesaver");
var JSZipUtils = require("jszip-utils");
var Katex = require("katex");
var domtoimage = require('dom-to-image');

var CHARACTERS = require("./symbols.json");
require("exercises.less");
require("../../../css/summernote.css");
require("dropzone/dist/dropzone.css");
require("../../../css/katex.min.css");
require("../../../css/mathquill.css");
var toMarkdown = require('to-markdown');
var htmlparser = require("html-parser");
require("../../utils/mathquill.min.js");


if (navigator.userAgent.indexOf('Chrome') > -1 || navigator.userAgent.indexOf("Safari") > -1){
    require("mathml.less");
}
var placeholder_text = "${☣ CONTENTSTORAGE}/"
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
            this.close();
        }else{
            event.stopPropagation();
            event.preventDefault();
        }
    }
});

var FileUploadView = BaseViews.BaseModalView.extend({
    modal: true,

    initialize: function(options) {
        _.bindAll(this, "file_uploaded", "file_added", "file_removed", "file_failed", "submit_file", "file_complete", "set_alt_text");
        this.callback = options.callback;
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

var AddFormulaView = BaseViews.BaseModalView.extend({
    modal: true,
    template: require("./hbtemplates/add_formula.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'add_formula', 'add_character', 'add_format');
        this.callback = options.callback;
        this.selector = "mathquill_" + this.cid;
        this.render();
    },
    events: {
        "click #add_formula": "add_formula",
        "click .character_symbol": "add_character",
        "click .char_cmd": "add_format"
    },
    render: function() {
        this.$el.html(this.template({selector: this.selector, characters: CHARACTERS}));
        this.$('[data-toggle="popover"]').popover({html: true, content: this.$("#characters_" + this.selector)});
    },
    add_character:function(event){
        event.stopPropagation();
        this.mathField.write(event.currentTarget.dataset.key);
        this.$('[data-toggle="popover"]').popover("hide");
        this.mathField.focus();
    },
    add_format:function(event){
        event.stopPropagation();
        this.mathField.cmd(event.currentTarget.dataset.key);
        this.$('[data-toggle="popover"]').popover("hide");
        this.mathField.focus();
    },
    activate_mq: function(){
        var mathFieldSpan = document.getElementById(this.selector);
        var MQ = MathQuill.getInterface(2); // for backcompat
        _.each(this.$(".character_format"), function(item, index){
            MQ.StaticMath(this.$("#character_format_" + index)[0]);
        });
        _.each(this.$(".character_eqn"), function(item, index){
            MQ.StaticMath(this.$("#character_eqn_" + index)[0]);
        });
        var self = this;
        this.mathField = MQ.MathField(mathFieldSpan, {
          spaceBehavesLikeTab: true, // configurable
          handlers: {
            enter:function(){
                self.add_formula();
            }
          }
        });

    },
    add_formula:function(){
        if(this.mathField.latex().trim()){

            /* IMPLEMENTATION FOR ADDING FORMULA AS IMAGE */
            // var self = this;
            // this.$(".mq-overlay").css("display", "block");
            // domtoimage.toSvg(this.$(".mq-root-block")[0]).then(function(dataUrl){
                // $.ajax({
                //     method:"POST",
                //     url: window.Urls.exercise_formula_upload(),
                //     data:  JSON.stringify({"formula": dataUrl}),
                //     success: function(data) {
                //         var formula = JSON.parse(data);
                //         self.callback(formula.file_id, formula.filename, self.mathField.latex());
                //         self.$(".mq-overlay").css("display", "none");
                //         self.mathField.latex("");
                //         $(".dropdown").dropdown('toggle');
                //     },
                //     error:function(e){
                //         reject(e);
                //     }
                // });
            // }).catch(function(err){console.log(err)})

            /* IMPLEMENTATION FOR INJECTING MATHJAX */
            this.callback("\t$$" + this.mathField.latex() + "$$\t"); //extra tabs allow for easier cursor navigation
            this.mathField.latex("");
            $(".dropdown").dropdown('toggle');
        }

    }
});


var replace_image_paths = function(content){
    var matches = content.match(regExp);
    if(matches){
        matches.forEach(function(match){
            var filename = match.split("/").slice(-1)[0];
            var replace_str = "/content/storage/" + filename.charAt(0) + "/" + filename.charAt(1) + "/" + filename;
            content = content.replace(match, replace_str);
        })
    }
    return content;
};

var replace_mathjax = function(content){
    var mathJaxRegex = /\$\$(.+)\$\$/g;
    var MQ = MathQuill.getInterface(2); // for backcompat
    var matches = content.match(mathJaxRegex);
    if(matches){
        matches.forEach(function(match){
            content = content.replace(match, Katex.renderToString(match.match(/\$\$(.+)\$\$/)[1]));
        });
    }
    return content;
};

var parse_content = function(content){
    parsed = replace_image_paths(content);
    return replace_mathjax(parsed);
};

var convert_html_to_markdown = function(contents) {
    var updated = toMarkdown(contents,{
        converters: [
            {
                filter: 'img',
                replacement: function (content, node) {
                    var alt = node.alt || '';
                    var src = node.getAttribute('src').split('/').slice(-1)[0] || '';
                    var title = node.title || '';
                    var width = node.style.width || node.width || null;
                    var height = node.style.height || node.height || null;
                    var size = width ? " =" + width.toString().replace('px', '') + "x" : '';
                    size += height ? height.toString().replace('px', '') : '';
                    return src ? '![' + alt + ']' + '(' + placeholder_text + src + size + ')' : ''
                }
            },
            {
                filter: ['em', 'i'],
                replacement: function (content) {
                    return '*' + content + '*'
                }
            },
        ]
    });
    return updated
}

var UploadImage = function (context) {
  var ui = $.summernote.ui;

  // create button
  var button = ui.button({
    contents: '<i class="note-icon-picture"/>',
    tooltip: 'Image',
    click: function () {
        var view = new FileUploadView({callback: context.options.callbacks.onImageUpload});
    }
  });

  return button.render();   // return button as jquery object
}

var AddFormula = function (context) {
    var ui = $.summernote.ui;
    var view = new AddFormulaView({callback: context.options.callbacks.onAddFormula});

    // create button
    var button = ui.buttonGroup([
        ui.button({
          className: 'dropdown-toggle',
          contents: '<span class="glyphicon glyphicon-plus-sign"></span> <span class="caret"></span>',
          tooltip: 'Formula',
          data: {
            toggle: 'dropdown'
          },
          click: function(){
              view.activate_mq();
          }
        }),
        ui.dropdown({
            className: 'drop-default add_formula_dropdown',
            contents: view.el
        })
      ]);

    return button.render();
}


function SummernoteWrapper(element, context, options) {
    this.element = element;
    this.context = context;
    this.element.summernote(options);

    this.insertHTML = function(content){
        element.summernote('code', content);
    };
    this.focus = function(){
        element.summernote('focus');
    };
}

var exerciseSaveDispatcher = _.clone(Backbone.Events);

var EditorView = Backbone.View.extend({
    tagName: "div",

    initialize: function(options) {
        _.bindAll(this, "add_image", "add_formula", "deactivate_editor", "activate_editor", "save", "render");
        this.edit_key = options.edit_key;
        this.editing = false;
        this.render();
        this.markdown = this.model.get(this.edit_key);
        this.listenTo(this.model, "change:" + this.edit_key, this.render);
    },

    events: {
        "click .editor-wrapper": "stop_events"
    },
    stop_events:function(event){
        event.stopPropagation();
    },

    add_image: function(file_id, filename, alt_text) {
        this.model.set('files', this.model.get('files')? this.model.get('files').concat(file_id) : [file_id]);
        this.model.set(this.edit_key, this.model.get(this.edit_key) + "![" + alt_text + "](" + filename + ")");
        this.render_editor();
    },
    add_formula:function(formula){
        this.model.set(this.edit_key, this.model.get(this.edit_key) + formula);
        this.render_editor();
        this.editor.focus();
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
        this.editor.insertHTML( this.view_template({content: parse_content(this.model.get(this.edit_key))}));
    },

    activate_editor: function() {
        var selector = this.cid + "_editor";
        this.$el.html(this.edit_template({selector: selector}));
        this.editor = new SummernoteWrapper(this.$("#" + selector), this, {
            toolbar: [
                ['style', ['bold', 'italic', 'underline']],
                ['insert', ['customupload', 'customformula']],
                ['controls', ['undo', 'redo']]
            ],
            buttons: {
                customupload: UploadImage,
                customformula: AddFormula
            },
            placeholder: 'Enter ' + this.edit_key + "...",
            disableResizeEditor: true,
            selector: this.cid,
            callbacks: {
                onChange: _.debounce(this.save, 300),
                onImageUpload: this.add_image,
                onAddFormula: this.add_formula
            }
        });
        $('.dropdown-toggle').dropdown()
        this.editing = true;
        this.render_editor();
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

    save: function(contents, $editable) {
        /*
        * This method can be triggered by a change event firing on the QuillJS
        * instance that we are using. As such, it supplies arguments delta and source.
        * Delta describes the change in the Editor instance, while source defines whether
        * those changes were user initiated or made via the API.
        * Doing this check prevents us from continually rerendering when a non-user source
        * modifies the contents of the editor (i.e. our own code).
        */
        this.setting_model = true;
        this.markdown = convert_html_to_markdown(contents);

        this.model.set(this.edit_key, this.markdown);
    },
    validate: function(){
        this.$(".note-error").css("display", (this.markdown.trim())? "none" : "inline-block");
        return this.markdown;
    }
});

var ExerciseEditableListView = BaseViews.BaseEditableListView.extend({
    template: null,
    additem_el: null,
    get_default_attributes: function(){
        return {};
    },
    get_next_order: function(){
        if(this.collection.length > 0){
            return this.collection.max(function(i){ return i.get('order');}).get('order') + 1
        }
        return 1;
    },
    add_item: function() {
        if(!this.$(this.additem_el).hasClass('disabled')){
            this.$(this.default_item).css('display', 'none');
            this.set_focus();
            this.collection.add(this.get_default_attributes());
            this.propagate_changes();
        }
    },
    remove_item: function(model){
        this.collection.remove(model);
        this.render();
        this.propagate_changes();
    },
    propagate_changes:function(){
        this.validate();
        this.container.propagate_changes();
    },
    add_item_view: function(model) {
        var view = this.create_new_view(model);
        this.$(this.list_selector).append(view.el);
        view.set_open();
    },
    set_focus:function(){
        _.where(this.views, {open: true}).forEach(function(view){
            view.set_closed();
        });
    },
    set_invalid:function(invalid){
        this.$(this.additem_el).prop("disabled", invalid);
        (invalid)? this.$(this.additem_el).addClass("disabled") : this.$(this.additem_el).removeClass("disabled");
        this.$(this.additem_el).prop('title', (invalid)? 'Blank item detected. Resolve to continue': "Add");
    },
    validate:function(){ return true; },
    switch_view_order:function(view, new_order){
        var matches = _.filter(this.views, function(view){ return view.model.get('order') === new_order; });
        var old_order = view.model.get('order');
        if(matches.length > 0){
            var previous_view = matches[0];
            previous_view.model.set('order', old_order);
            previous_view.$el.detach();
            (old_order < new_order)? view.$el.before(previous_view.el) : view.$el.after(previous_view.el);
            if(previous_view.open){
                previous_view.set_open();
            }
            view.model.set('order', new_order);
            this.propagate_changes();
        }
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
        this.containing_list_view.set_focus();
        if(this.close_editors_on_focus){
            this.containing_list_view.container.toggle_focus();
            this.containing_list_view.container.remove_focus();
        }
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
        this.set_closed();
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
    move_up:function(event){
        event.stopPropagation();
        this.containing_list_view.switch_view_order(this, this.model.get('order') - 1);
    },
    move_down:function(event){
        event.stopPropagation();
        this.containing_list_view.switch_view_order(this, this.model.get('order') + 1);
    },
});

var ExerciseView = ExerciseEditableListView.extend({
    additem_el: "#addquestion",
    list_selector:"#exercise_list",
    default_item:"#exercise_list >.default-item",
    template: require("./hbtemplates/exercise_edit.handlebars"),
    get_default_attributes: function() {
        return {
            order: this.get_next_order(),
            contentnode: this.model.get('id')
        };
    },

    initialize: function(options) {
        _.bindAll(this, 'toggle_answers','add_item', "add_item_view");
        this.bind_edit_functions();
        this.parentnode = options.parentnode;
        this.onchange = options.onchange;
        this.onrandom = options.onrandom;
        this.listenTo(this.collection, "remove", this.render);
        this.listenTo(exerciseSaveDispatcher, "save", this.save);
        this.collection = new Models.AssessmentItemCollection(this.model.get("assessment_items"));
        this.render();
        this.listenTo(this.collection, "add", this.add_item_view);
    },
    events: {
        "click #addquestion": "add_item",
        "change #exercise_show_answers" : "toggle_answers",
        'change #randomize_question_order': 'set_random',
    },
    toggle_answers:function(){
        this.$(this.list_selector).toggleClass("hide_answers");
    },
    validate: function(){
        return _.filter(this.views, function(view){return !view.validate();}).length === 0;
    },
    propagate_changes:function(){
        this.onchange(this.collection.toJSON());
    },
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON(),
            is_random: this.model.get('extra_fields').randomize
        }));
        this.load_content(this.collection.where({'deleted': false}), "Click '+ QUESTION' to begin...");
    },
    set_random:function(event){
        this.onrandom(event.target.checked)
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
        if(this.model.get('type') !== "perseus_question"){
            if (!this.answer_editor) {
                this.answer_editor = new AssessmentItemAnswerListView({
                    collection: this.model.get("answers"),
                    container:this,
                    assessment_item: this.model,
                    isdisplay:this.isdisplay
                });
            }
            this.$(".answers").html(this.answer_editor.el);
        }
        this.$(".question_type_select").val(this.model.get("type"));
    },
    show_hints:function(event){
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
                "toggle_undo_redo", "update_hints", "set_type", "set_open");
        this.originalData = this.model.toJSON();
        this.onchange = options.onchange;
        this.question = this.model.get('question');
        this.containing_list_view = options.containing_list_view;
        this.init_undo_redo();
        this.render();
        this.set_toolbar_closed();
        this.validate();
    },
    closed_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_open.handlebars"),

    events: {
        "click .cancel": "cancel",
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
    delete: function(event) {
        event.stopPropagation();
        if(confirm("Are you sure you want to delete this question?")){
            this.model.set('deleted', true);
            this.propagate_changes();
            this.containing_list_view.views.splice(this, 1);
            this.containing_list_view.handle_if_empty();
            this.remove();
        }
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
        this.propagate_changes();
    },
    propagate_changes:function(){
        this.containing_list_view.propagate_changes();
        this.validate();
    },
    toggle:function(event){
        event.stopPropagation();
        this.init_undo_redo();
        this.set_closed()
        this.$(".closed_toolbar").css("display", "none");
        var self = this;
        setTimeout(function(){ self.$(".closed_toolbar").css("display", "block"); }, 1000);
    },
    cancel: function(event) {
        this.undo_manager.undoAll();
        this.render();
        this.toggle(event);
        if(this.answer_editor){
            this.answer_editor.render();
        }
        if(this.hint_editor){
            this.hint_editor.render();
        }
    },
    init_undo_redo:function(){
        this.undo_manager = new UndoManager({
            track: true,
            register: [this.model, this.model.get("answers"), this.model.get("hints")]
        });
        this.toggle_undo_redo();
    },
    toggle_undo_redo: function() {
        var undo = this.undo;
        this.undo = this.undo_manager.isAvailable("undo");
        if (undo !== this.undo) {
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
        this.$(".question").removeClass("unfocused");
        this.set_toolbar_open();
        this.set_undo_redo_listener();
        this.answer_editor.validate();
        if (this.answer_editor) {
            this.answer_editor.set_focus();
        }
    },
    set_closed:function(){
        this.$(".assessment_item").removeClass("active");
        this.set_toolbar_closed();
        this.$(".question").removeClass("unfocused");
        this.editor_view.deactivate_editor();
        this.open = false;
        this.unset_undo_redo_listener();
        if (this.answer_editor) {
            this.answer_editor.set_focus();
        }
    },
    validate:function(){
        this.errors = [];
        if(this.model.get("type") === 'perseus_question'){ // Validation rules don't apply to perseus questions
            return true;
        }

        if(!this.model.get(this.content_field)){
            this.errors.push({error: "Question cannot be blank"})
        }

        if(this.model.get('answers').findWhere({'answer': ""})){
            this.errors.push({error: "Answers cannot be blank"});
        }

        if(this.model.get('hints').findWhere({'hint': ""})){
            this.errors.push({error: "Hints cannot be blank"});
        }

        // Make sure different question types have valid answers
        if(this.model.get("type") === "input_question"){
            if(this.model.get('answers').filter(function(a){ return isNaN(a.get('answer'));}).length > 0){
                this.errors.push({error: "Answers must be numeric"});
            }else if(this.model.get('answers').length === 0){
                this.errors.push({error: "Question must have one or more answers"});
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
    remove_focus:function(){
        this.editor_view.deactivate_editor();
        this.$(".question").addClass("unfocused");
        this.$(".question").on('click', this.set_open);
    }
});

var AssessmentItemAnswerListView = ExerciseEditableListView.extend({
    additem_el: ".addanswer",
    list_selector:">.answer_list",
    default_item:">.answer_list .default-item",
    template: require("./hbtemplates/assessment_item_answer_list.handlebars"),
    get_default_attributes: function() {
        return {order: this.get_next_order(), answer: "", correct: this.assessment_item.get('type') === "input_question"};
    },

    initialize: function(options) {
        _.bindAll(this, "render", "add_item", "add_item_view");
        this.bind_edit_functions();
        this.views = [];
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.container = options.container;
        this.render();
        this.listenTo(this.collection, "add", this.add_item_view);
        this.listenTo(this.collection, "remove", this.render);
    },
    render: function() {
        this.$el.html(this.template({
            input_answer: this.assessment_item.get("type") === "input_question",
            isdisplay: this.isdisplay
        }));
        this.load_content(this.collection, "No answers provided.");
        this.$(".addanswer").on('click', this.add_item);
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
    },
    validate:function(){
        this.set_invalid(this.collection.findWhere({answer: ""}));
    }
});

var AssessmentItemAnswerView = ExerciseEditableItemView.extend({
    className:"answer_li",
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
        'click .item_move_up': 'move_up',
        'click .item_move_down': 'move_down'
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
        this.set_open();
        event.stopPropagation();
        if(this.assessment_item.get("type") === "single_selection"){
            this.containing_list_view.set_all_correct(false);
        }
        this.set_correct(this.$(".correct").prop("checked"));
    },
    set_correct:function(is_correct){
        this.model.set("correct", is_correct);
        this.$(".correct").attr('title', (is_correct)? "Correct" : "Incorrect");
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
        _.bindAll(this, "closing_hints", "show", "closed_hints");
        this.assessment_item = options.assessment_item;
        this.isdisplay = options.isdisplay;
        this.onupdate = options.onupdate;
        this.container = options.container;
        this.render();
    },
    closing_hints:function(){
        this.$(".hint-errors").css('display', 'none');
        this.hint_editor.set_focus();
        if(!this.isdisplay){
            this.onupdate(this.model);
        }
    },
    closed_hints:function(){
        $("body").addClass('modal-open'); //Make sure modal-open class persists
        $('.modal-backdrop').slice(1).remove();
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
        this.$(".hint_modal").on("hidden.bs.modal", this.closed_hints);
    },
    show: function(){
        this.$(".hint_modal").modal({show: true});
    }
});

var AssessmentItemHintListView = ExerciseEditableListView.extend({
    additem_el: ".addhint",
    list_selector:">.hint_list",
    default_item:">.hint_list .default-item",
    template: require("./hbtemplates/assessment_item_hint_list.handlebars"),
    get_default_attributes: function() {
        return {order: this.get_next_order(), hint: ""};
    },
    initialize: function(options) {
        _.bindAll(this, "render", "add_item", "add_item_view");
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
    },
    validate:function(){
        this.set_invalid(this.collection.findWhere({hint: ""}));
    }
});

var AssessmentItemHintView = ExerciseEditableItemView.extend({
    className:"hint_li",
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
        'click .item_move_up': 'move_up',
        'click .item_move_down': 'move_down'
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
