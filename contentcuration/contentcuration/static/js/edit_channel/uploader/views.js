var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Previewer = require("edit_channel/preview/views");
var stringHelper = require("edit_channel/utils/string_helper");
var autoCompleteHelper = require("edit_channel/utils/autocomplete");
require("uploader.less");

var MetadataModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/uploader_modal.handlebars"),
  initialize: function(options) {
    _.bindAll(this, "close_uploader");
    this.onsave = options.onsave;
    this.onnew = options.onnew;
    this.collection = options.collection;
    this.new_content = options.new_content;
    this.upload_files = options.upload_files;
    this.render(this.close_uploader, {
      new_content: this.new_content,
      title: (this.model)? ((this.model.get("parent"))? this.model.get("title") : window.current_channel.get("name")) : null
    });
    this.metadata_view = new EditMetadataView({
      el: this.$(".modal-body"),
      collection : this.collection,
      onsave: this.onsave,
      onnew: this.onnew,
      onclose: this.close_uploader,
      new_content: this.new_content,
      container:this,
      model:this.model,
      upload_files:this.upload_files
    });
  },
  close_uploader:function(event){
    if(!this.metadata_view.check_for_changes() || !event){
      this.close();
      $(".modal-backdrop").remove();
    }else if(confirm("Unsaved Metadata Detected! Exiting now will"
      + " undo any new changes. \n\nAre you sure you want to exit?")){
      this.metadata_view.undo_changes();
      this.close();
      $(".modal-backdrop").remove();
    }else{
      this.cancel_actions(event);
    }
  }
});

