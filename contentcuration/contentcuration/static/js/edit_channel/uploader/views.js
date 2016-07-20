var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var FileUploader = require("edit_channel/file_upload/views");
var Import = require("edit_channel/import/views");
var Previewer = require("edit_channel/preview/views");
var stringHelper = require("edit_channel/utils/string_helper");
require("uploader.less");
//var ExerciseViews = require("edit_channel/exercise_creation/views");

var AddContentView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/add_content_dialog.handlebars"),
    header_template: require("./hbtemplates/add_content_header.handlebars"),
    modal_template: require("./hbtemplates/uploader_modal.handlebars"),
    next_header_template: require("./hbtemplates/edit_metadata_header.handlebars"),
    item_view:"uploading_content",
    counter:0,
    initialize: function(options) {
        _.bindAll(this, 'add_topic', 'edit_metadata','add_file','close', 'add_exercise', 'import_content', 'import_nodes');
        this.collection = options.collection;
        this.main_collection = options.main_collection;
        this.parent_view = options.parent_view;
        this.modal = options.modal;
        this.render();
    },
    render: function() {
        if(this.modal){
            this.$el.html(this.modal_template());
            this.$(".modal-title").prepend(this.header_template({
                title: (this.model.get("parent"))? this.model.get("title") : window.current_channel.get("name"),
                is_root: this.model.get("parent") == null
            }));
            this.$(".modal-body").html(this.template({
                node_list: this.collection.toJSON()
            }));
            this.$el.append(this.el);
            this.$el.find(".modal").modal({show: true, backdrop: 'static', keyboard: false});
            this.$el.find(".modal").on("hide.bs.modal", this.close);
        }else{
            this.$el.html(this.template({
                node_list: this.collection.toJSON()
            }));
            this.$el.prepend(this.header_template({
                title:this.model.get("title"),
                is_root: this.model.get("parent") == null
            }));
        }
        this.load_content();
    },
    events: {
        'click #create_topic':'add_topic',
        'click .edit_metadata' : 'edit_metadata',
        'click #upload_file' : 'add_file',
        'click #create_exercise' : 'add_exercise',
        'click #import_node' : 'import_content'
    },

    /*Render any items that have previously been added*/
    load_content:function(){
        var self = this;
        if(this.collection){
            this.collection.forEach(function(entry){
                var node_view = new NodeListItem({
                    containing_list_view: self,
                    el: self.$el.find("#content_item_" + entry.cid),
                    model: entry,
                    root: this.model
                });
                self.views.push(node_view);
            });
        }
    },
    add_topic:function(){
        var topic = this.collection.create({
            "kind":"topic",
            "title": (this.counter > 0)? "Topic " + this.counter : "Topic",
            "sort_order" : this.main_collection.length + this.collection.length
        }, {async:false});
        topic.set({
            "original_node" : topic.get("id"),
            "cloned_source" : topic.get("id")
        });
        this.counter++;
        var item_view = new NodeListItem({
            containing_list_view: this,
            model: topic
        });
        $("#upload_content_add_list").append(item_view.el);
        this.views.push(item_view);
    },
    edit_metadata: function(){
        if(this.modal){
            this.$el.find(".modal").modal("hide");
        }else{
            this.close();
        }
        $("#main-content-area").append("<div id='dialog'></div>");
        var metadata_view = new EditMetadataView({
            el : $("#dialog"),
            collection: this.collection,
            parent_view: this.parent_view,
            model: this.model,
            allow_add: true,
            main_collection : this.main_collection,
            modal: true
        });
    },
    add_file:function(){
        var view = new FileUploader.FileModalView({
            callback: this.upload_files,
            parent_view: this
        });
    },
    upload_files:function(collection){
        // console.log("uploading files", collection);
        var self = this.parent_view;
        collection.forEach(function(entry){
            entry.set({
                "parent" : self.model.id,
                "sort_order": self.main_collection.length + self.collection.length
            });
            self.collection.add(entry);
            var item_view = new NodeListItem({
                containing_list_view: self,
                model: entry
            });
            $("#upload_content_add_list").append(item_view.el);
            self.views.push(item_view);
        });
    },
    add_exercise:function(){
        var view = new ExerciseCreateView({
            callback: this.create_exercise,
            modal: true,
            parent_view: this,
            model: this.model
        });
    },
    create_exercise:function(exercise_list){
        console.log("exercises", exercise_list);
    },
    close: function() {
        $(".modal-backdrop").remove();  //TODO: Might need to change this later, but remove any remaining modals
        this.delete_view();
    },
    import_content:function(){
        var import_view = new Import.ImportView({
            modal: true,
            callback: this.import_nodes
        });
    },
    import_nodes:function(collection){
        this.collection.add(collection.models);
        this.render();
    }
});

