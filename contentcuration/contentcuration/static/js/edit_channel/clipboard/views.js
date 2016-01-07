var Backbone = require("backbone");
var _ = require("underscore");
require("clipboard.less");
var BaseViews = require("./../views");
var Dropzone = require("dropzone");
var get_cookie = require("utils/get_cookie");
var JSZip = require("jszip");
var fileSaver = require("browser-filesaver");
var JSZipUtils = require("jszip-utils");

var PreviewerViews = require("edit_channel/previewer/views");

var prevTemplate;
var list_index;

var clipboard_list_items = [];
var temp_list_items = [];

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardListView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_list.handlebars"),
	initialize: function() {
		_.bindAll(this, 'add_content', 'collapse_clipboard');
		//this.listenTo(clipboard_list_items, "change:clipboard_list_items.length", this.render);
		this.render();
		$("#clipboard").slideDown();
	},
	render: function() {
		this.$el.html(this.template());
		//loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: true, meta: false});
	},
	
	events: {
		'click .clipboard_add_content': 'add_content',
		'click .collapse_clipboard':'collapse_clipboard',
	},
	collapse_clipboard: function(event){
		$("#clipboard").slideUp();
	},
	add_content: function(event){
		new ClipboardAddContentView({
			el: $("#clipboard-area")
		});
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardListItemView = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/clipboard_list.handlebars"),

	initialize: function() {
		_.bindAll(this, 'delete_content');
		//this.listenTo(clipboard_list_items, "change:clipboard_list_items.length", this.render);
		this.render();
		$("#clipboard").slideDown();
	},
	render: function() {
		this.$el.html(this.template());
		//loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: true, meta: false});
	},
	
	events: {
		'click .delete_content': 'delete_content'
	},
	delete_content:function(event){
	/*
		if(confirm("Are you sure you want to delete this file?")){
			var el = DOMHelper.getParentOfTag(event.target, "li");
			var i = clipboard_list_items.indexOf($("#" + el.id).data("data"));
			console.log($("#" + el.id).data("data"));
			console.log(clipboard_list_items[0]);
			if(i != -1) console.log(clipboard_list_items[i]);
			//clipboard_list_items.remove(i);
			el.remove();
			
		}
		*/
	}
});

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
	toggle_clipboard: function(event){
		window.edit_page_view.set_editing(false);
		if(this.edit){
			this.model.set_as_placeholder(false);
		}
		else{
			this.model.delete_model();
			this.model.delete_view();
		}
		this.delete_view();
	},
	
	updateCount: function(){
		var char_length = this.char_limit - this.$("#clipboard textarea").val().length; 
		this.$('.char_counter').text(char_length + ((char_length != 1)? " chars" : " char") + ' left');

		if(char_length == 0) 
			this.$(".char_counter").css("color", "red");
		else 
			this.$(".char_counter").css("color", "black");
	},
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
		this.remove();
	}


});

/* Loaded when user clicks edit icon on folder or "Add Folder" button */
var ClipboardEditFolderView = ClipboardEditContentBaseView.extend({
	template: require("./hbtemplates/clipboard_edit_folder.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'update_folder', 'toggle_clipboard','update_count', 'delete_view');
		this.edit = options.edit;
		this.folder = options.folder;

		this.render();
	},
	render: function() {
		console.log(this.folder);
		this.$el.html(this.template({
							file: (this.edit)? this.folder.topic.attributes : null, 
							edit: this.edit, 
							is_file : false,
							limit: this.char_limit
						}));
		this.updateCount();
	},
	events: {
		'click .clipboard_update_folder': 'update_folder',
		'click .toggle_clipboard':'toggle_clipboard',
		'keyup textarea': 'update_count',
		'keydown textarea': 'update_count',
		'paste textarea': 'update_count'
	},
	update_folder: function(event){
		if($("#folder_name").val().trim() == "")
			$("#name_err").css("display", "inline");
		else{
			this.folder.update({
				title: $("#folder_name").val(), 
				description: $("#folder_description").val()
			});
			this.delete_view();
		}
	},
	toggle_clipboard: function(event){
		window.edit_page_view.set_editing(false);
		if(this.edit){
			this.folder.set_as_placeholder(false);
		}
		else{
			this.folder.delete_model();
			this.folder.delete_view();
		}
		this.delete_view();
	},
	update_count : function(event){
		this.updateCount();
	}
});

