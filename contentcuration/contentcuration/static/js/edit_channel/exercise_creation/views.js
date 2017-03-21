// Modules
var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var FileUploader = require('edit_channel/file_upload/views');
var get_cookie = require("utils/get_cookie");
var UndoManager = require("backbone-undo");
require("summernote");

// Parsers
var Katex = require("katex");
var toMarkdown = require('to-markdown');
var jax2svg = require('edit_channel/utils/mathjaxtosvg')
jax2svg.initMathJax();

// Stylesheets
require("exercises.less");
require("../../../css/summernote.css");
require("../../../css/katex.min.css");
if (navigator.userAgent.indexOf('Chrome') > -1 || navigator.userAgent.indexOf("Safari") > -1){
    require("mathml.less"); // Windows and Safari don't support mathml natively, so add styling accordingly
}

const CHARACTERS = require("./symbols.json");
const MATHJAX_REGEX = /\$\$([^\$]+)\$\$/g;
const IMG_PLACEHOLDER = "${☣ CONTENTSTORAGE}/"
const IMG_REGEX = /\${☣ CONTENTSTORAGE}\/([^)]+)/g;


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
        "click .char_cmd": "add_format",
        "click .mq-wrapper": "keep_open"
    },
    keep_open:function(event){
        event.stopPropagation();
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
            this.callback("&nbsp;\$\$" + this.mathField.latex() + "\$\$&nbsp;"); //extra tabs allow for easier cursor navigation
            this.mathField.latex("");
            $(".dropdown").dropdown('toggle');
        }

    }
});

