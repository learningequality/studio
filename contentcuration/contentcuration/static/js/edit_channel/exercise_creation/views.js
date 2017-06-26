/* CONSTANTS */
const CHARACTERS = require("./symbols.json");
const MATHJAX_REGEX = /\$\$([^\$]+)\$\$/g;
const IMG_PLACEHOLDER = "${☣ CONTENTSTORAGE}/"
const IMG_REGEX = /\${☣ CONTENTSTORAGE}\/([^)]+)/g;
const NUM_REGEX = /[0-9\,\.\-\/\+e\s]+/g;

/* MODULES */
var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var FileUploader = require('edit_channel/file_upload/views');
var UndoManager = require("backbone-undo");
require("summernote");
require("../../utils/mathquill.min.js");
var dialog = require("edit_channel/utils/dialog");

/* PARSERS */
var Katex = require("katex");
var toMarkdown = require('to-markdown');
var stringHelper = require("edit_channel/utils/string_helper");
var numParser = require("edit_channel/utils/number_parser");
var jax2svg = require('edit_channel/utils/mathjaxtosvg')
jax2svg.init();

/* STYLESHEETS */
require("exercises.less");
require("../../../css/summernote.css");
require("../../../css/katex.min.css");
require("../../../css/mathquill.css");
if (navigator.userAgent.indexOf('Chrome') > -1 || navigator.userAgent.indexOf("Safari") > -1){
    require("mathml.less"); // Windows and Safari don't support mathml natively, so add it accordingly
}

/*********** FORMULA ADD-IN FOR EXERCISE EDITOR ***********/
var AddFormulaView = Backbone.View.extend({
    template: require("./hbtemplates/add_formula.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'add_formula', 'add_character', 'add_format', 'activate_mq');
        this.callback = options.callback;
        this.selector = "mathquill_" + this.cid;
        this.render();
    },
    events: {
        "click #add_formula": "add_formula",
        "click .character_symbol": "add_character",
        "click .char_cmd": "add_format",
        "click .mq-wrapper": "keep_open",
        'keydown' : 'handle_escape'
    },

    /*********** LOAD METHODS ***********/
    render: function() {
        this.$el.html(this.template({selector: this.selector, characters: CHARACTERS}));
        this.$('[data-toggle="popover"]').popover({html: true, content: this.$("#characters_" + this.selector)});
    },
    activate_mq: function(){
        // Load mathjax symbols and formats
        var MQ = MathQuill.getInterface(2);
        this.parse_mathjax_characters(this.$("#characters_" + this.selector + " .character_format"), "#character_format_", MQ);
        this.parse_mathjax_characters(this.$("#characters_" + this.selector + " .character_eqn"), "#character_eqn_", MQ);

        // Configure mathquill input field
        var self = this;
        this.mathField = MQ.MathField(document.getElementById(this.selector), {
          spaceBehavesLikeTab: true,
          handlers: {enter: self.add_formula}
        });
    },
    parse_mathjax_characters:function(wrapper_el, id_prefix, MQ){
        var self = this;
        _.each(wrapper_el, function(item, index){
            MQ.StaticMath(self.$(id_prefix + index)[0]);
        });
    },

    /*********** TOGGLE METHODS ***********/
    keep_open:function(event){ event.stopPropagation(); },
    handle_escape: function(event){
        if (event.keyCode === 27 || event.which === 27){
            event.stopPropagation();
            $('.dropdown-toggle').dropdown("toggle");
        }
    },
    close_dropdown:function(){
        this.$('[data-toggle="popover"]').popover("hide");
        this.mathField.focus();
    },

    /*********** FORMATTING METHODS ***********/
    add_character:function(event){
        this.mathField.write(event.currentTarget.dataset.key);
        this.close_dropdown();
    },
    add_format:function(event){
        this.mathField.cmd(event.currentTarget.dataset.key);
        this.close_dropdown();
    },
    add_formula:function(){
        if(this.mathField.latex().trim()){
            this.callback("\$\$" + this.mathField.latex().trim() + "\$\$");
            this.mathField.latex("");
            $(".dropdown").dropdown('toggle');
        }
    }
});

