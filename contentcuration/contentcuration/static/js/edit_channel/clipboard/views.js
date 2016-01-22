var Backbone = require("backbone");
var _ = require("underscore");
require("clipboard.less");
var BaseViews = require("./../views");
var Models = require("./../models");
var DragHelper = require("./../tree_edit/views");

var PreviewerViews = require("edit_channel/previewer/views");

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardListView = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/clipboard_list.handlebars"),
	item_view:"clipboard",
	initialize: function(options) {
		_.bindAll(this, 'toggle_clipboard');
		this.collection = new Models.NodeCollection();
		this.collapsed = true;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			collapsed : this.collapsed,
			content_list : this.collection.toJSON()
		}));
		this.$el.find(".badge").html(this.collection.length);
		this.load_content();
	},
	events: {
		'click .clipboard-toggler' : 'toggle_clipboard'
	},
	toggle_clipboard: function(){
		this.collapsed = !this.collapsed;
		if(this.collapsed) $("#clipboard").slideUp();
		this.render();
		if(!this.collapsed) $("#clipboard").slideDown();
	},
	load_content:function(){
		var containing_list_view = this;
		this.collection.forEach(function(entry){
			var clipboard_item_view = new ClipboardListItemView({
				containing_list_view: containing_list_view,
				el: containing_list_view.$el.find("#clipboard_item_" + entry.cid),
				model: entry
			});
			containing_list_view.views.push(clipboard_item_view);
		});
	},
	add_to_clipboard:function(models){
		var collection = this.collection;
		models.forEach(function(entry){
			collection.add(entry);
		});
		this.render();
	},
});

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardListItemView = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/clipboard_list_item.handlebars"),

	initialize: function(options) {
		//_.bindAll(this);
		//this.listenTo(clipboard_list_items, "change:clipboard_list_items.length", this.render);
		this.containing_list_view = options.containing_list_view;
		this.render();
		$("#clipboard").slideDown();
	},
	render: function() {
		this.$el.html(this.template({
			node:this.model,
			isfolder: this.model.attributes.kind.toLowerCase() == "topic",
		}));
		this.$el.data("data", this);
		DragHelper.handleDrag(this);
		//loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: true, meta: false});
	},
});

module.exports = {
	ClipboardListView:ClipboardListView
}

/*
var ClipboardEditContentBaseView = Backbone.View.extend({
	char_limit : 300,
	initialize: function(options) {
		_.bindAll(this, 'update_folder', 'toggle_clipboard','update_count', 'delete_view');
		this.edit = options.edit;
		this.model = options.model;
	},
	update_content: function(event){
		if($("#folder_name").val().trim() == "")
			$("#name_err").css("display", "inline");
		else{
			this.model.update({
				title: $("#folder_name").val(), 
				description: $("#folder_description").val()
			});
			this.delete_view();
		}
	},
	
	updateCount: function(){
		var char_length = this.char_limit - this.$("#clipboard textarea").val().length; 
		this.$('.char_counter').text(char_length + ((char_length != 1)? " chars" : " char") + ' left');

		if(char_length == 0) 
			this.$(".char_counter").css("color", "red");
		else 
			this.$(".char_counter").css("color", "black");
	},
});

var ClipboardAddContentComputerView = ClipboardAddContentView.extend({
	template: require("./hbtemplates/clipboard_step_2_computer.handlebars"),
	initialize: function() {
		_.bindAll(this, 'choose_file', 'preview_file','toggle_folder','remove_item','file_uploaded');
		this.render();
	},
	render: function() {
		this.$el.html(this.template({url : window.location.pathname}));
		this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
			clickable: true, 
			url: window.Urls.file_upload(), 
			headers: {"X-CSRFToken": get_cookie("csrftoken")}, 
			uploadMultiple: true, 
			acceptedFiles: ["image/*", "application/pdf"]
		});
        this.dropzone.on("success", this.file_uploaded);
	},
	
	events: {
		'click .choose_file':'choose_file',
		'click .preview_file': 'preview_file',
		'click .tog_folder':'toggle_folder',
		'click .remove_item':'remove_item'
	},
	 file_uploaded: function(file) {
	 	console.log(file);
        this.callback(JSON.parse(file.xhr.response).filename);
        this.close();
    },
	remove_item: function(event){
		$(event.target.selector).parent("li").remove();
	},
	
	preview_file: function(event){
		var file = $("#"+ $(event.target.selector).parent("li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model:  file.data("data"),
			file: file
		});
	},
	choose_file: function(event){
		$("#fileinput").trigger("click");
		 $('#fileinput').change(function(evt) {
			var selected = $(this).context.files;
			for(var i = 0; i < selected.length; i++){
				var file = window.channel_router.generate_temp_file({
					content_file: selected[i], 
					retrieved_on: new Date(), 
					title: selected[i].name, 
					parent: this.model
				});
				temp_list_items.push(file);
			}
			console.log(temp_list_items);
			loadSelectedItems();
				
			//loadListItems(temp_list_items, "#selected_content_area ul", null, {selected: true, list: false, meta: false});			
		});
	},
});

var ClipboardAddContentMetadataView = ClipboardAddContentView.extend({
	events: {
		'keyup textarea': 'update_count',
		'keydown textarea': 'update_count',
		'paste textarea': 'update_count',
	},
	update_count: function(event){
		this.updateCount();
	},
});

function closeClipboard(){
	$("#edit").find(".content_options button").prop('disabled',false);
	$("#edit").find(".edit_folder_button").css('visibility','visible');
	$("#edit").find(".edit_file_button").css('visibility','visible');

	$(".newcontent").attr("class", "content");
	$("#clipboard").hide();
}

function addItems(list){
	clipboard_list_items.push.apply(clipboard_list_items, list);
	$(".badge").html(clipboard_list_items.length);
}

function loadSelectedItems(){
	var list_item_template = require("./hbtemplates/clipboard_list_item_step_2_and_3.handlebars");
	$("#selected_content_area ul").children().detach();
	temp_list_items.forEach(function(file) {
		$("#selected_content_area ul").append("<p>file.attributes</p>");
	});
}
function loadListItems(list, listid, model, options){
	$(listid).empty();
	var index = 0;
	for(var i = 0; i < list.length; i++){
		$(listid).append(list_item_template({index: index, file: list[i].data.attributes, folder: list[i].folder, 
											options: options}));
		$(listid + " #item_"+list_index).data("data",list[i].data);
		$(listid + " #item_"+list_index).data("collapsed", true);
		if(model){
			/*
			index = LoadHelper.loadList(list[i].data, model, list_item_template, list_item_template, 
									listid + " #item_" + index + "_sub", 30, {selected: true, 
									list: true, meta: false}, index + 1, 1);

		}
	}
	if(model && index == 0)
		$(listid).append("<li><label style=\"margin-left:40px;padding-left:10px;\"><h4><em>No items found.</em></h4></label></li>");
}
*/