var EditMetadataView = BaseViews.BaseEditableListView.extend({
  template : require("./hbtemplates/edit_metadata_dialog.handlebars"),

  initialize: function(options) {
    _.bindAll(this, 'render_details', 'render_preview', 'render_questions', 'enable_submit', 'disable_submit',
      'save_and_keep_open', 'save_nodes', 'save_and_finish','process_updated_collection');
    this.bind_edit_functions();
    this.collection = options.collection;
    this.new_content = options.new_content;
    this.upload_files = options.upload_files;
    this.onsave = options.onsave;
    this.onnew = options.onnew;
    this.onclose = options.onclose;
    this.render();
    this.render_details();
    this.adjust_list_height();
  },
  events: {
    'click #metadata_details_btn' : 'render_details',
    'click #metadata_preview_btn' : 'render_preview',
    'click #metadata_questions_btn': 'render_questions',
    'click #upload_save_button' : 'save_and_keep_open',
    'click #upload_save_finish_button' : 'save_and_finish'
  },
  render: function() {
    this.$el.html(this.template());
    this.load_preview();
    this.load_list();
    this.load_editor(this.edit_list.selected_items);
  },
  render_details:function(){
    this.switchPanel("details");
  },
  render_preview:function(){
    this.switchPanel("preview");
  },
  render_questions:function(){
    this.switchPanel("questions")
  },
  switchPanel:function(panel_to_show){
    this.$(".tab_button").removeClass("btn-tab-active");
    this.$(".tab_panel").css("display", "none");
    switch(panel_to_show){
      case "preview":
        $("#metadata_preview_btn").addClass("btn-tab-active");
        $("#metadata_preview").css("display", "block");
        break;
      case "questions":
        $("#metadata_questions_btn").addClass("btn-tab-active");
        $("#metadata_questions").css("display", "block");
        break;
      default:
        $("#metadata_details_btn").addClass("btn-tab-active");
        $("#metadata_edit_details").css("display", "block");
    }
  },
  load_list:function(){
    this.edit_list = new EditMetadataList({
      collection:this.collection,
      new_content : this.new_content,
      upload_files : this.upload_files,
      el: this.$("#topic_tree_selector"),
      model: this.model,
      container: this
    });
    this.edit_list.handle_if_individual();
  },
  load_preview:function(){
     this.preview_view = new Previewer.PreviewView({
      modal:false,
      el: this.$("#metadata_preview"),
      model:null
    });
  },
  load_questions:function(model){
    var Exercise = require("edit_channel/exercise_creation/views");
    var exercise_view = new Exercise.ExerciseView({
        parent_view: this,
        model:model,
        onsave:this.reload_ancestors,
        el:$("#metadata_questions")
      });
  },
  load_editor:function(selected_items){
    var is_individual = selected_items.length === 1 && selected_items[0].model.get("kind") !== "topic";
    var is_exercise = is_individual && selected_items[0].model.get("assessment_items").length > 0;
    var has_files = false;
    if(is_individual){
      selected_items[0].model.get("files").forEach(function(file){
        var preset = (file.preset.id)? file.preset.id:file.preset;
        has_files = has_files || window.formatpresets.get({id:preset}).get("display");
      });
    }
    this.$("#metadata_preview_btn").css("display", (is_individual && has_files) ? "inline-block" : "none");
    this.$("#metadata_questions_btn").css("display", (is_exercise) ? "inline-block" : "none");
    if(!is_individual){
      this.render_details();
    }
    if(this.editor_view){
      this.editor_view.stopListening();
      this.editor_view.undelegateEvents();
    }
    this.editor_view = new EditMetadataEditor({
      selected_items:selected_items,
      el: this.$("#edit_details_wrapper"),
      model: this.model,
      container: this,
      shared_data: (this.edit_list)? this.edit_list.shared_data : null
    });
    if(this.edit_list){
      this.edit_list.adjust_list_height();
    }
  },
  enable_submit:function(){
      this.$("#upload_save_button, #upload_save_finish_button").removeAttr("disabled");
      this.$("#upload_save_button, #upload_save_finish_button").prop("disabled", false);
      this.$("#upload_save_button, #upload_save_finish_button").css("cursor", "pointer");
  },
  disable_submit:function(){
      this.$("#upload_save_button, #upload_save_finish_button").attr("disabled", "disabled");
      this.$("#upload_save_button, #upload_save_finish_button").prop("disabled", true);
      this.$("#upload_save_button, #upload_save_finish_button").css("cursor", "not-allowed");
  },
  save_and_keep_open:function(){
    var self = this;
    this.editor_view.add_tag(null);
    this.save("Saving Content...", this.save_nodes).then(function(collection){
      self.process_updated_collection(collection);
    });
  },
  save_and_finish: function(event){
    var self = this;
    this.editor_view.add_tag(null);
    this.save("Saving Content...", this.save_nodes).then(function(collection){
      self.process_updated_collection(collection);
      self.onclose();
    });
  },
  save_nodes:function(){
    var sort_order = (this.model && (this.new_content || this.upload_files)) ? Math.ceil(this.model.get("metadata").max_sort_order) : 0;
    var self = this;
    this.edit_list.views.forEach(function(entry){
      var tags = [];
      entry.tags.forEach(function(tag){
        tags.push("{\"tag_name\" : \"" + tag.replace(/\"/g, "\\\"") + "\",\"channel\" : \"" + window.current_channel.get("id") + "\"}");
      });
      entry.set({
        tags: tags
      });
      if(self.new_content || self.upload_files ){
        entry.set({
          parent:self.model.id,
          sort_order:++sort_order
        });
      }
    });
  },
  process_updated_collection:function(collection){
    var new_collection = new Models.ContentNodeCollection();
    var updated_collection = new Models.ContentNodeCollection();
    this.edit_list.views.forEach(function(view){
      var model = collection.findWhere({id: view.model.id});
      if(model){
        view.set(model.toJSON());
        (view.isNew)? new_collection.add(model) : updated_collection.add(model);
      }
      view.handle_save();
    });
    if(new_collection.length > 0){
      this.onnew(new_collection);
    }
    if(updated_collection.length > 0){
      this.onsave(updated_collection);
    }
  },
  check_for_changes:function(){
    return _.findWhere(this.edit_list.views, {edited : true}) != null;
  },
  undo_changes:function(){
    this.edit_list.views.forEach(function(view){
      view.unset();
    });
  },
  switch_preview:function(model){
    this.preview_view.switch_preview(model);
  },
  adjust_list_height:function(){
    if(this.edit_list){
      this.edit_list.adjust_list_height();
    }
  },

});