var UploadImage = function (context) {
  var ui = $.summernote.ui;

  // create button
  var button = ui.button({
    contents: '<i class="note-icon-picture"/>',
    tooltip: 'Image',
    click: function () {
        var view = new FileUploader.ImageUploadView({
            callback: context.options.callbacks.onImageUpload,
            preset_id: 'exercise_image'
        });
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

    this.setHTML = function(content){
        element.summernote('code', content);
    };
    this.insertHTML = function(content){
        element.summernote('insertNode', content);
    };
    this.focus = function(){
        element.summernote('focus');
    };
    this.getContents = function(){
        return element.summernote('code');
    };
    this.enable = function(){
        element.summernote('enable');
    };
    this.disable = function(){
        element.summernote('disable');
    };
}

var exerciseSaveDispatcher = _.clone(Backbone.Events);

var EditorView = Backbone.View.extend({
    tagName: "div",
    id: function() { return "editor_view_" + this.cid; },

    initialize: function(options) {
        _.bindAll(this, "add_image", "add_formula", "deactivate_editor", "activate_editor", "save",
                "render", "render_content", "parse_content", "replace_mathjax_with_svgs");
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
        alt_text = alt_text || "";
        this.model.set(this.edit_key, this.model.get(this.edit_key) + "![" + alt_text + "](" + filename + ")");
        this.render_editor();
    },
    add_formula:function(formula){
        var self = this;
        jax2svg.toSVG(formula).then(function(svg){
            var updatedHtml = svg.outerHTML;

            // Check if there is any content. If there is, append to the end of the last line
            var div = document.createElement('div');
            div.innerHTML = self.editor.getContents();
            var paragraphs = div.getElementsByTagName('p');
            if(paragraphs.length){
                paragraphs[paragraphs.length - 1].appendChild(svg);
                updatedHtml = div.innerHTML;
            }
            self.editor.setHTML(updatedHtml)
            self.model.set(self.edit_key, self.model.get(self.edit_key) + formula);
            self.editor.focus();
        });
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
            var self = this;
            this.toggle_loading(true);
            this.parse_content(this.model.get(this.edit_key)).then(function(result){
                self.$el.html(self.view_template({content: result}));
                self.toggle_loading(false);
            });
        }else{
            this.$el.html(this.default_template({
                source_url: this.model.get('source_url')
            }));
        }
    },

    render_editor: function() {
        var self = this;
        this.toggle_loading(true);
        this.parse_content(this.model.get(this.edit_key)).then(function(result){
            self.editor.setHTML( self.view_template({content: result}));
            self.toggle_loading(false);
        });
    },
    toggle_loading:function(isLoading){
        if(this.editor && this.editing){
            if(isLoading){
                this.editor.disable();
                this.$('.loading-overlay').css('display', 'block');
            }else{
                this.editor.enable();
                this.$('.loading-overlay').css('display', 'none');
            }
        }
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
            disableDragAndDrop: true,
            shortcuts: false,
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
        this.markdown = this.convert_html_to_markdown(contents);
        this.model.set(this.edit_key, this.markdown);
    },
    validate: function(){
        this.$(".note-error").css("display", (this.markdown.trim())? "none" : "inline-block");
        return this.markdown;
    },
    replace_image_paths: function(content){
        var matches = content.match(IMG_REGEX);
        if(matches){
            matches.forEach(function(match){
                var filename = match.split("/").slice(-1)[0];
                var replace_str = "/content/storage/" + filename.charAt(0) + "/" + filename.charAt(1) + "/" + filename;
                content = content.replace(match, replace_str);
            })
        }
        return content;
    },
    replace_mathjax_with_svgs: function(content, callback){
        var matches = content.match(MATHJAX_REGEX) || [];
        var promises = [];
        matches.forEach(function(match){
            promises.push(jax2svg.toSVG(match));
        });
        Promise.all(promises).then(function(results){
            results.forEach(function(result){
                content = content.replace(result.getAttribute('data-texstring'), '&nbsp;' + result.outerHTML + '&nbsp;');
            });
            callback(content);
        });
    },
    replace_mathjax_with_katex: function(content, callback){
        var matches = content.match(MATHJAX_REGEX) || [];
        matches.forEach(function(match){
            var replace_str = Katex.renderToString(match.match(/\$\$(.+)\$\$/)[1]);
            content = content.replace(match, replace_str);
        });
        callback(content);
    },
    parse_content: function(content){
        var self = this;
        return new Promise(function(resolve, reject){
            content = self.replace_image_paths(content);
            content = content.replace(/\\/g, '\\\\') // Escape backslashes
            if(!MATHJAX_REGEX.test(content)){
                resolve(content);
                return;
            }

            // If the editor is open, convert to svgs. Otherwise use katex to make loading faster
            (self.editing)? self.replace_mathjax_with_svgs(content, resolve) : self.replace_mathjax_with_katex(content, resolve);
        });
    },
    convert_html_to_markdown: function(contents) {
        var el = document.createElement( 'div' );
        el.innerHTML = contents;
        _.each(el.getElementsByTagName( 'svg' ), function(svg){
            contents = contents.replace(svg.outerHTML, '\$\$' + svg.getAttribute('data-texstring') + '\$\$')
        });
        contents = toMarkdown(contents,{
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
                        return src ? '![' + alt + ']' + '(' + IMG_PLACEHOLDER + src + size + ')' : ''
                    }
                },
                {
                    filter: ['em', 'i'],
                    replacement: function (content) {
                        return '*' + content + '*'
                    }
                }
            ]
        });
        return contents
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
        this.set_toolbar_closed();
        this.editor_view.deactivate_editor();
        this.$(".assessment_item").removeClass("active");
        this.$(".question").removeClass("unfocused");
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
        _.bindAll(this, "render", "set_editor", "set_open", "toggle", "toggle_correct");
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
        event.stopPropagation();
        if(this.assessment_item.get("type") === "single_selection"){
            this.containing_list_view.set_all_correct(false);
        }
        this.set_correct(this.$(".correct").prop("checked"));
        if(!this.containing_list_view.container.open){
            this.containing_list_view.container.init_undo_redo()
        }
    },
    set_correct:function(is_correct){
        this.model.set("correct", is_correct);
        this.$(".correct").attr('title', (is_correct)? "Correct" : "Incorrect");
        this.propagate_changes();
        (is_correct)? this.$(".answer_item").addClass('is_correct') : this.$(".answer_item").removeClass('is_correct');
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
    AssessmentItemDisplayView:AssessmentItemDisplayView
}