/* Loaded when user clicks edit icon on file*/
var ClipboardEditFileView = ClipboardEditContentBaseView.extend({
	template: require("./hbtemplates/clipboard_edit_file.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'toggle_clipboard', 'update_file', 'update_count', 'delete_view');
		this.file = options.file;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			file: this.file.attributes,
			is_file: true, 
			limit: this.char_limit// - this.file.attributes.description.length
		}));
		
	},
	
	events: {
		'click .toggle_clipboard':'toggle_clipboard',
		'click .clipboard_update_file':'update_file',
		'keyup textarea': 'update_count',
		'keydown textarea': 'update_count',
		'paste textarea': 'update_count'
	},
	
	toggle_clipboard: function(event){
		this.file.set_as_placeholder(false);
		this.delete_view();
	},
	update_file: function(event){
		if($("#content_name").val().trim() == "")
			$("#name_err").css("display", "inline");
		else{
			//RELOAD TREE 
			if(this.edit){
				//Handle editing mode
			}else{				
				this.file.update({
					title: $("#content_name").val(), 
					author: $("#content_author").val(),
					//license : new License(...),
					//tags : [...],
					description: $("#file_description").val()
				});
				this.delete_view();
			}
		}
	},
	update_count : function(event){
		this.updateCount();
	}
});

/* Loaded when user clicks "Add Content" button */
var ClipboardAddContentView = ClipboardEditContentBaseView.extend({
	template: require("./hbtemplates/clipboard_header.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'toggle_clipboard','to_step_1', 'to_step_2', 'to_step_3', 'previous', 'next', 'clipboard_finish','switch_tab','delete_view');
		this.file = options.file;
		this.step_1_view = new ClipboardAddContentSourceView({model: null});
		this.step_2_view = null;
		this.step_3_view = new ClipboardAddContentMetadataView({model: null});
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		this.switch_tab($("#source_nav"));	
		$("#choose_nav").prop("disabled", true);
		$("#meta_nav").prop("disabled", true);
	},
	
	events: {
		'click .toggle_clipboard':'toggle_clipboard',
		'click #source_nav':'to_step_1',
		'click #choose_nav':'to_step_2',
		'click #meta_nav': 'to_step_3',
		'click .clipboard_previous':'previous',
		'click .clipboard_next':'next',
		'click .clipboard_finish':'clipboard_finish'
	},
	toggle_clipboard: function(event){
		closeClipboard();
	},
	to_step_1: function(event){
		this.switch_tab($("#source_nav"), this.step_1_view);	
	},
	to_step_2: function(event){
		this.switch_tab($("#choose_nav"), this.step_2_view);
	},
	to_step_3: function(event){
		this.switch_tab($("#meta_nav"), this.step_3_view);
	},
	previous: function(event){
		if($(".clipboard_navigation .selected").attr("id") == "choose_nav"){
			this.switch_tab($("#source_nav"), this.step_1_view);
			}
		else
			this.switch_tab($("#choose_nav"), this.step_2_view);
	},
	next: function(event){
		this.switch_tab($("#meta_nav"), this.step_3_view);
	},
	clipboard_finish: function(event){
		this.file.update({
					//title: $("#content_name").val(), 
					//author: $("#content_author").val(),
					//license : new License(...),
					//tags : [...],
					//description: $("#file_description").val()
				});
		this.delete_view();
	},
	switch_tab: function(newTab, view){
		$('.clipboard_navigation').find('a').attr("class", "btn btn-defult");
		newTab.addClass("selected");
		$("#clipboard_content").children().detach();

		switch(newTab.selector){
		case "#choose_nav":
			$(".clipboard_previous").show();
			$(".clipboard_next").show();
			$(".clipboard_finish").hide();
			$("#choose_nav").prop("disabled", false);
			this.step_2_view = view;
			$("#clipboard_content").append(this.step_2_view.el);
			break;
		case "#meta_nav":
			$(".clipboard_previous").show();
			$(".clipboard_next").hide();
			$(".clipboard_finish").show();
			$("#meta_nav").prop("disabled", false);
			$("#clipboard_content").append(this.step_3_view.el);
			break;
		default:
			$(".clipboard_previous").hide();
			$(".clipboard_next").hide();
			$(".clipboard_finish").hide();
			//this.step_1_view = new ClipboardAddContentSourceView({model: this.model});
			$("#clipboard_content").append(this.step_1_view.el);
		}
	}
});