/*********** CUSTOM BUTTON FOR UPLOADING IMAGES ***********/
var UploadImage = function (context) {
    return $.summernote.ui.button({
        contents: '<i class="note-icon-picture"/>',
        tooltip: 'Image',
        click: function () {
            var view = new FileUploader.ImageUploadView({
                callback: context.options.callbacks.onImageUpload,
                preset_id: 'exercise_image'
            });
        }
    }).render();
}

/*********** CUSTOM BUTTON FOR ADDING FORMULAS ***********/
var AddFormula = function (context) {
    var ui = $.summernote.ui;
    var view = new AddFormulaView({callback: context.options.callbacks.onAddFormula});
    return ui.buttonGroup([
        ui.button({
            className: 'dropdown-toggle',
            contents: '<b class="formula_icon">∑</b> <span class="caret"></span>',
            tooltip: 'Formula',
            data: { toggle: 'dropdown' },
            click: view.activate_mq
        }),
        ui.dropdown({ className: 'drop-default add_formula_dropdown', contents: view.el })
    ]).render();
}

/*********** WRAPPER FOR SUMMERNOTE FOR OBECT-ORIENTED APPROACH ***********/
function Summernote(element, context, options) {
    // Clear all ranges to get undo/redo to work on summernote
    if(!!document.createRange) {
        document.getSelection().removeAllRanges();
    }

    // Configure editor
    this.element = element;             // Element to which summernote should be attached
    this.context = context;             // View in which summernote is nested
    this.element.summernote(options);   // Initialize summernote with configuration options

    this.setHTML = function(content){ element.summernote('code', content); };
    this.insertHTML = function(content){ element.summernote('insertNode', content); };
    this.focus = function(){ element.summernote('focus'); };
    this.getContents = function(){ return element.summernote('code'); };
    this.enable = function(){ element.summernote('enable'); };
    this.disable = function(){ element.summernote('disable'); };
    this.togglePlaceholder = function(show){ context.$('.note-placeholder').css('display', (show) ? 'inline' : 'none'); }
}

