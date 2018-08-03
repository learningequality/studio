var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Related = require("edit_channel/related/views");
var Previewer = require("edit_channel/preview/views");
var FileUploader = require("edit_channel/file_upload/views");
var Exercise = require("edit_channel/exercise_creation/views");
var Info = require("edit_channel/information/views");
var stringHelper = require("edit_channel/utils/string_helper");
var autoCompleteHelper = require("edit_channel/utils/autocomplete");
var dialog = require("edit_channel/utils/dialog");
require("uploader.less");

var NAMESPACE = "uploader";
var MESSAGES = {
    "of": "of",
    "author": "Author",
    "aggregator": "Aggregator",
    "provider": "Provider",
    "details": "Details",
    "license": "License",
    "questions": "Questions",
    "tags": "Tags",
    "copyright_holder": "Copyright Holder",
    "prereqs": "Prerequisites",
    "dont_save": "Discard Changes",
    "keep_open": "Keep Editing",
    "mastery_criteria": "Mastery Criteria",
    "editing_header": "Editing Content Details",
    "remove_tag": "Remove Tag",
    "adding_topics": "Adding Topics to {title}",
    "adding_exercise": "Adding Exercise to {title}",
    "editing_content": "Editing Content",
    "viewing_content": "Viewing Content",
    "save": "SAVE",
    "save_and_close": "SAVE & CLOSE",
    "select_prompt": "Please select an item to view.",
    "select_to_edit": "Please select an item to edit.",
    "selected_count": "Viewing data for {count, plural,\n =1 {# item}\n other {# items}}",
    "editing_count": "Editing data for {count, plural,\n =1 {# item}\n other {# items}}",
    "detected_import": "Detected items imported from another channel",
    "detected_import_disabled": "Detected items imported from another channel - fields disabled accordingly",
    "title": "Title",
    "title_error": "Title cannot be blank",
    "title_placeholder": "Enter a title...",
    "source": "Source:",
    "readonly": "READ-ONLY Source:",
    "readonly_text": "READ-ONLY: content has been imported with view-only permission",
    "permissions_vary": "Permissions Vary",
    "description": "Description",
    "chars_left": "{data, plural,\n =1 {# character}\n other {# characters}} left",
    "too_long": "Too long - recommend removing {data, plural,\n =1 {# character}\n other {# characters}}",
    "description_placeholder": "Enter a description of your content...",
    "tags_text": "(press 'Enter' to add new tag)",
    "tags_error": "Invalid characters found.",
    "tags_placeholder": "Enter tag...",
    "related_content_warning": "Related content will not be included in the copy of this content.",
    "author_placeholder": "Enter author...",
    "author_description": "Person or organization who created this content",
    "aggregator_placeholder": "Enter aggregator...",
    "aggregator_description": "Website or org hosting the content collection but not necessarily the creator or copyright holder",
    "provider_placeholder": "Enter provider...",
    "provider_description": "Organization that commissioned or is distributing the content",
    "license_description_placeholder": "Enter license description...",
    "copyright_holder_placeholder": "Enter copyright holder name...",
    "same_as_channel": "Same as Channel",
    "same_as_topic": "Same as Topic",
    "invalid_items": "One or more of the selected items is invalid",
    "license_error": "License is required",
    "special_permission_error": "Special permissions license must have a description",
    "copyright_holder_error": "Copyright holder is required",
    "no_title": "No Title",
    "fix_errors_prompt": "Saving disabled (invalid content detected)",
    "error_saving": "Save Failed",
    "save_failed": "There was a problem saving your content.",
    "out_of_space": "Out of Disk Space",
    "out_of_space_text": "You don't have enough space to save these files. Request more space under the Settings > Account page.",
    "open_settings": "Open Settings",
    "ok": "OK",
    "role_visibility": "Visible to",
    "imported_from": "Imported from:"
}

var MetadataModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/uploader_modal.handlebars"),
  name: NAMESPACE,
  $trs: MESSAGES,
  initialize: function(options) {
    _.bindAll(this, "close_uploader");
    this.allow_edit = options.allow_edit;
    this.isclipboard = options.isclipboard;
    this.render(this.close_uploader, {
      new_content: options.new_content,
      new_topic: options.new_topic,
      title: (this.model)? ((this.model.get("parent"))? this.model.get("title") : window.current_channel.get("name")) : null,
      allow_edit: this.allow_edit
    });
    this.metadata_view = new EditMetadataView({
      el: this.$(".modal-body"),
      collection : options.collection,
      onsave: options.onsave,
      onnew: options.onnew,
      onclose: this.close_uploader,
      new_exercise: options.new_exercise,
      new_content: options.new_content,
      new_topic: options.new_topic,
      container:this,
      model:this.model,
      allow_edit: this.allow_edit,
      isclipboard: this.isclipboard
    });
    this.$(".modal").on('shown.bs.modal', this.metadata_view.init_editor);
  },
  events: {
    'keydown #uploaderModal': 'handle_escape',
  },
  handle_escape: function(event){
    if(event && (event.keyCode || event.which) === 27){
      this.close_uploader();
    }
  },
  close_uploader:function(event){
    if(!this.allow_edit || (this.metadata_view && !this.metadata_view.check_for_changes()) || !event){
      this.close();
      $(".modal-backdrop").remove();
      window.channel_router.update_url(null, null, window.title);
    }else{
      var t = event.target;
      var self = this;
      dialog.dialog(this.get_translation("unsaved_changes"), this.get_translation("unsaved_changes_text"), {
          [self.get_translation("dont_save")]: function(){
              self.metadata_view.undo_changes();
              self.close();
              $(".modal-backdrop").remove();
              window.channel_router.update_url(null, null, window.title);
          },
          [self.get_translation("keep_open")]:function(){},
          [self.get_translation("save")]:function(){
            self.metadata_view.save_and_finish();
            window.channel_router.update_url(null, null, window.title);
          },
      }, null);
      self.cancel_actions(event);
    }
  }
});