var EditMetadataList = BaseViews.BaseEditableListView.extend({
  template : require("./hbtemplates/edit_metadata_list.handlebars"),
  selected_items: [],
  shared_data:{
    shared_tags:[],
    shared_copyright_owner:null,
    shared_license:0,
    shared_author:null,
    all_files:false
  },
  list_selector: "#uploaded_list",
  default_item: "#uploaded_list .default-item",

  initialize: function(options) {
    _.bindAll(this, 'add_topic', 'check_all_wrapper');
    this.bind_edit_functions();
    this.collection = options.collection;
    this.new_content = options.new_content;
    this.upload_files = options.upload_files;
    this.container = options.container;
    this.selected_items = [];
    this.render();
    if(!this.upload_files && !this.new_content && this.collection.length > 1){
      this.$("#uploader_select_all_check").attr("checked", true);
      this.check_all_wrapper(null);
    }
  },
  render: function() {
    this.$el.html(this.template({
      new_content: this.new_content,
      show_list: this.collection.length > 1 || this.new_content || this.upload_files
    }));
    this.load_content();
  },
  events: {
    'click #add_topic_button' : 'add_topic',
    'change #uploader_select_all_check':'check_all_wrapper'
  },
  check_all_wrapper :function(event){
    this.check_all(event);
    this.update_checked();
  },
  adjust_list_height:function(){
    this.$("#uploaded_list_wrapper").css('max-height', $("#edit_details_wrapper").height() * 0.95);
  },
  create_new_view:function(model){
    var uploaded_view = new UploadedItem({
      model: model,
      containing_list_view : this,
      new_content: this.new_content,
      new_file: this.upload_files,
      container: this.container
    });
    this.views.push(uploaded_view);
    return uploaded_view;
  },
  handle_if_individual:function(){
    //Set current node if only one in collection
    if(this.collection.length === 1){
      if(!this.new_content && !this.uploaded_files){
        this.selected_items.push(this.views[0]);
        this.update_shared_values(true, this.views[0]);
        this.container.load_editor(this.selected_items);
        this.container.switch_preview(this.selected_items[0].model);
      }else{
        this.views[0].select_item();
      }
    }
  },
  add_topic:function(){
    var self = this;
    var data = {
      "kind":"topic",
      "title": "Topic",
      "sort_order" : this.collection.length,
      "author": window.current_user.get("first_name") + " " + window.current_user.get("last_name")
    };
    this.create_new_item(data, true, " ").then(function(newView){
      newView.select_item();
    });
  },
  update_checked:function(){
    this.selected_items = [];
    var self = this;
    this.views.forEach(function(view){
      if(!_.contains(self.selected_items, view) && view.$(".upload_item_checkbox").is(":checked")){
            self.selected_items.push(view);
            self.update_shared_values(self.selected_items.length === 1, view);
        }
    });
    this.container.load_editor(this.selected_items);
    if(this.selected_items.length === 1){
      this.container.switch_preview(this.selected_items[0].model);
      if(this.selected_items[0].model.get("kind")==="exercise"){
        this.container.load_questions(this.selected_items[0].model);
      }
    }
  },
  update_shared_values:function(reset, view){
    if(reset){
      this.shared_data.shared_tags = view.tags;
      this.shared_data.shared_copyright_owner = view.model.get("copyright_holder");
      this.shared_data.shared_author = view.model.get("author");
      this.shared_data.shared_license = view.model.get("license");
      this.shared_data.all_files = view.model.get("kind") !== "topic";
    }else{
      this.shared_data.shared_tags = _.intersection(this.shared_data.shared_tags, view.tags);
      this.shared_data.shared_copyright_owner = (this.shared_data.shared_copyright_owner === view.model.get("copyright_holder"))? this.shared_data.shared_copyright_owner : null;
      this.shared_data.shared_author = (this.shared_data.shared_author === view.model.get("author"))? this.shared_data.shared_author : null;
      this.shared_data.shared_license = (this.shared_data.shared_license === view.model.get("license"))? this.shared_data.shared_license : 0;
      this.shared_data.all_files = this.shared_data.all_files && view.model.get("kind")  !== "topic";
    }
  }
});