/*********** TEXT EDITOR FOR QUESTIONS, ANSWERS, AND HINTS ***********/
var EditorView = Backbone.View.extend({
    tagName: "div",
    edit_template: require("./hbtemplates/editor.handlebars"),
    view_template: require("./hbtemplates/editor_view.handlebars"),
    default_template: require("./hbtemplates/editor_view_default.handlebars"),

    id: function() { return "editor_view_" + this.cid; },
    initialize: function(options) {
        _.bindAll(this, "add_image", "add_formula", "deactivate_editor", "activate_editor", "save", "process_key",
               "render", "render_content", "parse_content", "replace_mathjax_with_svgs", "paste_content", "check_key");
        this.edit_key = options.edit_key;
        this.editing = false;
        this.numbersOnly = options.numbersOnly || false;
        this.render();
        this.markdown = this.model.get(this.edit_key);
        this.listenTo(this.model, "change:" + this.edit_key, this.render);
    },
    events: {
        "click .editor-wrapper": "stop_events"
    },
    stop_events:function(event){ event.stopPropagation(); },

    /*********** LOADING METHODS ***********/
    render: function() {
        if (this.editing) {
            if (!this.setting_model) this.render_editor();
        } else { this.render_content(); }
        this.setting_model = false;
    },
    render_content: function() {
        var self = this;
        if(this.model.get(this.edit_key) && this.model.get(this.edit_key).trim() !==""){
            this.toggle_loading(true);
            this.parse_content(this.model.get(this.edit_key)).then(function(result){
                self.$el.html(self.view_template({content: result}));
                self.toggle_loading(false);
            });
        }else{
            this.$el.html(this.default_template({ source_url: this.model.get('source_url') }));
        }
    },
    render_editor: function() {
        var self = this;
        this.toggle_loading(true);
        this.parse_content(this.model.get(this.edit_key)).then(function(result){
            var html = self.view_template({content: result});
            self.editor ? self.editor.setHTML(html) : self.$el.html(html);
            self.toggle_loading(false);
            self.render_toolbar();
            if(self.editor) self.editor.focus();
        });
    },
    render_toolbar:function(){
        if(this.numbersOnly){
            this.$(".note-style, .note-insert").css('display', 'none');
        }
    },
    toggle_loading:function(isLoading){
        if(this.editor && this.editing){
            (isLoading) ? this.editor.disable() : this.editor.enable();
            this.$('.loading-overlay').css('display', (isLoading) ? 'block' : 'none');
        }
    },

    /*********** EDITOR METHODS ***********/
    activate_editor: function() {
        var selector = this.cid + "_editor";
        this.$el.html(this.edit_template({selector: selector}));
        this.editor = new Summernote(this.$("#" + selector), this, {
            toolbar: [
                ['style', ['bold', 'italic']],
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
                onChange: _.debounce(this.save, 1),
                onPaste: this.paste_content,
                onImageUpload: this.add_image,
                onAddFormula: this.add_formula,
                onKeydown: this.process_key
            }
        });
        $('.dropdown-toggle').dropdown();
        this.editing = true;
        this.render_editor();
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

    /*********** EDITOR CONTENT METHODS ***********/
    save: function(contents, $editable) {
        this.setting_model = true;
        this.markdown = this.convert_html_to_markdown(contents);
        this.model.set(this.edit_key, this.markdown);
    },
    validate: function(){
        this.$(".note-error").css("display", (this.markdown.trim())? "none" : "inline-block");
        return this.markdown;
    },
    process_key: function(event){
        this.editor.togglePlaceholder(false);
        if(this.numbersOnly){
            var key = event.keyCode || event.which;
            var allowedKeys = [46, 8, 9, 27, 110, 37, 38, 39, 40, 10];
            if((!this.check_key(String.fromCharCode(key), key, event.shiftKey)) &&  // Key is a digit or allowed special characters
               !_.contains(allowedKeys, key) && !(event.ctrlKey || event.metaKey)){   // Key is not a CMD key
                event.preventDefault();
            }
        }
    },
    check_key: function(content, key, shiftkey){
        var allowedShiftKeys = [53, 61, 187];
        var specialCharacterKeys = [32, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 69, 173, 188, 189, 190, 191, 220];

        if(shiftkey){ return _.contains(allowedShiftKeys, key)}
        return !this.numbersOnly || NUM_REGEX.test(content) || _.contains(specialCharacterKeys, key);
    },
    paste_content: function(event){
        var clipboard = (event.originalEvent || event).clipboardData || window.clipboardData;
        event.preventDefault();
        var bufferText = clipboard.getData("Text");
        var clipboardHtml = clipboard.getData('text/html');
        if(clipboardHtml){
            var div = document.createElement("DIV");
            div.innerHTML = this.convert_html_to_markdown(clipboardHtml);
            bufferText = div.textContent || tmp.innerText || bufferText;
        }
        var self = this;
        setTimeout(function () { // Firefox fix
            if(!self.numbersOnly || self.check_key(bufferText)){
                document.execCommand('insertText', false, bufferText);
                self.editor.togglePlaceholder(false);
                if(clipboardHtml){
                    self.save(self.editor.getContents());
                    self.editor.setHTML("");
                    self.render_editor();
                }
            }
        }, 10);
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
                paragraphs[paragraphs.length - 1].innerHTML += '&nbsp;';
                updatedHtml = div.innerHTML;
            }
            self.editor.setHTML(updatedHtml)
            self.model.set(self.edit_key, self.model.get(self.edit_key) + formula);
            self.editor.focus();
        });
    },

    /*********** PARSING METHODS ***********/
    parse_content: function(content){
        var self = this;
        return new Promise(function(resolve, reject){
            content = self.replace_image_paths(content);
            content = stringHelper.escape_str(content.replace(/\\(?![^\\\s])/g, '\\\\'));
            // If the editor is open, convert to svgs. Otherwise use katex to make loading faster
            (self.editing)? self.replace_mathjax_with_svgs(content, resolve) : self.replace_mathjax_with_katex(content, resolve);
        });
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
    get_mathjax_strings:function(content){
        var mathjax_list = [];
        var collectString = false;
        var parsedString = content;
        while(parsedString.length){
            var index = parsedString.indexOf("$$");
            if(index < 0) break;
            if(collectString) mathjax_list.push("$$" + parsedString.substring(0, index) + "$$");
            parsedString = parsedString.substring(index + 2, parsedString.length);
            collectString = !collectString;
        }
        return mathjax_list;
    },
    replace_mathjax_with_svgs: function(content, callback){
        var matches = this.get_mathjax_strings(content);
        var promises = [];
        matches.forEach(function(match){
            promises.push(jax2svg.toSVG(match));
        });
        Promise.all(promises).then(function(svgs){
            svgs.forEach(function(svg){
                content = content.replace(svg.getAttribute('data-texstring'), '&nbsp;' + svg.outerHTML + '&nbsp;');
            });
            callback(content);
        });
    },
    replace_mathjax_with_katex: function(content, callback){
        var matches = this.get_mathjax_strings(content);
        matches.forEach(function(match){
            var replace_str = Katex.renderToString(match.match(/\$\$(.+)\$\$/)[1]);
            content = content.replace(match, replace_str);
        });
        callback(content);
    },
    convert_html_to_markdown: function(contents) {
        // Replace svgs with latex strings
        var el = document.createElement( 'div' );
        el.innerHTML = contents;
        _.each(el.getElementsByTagName( 'svg' ), function(svg){
            contents = contents.replace(svg.outerHTML, '\$\$' + svg.getAttribute('data-texstring') + '\$\$');
        });

        // Render content to markdown (use custom fiters for images and italics)
        return toMarkdown(contents,{
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
                    replacement: function (content) { return '*' + content + '*'; }
                },
                {
                    filter: ['span'],
                    replacement: function (content) {
                        var div = document.createElement('div');
                        div.innerHTML = content;
                        return div.textContent;
                    }
                }
            ]
        });
    }
});