var EditMetadataView = BaseViews.BaseEditorView.extend({
    template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
    modal_template: require("./hbtemplates/uploader_modal.handlebars"),
    header_template: require("./hbtemplates/edit_metadata_header.handlebars"),

    description_limit : 400,

    initialize: function(options) {
        _.bindAll(this, 'close_uploader', "save_and_keep_open", 'check_item',"select_item",
                        'add_tag','save_and_finish','add_more','set_edited','enable_submit', 'disable_submit',
                        'render_details', 'render_preview', 'remove_tag', 'update_count');
        this.parent_view = options.parent_view;
        this.collection = (options.collection)? options.collection : new Models.ContentNodeCollection();
        this.allow_add = options.allow_add;
        this.modal = options.modal;
        this.new_topic = options.new_topic;
        this.callback = options.callback;
        this.main_collection = options.main_collection;
        this.back_function = options.back_function;
        this.fileCollection = new Models.FileCollection();
        this.render();
        this.switchPanel(true);
    },
    render: function() {
        var template_data = {
            node_list: this.collection.toJSON(),
            multiple_selected: this.collection.length > 1 || this.allow_add,
            allow_add: this.allow_add,
            word_limit : this.description_limit,
            modal: this.modal,
            licenses: window.licenses.toJSON()
        }
        if(this.modal){
            this.$el.html(this.modal_template());
            this.$(".modal-title").prepend(this.header_template());
            this.$(".modal-body").html(this.template(template_data));
            $("body").append(this.el);
            this.$(".modal").modal({show: true});
            this.$(".modal").on("hide.bs.modal", this.close_uploader);
        }else{
            this.$el.html(this.template(template_data));
        }
        this.preview_view = new Previewer.PreviewView({
            modal:false,
            el: $("#metadata_preview"),
            model:this.current_node
        });

        this.gray_out(true);
        this.$el.find(".tag_input").addClass("gray-out");
        this.$el.find(".tag_input").prop("disabled", true);
        this.$el.find("#description_counter").html("Select an item first.");
        this.load_content();
    },
    events: {
        'click .close_uploader' : 'close_uploader',
        'click #upload_save_button' : 'save_and_keep_open',
        'click #upload_save_finish_button' : 'save_and_finish',
        'click #add_more_button' : 'add_more',
        'click #uploader' : 'finish_editing',
        'click .upload_item_checkbox' : 'check_item',
        'click .uploaded_list_item' : 'select_item',
        'keypress #tag_box' : 'add_tag',
        'keyup .upload_input' : 'set_edited',
        'click #metadata_details_btn' : 'render_details',
        'click #metadata_preview_btn' : 'render_preview',
        'click .delete_tag':'remove_tag',
        'keyup #input_description': 'update_count',
        'keydown #input_description': 'update_count',
        'paste #input_description': 'update_count',
        "change #license_select" : "select_license",
        "click #license_about": "load_license"
    },
    update_count:function(){
        this.update_word_count(this.$el.find("#input_description"), this.$el.find("#description_counter"), this.description_limit);
    },
    load_content:function(){
        var self = this;
        this.views = [];
        if(this.collection.length <= 1 && !this.allow_add){
            this.collection.add(this.model);
            var node_view = new UploadedItem({
                model: this.model,
                el: self.$el.find("#hidden_node"),
                containing_list_view: self
            });

            self.views.push(node_view);
            this.set_current(node_view);
        }else{
            this.collection.forEach(function(entry){
               // console.log("view = ", entry);
                var node_view = new UploadedItem({
                    model: entry,
                    el: self.$el.find("#uploaded_list #item_" + entry.cid),
                    containing_list_view: self,
                });
                self.views.push(node_view);
                if(self.collection.length ==1){
                    self.set_current(node_view);
                }
            });
        }
    },
    render_details:function(){
        this.switchPanel(true);
    },
    render_preview:function(){
        this.switchPanel(false);
    },

    save_and_keep_open:function(){
        var self = this;
        this.check_and_save_nodes(null);
    },

    check_and_save_nodes: function(callback){
        this.$el.find("#validating_text").css("display", "inline");
        this.$el.find(".editmetadata_save").prop("disabled", true);
        this.$el.find(".editmetadata_save").css("pointer", "not-allowed");

        var self = this;
        setTimeout(function() {
           /* TODO :fix to save multiple nodes at a time */
            self.gray_out(false);
            self.parent_view.set_editing(false);
            self.errorsFound = false;
            self.$el.find("#description_error").html("");
            self.$el.find("#input_description").removeClass("error_input");

            self.check_nodes();
            self.$el.find(".editmetadata_save").prop("disabled", false);
            self.$el.find("#validating_text").css("display", "none");
            self.$el.find(".editmetadata_save").css("pointer", "cursor");

            self.add_tag(null);

            if(!self.errorsFound){
                self.$el.css("visibility", "hidden");
                self.display_load("Saving Content...", function(){
                    self.save_nodes(function(){
                        if(!self.errorsFound){
                            $(".uploaded").css("background-color", "white");
                            self.$el.find("#title_error").html("");
                            self.$el.find("#description_error").html("");
                            if(self.multiple_selected){
                                self.gray_out(true);
                            }
                        }
                        if(!self.errorsFound && (self.allow_add || self.new_topic)){
                            self.parent_view.add_nodes(self.collection, self.parent_view.model.get("metadata").max_sort_order);
                        }
                        self.$el.css("visibility", "visible");
                        if(callback){
                            callback();
                        }
                    });
                });
            }

        }, 200);
    },
    save_and_finish: function(event){
        var self = this;
        this.check_and_save_nodes(function(){
            if(self.modal){
                self.$el.find(".modal").modal("hide");
            }else{
                self.close_uploader(event);
            }
        });

    },
    add_more:function(event){
        this.save_queued();
        if(this.modal){
            this.$el.find(".modal").modal("hide");
        }else{
            this.close_uploader(event);
        }

        $("#main-content-area").append("<div id='dialog'></div>");
        var content_view = new AddContentView({
            collection: this.collection,
            parent_view: this.parent_view,
            el: $("#dialog"),
            model: (this.allow_add)? this.model : null,
            main_collection : this.main_collection,
            modal:true
        });

        this.reset();
        this.undelegateEvents();
        this.unbind();
        // this.back_function(this.collection);
    },
    set_current_node:function(view){
        this.$el.find("#title_error").html("");
        this.$el.find(".disable_on_error").css("cursor", "pointer");
        if(!this.current_view && !this.multiple_selected){
            this.set_current(view);
        }else {
            if(!this.multiple_selected){
                /* Previous node passes all tests */
                this.$el.find("#title_error").html("");
                this.$el.find("#description_error").html("");
                this.set_current(view);
            }
        }
    },
    set_current:function(view){
        this.$el.find("#uploaded_list .uploaded").removeClass("current_item");
        if(!this.multiple_selected){
            this.current_node = view.model;
            this.current_view = view;
        }else{
            this.current_node = this.collection.get({cid: view.model.cid});
            this.current_view = view;
        }
        if(this.current_node.get("kind") === "topic"){
            this.switchPanel(true);
            this.$(".content_nodes_only").css("display", "none");
        }else{
            this.load_preview();
            this.$(".content_nodes_only").css("display", "inline-block");
        }

        this.$el.find("#input_title").val(this.current_node.get("title"));
        this.$el.find("#input_description").val(this.current_node.get("description"));

        if(this.current_node.get("license") != null){
            this.$el.find("#license_select").val(this.current_node.get("license"));
            this.$("#license_about").css("display", "inline");
        }else{
            this.$el.find("#license_select").val(-1);
        }


        view.$el.addClass("current_item");
        view.$el.find("input[type=checkbox]").prop("checked", true);
        this.$("#editmetadata_format_section").css("display", (this.current_node.get("kind") == "topic")? "none" : "block");
        if(this.format_view){
            this.format_view.$el.after("<div id='editmetadata_format_section'></div>");
            this.format_view.delete_view();
        }
        if(!this.multiple_selected && this.current_node.get("kind") != "topic"){
            $("#editmetadata_format_section").css("display", "block");
            this.current_view.format_view.display_inline();
            $("#metadata_preview_btn").css("visibility", "visible");
        }else{
            $("#editmetadata_format_section").css("display", "none");
            $("#metadata_preview_btn").css("visibility", "hidden");
        }

        if(this.current_node.get("original_filename")){
            this.$el.find("#original_filename_area").css("display", "block");
            this.$el.find("#original_filename").html( this.current_node.get("original_filename"));
        }else{
            this.$el.find("#original_filename_area").css("display", "none");
        }
        $("#tag_area").html("");
        this.append_tags(this.current_view.tags);

        // Allows us to read either a node with nested metadata from the server, or an instantiated but unsaved node on the client side.
        //var file_size = (((this.current_node.get("files") || [])[0] || {}).format_size) || ((this.current_node.get("files") || {}).data || {}).size || "";
        this.$("#display_file_size").text(this.current_node.get("metadata").resource_size);
        this.gray_out(false);
        this.update_word_count(this.$el.find("#input_description"), this.$el.find("#description_counter"), this.description_limit);
    },
    enable_submit:function(){
        this.$("#upload_save_button, #upload_save_finish_button, #add_more_button").removeAttr("disabled");
        this.$("#upload_save_button, #upload_save_finish_button, #add_more_button").prop("disabled", false);
    },
    disable_submit:function(){
       this.$("#upload_save_button, #upload_save_finish_button, #add_more_button").attr("disabled", "disabled");
        this.$("#upload_save_button, #upload_save_finish_button, #add_more_button").prop("disabled", true);
    },
    select_item:function(event){
        this.$(".upload_item_checkbox").prop("checked", false);
    },
    check_item: function(event){
        this.$el.find("#uploaded_list .uploaded").removeClass("current_item");
        this.multiple_selected = this.$el.find("#uploaded_list :checked").length > 1;
        this.parent_view.set_editing(this.multiple_selected);
        this.$el.find("#input_title").val((this.multiple_selected || !this.current_node)? " " : this.current_node.get("title"));
        this.$el.find("#input_description").val((this.multiple_selected || !this.current_node)? " " : this.current_node.get("description"));
        if(this.$el.find("#uploaded_list :checked").length == 0){
            this.gray_out(true);
            this.$el.find(".tag_input").addClass("gray-out");
            this.$el.find(".tag_input").prop("disabled", true);
            this.$el.find("#description_counter").html("Select an item first.");
            $("#tag_area").html("");
            return;
        }
        if(this.multiple_selected) {
            this.gray_out(true);
            $("#tag_area").html("");
            this.$el.find("#description_counter").html("Cannot edit for multiple items.");
            var list = this.$el.find('#uploaded_list input:checked').parent("li");
            list.addClass("current_item");

            var tagList = $(list[0]).data("data").tags;
            var license_id = $(list[0]).data("data").model.get("license");

            /* Create list of nodes to edit */
            for(var i = 1; i < list.length; i++){
                var view = $(list[i]).data("data");
                tagList = $(tagList).filter(view.tags);
                if(license_id != view.model.get("license")){
                    license_id = 0;
                }
            }
            this.$("#license_select").val(license_id);
            this.append_tags(tagList);

            this.$(".content_nodes_only").css("display", "inline-block");
            for(var i = 0; i < list.length; i++){
                if($(list[i]).data("data").model.get("kind") === "topic"){
                    this.$(".content_nodes_only").css("display", "none");
                    break;
                }
            }

        }
        else {
            this.gray_out(false);
            this.set_current_node(this.$el.find("#uploaded_list :checked").parent("li").data("data"));
            this.$el.find("#uploaded_list :checked").parent("li").addClass("current_item");
            this.update_word_count(this.$el.find("#input_description"), this.$el.find("#description_counter"), this.description_limit);
        }
    },
    gray_out:function(grayout){
        this.$("#uploaded_list").height($("#edit_details_wrapper").height());
        if(grayout){
            this.$el.find(".disable-on-edit").addClass("gray-out");
            this.$el.find(".upload_input").addClass("gray-out");
            this.$el.find("#input_title").val(" ");
            this.$el.find("#input_description").val(" ");
            this.$el.find(".gray-out").prop("disabled", true);
            $("#editmetadata_format_section").css("display", "none");
            this.$("#metadata_preview_btn").attr("disabled", "disabled");
            this.$("#metadata_preview_btn").prop("disabled", true);
            this.switchPanel(true);
            $("#metadata_preview_btn").css("visibility", "hidden");
        }else{
            this.$el.find(".tag_input").removeClass("gray-out");
            this.$el.find(".upload_input").removeClass("gray-out");
            this.$el.find(".upload_input").prop("disabled", false);
            this.$el.find(".tag_input").prop("disabled", false);
            this.$("#metadata_preview_btn").removeAttr("disabled");
            this.$("#metadata_preview_btn").prop("disabled", false);
        }

    },
    add_tag: function(event){
        $("#tag_error").css("display", "none");
        if((!event || (!event.keyCode || event.keyCode ==13)) && this.$el.find("#tag_box").val().trim() != ""){
            var tag = this.$el.find("#tag_box").val().trim();
            var exists_already = false;
            this.$("#tag_area").find(".tag").each(function(index, entry){
                if(entry.getAttribute("value") === tag){
                    exists_already = true;
                }
            })
            if(!exists_already){
                this.append_tags([tag]);
                if(this.multiple_selected){
                    var list = this.$el.find('#uploaded_list input:checked').parent("li");
                    for(var i = 0; i < list.length; i++){
                        $(list[i]).data("data").add_tag(tag);
                    }
                }else{
                    this.current_view.add_tag(tag);
                }
            }
            this.$el.find("#tag_box").val("");
            this.$("#uploaded_list").height($("#edit_details_wrapper").height());
        }
    },
    remove_tag:function(event){
        var tagname = event.target.getAttribute("value");
        if(this.multiple_selected){
            var list = this.$el.find('#uploaded_list input:checked').parent("li");
            for(var i = 0; i < list.length; i++){
                $(list[i]).data("data").remove_tag(tagname);
            }
        }else{
            this.current_view.remove_tag(tagname);
        }
        event.target.parentNode.remove();
    },
    set_edited:function(event){
        this.$el.find(".disable_on_error").prop("disabled", false);
        this.$el.find("#input_title").removeClass("error_input");
        this.$el.find("#title_error").html("");

        this.set_node_edited();
    },
    handle_error:function(view){
        this.$el.find(".disable_on_error").prop("disabled", true);
        this.set_current(view);
        this.$el.find("#input_title").addClass("error_input");
        this.$el.find("#title_error").html(view.model.validationError);
        view.$el.css("background-color", "#F6CECE");
        this.switchPanel(true);
    },
    load_preview:function(){
        this.preview_view.switch_preview(this.current_node);
    },
    switchPanel:function(switch_to_details){
        $((switch_to_details)? "#metadata_details_btn" : "#metadata_preview_btn").addClass("btn-tab-active");
        $((switch_to_details)? "#metadata_preview_btn" : "#metadata_details_btn").removeClass("btn-tab-active");
        $("#metadata_edit_details").css("display", (switch_to_details)? "block" : "none");
        $("#metadata_preview").css("display", (switch_to_details)? "none" : "block");
    },
    append_tags:function(tags){
        for(var i = 0; i < tags.length; i++){
            var new_tag_elem = document.createElement('div');
            new_tag_elem.className = "col-xs-4 tag";
            $(new_tag_elem).val(tags[i]);
            $(new_tag_elem).text(tags[i]);
            $(new_tag_elem).append("<span class='glyphicon glyphicon-remove pull-right delete_tag' aria-hidden='true' value='" + tags[i] + "'></span>");
            this.$el.find("#tag_area").append(new_tag_elem);
        }
    },
    load_license:function(){
        var license_modal = new LicenseModalView({
            select_license : window.licenses.get({id: $("#license_select").val()})
        })
    },
    select_license:function(){
        this.$("#license_about").css("display", "inline");
        if(this.multiple_selected){
            var license_id = $("#license_select").val();
            var list = this.$el.find('#uploaded_list input:checked').parent("li");
            list.each(function(index, item){
                $(item).data("data").set_license(license_id);
            })
        }else{
            this.set_node_edited();
        }
    }
});

var LicenseModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/license_modal.handlebars"),

    initialize: function(options) {
        this.modal = true;
        this.select_license = options.select_license;
        console.log(this.select_license)
        this.render();
    },

    render: function() {
        this.$el.html(this.template({
            license: this.select_license.toJSON()
        }));
        $("body").append(this.el);
        this.$("#license_modal").modal({show: true});
        this.$("#license_modal").on("hide.bs.modal", this.close);
    }
});

var ContentItem =  BaseViews.BaseListNodeItemView.extend({
    license:function(){
        return window.licenses.get_default().id;
    },
    /* TODO: Implement once other types of content are implemented */
    remove_item: function(){
        this.containing_list_view.collection.remove(this.model);
        this.delete(false);
    },
    submit_item:function(){
        this.containing_list_view.collection.add(this.model);
    },
    delete_item: function(){
        this.delete(true);
    }
});

var NodeListItem = ContentItem.extend({
    template: require("./hbtemplates/content_list_item.handlebars"),
    tagName: "li",
    'id': function() {
        return this.model.cid;
    },
    initialize: function(options) {
        _.bindAll(this, 'submit_topic','remove_topic');
        this.containing_list_view = options.containing_list_view;
        this.file_data = options.file_data;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            topic: this.model,
            edit: this.edit,
        }));
        this.$el.find(".topic_textbox").focus();
    },
    events: {
        'keyup .content_name' : 'submit_topic',
        'click .remove_topic' : 'remove_topic'
    },
    remove_topic: function(){
        this.remove_item();
        this.delete_view();
    },
    submit_topic : function(event){
        this.model.set({
            title: this.$el.find("input").val()
        });
        this.submit_item();
        if(!event.keyCode || event.keyCode ==13){
            this.render();
        }
    }
});