var EditMetadataEditor = BaseViews.BaseView.extend({
  template:require("./hbtemplates/edit_metadata_editor.handlebars"),
  tags_template:require("./hbtemplates/edit_metadata_tagarea.handlebars"),
  tag_template:require("./hbtemplates/tag_template.handlebars"),
  description_limit : 400,
  selected_items: [],

  initialize: function(options) {
    _.bindAll(this, 'update_count', 'remove_tag', 'add_tag', 'select_tag');
    this.new_content = options.new_content;
    this.upload_files = options.upload_files;
    this.selected_items = options.selected_items;
    this.shared_data = options.shared_data;
    this.container = options.container;
    this.render();
  },
  render: function() {
    var has_files = false;
    if(this.selected_items.length === 1){
      has_files = this.selected_items[0].model.get("kind") !== "topic" && this.selected_items[0].model.get("kind") !== "exercise";
      this.selected_items[0].model.get("files").forEach(function(file){
        var preset = (file.preset.id)? file.preset.id:file.preset;
        has_files = has_files || window.formatpresets.get({id:preset}).get("display");
      });
    }

    // Set license, author, copyright values based on whether selected items have been copied from another source
    var alloriginal = true;
    this.selected_items.forEach(function(item){
      alloriginal = alloriginal && item.isoriginal;
    });

    var original_source_license = "---";
    if(this.shared_data && this.shared_data.shared_license){
      original_source_license = window.licenses.get(this.shared_data.shared_license).get("license_name");
    }
    var copyright_owner = (this.shared_data && this.shared_data.shared_copyright_owner)? this.shared_data.shared_copyright_owner: (alloriginal)? null: "---";
    var author = (this.shared_data && this.shared_data.shared_author)? this.shared_data.shared_author: (alloriginal)? null: "---";

    this.$el.html(this.template({
      node: (this.selected_items.length === 1)? this.selected_items[0].model.toJSON() : null,
      isoriginal: alloriginal,
      is_file: (this.shared_data)? this.shared_data.all_files : false,
      none_selected: this.selected_items.length === 0,
      licenses: window.licenses.toJSON(),
      copyright_owner: copyright_owner,
      author: author,
      selected_count: this.selected_items.length,
      has_files: has_files,
      word_limit: this.description_limit
    }));
    this.update_count();
    this.handle_if_individual();
    if(this.shared_data){
      this.load_tags();
      (!alloriginal)? $("#license_select").text(original_source_license) : $("#license_select").val(this.shared_data.shared_license);
      this.$("#license_about").css("display", (this.shared_data.shared_license > 0)? "inline" : "none");
    }
  },
  handle_if_individual:function(){
    if(this.selected_items.length === 1){
      var view = this.selected_items[0];
      if(view.model.get("kind") !== "topic"){
        view.load_file_displays(this.$("#editmetadata_format_section"));
      }
      if(view.model.get("kind")==="exercise"){
        this.container.load_questions(view.model);
      }
    }
  },
  events: {
    'keyup #input_description': 'update_count',
    'keydown #input_description': 'update_count',
    'paste #input_description': 'update_count',
    'keyup .input_listener': 'set_selected',
    'keydown .input_listener': 'set_selected',
    'paste .input_listener': 'set_selected',
    "click #license_about": "load_license",
    "change #license_select" : "select_license",
    'keypress #tag_box' : 'add_tag',
    'click .delete_tag':'remove_tag',
  },
  load_tags:function(){
    this.$("#tag_area").html(this.tags_template({
      tags:this.shared_data.shared_tags
    }));
    var self = this;
    var tags = _.reject(window.contenttags.pluck("tag_name"), function(tag){
      return self.shared_data.shared_tags.indexOf(tag) >= 0;
    });
    autoCompleteHelper.addAutocomplete($( "#tag_box" ), tags, this.select_tag, "#tag_area_wrapper");
  },
  load_license:function(){
    iscopied = this.selected_items.length === 1 && !this.selected_items[0].isoriginal
    var license_modal = new LicenseModalView({
      select_license : window.licenses.get({id: (iscopied)? this.selected_items[0].model.get("license") : $("#license_select").val()})
    })
  },
  update_count:function(){
    if(this.selected_items.length === 1){
      var char_length = this.description_limit - this.$("#input_description").val().length;
      if(this.$("#input_description").val() == ""){
        char_length = this.description_limit;
      }
      if(char_length < 0){
        char_length *= -1;
        this.$("#description_counter").html("Too long - recommend removing " + char_length + ((char_length  == 1) ? " character" : " characters"));
        this.$("#description_counter").css("color", "red");
      }else{
        this.$("#description_counter").html(char_length + ((char_length  == 1) ? " character left" : " characters left"));
        this.$("#description_counter").css("color", "gray");
      }

    }
  },
  select_tag:function(selected_tag){
    this.assign_tag(selected_tag.label);
  },
  add_tag: function(event){
    $("#tag_error").css("display", "none");
    var code = (!event)? null : event.keyCode ? event.keyCode : event.which;
    if(!code || code ==13){
      $(".ui-menu-item").hide();
      if(this.$el.find("#tag_box").length > 0 && this.$el.find("#tag_box").val().trim() != ""){
        var tag = this.$el.find("#tag_box").val().trim();
        if(!window.contenttags.findWhere({'tag_name':tag})){
          window.contenttags.add(new Models.TagModel({tag_name: tag, channel: window.current_channel.id}));
        }
        this.assign_tag(tag);
      }
    }
  },
  assign_tag:function(tag){
    if(this.shared_data.shared_tags.indexOf(tag) < 0){
      this.shared_data.shared_tags.push(tag);
      this.selected_items.forEach(function(view){
        view.add_tag(tag);
      });
      this.load_tags();
    }
    this.$el.find("#tag_box").val("");
    this.container.adjust_list_height();
  },
  remove_tag:function(event){
    var tagname = event.target.getAttribute("value");
    this.selected_items.forEach(function(view){
      view.remove_tag(tagname);
    });
    this.load_tags();
    event.target.parentNode.remove();
    window.contenttags.remove(window.contenttags.findWhere({'tag_name':tagname}));
  },
  select_license:function(){
    this.$("#license_about").css("display", "inline");
    this.set_selected();
  },
  set_selected:function(){
    if(this.selected_items.length === 1 && this.$("#input_title").val().trim() == ""){
      this.$("#title_error").css("display", "inline-block");
      if(this.collection && this.collection.length === 1 && !this.new_content && !this.uploaded_files){
          this.container.disable_submit();
      }
    }else{
      this.$("#title_error").css("display", "none");
      this.container.enable_submit();
      this.selected_items.forEach(function(view){
          view.set_node();
      })
    }
  }
});