/*********** BASE EXERCISE LIST VIEW ***********/
var ExerciseEditableListView = BaseViews.BaseEditableListView.extend({
    template: null,
    additem_el: null,
    get_default_attributes: function(){ return {}; }, // Default attributes to use when adding to list
    get_next_order: function(){
        if(this.collection.length > 0){
            var max = this.collection.max(function(i){ return i.get('order');});
            return (max && max.get('order') >= 0)? max.get('order') + 1 : 1;
        }
        return 1;
    },

    /*********** EDITING METHODS ***********/
    add_item: function() {
        if(!this.$(this.additem_el).hasClass('disabled')){
            this.$(this.default_item).css('display', 'none');
            this.close_all_editors();
            this.collection.add(this.get_default_attributes());
            this.propagate_changes();
        }
    },
    remove_item: function(model){
        this.collection.remove(model);
        this.render();
        this.propagate_changes();
    },
    switch_view_order:function(view, new_order){
        var matches = _.filter(this.views, function(view){ return view.model.get('order') === new_order; });
        var old_order = view.model.get('order');
        if(matches.length > 0){
            var previous_view = matches[0];
            previous_view.model.set('order', old_order);
            previous_view.$el.detach();
            (old_order < new_order)? view.$el.before(previous_view.el) : view.$el.after(previous_view.el);
            if(previous_view.open) previous_view.set_open();
            view.model.set('order', new_order);
            this.propagate_changes();
        }
    },
    propagate_changes:function(){
        this.validate();
        this.container.propagate_changes();
    },

    /*********** VALIDATION METHODS ***********/
    validate:function(){ return true; },
    set_invalid:function(invalid){
        this.$(this.additem_el).prop("disabled", invalid);
        (invalid)? this.$(this.additem_el).addClass("disabled") : this.$(this.additem_el).removeClass("disabled");
        this.$(this.additem_el).prop('title', (invalid)? 'Blank item detected. Resolve to continue': "Add");
    },

    /*********** RENDERING METHODS ***********/
    add_item_view: function(model) {
        var view = this.create_new_view(model);
        this.$(this.list_selector).append(view.el);
        view.set_open();
    },
    close_all_editors:function(){
        _.where(this.views, {open: true}).forEach(function(view){
            view.set_closed();
        });
    }
});