var UploadedItem = ContentItem.extend({
    template: require("./hbtemplates/uploaded_list_item.handlebars"),
    format_view:null,
    initialize: function(options) {
        _.bindAll(this, 'remove_topic', 'enable_submit', 'disable_submit');
        this.containing_list_view = options.containing_list_view;
        this.edited = false;
        this.checked = false;
        this.file_data = options.file_data;
        this.presets = new Models.FormatPresetCollection();
        this.originalData = this.model.pick("title", "description", "license", "changed", "tags");
        this.render();
        this.load_tags();

    },
    render: function() {
        this.$el.html(this.template({
            topic: this.model,
            id: this.model.cid
        }));
        this.$el.find("input[type=checkbox]").prop("checked", this.checked);
        this.set_edited(this.edited);
        this.$el.data("data", this);
        this.load_presets();
    },
    events: {
        'click .remove_topic' : 'remove_topic'
    },
    load_tags:function(){
        this.tags = [];
        if(this.model.get("tags")){
            var self = this;
            this.model.get("tags").forEach(function(entry){
                self.tags.push(window.contenttags.get_or_fetch(entry).get("tag_name"));
            });
        }
    },
    load_presets:function(){
        var self = this;
        window.formatpresets.forEach(function(preset){
            if(preset.get("kind") == self.model.get("kind")){
                var new_slot = preset.clone();
                new_slot.attached_format = null;
                self.model.get("files").forEach(function(f){
                    var file_data = (f.attributes) ? f.attributes : f;
                    if(preset.get("id") == file_data.preset){
                        new_slot.attached_format = new Models.FileModel(file_data);
                        new_slot.set({
                            file_size : file_data.file_size,
                            contentnode: file_data.contentnode,
                            preset : file_data.preset
                        });
                    }
                });
                self.presets.add(new_slot);
            }
        });
        this.format_view = new FileUploader.FormatItem({
            initial:false,
            presets: this.presets,
            model: this.model,
            inline:true,
            el:$("#editmetadata_format_section"),
            containing_list_view:this,
            update_models:!this.containing_list_view.allow_add,
            preview : this.containing_list_view.preview_view
        });
    },
    remove_topic: function(){
        this.delete_item();
    },
    set_edited:function(edited){
        this.edited = edited;
        this.model.set("changed", true);
        if(edited){
            this.set_node();
            this.containing_list_view.enqueue(this);
        }
        $("#item_" + this.model.cid + " .item_name").html(this.model.get("title") + ((edited) ? " <b>*</b>" : ""));
    },
    set_node:function(){
        if(!this.containing_list_view.multiple_selected){
            this.set({
                title: $("#input_title").val().trim(),
                description: $("#input_description").val().trim(),
                license: $("#license_select").val()
            });
        }
    },
    unset_node:function(){
        this.save(this.originalData, {async:false, validate:false});
        this.format_view.unset_model();
    },
    add_tag:function(tagname){
        if(this.tags.indexOf(tagname) < 0){
            this.tags.push(tagname);
        }
        this.set_edited(true);
    },
    remove_tag:function(tagname){
        this.tags.splice(this.tags.indexOf(tagname), 1);
        this.set_edited(true);
    },
    enable_submit:function(){
        this.$el.off('click');
        this.set_edited(true);
    },
    disable_submit:function(){
        this.$el.on('click', function(event) {
          event.preventDefault();
        });
        this.$el.css("pointer", "not-allowed");
    },
    set_license:function(license_id){
        this.model.set("license", license_id);
    }
});

module.exports = {
    AddContentView: AddContentView,
    EditMetadataView:EditMetadataView
}