var UploadedItem = BaseViews.BaseListEditableItemView.extend({
  template: require("./hbtemplates/uploaded_list_item.handlebars"),
  selectedClass:"current_item",
  format_view:null,
  'id': function() {
      return "item_" + this.model.get("id");
  },
  className: "uploaded disable_on_error",
  tagName: "li",
  initialize: function(options) {
      _.bindAll(this, 'remove_topic', 'check_item', 'select_item','update_name', 'set_edited','handle_change');
      this.bind_edit_functions();
      this.containing_list_view = options.containing_list_view;
      this.container = options.container;
      this.edited = false;
      this.new_content = options.new_content;
      this.new_file = options.new_file;
      this.render();
      this.isNew = this.new_content || this.new_file;
      this.set_edited(this.isNew);
      this.load_tags();
      this.uploads_in_progress = 0;
      this.isoriginal = !this.model.get("original_channel") || this.model.get("original_channel").id == window.current_channel.id;
      this.listenTo(this.model, "change:title", this.update_name);
  },
  render: function() {
      this.$el.html(this.template({
          node: this.model.toJSON(),
          new_content: this.new_content,
          isfolder: this.model.get("kind") === "topic"
      }));
  },
  update_name:function(){
    this.$el.find(".item_name").text(this.model.get("title"));
    this.$el.find("h5").prop("title", this.model.get("title"));
  },
  events: {
      'click .remove_topic' : 'remove_topic',
      'click .upload_item_checkbox': 'check_item',
      'click .uploaded_list_item' : 'select_item',
  },
  remove_topic: function(){
      this.delete(true, "");
  },
  check_item:function(){
      this.handle_checked();
      this.containing_list_view.update_checked();
  },
  select_item:function(event){
    $(".upload_item_checkbox:checked").attr("checked", false);
    $(".uploaded").removeClass(this.selectedClass);
    if(!event){
      this.$(".upload_item_checkbox").attr("checked", true);
    }
    $("#uploader_select_all_check").attr("checked", false);
    this.check_item();
  },
  set_edited:function(is_edited){
      var edited_data = this.model.pick("title", "description", "license", "changed", "tags", "copyright_holder", "author", "files")
      // Handle unsetting node
      if(!is_edited){
          this.originalData = edited_data;
      }
      this.edited = JSON.stringify(this.originalData) != JSON.stringify(edited_data);
      this.isNew =  is_edited && this.isNew;
      (this.edited)? this.$el.addClass("edited_node") : this.$el.removeClass("edited_node");
      this.model.set("changed", this.model.get("changed") || this.edited);
  },
  set_node:function(){
    var individual_selected = this.containing_list_view.selected_items.length === 1;
    var data = {
          title: (individual_selected)? $("#input_title").val().trim() : this.model.get("title"),
          description: (individual_selected)? $("#input_description").val().trim() : this.model.get("description"),
          license: ($("#license_select").is(":visible") && $("#license_select").val()!=0)? $("#license_select").val() : this.model.get("license"),
          copyright_holder: ($("#input_license_owner").is(":visible") && (individual_selected || $("#input_license_owner").val() !== ""))? $("#input_license_owner").val().trim() : this.model.get("copyright_holder"),
          author: ($("#author_field").is(":visible") && (individual_selected || $("#author_field").val() !== ""))? $("#author_field").val().trim() : this.model.get("author"),
      };
      this.set(data);
      this.set_edited(true);
  },
  unset_node:function(){
      this.unset();
      this.set_edited(false);
  },
  handle_save:function(){
      this.set_edited(false);
  },
  load_tags:function(){
      this.tags = [];
      if(this.model.get("tags")){
          var self = this;
          fetch_tags = [];
          this.model.get("tags").forEach(function(entry){
              fetch_tags.push((entry.id)? entry.id : entry);
          });
          this.tags = window.contenttags.get_all_fetch(fetch_tags).pluck('tag_name');
      }
  },
  load_file_displays:function(formats_el){
      var FileUploader = require("edit_channel/file_upload/views");
      this.format_view = new FileUploader.FormatInlineItem({
          model: this.model,
          containing_list_view:this
      });
      formats_el.html(this.format_view.el);
      this.listenTo(this.model, "change:files", this.handle_change);
  },
  handle_change:function(){
    this.set_edited(true);
    $("#metadata_preview_btn").css("display", "inline-block");
    this.container.preview_view.load_preview();
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
  set_uploading:function(uploading){
        (uploading)? this.uploads_in_progress++ : this.uploads_in_progress--;
        (this.uploads_in_progress===0)? this.container.enable_submit() : this.container.disable_submit();
    }
});

var LicenseModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),

  initialize: function(options) {
      this.modal = true;
      this.select_license = options.select_license;
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

module.exports = {
    MetadataModalView: MetadataModalView,
    EditMetadataView:EditMetadataView
}