var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var FileUploader = require("edit_channel/file_upload/views");
var Previewer = require("edit_channel/preview/views");
var stringHelper = require("edit_channel/utils/string_helper");
require("uploader.less");

var MetadataModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/uploader_modal.handlebars"),
  initialize: function(options) {
    _.bindAll(this, "close_uploader");
    this.onsave = options.onsave;
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
      onclose: this.close_uploader,
      new_content: this.new_content,
      container:this,
      model:this.model,
      upload_files:this.upload_files
    });
  },
  close_uploader:function(event){
    if(!this.metadata_view.check_for_changes()){
      this.close();
      $(".modal-backdrop").remove();
    }else if(confirm("Unsaved Metadata Detected! Exiting now will"
      + " undo any new changes. \n\nAre you sure you want to exit?")){
      this.metadata_view.undo_changes();
      this.close();
      $(".modal-backdrop").remove();
    }else{
      event.stopPropagation();
      event.preventDefault();
    }
  }
});

var EditMetadataView = BaseViews.BaseEditableListView.extend({
  template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
  editor_template:require("./hbtemplates/edit_metadata_editor.handlebars"),
  tags_template:require("./hbtemplates/edit_metadata_tagarea.handlebars"),
  tag_template:require("./hbtemplates/tag_template.handlebars"),
  description_limit : 400,
  multiple_selected: false,
  current_node: null,
  selected_items: [],
  none_selected :true,
  shared_tags:[],
  shared_copyright_owner:null,
  shared_license:0,
  shared_author:null,
  all_files : false,
  list_selector: "#uploaded_list",
  default_item: "#uploaded_list .default-item",

  initialize: function(options) {
    _.bindAll(this, 'add_topic', 'update_count','set_selected','render_details', 'render_preview','save_nodes',
      'enable_submit', 'disable_submit', 'save_and_keep_open', 'remove_tag', 'add_tag','save_and_finish');
    this.bind_edit_functions();
    this.collection = options.collection;
    this.new_content = options.new_content;
    this.upload_files = options.upload_files;
    this.onsave = options.onsave;
    this.onclose = options.onclose;
    this.render();
  },
  render: function() {
    this.$el.html(this.template({
      show_list: this.collection.length > 1 || this.new_content,
      new_content: this.new_content,
      word_limit : this.description_limit,
      modal: this.modal,
      upload_files: this.upload_files
    }));
    this.load_content(this.collection);
    this.handle_if_individual();
    this.load_editor();
    this.preview_view = new Previewer.PreviewView({
      modal:false,
      el: this.$("#metadata_preview"),
      model:null
    });
  },
  events: {
    'click #metadata_details_btn' : 'render_details',
    'click #metadata_preview_btn' : 'render_preview',
    'click #add_topic_button' : 'add_topic',
    'keyup #input_description': 'update_count',
    'keydown #input_description': 'update_count',
    'paste #input_description': 'update_count',
    'click #add_topic_button' : 'add_topic',
    'keyup .input_listener': 'set_selected',
    'keydown .input_listener': 'set_selected',
    'paste .input_listener': 'set_selected',
    "click #license_about": "load_license",
    "change #license_select" : "select_license",
    'keypress #tag_box' : 'add_tag',
    'click .delete_tag':'remove_tag',
    'click #upload_save_button' : 'save_and_keep_open',
    'click #upload_save_finish_button' : 'save_and_finish'
  },
/* LOADING OPERATIONS */
  handle_if_individual:function(){
    //Set current node if only one in collection
    if(this.collection.length === 1){
      if(!this.new_content && !this.uploaded_files){
        this.current_view = this.views[0];
        this.selected_items.push(this.views[0]);
        this.update_shared_values(true, this.current_view);
      }else{
        this.views[0].$(".upload_item_checkbox").attr("checked", true);
        this.views[0].$el.addClass("current_item")
        this.update_checked();
      }
    }
  },
  load_editor:function(){
    this.$("#edit_details_wrapper").html(this.editor_template({
      node: (this.current_view)? this.current_view.model.toJSON() : null,
      is_file: this.all_files,
      none_selected: this.selected_items.length === 0,
      licenses: window.licenses.toJSON(),
      copyright_owner: this.shared_copyright_owner,
      author: this.shared_author
    }));
    $("#metadata_preview_btn").css("display", (this.all_files && this.current_view)? "inline-block" : "none");
    this.update_count();
    /*Load only one node*/
    if(this.current_view){
      this.current_view.load_file_displays(this.$("#editmetadata_format_section"));
    }
    this.switchPanel(true);
    this.load_tags();
    $("#license_select").val(this.shared_license);
    $( "#tag_box" ).autocomplete({
      source: window.contenttags.pluck("tag_name"),
      minLength: 0,
      select: this.add_tag
    });
  },
  load_tags:function(){
    this.$("#tag_area").html(this.tags_template({
      tags:this.shared_tags
    }));
  },
  load_license:function(){
    var license_modal = new LicenseModalView({
      select_license : window.licenses.get({id: $("#license_select").val()})
    })
  },
  render_details:function(){
    this.switchPanel(true);
  },
  render_preview:function(){
    this.switchPanel(false);
    this.preview_view.switch_preview(this.current_view.model);
  },
  switchPanel:function(switch_to_details){
    $((switch_to_details)? "#metadata_details_btn" : "#metadata_preview_btn").addClass("btn-tab-active");
    $((switch_to_details)? "#metadata_preview_btn" : "#metadata_details_btn").removeClass("btn-tab-active");
    $("#metadata_edit_details").css("display", (switch_to_details)? "block" : "none");
    $("#metadata_preview").css("display", (switch_to_details)? "none" : "block");
  },
/* INPUT OPERATIONS */
  update_count:function(){
    stringHelper.update_word_count(this.$("#input_description"), this.$("#description_counter"), this.description_limit);
  },
  append_tags:function(tags){
    for(var i = 0; i < tags.length; i++){
      this.$("#tag_area").append(this.tag_template({
        tag: tags[i]
      }));
    }
  },
  add_tag: function(event){
    $("#tag_error").css("display", "none");
    if((!event || (!event.keyCode || event.keyCode ==13)) && this.$el.find("#tag_box").val().trim() != ""){
      var tag = this.$el.find("#tag_box").val().trim();
      if(this.shared_tags.indexOf(tag) < 0){
        this.append_tags([tag]);
        this.selected_items.forEach(function(view){
          view.add_tag(tag);
        })
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
/* CONTENT CREATION OPERATIONS */
  create_new_view:function(model){
    var uploaded_view = new UploadedItem({
      model: model,
      containing_list_view : this,
      new_content: this.new_content,
      new_file: this.upload_files
    });
    this.views.push(uploaded_view);
    return uploaded_view;
  },
      add_topic:function(){
          var self = this;
          var data = {
              "kind":"topic",
              "title": "Topic",
              "sort_order" : this.collection.length,
              "author": window.current_user.get("first_name") + " " + window.current_user.get("last_name")
          };
          this.create_new_item(data, true, "Creating Topic...").then(function(newView){
              newView.set({
                  "original_node" : newView.model.get("id"),
                  "cloned_source" : newView.model.get("id")
              });
          });
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
  /* UPDATE OPERATIONS */
      select_license:function(){
          this.$("#license_about").css("display", "inline");
          this.set_selected();
      },
      set_selected:function(){
          if(this.current_view && this.$("#input_title").val().trim() == ""){
              this.$("#title_error").css("display", "inline-block");
              if(this.collection.length === 1 && !this.new_content && !this.uploaded_files){
                  this.disable_submit();
              }
          }else{
              this.$("#title_error").css("display", "none");
              this.enable_submit();
              this.selected_items.forEach(function(view){
                  view.set_node();
              })
          }
      },
      check_for_changes:function(){
          if(this.collection.length === 1){
              return this.views[0].edited;
          }
         return this.$el.find(".edited_node").length > 0;
      },
      undo_changes:function(){
          this.views.forEach(function(view){
              view.unset_node();
          })
      },
      save_and_keep_open:function(){
        var self = this;
        this.add_tag(null);
        this.save("Saving Content...", this.save_nodes).then(function(collection){
          self.onsave(collection);
        });
      },
      save_and_finish: function(event){
        var self = this;
        this.add_tag(null);
        this.save("Saving Content...", this.save_nodes).then(function(collection){
          self.onsave(collection);
          self.onclose(event);
        });
      },
      save_nodes:function(){
        var sort_order = null;
        var self = this;
        if(this.model && (this.new_content || this.upload_files)){
          sort_order = Math.ceil(this.model.get("metadata").max_sort_order);
        }
        this.views.forEach(function(entry){
          entry.set_edited(false);
          var tags = [];
          entry.tags.forEach(function(tag){
            tags.push("{\"tag_name\" : \"" + tag.replace(/\"/g, "\\\"") + "\",\"channel\" : \"" + window.current_channel.get("id") + "\"}");
          })
          entry.set({tags: tags});
          if(sort_order){
            entry.set({
              parent:self.model.id,
              sort_order:++sort_order
            });
          }
          if(entry.format_view){
            entry.format_view.update_file();
            entry.format_view.clean_files();
          }
        });
      },
  /* SWITCHING OPERATIONS */
      update_checked:function(){
          this.selected_items = [];
          this.shared_tags = [];
          this.shared_copyright_owner = null;
          this.shared_author = null;
          this.shared_license = 0;
          this.shared_author = null;
          all_files = false;
          var self = this;

          this.$el.find(".current_item").each(function(index, el){
              var view = $(el).data('data');
              if(self.selected_items.indexOf(view) < 0){
                  self.selected_items.push(view);
                  self.update_shared_values(self.selected_items.length === 1, view);
              }
          });

          this.current_view = (this.selected_items.length === 1)? this.selected_items[0] : null;
          this.load_editor();
      },
      update_shared_values:function(reset, view){
          if(reset){
              this.shared_tags = view.tags;
              this.shared_copyright_owner = view.model.get("copyright_holder");
              this.shared_author = view.model.get("author");
              this.shared_license = view.model.get("license");
              this.all_files = view.model.get("kind") !== "topic";
          }else{
              $(this.shared_tags).filter(view.tags);
              this.shared_copyright_owner = (this.shared_copyright_owner === view.model.get("copyright_holder"))? this.shared_copyright_owner : null;
              this.shared_author = (this.shared_author === view.model.get("author"))? this.shared_author : null;
              this.shared_license = (this.shared_license === view.model.get("license"))? this.shared_license : 0;
              this.all_files = this.all_files && view.model.get("kind")  !== "topic";
          }
      }
});

var UploadedItem = BaseViews.BaseListEditableItemView.extend({
  template: require("./hbtemplates/uploaded_list_item.handlebars"),
  format_view:null,
  'id': function() {
      return "item_" + this.model.get("id");
  },
  className: "uploaded disable_on_error",
  tagName: "li",
  initialize: function(options) {
      _.bindAll(this, 'remove_topic', 'check_item', 'select_item', 'enable_submit', 'disable_submit');
      this.containing_list_view = options.containing_list_view;
      this.edited = false;
      this.new_content = options.new_content;
      this.new_file = options.new_file;
      this.presets = new Models.FormatPresetCollection();
      this.originalData = this.model.pick("title", "description", "license", "changed", "tags", "copyright_holder");
      this.render();
      this.set_edited(this.new_content || this.new_file);
      this.load_tags();
  },
  render: function() {
      this.$el.html(this.template({
          node: this.model.toJSON(),
          new_content: this.new_content
      }));
      this.$el.data("data", this);
      if(this.model.get("kind") != "topic"){
          this.load_presets();
      }
  },
  events: {
      'click .remove_topic' : 'remove_topic',
      'change .upload_item_checkbox': 'check_item',
      'click .uploaded_list_item' : 'select_item',
  },
  remove_topic: function(){
      this.containing_list_view.views.slice(this.containing_list_view.views.indexOf(this));
      this.containing_list_view.collection.remove(this.model);
      this.model.destroy();
      this.remove();
  },

  set_edited:function(is_edited){
      this.edited = is_edited;
      this.model.set("changed", this.model.get("changed") || is_edited);
      (is_edited)? this.$el.addClass("edited_node") : this.$el.removeClass("edited_node");
      if(!is_edited){
          this.originalData = this.model.pick("title", "description", "license", "changed", "tags", "copyright_holder");
      }
  },
  set_node:function(){
      this.model.set({
          title: (this.containing_list_view.selected_items.length === 1)? $("#input_title").val().trim() : this.model.get("title"),
          description: (this.containing_list_view.selected_items.length===1)? $("#input_description").val().trim() : this.model.get("description"),
          license: (this.model.get("kind") != "topic" && $("#license_select").val()!=0)? $("#license_select").val() : this.model.get("license"),
          copyright_holder: (this.model.get("kind") != "topic" && $("#input_license_owner").val() !== "")? $("#input_license_owner").val().trim() : this.model.get("copyright_holder")
      });
      this.$el.find(".item_name").text(this.model.get("title"));
      this.$el.find("h5").prop("title", this.model.get("title"));
      this.set_edited(true);
  },
  unset_node:function(){
      var self = this;
      this.model.set(this.originalData, {
          success:function(){
              self.format_view.unset_model();
          },
          error:function(obj, error){
              console.log("Error undoing changes", obj);
              console.log("Error message:", error);
          }
      });
      this.$el.find(".item_name").text(this.model.get("title"));
      this.set_edited(false);
  },
  handle_save:function(){
      this.set_edited(false);
  },
  check_item:function(){
      (this.$(".upload_item_checkbox").is(":checked"))? this.$el.addClass("current_item") : this.$el.removeClass("current_item")
      this.containing_list_view.update_checked();
  },
  select_item:function(){
      var is_checked = this.$(".upload_item_checkbox").is(":checked");
      $(".upload_item_checkbox:checked").prop("checked", false);
      $(".uploaded").removeClass("current_item");
      this.$(".upload_item_checkbox").attr("checked", is_checked);
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
  load_file_displays:function(formats_el){
      this.format_view = new FileUploader.FormatItem({
          initial:false,
          presets: this.presets,
          model: this.model,
          inline:true,
          el:formats_el,
          containing_list_view:this,
          update_models:!this.containing_list_view.allow_add,
          preview : this.containing_list_view.preview_view
      });
      this.format_view.display_inline();
  },
  enable_submit:function(){
      this.containing_list_view.enable_submit();
  },
  disable_submit:function(){
      this.containing_list_view.disable_submit();
      this.set_edited(true);
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

module.exports = {
    MetadataModalView: MetadataModalView,
    EditMetadataView:EditMetadataView
}