/*********** BASE EXERCISE ITEM VIEW ***********/
var ExerciseEditableItemView =  BaseViews.BaseListEditableItemView.extend({
    close_editors_on_focus: true,   // Determines if all other open editors should be closed
    editor_el: null,                // HTML container for editor
    content_field: null,            // Field that will be changed based on editor
    undo: null,                     // Keep track of changes so user can cancel all changes
    open: false,                    // Determines if editor is open
    error_template: require("./hbtemplates/assessment_item_errors.handlebars"),
    numbers_only: function() {return false;},

    /*********** EDITOR METHODS ***********/
    render_editor: function(){
        if (!this.editor_view) {
            this.editor_view = new EditorView({model: this.model, edit_key: this.content_field, numbersOnly:this.numbers_only()});
        }
        this.$(this.editor_el).html(this.editor_view.el);
        this.listenTo(this.model, "change:" + this.content_field, this.propagate_changes)
    },
    toggle_editor: function() {
        this.open = !this.open;
        this.set_editor(true);
    },
    set_open:function(){
        if(!this.open){
            this.containing_list_view.close_all_editors();
            if(this.close_editors_on_focus){
                this.containing_list_view.container.toggle_focus();
                this.containing_list_view.container.remove_focus();
            }
            this.set_toolbar_open();
            this.editor_view.activate_editor();
            this.open = true;
        }
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
        this.$(this.toolbar_el).html(this.open_toolbar_template({model: this.model.attributes, undo: this.undo}));
    },
    set_toolbar_closed: function() {
        this.$(this.toolbar_el).html(this.closed_toolbar_template({model: this.model.attributes}));
    },

    /*********** CONTENT PROCESSING METHODS ***********/
    propagate_changes:function(){
        this.containing_list_view.propagate_changes();
    },
    delete: function(event) {
        event.stopPropagation();
        this.containing_list_view.remove_item(this.model);
        this.remove();
    },
    move_up:function(event){
        event.stopImmediatePropagation();
        event.stopPropagation();
        this.containing_list_view.switch_view_order(this, this.model.get('order') - 1);
    },
    move_down:function(event){
        event.stopImmediatePropagation();
        event.stopPropagation();
        this.containing_list_view.switch_view_order(this, this.model.get('order') + 1);
    },
});