var EditMetadataView = BaseViews.BaseEditableListView.extend({
  template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
  name: NAMESPACE,
  $trs: MESSAGES,

  initialize: function(options) {
    _.bindAll(this, 'render_details', 'render_preview', 'render_questions', 'render_prerequisites', 'enable_submit', 'disable_submit',
      'save_and_keep_open', 'save_nodes', 'save_and_finish','process_updated_collection', 'close_upload', 'copy_items', 'save_error',
      'set_prerequisites', 'call_duplicate', 'update_prereq_count','loop_focus', 'set_indices', 'set_editor_focus', 'validate', 'init_editor');
    this.bind_edit_functions();
    this.new_content = options.new_content;
    this.new_exercise = options.new_exercise;
    this.onsave = options.onsave;
    this.onnew = options.onnew;
    this.new_topic = options.new_topic;
    this.onclose = options.onclose;
    this.allow_edit = options.allow_edit;
    this.isclipboard = options.isclipboard;
    this.show_errors = !this.new_content;
    this.render();
    this.render_details();
    this.adjust_list_height();
  },
  events: {
    'click #metadata_details_btn' : 'render_details',
    'click #metadata_preview_btn' : 'render_preview',
    'click #metadata_questions_btn': 'render_questions',
    'click #metadata_prerequisites_btn': 'render_prerequisites',
    'click #upload_save_button' : 'save_and_keep_open',
    'click #upload_save_finish_button' : 'save_and_finish',
    'keypress #upload_save_finish_button': 'handle_save_and_finish_key',
    'click #copy_button': 'copy_items',
    'click #close_uploader_button': 'close_upload',
    'focus .input-tab-control': 'loop_focus',
  },
  render: function() {
    this.$el.html(this.template({
      allow_edit: this.allow_edit,
      staging: window.staging,
      isclipboard: this.isclipboard
    }, {
      data: this.get_intl_data()
    }));

    var self = this;
    this.collection.fetch_nodes_by_ids_complete(this.collection.pluck('id'), !this.collection.has_all_data()).then(function(fetched){
      self.collection.reset(fetched.toJSON());
      self.load_list();
      if(self.collection.length > 1){
        self.load_editor(self.edit_list.selected_items);
      }
    });
  },
  render_details:function(){
    this.is_details = true;
    this.switchPanel("details");
  },
  render_preview:function(){
    this.is_details = false;
    this.switchPanel("preview");
  },
  render_questions:function(){
    this.is_details = false;
    this.switchPanel("questions");
  },
  render_prerequisites: function(){
    this.is_details = false;
    this.switchPanel("prerequisites")
  },
  switchPanel:function(panel_to_show){
    this.$(".tab_button").removeClass("btn-tab-active");
    this.$(".tab_panel").css("display", "none");
    switch(panel_to_show){
      case "preview":
        $("#metadata_preview_btn").addClass("btn-tab-active");
        $("#metadata_preview").css("display", "block");
        $("#metadata_preview").find("iframe").prop("src", function(){return $(this).data("src");});
        break;
      case "questions":
        $("#metadata_questions_btn").addClass("btn-tab-active");
        $("#metadata_questions").css("display", "block");
        $("#metadata_preview").find("iframe").prop("src", "about:blank");
        break;
      case "prerequisites":
        $("#metadata_prerequisites_btn").addClass("btn-tab-active");
        $("#metadata_prerequisites").css("display", "block");
        break;
      default:
        $("#metadata_details_btn").addClass("btn-tab-active");
        $("#metadata_edit_details").css("display", "block");
        $("#metadata_preview").find("iframe").prop("src", "about:blank");
        if (this.editor_view){
          this.editor_view.set_initial_focus();
        }
    }
  },
  load_list:function(){
    this.edit_list = new EditMetadataList({
      collection:this.collection,
      new_content : this.new_content,
      new_exercise : this.new_exercise,
      new_topic: this.new_topic,
      el: this.$("#topic_tree_selector"),
      model: this.model,
      container: this,
      allow_edit: this.allow_edit
    });
    this.edit_list.handle_if_individual();
  },
  load_preview:function(view){
     view.load_preview_display(this.$("#metadata_preview"));
  },
  load_questions:function(view){
    view.load_question_display(this.$("#metadata_questions"));
  },
  load_prerequisites:function(selected_items){
    if(selected_items.length){
      if(this.prerequisite_view){
        this.prerequisite_view.stopListening();
        this.prerequisite_view.undelegateEvents();
      }
      this.prerequisite_view = new Related.PrerequisiteView({
        modal: false,
        model: selected_items[0].model,
        oncount: this.update_prereq_count,
        onselect: this.set_prerequisites,
        views_to_update: selected_items,
        el: this.$("#metadata_prerequisites"),
        allow_edit: this.allow_edit
      });
    }
  },
  update_prereq_count: function(count){
    this.$(".prereq_badge").text(count)
  },
  set_prerequisites:function(prerequisite_list, selected_items){
      var self = this;
      selected_items.forEach(function(view){
        // TODO: Handle prerequisites that were previously set on the node if multiple selected
        view.set_node({'prerequisite': prerequisite_list});
        view.set_edited(true);
      });
  },
  load_editor:function(selected_items){
    var is_individual = selected_items.length === 1;
    var is_exercise = is_individual && selected_items[0].model.get("kind") == "exercise";
    var has_files = is_individual && selected_items[0].model.get("files").some(function(f){
                      return window.formatpresets.get({id: f.preset.name || f.preset.id || f.preset}).get("display");
                    });
    this.$("#metadata_details_btn").css("display", (selected_items.length) ? "inline-block" : "none");
    this.$("#metadata_preview_btn").css("display", (is_individual && has_files) ? "inline-block" : "none");
    this.$("#metadata_prerequisites_btn").css("display", (is_individual && (has_files || is_exercise)) ? "inline-block" : "none");
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
      shared_data: (this.edit_list)? this.edit_list.shared_data : null,
      allow_edit: this.allow_edit,
      new_content: this.new_content,
    });
    if(this.edit_list){
      this.edit_list.adjust_list_height();
    }
    _.defer(this.set_indices);
  },
  init_editor: function() {
    if(this.editor_view){
      this.editor_view.handle_if_individual();
      _.defer(this.editor_view.set_initial_focus);
    }
  },
  set_editor_focus: function(){
    if(this.editor_view){
      _.defer(this.editor_view.set_initial_focus);
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
  close_upload:function(){
    this.onclose();
  },
  validate: function() {
    if(!this.is_details){
      this.render_details();
    }
    var isInvalid = this.edit_list && this.edit_list.validate();
    if(isInvalid) {
      this.disable_submit();
      this.$(".editmetadata_save").attr("title", this.get_translation("fix_errors_prompt"));
      if(isInvalid !== 1) {
        $("#editor_errors").css("display", "block").text(isInvalid);
      }
    } else {
      this.enable_submit();
      this.$(".editmetadata_save").attr("title", null);
      $("#editor_errors").css("display", "none");
    }
    return !isInvalid;
  },
  save_and_keep_open:function(){
    this.editor_view.add_tag(null);
    this.show_errors = true;

    var self = this;
    if(this.validate()) {
      this.save(this.get_translation("saving"), this.save_nodes, this.save_error).then(function(collection){
        self.process_updated_collection(collection);
      });
    }
  },
  handle_save_and_finish_key:function(event){
    var code = (!event)? null : event.keyCode ? event.keyCode : event.which;
    if(code == 13){
      this.save_and_finish(event);
    }
  },
  save_and_finish: function(event){
    var self = this;
    this.editor_view.add_tag(null);
    this.show_errors = true;
    if(this.validate()) {
      this.save(this.get_translation("saving"), this.save_nodes, this.save_error).then(function(collection){
        self.process_updated_collection(collection);
        self.onclose();
      });
    }
  },
  save_error: function(error){
    if(error.status===403) {
      dialog.dialog(this.get_translation("out_of_space"), this.get_translation("out_of_space_text"), {
        [this.get_translation("open_settings")]: function() {
          var tab = window.open(window.Urls.account_settings(), "_blank");
          tab.focus();
        },
        [this.get_translation("ok")]: function(){}
      })
    } else {
      dialog.alert(this.get_translation("error_saving"), error.responseText || this.get_translation("save_failed"));
    }
  },
  copy_items: function(){
    if(this.collection.has_related_content()){
      dialog.alert(this.get_translation("warning"), this.get_translation("related_content_warning"), this.call_duplicate);
    } else {
      this.call_duplicate();
    }
  },
  call_duplicate: function(){
    var self = this;
    var clipboard = window.workspace_manager.get_queue_view();
    clipboard.open_queue();
    this.display_load(this.get_translation("copying_to_clipboard"), function(load_resolve, load_reject){
      self.collection.duplicate(clipboard.clipboard_queue.model).then(function(collection){
        self.onnew(collection, self.get_translation("copying_to_clipboard"));
        self.onclose();
        load_resolve(true);
      }).catch(function(error){
        load_reject(error);
      });
    });
  },
  save_nodes:function(){
    var sort_order = (this.model && this.new_content) ? Math.ceil(this.model.get("metadata").max_sort_order) : 0;
    var self = this;
    this.edit_list.views.forEach(function(entry){
      var tags = entry.tags.reduce(function(list, tag){
        return list.concat(JSON.stringify({tag_name: tag, channel: window.current_channel.get("id")}));
      }, []);
      entry.set({
        tags: tags,
        prerequisite: entry.model.get('prerequisite')
      });
      if(self.new_content){
        entry.set({
          parent:self.model.id,
          sort_order:++sort_order,
          tree_id: self.model.get("tree_id")
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
    if(!this.edit_list) return false;
    return _.findWhere(this.edit_list.views, {edited : true}) != null;
  },
  undo_changes:function(){
    this.edit_list.views.forEach(function(view){
      view.unset();
    });
  },
  adjust_list_height:function(){
    if(this.edit_list){
      this.edit_list.adjust_list_height();
    }
  },
});

var EditMetadataList = BaseViews.BaseEditableListView.extend({
  template : require("./hbtemplates/edit_metadata_list.handlebars"),
  name: NAMESPACE,
  $trs: MESSAGES,
  selected_items: [],
  // NEW FIELD: add the field here to track shared values
  shared_data:{
    shared_tags:[],
    shared_copyright_owner:null,
    shared_license:0,
    shared_license_description:null,
    shared_author:null,
    all_files:false,
    all_exercises: false,
    shared_exercise_data:{mastery_model: 0, m: null, n: null, randomize: null},
    shared_language:0,
    shared_role: 0,
    shared_source: null,
    shared_aggregator: null,
    shared_provider: null
  },
  list_selector: "#uploaded_list",
  default_item: "#uploaded_list .default-item",

  initialize: function(options) {
    _.bindAll(this, 'add_topic', 'check_all_wrapper', 'selected_individual');
    this.bind_edit_functions();
    this.collection = options.collection;
    this.new_content = options.new_content;
    this.new_topic = options.new_topic;
    this.new_exercise = options.new_exercise;
    this.container = options.container;
    this.allow_edit = options.allow_edit;
    this.selected_items = [];
    this.render();
    if(!this.new_content && this.collection.length > 1){
      this.$("#uploader_select_all_check").attr("checked", true);
      this.check_all_wrapper(null);
    }
  },
  render: function() {
    this.$el.html(this.template({
      new_topic: this.new_topic,
      show_list: this.collection.length > 1 || (this.new_content && !this.new_exercise)
    }, {
      data: this.get_intl_data()
    }));
    this.load_content();
  },
  events: {
    'click #add_topic_button' : 'add_topic',
    'change #uploader_select_all_check':'check_all_wrapper'
  },
  selected_individual:function(){
    return this.selected_items.length === 1;
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
      container: this.container,
      allow_edit: this.allow_edit
    });
    this.views.push(uploaded_view);
    return uploaded_view;
  },
  handle_if_individual:function(){
    //Set current node if only one in collection
    if(this.collection.length === 1){
      if(!this.new_content){
        this.selected_items.push(this.views[0]);
        this.update_shared_values(true, this.views[0]);
        this.container.load_editor(this.selected_items);
        this.container.load_prerequisites(this.selected_items);
        this.container.load_preview(this.views[0]);
      }else{
        this.views[0].select_item();
      }
    }
  },
  validate: function() {
    var invalid_items = _.filter(this.views, function(view) { return view.validate(); });
    return invalid_items.length && ((this.selected_individual())? this.selected_items[0].error || 1 : this.get_translation("invalid_items"));
  },
  get_selected_items: function(){
    return this.selected_items;
  },
  add_topic:function(){
    var self = this;
    this.collection.create_new_node({
      "kind":"topic",
      "title": (this.model.get('parent'))? this.model.get('title') + " " + this.get_translation("topic") : this.get_translation("topic"),
      "sort_order" : this.collection.length,
      "author": window.preferences.author || ""
    }).then(function(new_topic){
      var new_view = self.create_new_view(new_topic);
      self.$(self.list_selector).append(new_view.el);
      self.handle_if_empty();
      new_view.select_item();
    });
  },
  update_checked:function(){
    this.selected_items = [];
    var self = this;
    this.views.forEach(function(view){
      if(!_.contains(self.selected_items, view) && view.$(".upload_item_checkbox").is(":checked")){
            self.selected_items.push(view);
            self.update_shared_values(self.selected_individual(), view);
        }
    });
    this.container.load_editor(this.selected_items);
    if(this.selected_individual()){
      this.container.load_preview(this.selected_items[0]);
      this.container.load_prerequisites(this.selected_items);
      if(this.selected_items[0].model.get("kind")==="exercise"){
        this.container.load_questions(this.selected_items[0]);
      }
    }
    this.container.load_editor(this.selected_items);
  },
  update_shared_values:function(reset, view){
    if(reset){
      this.shared_data.shared_tags = view.tags;
      this.shared_data.shared_copyright_owner = view.model.get("copyright_holder");
      this.shared_data.shared_author = view.model.get("author");
      this.shared_data.shared_license = view.model.get("license");
      this.shared_data.shared_license_description = view.model.get('license_description');
      this.shared_data.all_files = view.model.get("kind") !== "topic";
      this.shared_data.all_exercises = view.model.get("kind") === "exercise";
      this.shared_data.shared_language = view.model.get("language");
      this.shared_data.shared_role = view.model.get("role_visibility");
      this.shared_data.shared_source = view.model.get("original_channel");
      this.shared_data.shared_aggregator = view.model.get("aggregator");
      this.shared_data.shared_provider = view.model.get("provider");
      if(view.model.get("extra_fields")){
        this.shared_data.shared_exercise_data = view.model.get("extra_fields");
      }
      // NEW FIELD: set the shared data to the model's field
    }else{
      this.shared_data.shared_tags = _.intersection(this.shared_data.shared_tags, view.tags);
      this.shared_data.shared_copyright_owner = (this.shared_data.shared_copyright_owner === view.model.get("copyright_holder"))? this.shared_data.shared_copyright_owner : null;
      this.shared_data.shared_author = (this.shared_data.shared_author === view.model.get("author"))? this.shared_data.shared_author : null;
      this.shared_data.shared_license = (this.shared_data.shared_license == view.model.get("license"))? this.shared_data.shared_license : 0;
      this.shared_data.shared_license_description = (this.shared_data.shared_license_description === view.model.get("license_description"))? this.shared_data.shared_license_description : null;
      this.shared_data.all_files = this.shared_data.all_files && view.model.get("kind")  !== "topic";
      this.shared_data.all_exercises = this.shared_data.all_exercises && view.model.get("kind")  === "exercise";
      this.shared_data.shared_role = (this.shared_data.shared_role == view.model.get("role_visibility"))? this.shared_data.shared_role : 0;
      this.shared_data.shared_source = (this.shared_data.shared_source && this.shared_data.shared_source.id == view.model.get("original_channel").id)? this.shared_data.shared_source : null;
      this.shared_data.shared_aggregator = (this.shared_data.shared_aggregator === view.model.get("aggregator"))? this.shared_data.shared_aggregator : null;
      this.shared_data.shared_provider = (this.shared_data.shared_provider === view.model.get("provider"))? this.shared_data.shared_provider : null;


      // NEW FIELD: see if the shared fields match, if not set to a default

      var language = view.model.get("language");
      this.shared_data.shared_language = (this.shared_data.shared_language === language || null)? this.shared_data.shared_language : 0;

      if(this.shared_data.all_exercises){
        if(view.model.get("extra_fields")){
          var exercise = this.shared_data.shared_exercise_data;
          this.shared_data.shared_exercise_data = {
            mastery_model: (exercise.mastery_model === view.model.get("extra_fields").mastery_model)? exercise.mastery_model : 0,
            m: (exercise.m === view.model.get("extra_fields").m)? exercise.m : null,
            n: (exercise.n === view.model.get("extra_fields").n)? exercise.n : null,
            randomize: (exercise.randomize === view.model.get("extra_fields").randomize)? exercise.randomize : null
          }
        }else{
          this.shared_data.shared_exercise_data = {mastery_model: null, m: null, n: null, randomize: null}
        }
      }
    }
  }
});

var EditMetadataEditor = BaseViews.BaseView.extend({
  template:require("./hbtemplates/edit_metadata_editor.handlebars"),
  preview_template:require("./hbtemplates/edit_metadata_details.handlebars"),
  tags_template:require("./hbtemplates/edit_metadata_tagarea.handlebars"),
  description_limit : 400,
  selected_items: [],
  name: NAMESPACE,
  $trs: MESSAGES,

  initialize: function(options) {
    _.bindAll(this, 'update_count', 'remove_tag', 'add_tag', 'loop_focus', 'select_tag', 'set_initial_focus', 'update_field');
    this.new_content = options.new_content;
    this.selected_items = options.selected_items;
    this.shared_data = options.shared_data;
    this.container = options.container;
    this.allow_edit = options.allow_edit;
    this.m_value = (this.shared_data && this.shared_data.shared_exercise_data && this.shared_data.shared_exercise_data.m) ? this.shared_data.shared_exercise_data.m : 1;
    this.n_value = (this.shared_data && this.shared_data.shared_exercise_data && this.shared_data.shared_exercise_data.n) ? this.shared_data.shared_exercise_data.n : 1;
    this.first_rendered = this.new_content;
    this.render();
  },
  render: function() {
    var has_files = this.selected_individual() && _.some(this.selected_items[0].model.get("files"), function(f){return f.preset.display && !f.preset.thumbnail;});

    // Set license, author, copyright values based on whether selected items have been copied from another source
    var alloriginal = this.all_original();
    var original_source_license = "---";
    if(this.shared_data && this.shared_data.shared_license){
      original_source_license = window.licenses.get({id: this.shared_data.shared_license}).get("license_name");
    }
    var copyright_owner = (this.shared_data && this.shared_data.shared_copyright_owner)? this.shared_data.shared_copyright_owner: (alloriginal)? null: "---";
    var author = (this.shared_data && this.shared_data.shared_author)? this.shared_data.shared_author: (alloriginal)? null: "---";
    var aggregator = (this.shared_data && this.shared_data.shared_aggregator)? this.shared_data.shared_aggregator: (alloriginal)? null: "---";
    var provider = (this.shared_data && this.shared_data.shared_provider)? this.shared_data.shared_provider: (alloriginal)? null: "---";
    var all_top_level = (this.new_content)? !this.model.get("parent") : _.all(this.selected_items, function(item) { return item.model.get("ancestors").length === 1; });
    var shared_source = (this.shared_data && this.shared_data.shared_source && this.shared_data.shared_source.id !== window.current_channel.id)? this.shared_data.shared_source : null;
    if(this.allow_edit){
      !this.new_content && this.container.validate();
      this.$el.html(this.template({
        node: (this.selected_individual())? this.selected_items[0].model.toJSON() : null,
        isoriginal: alloriginal,
        is_file: this.shared_data && this.shared_data.all_files,
        none_selected: this.selected_items.length === 0,
        licenses: window.licenses.toJSON(),
        license: original_source_license,
        copyright_owner: copyright_owner,
        author: author,
        aggregator: aggregator,
        provider: provider,
        selected_count: this.selected_items.length,
        has_files: has_files,
        word_limit: this.description_limit,
        is_exercise: this.shared_data && this.shared_data.all_exercises,
        m_value: this.m_value,
        n_value: this.n_value,
        license_description: this.shared_data && this.shared_data.shared_license_description,
        languages: window.languages.toJSON(),
        roles: window.roles,
        mastery: window.mastery,
        language_default: this.get_language(null, all_top_level),
        channel_id: window.current_channel.id,
        source_channel: shared_source
        // NEW FIELD: Load in renderer
      }, {
        data: this.get_intl_data()
      }));
      this.update_count();
      this.load_language();
      this.load_autocomplete();
      if(this.shared_data){
        // NEW FIELD: If new field is a dropdown, load here
        $("#role_select").val(this.shared_data.shared_role);
        (!alloriginal)? $("#license_select").text(stringHelper.translate(original_source_license)) : $("#license_select").val(this.shared_data.shared_license);
        // Set exercise fields according to shared exercise data
        if(this.shared_data.all_exercises){
          this.$("#mastery_model_select").val(this.shared_data.shared_exercise_data.mastery_model);
          this.$("#mastery_custom_criterion").css('display', (this.shared_data.shared_exercise_data.mastery_model === "m_of_n") ? 'inline-block' : 'none');

          var randomize = this.shared_data.shared_exercise_data.randomize;
          this.$("#randomize_exercise").prop("indeterminate", randomize === null || randomize === undefined);
          this.$("#randomize_exercise").prop("checked", randomize);
        }
      }
      if(!this.first_rendered) {
        _.defer(this.container.validate);
      }
    }else{
      this.$el.html(this.preview_template({
        node: (this.selected_individual())? this.selected_items[0].model.toJSON() : null,
        isoriginal: alloriginal,
        is_file: this.shared_data && this.shared_data.all_files,
        none_selected: this.selected_items.length === 0,
        copyright_owner: copyright_owner,
        author: author,
        aggregator: aggregator,
        provider: provider,
        selected_count: this.selected_items.length,
        has_files: has_files,
        is_exercise: this.shared_data && this.shared_data.all_exercises,
        license_description: this.shared_data && this.shared_data.shared_license_description,
        language: this.shared_data && this.get_language(this.shared_data.shared_language, all_top_level),
        role: this.shared_data && this.shared_data.shared_role,
        source_channel: shared_source
        // NEW FIELD: Load in renderer
      }, {
        data: this.get_intl_data()
      }));
    }
    this.handle_if_individual();
    if(this.shared_data){
      this.display_license_description(this.shared_data.shared_license);
      var license_name = !alloriginal ? original_source_license : this.get_license(this.shared_data.shared_license);
      this.$("#license_detail_field").text(stringHelper.translate(license_name));
      if(this.shared_data && this.shared_data.all_exercises) this.$("#mastery_detail_field").text(this.get_mastery_string());
      this.load_tags();
      this.$("#tag_default_detail_field").css("display", (this.shared_data.shared_tags.length)? "none" : "block");
      this.$("#license_about").css("display", (this.shared_data.shared_license > 0)? "inline" : "none");

      // Set exercise fields according to shared exercise data
      if(this.shared_data.all_exercises){
        this.$("#mastery_model_select").val(this.shared_data.shared_exercise_data.mastery_model);
        this.$("#mastery_custom_criterion").css('display', (this.shared_data.shared_exercise_data.mastery_model === "m_of_n") ? 'inline-block' : 'none');

        var randomize = this.shared_data.shared_exercise_data.randomize;
        this.$("#randomize_exercise").prop("indeterminate", randomize === null || randomize === undefined);
        this.$("#randomize_exercise").prop("checked", randomize);
      }
    }
    this.$('[data-toggle="tooltip"]').tooltip();
    this.first_rendered = true;
    _.defer(this.set_initial_focus, 1);
  },
  get_mastery_string: function(){
    if (this.shared_data.shared_exercise_data.mastery_model === "m_of_n"){
      return this.m_value + " " + this.get_translation("of") + " " + this.n_value;
    }
    return stringHelper.translate(this.shared_data.shared_exercise_data.mastery_model);
  },
  get_language: function(language, all_top_level){
    if (language === 0){ return "---"; }
    else if(!language) { return (all_top_level)? this.get_translation("same_as_channel") : this.get_translation("same_as_topic"); }
    return window.languages.findWhere({id: language}).get("readable_name");
  },
  set_initial_focus:function(){
    var element = null;
      if($("#copy_button").length > 0){
        element = $("#copy_button");
      } else if($("#input_title").length > 0){
        element = $('#input_title');
      }else if($("#author_field").length > 0){
        element = $('#author_field');
      }else if($("#tag_box").length > 0){
        element = $('#tag_box');
      } else {
        element = $("#close_uploader_button");
      }

      if(element){
        element.focus();
        element.select();
      }
  },
  get_license: function(license_id){
    if(isNaN(license_id)){ return license_id; }
    else if(!license_id || license_id <= 0){ return null; }
    return window.licenses.get({id: license_id}).get('license_name');
  },
  display_license_description: function(license_id){
    var license = license_id > 0 && window.licenses.get({id: license_id});
    if(license && license.get('is_custom')){
      this.$("#custom_license_description").css('display', 'block');
      if(this.shared_data){
        this.$("#custom_license_description").attr('placeholder', (this.selected_individual() || this.shared_data.shared_license_description !== null) ? this.get_translation("license_description_placeholder") : "---");
        if(this.all_original() && this.allow_edit){
          this.$("#custom_license_description").val(this.shared_data.shared_license_description);
        } else{
          this.$("#custom_license_description").text(this.shared_data.shared_license_description || this.get_translation("permissions_vary"));
        }
      }
    } else {
      this.$("#custom_license_description").css('display', 'none');
    }
    this.$("#copyright_holder_wrapper").css("display", license && license.get("copyright_holder_required")? "block" : "none");
  },
  all_original: function(){
    return this.selected_items.every(function(item){ return item.isoriginal; });
  },
  selected_individual:function(){
    return this.selected_items.length === 1;
  },
  handle_if_individual:function(){
    if(this.selected_individual()){
      var view = this.selected_items[0];
      var self = this;
      view.load_file_displays(self.$("#editmetadata_format_section"));
      if(view.model.get("kind")==="exercise"){
        this.container.load_questions(view);
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
    'change #mastery_model_select': 'change_mastery_model',
    'change #m_value': 'set_mastery',
    'change #n_value': 'set_mastery',
    "click #mastery_about": "load_mastery",
    "click #visibility_about": "load_roles",
    "focus .input-tab-control": "loop_focus",
    "change #select_language": "set_language",
    "change #role_select": "set_selected"
    // NEW FIELD: add listener to new field and set_selected to trigger change
  },
  load_tags:function(){
    this.$("#tag_area").html(this.tags_template({
      tags:this.shared_data.shared_tags
    }, {
      data: this.get_intl_data()
    }));
    var self = this;
    var tags = _.reject(window.contenttags.pluck("tag_name"), function(tag){
      return self.shared_data.shared_tags.indexOf(tag) >= 0;
    });
    autoCompleteHelper.addAutocomplete($( "#tag_box" ), tags, this.select_tag, "#tag_area_wrapper");
  },
  load_license:function(){
    if (this.selected_items.length){
      var license_modal = new Info.LicenseModalView({
        select_license : window.licenses.get({id: this.selected_items[0].model.get("license")})
      });
    }

  },
  load_mastery:function(){
    new Info.MasteryModalView();
  },
  load_roles: function() {
    new Info.RolesModalView();
  },
  load_language: function(){
    var language = this.shared_data && this.shared_data.shared_language;
    if(language===0) { this.$("#select_language").val(0); }
    else if (!language) { this.$("#select_language").val("inherit"); }
    else { this.$("#select_language").val(language); }
  },
  load_autocomplete: function() {
    var self = this;
    var metadata = window.current_channel.get('main_tree').metadata;
    this.$(".autocomplete_item").each(function(index, item) {
      var list_name = $(item).data("list");
      if(list_name) {
        autoCompleteHelper.addAutocomplete($(item), metadata[list_name], self.update_field, "#metadata");
      }
    })
  },
  update_field: function(value, el) {
    el.val(value.label);
    this.set_selected();
  },
  update_count:function(){
    if(this.selected_individual()){
      var char_length = this.description_limit - this.$("#input_description").val().length;
      if(this.$("#input_description").val() == ""){
        char_length = this.description_limit;
      }
      if(char_length < 0){
        char_length *= -1;
        this.$("#description_counter").html(this.get_translation("too_long", char_length));
        this.$("#description_counter").css("color", "red");
      }else{
        this.$("#description_counter").html(this.get_translation("chars_left", char_length));
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
    window.contenttags.remove(window.contenttags.findWhere({'tag_name':tagname}));
    this.shared_data.shared_tags = _.reject(this.shared_data.shared_tags, function(tag) {return tag === tagname});
    this.load_tags();
  },
  select_license:function(){
    this.$("#license_about").css("display", "inline");
    this.set_selected();
    this.display_license_description($("#license_select").val());
  },
  toggle_license_description: function() {
    var license = window.licenses.get({id: (iscopied || !this.allow_edit)? this.selected_items[0].model.get("license") : $("#license_select").val()})
  },
  set_selected:function(){
    var self = this;
    var individual_selected = this.selected_individual();
    var title = (individual_selected)? this.$("#input_title").val().trim() : false;
    var description = (individual_selected)? this.$("#input_description").val().trim() : false;
    var license = (this.$("#license_select").is(":visible") && this.$("#license_select").val()!=0)? this.$("#license_select").val() : false;
    var copyright_holder = (this.$("#input_license_owner").is(":visible") && (individual_selected || this.$("#input_license_owner").val() !== ""))? self.$("#input_license_owner").val().trim() : false;
    var author = (this.$("#author_field").is(":visible") && (individual_selected || this.$("#author_field").val() !== ""))? this.$("#author_field").val().trim() : false;
    var license_description = (this.$("#custom_license_description").is(":visible") && (individual_selected || this.$("#custom_license_description").val() !== ""))? this.$("#custom_license_description").val() : false;
    var role_visibility = (this.$("#role_select").is(":visible") && this.$("#role_select").val()!=0)? this.$("#role_select").val() : false;
    var aggregator = (this.$("#aggregator_field").is(":visible") && (individual_selected || this.$("#aggregator_field").val() !== ""))? this.$("#aggregator_field").val().trim() : false;
    var provider = (this.$("#provider_field").is(":visible") && (individual_selected || this.$("#provider_field").val() !== ""))? this.$("#provider_field").val().trim() : false;

    // NEW FIELD: get the selected value, if it isn't set, skip

    this.selected_items.forEach(function(view){
      view.set_node({
        title: (title===false)? view.model.get('title') : title,
        description: (description===false)? view.model.get('description') : description,
        license: (license===false)? view.model.get('license') : license,
        copyright_holder: (copyright_holder===false)? view.model.get('copyright_holder') : copyright_holder,
        author: (author===false)? view.model.get('author') : author,
        aggregator: (aggregator===false)? view.model.get('aggregator') : aggregator,
        provider: (provider===false)? view.model.get('provider') : provider,
        license_description: (license_description===false)? view.model.get('license_description') : license_description,
        role_visibility: (!role_visibility)? view.model.get('role_visibility') : role_visibility
      });
    });
    if(this.container.show_errors)
      this.container.validate();
  },
  change_mastery_model:function(event){
    if(event.target.value === "m_of_n"){
      this.$("#mastery_custom_criterion").css('display', 'inline-block');
      this.$("#m_value").val(this.m_value)
      this.$("#n_value").val(this.n_value)
    }else{
      this.$("#mastery_custom_criterion").css('display', 'none');
    }
    this.set_mastery();
  },
  set_mastery:function(){
    var mastery_model = this.$("#mastery_model_select").val();
    if(mastery_model === "m_of_n"){
      this.m_value = Number(this.$("#m_value").val());
      this.n_value = Number(this.$("#n_value").val());

      if(this.n_value < this.m_value){
        this.n_value = this.m_value;
        this.$("#n_value").val(this.n_value);
      }
      this.$("#n_value").attr('min', this.m_value);
    }
    var self = this;
    this.selected_items.forEach(function(view){
        view.set_mastery(mastery_model, self.m_value, self.n_value);
    });
  },
  set_language:function(){
    var language = this.$("#select_language").val();
    language = (language === "inherit")? null : language;
    var self = this;
    this.selected_items.forEach(function(view){
        view.set_language(language);
    });
  }
});

var UploadedItem = BaseViews.BaseListEditableItemView.extend({
  template: require("./hbtemplates/uploaded_list_item.handlebars"),
  selectedClass:"current_item",
  name: NAMESPACE,
  $trs: MESSAGES,
  format_view:null,
  error: null,
  'id': function() {
      return "item_" + this.model.get("id");
  },
  className: "uploaded disable_on_error",
  tagName: "li",
  initialize: function(options) {
      _.bindAll(this, 'remove_topic', 'check_item', 'select_item','update_name', 'set_edited',
              'handle_change', 'handle_assessment_items', 'set_random', 'validate');
      this.bind_edit_functions();
      this.model.setExtraFields();
      this.containing_list_view = options.containing_list_view;
      this.container = options.container;
      this.thumbnail = this.model.get('files').filter(function(f){ return f.preset.thumbnail; });
      this.edited = false;
      this.allow_edit = options.allow_edit;
      this.new_content = options.new_content;
      this.isNew = this.new_content;
      this.render();
      this.set_edited(this.new_content);
      this.load_tags();
      this.uploads_in_progress = 0;
      this.isoriginal = !this.model.get("freeze_authoring_data");
      this.listenTo(this.model, "change:title", this.update_name);
  },
  render: function() {
      this.$el.html(this.template({
          node: this.model.toJSON(),
          new_topic: this.new_content && this.model.get("kind") === "topic",
          isfolder: this.model.get("kind") === "topic"
      }, {
        data: this.get_intl_data()
      }));
  },
  update_name:function(){
    this.$(".item_name").text(this.model.get("title"));
    this.$("h5").prop("title", this.model.get("title"));
    this.$(".invalid_title").css("display", (this.model.get("title"))? "none": "inline-block");
  },
  events: {
      'click .remove_topic' : 'remove_topic',
      'click .upload_item_checkbox': 'check_item',
      'click .uploaded_list_item' : 'select_item',
  },
  remove_topic: function(event){
      event.stopImmediatePropagation();
      this.cancel_actions(event);
      this.delete(true, "");
      this.remove();
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
      // NEW FIELD: add listener to fields
      var edited_data = this.model.pick("title", "description", "license", "changed", "tags", "copyright_holder", "author",
        "files", "assessment_items", "extra_fields", "prerequisite", "role_visibility", "aggregator", "provider");
      // Handle unsetting node
      if(!is_edited){
          this.originalData = $.extend(true, {}, edited_data);
      }
      this.edited = JSON.stringify(this.originalData) != JSON.stringify(edited_data);
      this.$el.addClass("edited_node")
      this.isNew =  is_edited && this.isNew;
      (this.edited)? this.$el.addClass("edited_node") : this.$el.removeClass("edited_node");
      this.model.set("changed", this.model.get("changed") || this.edited);
  },
  set_node:function(data){
      this.set(data);
      this.set_edited(true);
  },
  set_mastery:function(mastery_model, m_value, n_value){
    switch(mastery_model){
      case "skill_check":
        m_value = n_value = 1;
        break;
      case "num_correct_in_a_row_2":
        m_value = n_value = 2;
        break;
      case "num_correct_in_a_row_3":
        m_value = n_value = 3;
        break;
      case "num_correct_in_a_row_5":
        m_value = n_value = 5;
        break;
      case "num_correct_in_a_row_10":
        m_value = n_value = 10;
        break;
      case "do_all":
        m_value = n_value = this.model.get('assessment_items').length;
        break;
    }
    var current_data = this.model.get('extra_fields');
    current_data['mastery_model'] = mastery_model;
    current_data['m'] = m_value;
    current_data['n'] = n_value;
    this.set({'extra_fields': current_data});
    this.set_edited(true);
  },
  set_language: function(language){
    this.set({"language": language});
    this.set_edited(true);
  },
  set_random:function(randomize){
    var current_data = this.model.get('extra_fields');
    current_data['randomize'] = randomize;
    this.set({'extra_fields': current_data});
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
          var fetch_tags = [];
          this.model.get("tags").forEach(function(entry){
              fetch_tags.push((entry.id)? entry.id : entry);
          });
          this.tags = window.contenttags.get_all_fetch(fetch_tags).pluck('tag_name');
      }
  },
  load_file_displays:function(formats_el){
      this.format_view = new FileUploader.FormatInlineItem({
          model: this.model,
          containing_list_view:this,
          allow_edit: this.allow_edit
      });
      formats_el.html(this.format_view.el);
      this.format_view.create_thumbnail_view(this.container.disable_submit, this.container.enable_submit, this.container.enable_submit);
      this.listenTo(this.model, "change:files", this.handle_change);
      this.listenTo(this.model, "change:thumbnail_encoding", this.handle_change);
  },
  load_question_display:function(formats_el){
      if(this.exercise_view){
        this.exercise_view.remove();
      }
      this.exercise_view = new Exercise.ExerciseView({
        parent_view: this,
        model:this.model,
        onchange: this.handle_assessment_items,
        onrandom: this.set_random,
        allow_edit: this.allow_edit
      });
      formats_el.html(this.exercise_view.el);
  },
  load_preview_display:function(formats_el){
    if(this.preview_view){
      this.preview_view.remove();
    }
    this.preview_view = new Previewer.PreviewView({
      modal:false,
      model: this.model
    });
    formats_el.html(this.preview_view.el);
  },
  handle_assessment_items:function(data){
    this.model.set('assessment_items', data);
    this.set_edited(true);
  },
  handle_change:function(){
    this.set_edited(true);
    $("#metadata_preview_btn").css("display", "inline-block");
    this.preview_view.switch_preview(this.model);
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
  },
  validate: function() {
    var license = window.licenses.get({id: this.model.get("license")});
    this.error = "";
    $(".input_listener, select").removeClass("invalid_field");
    if(!this.model.get("title")) {
      $("#input_title").addClass("invalid_field");
      this.error = this.get_translation("title_error");
    } else if(this.isoriginal && this.model.get("kind") !== "topic" && !license) {
      $("#license_select").addClass("invalid_field");
      this.error = this.get_translation("license_error");
    } else if (this.isoriginal && this.model.get("kind") !== "topic" && license.get("copyright_holder_required") && !this.model.get("copyright_holder")) {
      $("#input_license_owner").addClass("invalid_field");
      this.error = this.get_translation("copyright_holder_error");
    } else if (this.isoriginal && license && license.get('is_custom') && !this.model.get('license_description')) {
      $("#custom_license_description").addClass("invalid_field");
      this.error = this.get_translation("special_permission_error");
    }
    (this.error)? this.$el.addClass("invalid") : this.$el.removeClass("invalid");
    return this.error;
  }
});

module.exports = {
    MetadataModalView: MetadataModalView,
    EditMetadataView:EditMetadataView
}