/* Loaded when user clicks "Add Content" button */
var ClipboardAddContentSourceView = ClipboardAddContentView.extend({
	template: require("./hbtemplates/clipboard_step_1.handlebars"),
	initialize: function() {
		_.bindAll(this, 'computer_choose_content', 'channel_choose_content');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
	},
	
	events: {
		'click .computer_choose_content':'computer_choose_content',
		'click .channel_choose_content':'channel_choose_content',
	},
	computer_choose_content: function(event){
		window.add_content_view.switch_tab($("#choose_nav"), new ClipboardAddContentComputerView({model : this.model}));	
	},
	channel_choose_content:  function(event){
		window.add_content_view.switch_tab($("#choose_nav"), new ClipboardAddContentChannelView({model : this.model}));	
	}
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
	toggle_folder: function(event){
		console.log("Toggling folder...");
	}
});

var ClipboardAddContentChannelView = ClipboardAddContentView.extend({
	template: require("./hbtemplates/clipboard_step_2_channel.handlebars"),
	initialize: function() {
		_.bindAll(this, 'add_folder_to_list','toggle_folder','choose_channel','add_file_to_list','remove_item');
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
	},
	
	events: {
		'change select':'choose_channel',
		'click .file_plus':'add_file_to_list',
		'click .preview_file': 'preview_file',
		'click .folder_plus': 'add_folder_to_list',
		'click .toggle_folder':'toggle_folder',
		'click .remove_item':'remove_item'
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
	add_folder_to_list: function(event){
		console.log("Adding folder to list...");
		//Todo: change clipboard_list_items
		//loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: false, meta: false});
		//list_index = listHelper.appendList(file, list_item_template, "#selected_content_area ul", list_index);
	},
	add_file_to_list: function(event){
		console.log("Adding file to list...");
		//loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: false, meta: false});
		//list_index = listHelper.appendList(file, list_item_template, "#selected_content_area ul", list_index);
	},
	choose_channel: function(event){
		//loadListItems(temp_list_items, "#selected_content_area ul", this.model, {selected: true, list: false, meta: true});	
	},
	toggle_folder: function(event){
		console.log("Toggling folder...");
	}
});

var ClipboardAddContentMetadataView = ClipboardAddContentView.extend({
	template: require("./hbtemplates/clipboard_step_3.handlebars"),
	initialize: function() {
		_.bindAll(this,'preview_file','add_tag','update_count','remove_item','toggle_folder');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		var choose_template = require("./hbtemplates/clipboard_step_1.handlebars");
		$("#clipboard_content").append(choose_template(this.model));
		$("#source_nav").css("border-bottom", "5px solid #8DA9DB");
		$("#choose_nav").prop("disabled", true);
		$("#meta_nav").prop("disabled", true);
	},
	
	events: {
		'click .preview_file': 'preview_file',
		'click .plus':'add_tag',
		'click .toggle_folder':'toggle_folder',
		'keyup textarea': 'update_count',
		'keydown textarea': 'update_count',
		'paste textarea': 'update_count',
		'click .remove_item':'remove_item'
	},
	remove_item: function(event){
		$(event.target.selector).parent("li").remove();
	},
	update_count: function(event){
		this.updateCount();
	},
	
	preview_file: function(event){
		var file = $("#"+ $(event.target.selector).parent("li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model:  file.data("data"),
			file: file
		});
	},
	add_tag: function(event){
		console.log("Adding tag...");
	},
	toggle_folder: function(event){
		console.log("Toggling folder...");
	}
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
*/
		}
	}
	if(model && index == 0)
		$(listid).append("<li><label style=\"margin-left:40px;padding-left:10px;\"><h4><em>No items found.</em></h4></label></li>");
}

/*Todo: export only one ClipboardView once views are an extension of it*/
module.exports = {
	ClipboardListView:ClipboardListView,
	ClipboardEditFolderView:ClipboardEditFolderView,
	ClipboardEditFileView:ClipboardEditFileView,
	ClipboardAddContentView:ClipboardAddContentView,
	addItems:addItems
}