/*********** MAIN EXERCISE VIEW ***********/
var ExerciseView = ExerciseEditableListView.extend({
    additem_el: "#addquestion",
    list_selector:"#exercise_list",
    default_item:"#exercise_list >.default-item",
    template: require("./hbtemplates/exercise_edit.handlebars"),

    get_default_attributes: function() {
        return {order: this.get_next_order(), contentnode: this.model.get('id')};
    },
    initialize: function(options) {
        _.bindAll(this, 'toggle_answers','add_item', "add_item_view");
        this.bind_edit_functions();
        this.parentnode = options.parentnode;
        this.onchange = options.onchange;
        this.onrandom = options.onrandom;
        this.allow_edit = options.allow_edit;
        this.listenTo(this.collection, "remove", this.render);
        this.collection = new Models.AssessmentItemCollection(this.model.get("assessment_items"));
        this.render();
        this.listenTo(this.collection, "add", this.add_item_view);
    },
    events: {
        "click #addquestion": "add_item",
        "change #exercise_show_answers" : "toggle_answers",
        'change #randomize_question_order': 'set_random',
    },

    /*********** LOADING METHODS ***********/
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON(),
            is_random: this.model.get('extra_fields').randomize,
            allow_edit: this.allow_edit
        }));
        this.load_content(this.collection.where({'deleted': false}), (this.allow_edit)? "Click '+ QUESTION' to begin..." : "No questions associated with this exercise");
    },
    create_new_view:function(model){
        var new_exercise_item = null;
        if(model.get('type') === "perseus_question" || !this.allow_edit){
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

    /*********** CHECKBOX METHODS ***********/
    toggle_answers:function(){
        this.$(this.list_selector).toggleClass("hide_answers");
    },
    set_random:function(event){
        this.onrandom(event.target.checked)
    },

    /*********** CONTENT PROCESSING METHODS ***********/
    validate: function(){
        return _.every(this.views, function(view){return view.validate();});
    },
    propagate_changes:function(){
        this.onchange(this.collection.toJSON());
    },
    check_for_changes:function(){
        var is_changed = false;
        this.views.forEach(function(view){
            is_changed = is_changed || view.undo;
        });
        return is_changed;
    }
});

/*********** ASSESSMENT ITEM VIEW (STATIC) ***********/
var AssessmentItemDisplayView = ExerciseEditableItemView.extend({
    className:"assessment_li",
    toolbar_el : '.toolbar',
    content_field: 'question',
    editor_el: ".question",
    isdisplay: true,
    template: require("./hbtemplates/assessment_item_edit.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "update_hints", "show_hints");
        this.render();
    },
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
        this.$(".question_type_select").val(this.model.get("type")); // Set dropdown to current type

        // Add answer list for non-perseus questions
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
        this.$(".hint_count").text(this.model.get("hints").length); // Update how many hints are on assessment item
    }
});

/*********** ASSESSMENT ITEM VIEW (DYNAMIC) ***********/
var AssessmentItemView = AssessmentItemDisplayView.extend({
    isdisplay: false,
    errors: [],
    closed_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_closed.handlebars"),
    open_toolbar_template: require("./hbtemplates/assessment_item_edit_toolbar_open.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "set_toolbar_open", "toggle", "set_toolbar_closed", "commit_type_change",
                "set_undo_redo_listener", "unset_undo_redo_listener", "toggle_focus", "set_true_false",
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
    stop_events:function(event){ event.stopPropagation(); },

    /*********** EDITING METHODS ***********/
    delete: function(event) {
        this.stop_events(event); // Don't activate editor on deleting question
        var self = this;
        dialog.dialog("Deleting Question", "Are you sure you want to delete this question?", {
            "CANCEL":function(){},
            "DELETE": function(){
                self.model.set('deleted', true);
                self.propagate_changes();
                self.containing_list_view.views.splice(self, 1);
                self.containing_list_view.handle_if_empty();
                self.remove();
            },
        }, function(){});
    },
    set_type:function(event){
        var new_type = event.target.value;
        var self = this;

        // True/false questions will overwrite all answers
        if(new_type === "true_false"){
            if(!this.model.get('answers').length){
                this.set_true_false();
            } else{
                dialog.dialog("Changing Question Type", "Switching to single selection will set only one answer as correct. Continue?", {
                    "CANCEL":function(){},
                    "CHANGE": function(){
                        self.set_true_false();
                    },
                }, function(){ self.commit_type_change(self.model.get('type')); });
            }
        }

        // Single selection questions will set only one answer as being correct
        else if(new_type === "single_selection" && this.model.get("answers").where({'correct': true}).length > 1){
            dialog.dialog("Changing Question Type", "Switching to true or false will remove any current answers. Continue?", {
                "CANCEL":function(){},
                "CHANGE": function(){
                    var correct_answer_set = false;
                    self.model.get('answers').forEach(function(item){
                        if(correct_answer_set) item.set('correct', false);
                        correct_answer_set = correct_answer_set || item.get('correct');
                    });
                    self.commit_type_change(new_type);
                },
            }, function(){ self.commit_type_change(self.model.get('type')); });
        }

        // Input questions will set all answers as being correct and remove non-numeric answers
        else if(new_type === "input_question" && this.model.get("answers").some(function(a){ return a.get('correct') || numParser.test_valid_number(a.get('answer')); })){
            dialog.dialog("Changing Question Type", "Switching to numeric input will set all answers as correct and remove all non-numeric answers. Continue?", {
                "CANCEL":function(){},
                "CHANGE": function(){
                    var newCollection = self.model.get('answers');
                    newCollection.reset(self.model.get('answers').chain()
                        .reject( function(a){return !numParser.extract_value(a.get('answer'));} )
                        .each( function(a){
                            var value = numParser.extract_value(a.get('answer'));
                            a.set({'correct': true, 'answer': value && value.toString()});
                        } ).value());
                    self.model.set('answers', newCollection);
                    self.commit_type_change(new_type);
                },
            }, function(){ self.commit_type_change(self.model.get('type')); });
        }

        else {
            this.commit_type_change(new_type);
        }
    },
    set_true_false: function(){
        var trueFalseCollection = this.model.get('answers');
        trueFalseCollection.reset([{answer: "True", correct: true, order: 1}, {answer: "False", correct: false, order: 2}]);
        this.model.set("answers", trueFalseCollection);
        this.commit_type_change("true_false");
    },
    commit_type_change:function(new_type){
        // Set type and re-render answers accordingly
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
    validate:function(){
        this.errors = [];

        // Validation rules don't apply to perseus questions
        if(this.model.get("type") === 'perseus_question') return true;

        // Make sure questions aren't blank
        if(!this.model.get(this.content_field)) this.errors.push({error: "Question cannot be blank"});

        // Make sure answers aren't blank
        if(this.model.get('answers').findWhere({'answer': ""})) this.errors.push({error: "Answers cannot be blank"});

        // Make sure hints aren't blank
        if(this.model.get('hints').findWhere({'hint': ""})) this.errors.push({error: "Hints cannot be blank"});

        // Make sure different question types have valid answers
        if(this.model.get("type") === "input_question"){
            // Answers must be numeric for input questions
            if(_.some(this.model.get('answers'), function(a){return a && !NUM_REGEX.test(a.get('answer'));})){
                this.errors.push({error: "Answers must be numeric"});
            }

            // Input answers must have at least one answer
            else if(this.model.get('answers').length === 0){
                this.errors.push({error: "Question must have one or more answers"});
            }
        }

        // Multiple selection questions must have at least one correct answer
        else if(this.model.get('type') === 'multiple_selection'){
            if(this.model.get('answers').where({'correct': true}).length === 0){
                this.errors.push({error: "Question must have at least one correct answer"});
            }
        }

        // Single selection questions must have one correct answer
        else if(this.model.get('type') === 'single_selection'){
            if(this.model.get('answers').where({'correct': true}).length !== 1){
                this.errors.push({error: "Question must have one correct answer"});
            }
        }
        this.$(".error-list").html(this.error_template({errors: this.errors}));
        return this.errors.length === 0;
    },
    set_random_order:function(event){
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.model.set("randomize", event.target.checked);
        this.propagate_changes();
    },

    /*********** UNDO/REDO METHODS ***********/
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

    /*********** EDITOR METHODS ***********/
    toggle:function(event){
        event.stopPropagation();
        this.init_undo_redo();
        this.set_closed()
        this.$(".closed_toolbar").css("display", "none");
        var self = this;
        setTimeout(function(){ self.$(".closed_toolbar").css("display", "block"); }, 1000);
    },
    toggle_focus:function(){
        if(!this.$(".assessment_item").hasClass("active")){
           this.containing_list_view.close_all_editors();
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
            this.answer_editor.close_all_editors();
        }
    },
    set_closed:function(){
        this.set_toolbar_closed();
        if(this.model.get("type") === "input_question"){
            this.model.get('answers').each( function(answer){
                var value = numParser.extract_value(answer.get('answer'));
                answer.set('answer', (value)? value.toString() : "");
            });
        }
        this.editor_view.deactivate_editor();
        this.$(".assessment_item").removeClass("active");
        this.$(".question").removeClass("unfocused");
        this.open = false;
        this.unset_undo_redo_listener();
        if (this.answer_editor) {
            this.answer_editor.close_all_editors();
        }
    },
    remove_focus:function(){
        this.editor_view.deactivate_editor();
        this.$(".question").addClass("unfocused");
        this.$(".question").on('click', this.set_open);
    }
});

/*********** ANSWER LIST VIEW ***********/
var AssessmentItemAnswerListView = ExerciseEditableListView.extend({
    additem_el: ".addanswer",
    list_selector:">.answer_list",
    default_item:">.answer_list .default-item",
    template: require("./hbtemplates/assessment_item_answer_list.handlebars"),

    get_default_attributes: function() {
        return {
            order: this.get_next_order(),
            answer: "",
            correct: this.assessment_item.get('type') === "input_question"
        };
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
            isdisplay: this.isdisplay,
            true_false: this.assessment_item.get("type") === "true_false"
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
        });
    },
    validate:function(){
        this.set_invalid(this.collection.findWhere({answer: ""}));
    }
});

/*********** ANSWER ITEM VIEW ***********/
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
            input_answer: this.numbers_only(),
            single_selection: this.is_single_correct(),
            groupName: this.assessment_item.cid,
            allow_edit: !this.isdisplay && this.assessment_item.get("type") !== "true_false",
            allow_toggle: !this.isdisplay
        }));
        this.render_editor();
        _.defer(this.set_editor);
    },
    numbers_only: function() {return this.assessment_item.get('type') === 'input_question';},
    is_single_correct: function(){
        return this.assessment_item.get("type") === "single_selection" || this.assessment_item.get("type") === "true_false";
    },
    toggle_correct: function(event) {
        event.stopPropagation();
        if(this.is_single_correct()){
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

/*********** QUESTION DISPLAY FOR HINT MODAL ***********/
var HintQuestionDisplayView = Backbone.View.extend({
    className:"assessment_li",
    template: require("./hbtemplates/assessment_item_display.handlebars"),

    initialize: function(options) {
        this.render();
    },
    render: function() {
        this.$el.html(this.template({model: this.model.toJSON()}));
        var editor_view = new EditorView({
            model: this.model,
            edit_key: "question",
            el: this.$(".question")
        });
    }
});

/*********** HINT MODAL VIEW ***********/
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
            isdisplay: this.isdisplay,
            modal_view: this
        });
        this.$(".hints").append(this.hint_editor.el);
        this.$(".hint_modal").on("hide.bs.modal", this.closing_hints);
        this.$(".hint_modal").on("hidden.bs.modal", this.closed_hints);
    },
    show: function(){
        this.$(".hint_modal").modal({show: true});
    },
    closing_hints:function(){
        this.$(".hint-errors").css('display', 'none');
        this.hint_editor.close_all_editors();
        if(!this.isdisplay) this.onupdate(this.model);
    },
    closed_hints:function(){
        $("body").addClass('modal-open'); // Make sure modal-open class persists
        $('.modal-backdrop').slice(1).remove();
    }
});

/*********** HINT LIST VIEW ***********/
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
        this.modal_view = options.modal_view;
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
        this.validate();
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
        var invalid = this.collection.findWhere({hint: ""});
        this.modal_view.$(".hint_prompt, .error-list").css("display", (invalid)? "block" : "none");
        this.set_invalid(this.collection.findWhere({hint: ""}));
    }
});

/*********** HINT ITEM VIEW ***********/
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
        this.$el.html(this.template({hint: this.model.toJSON(), allow_toggle: !this.isdisplay}));
        this.render_editor();
    }
});

module.exports = {
    ExerciseView:ExerciseView,
    AssessmentItemDisplayView:AssessmentItemDisplayView
}
