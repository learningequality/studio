require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"channel_edit":[function(require,module,exports){
var Views = require("edit_channel/views");
var Models = require("edit_channel/models");

$(function() {

	/* Todo: remove once data structures implemented */
	var channelModel = new Models.ChannelModel({name: 'Khan Academy', description: 'Default value for testing purposes'});
	var rootTopicNode = new Models.TopicNodeModel({title:'Khan Academy', description:'This is a sample description'});
	var topicTree = new Models.TopicTreeModel({name: "Untitled Tree", is_published: false, root_node: rootTopicNode, channel: channelModel});
	var dummyDescription = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";

	//Content Container 1
	var topicNode1 = new Models.TopicNodeModel({parent: rootTopicNode, title:'This is a very long title name for a file', description: dummyDescription + dummyDescription + dummyDescription + dummyDescription + dummyDescription + dummyDescription + dummyDescription + dummyDescription + dummyDescription +dummyDescription + dummyDescription + dummyDescription});
	var topicNode2 = new Models.TopicNodeModel({parent: rootTopicNode, title:'Science', description: "Shorter description"});
	var contentNode1 = new Models.ContentNodeModel({parent: rootTopicNode, title: "Intro video", description: dummyDescription, author:"Anyonymous"});
	var contentNode2 = new Models.ContentNodeModel({parent: rootTopicNode, title: "This is a very long title name for a file", description: dummyDescription, author:"Anyonymous"});
	
	//Content Container 2										
	var topicNode3 = new Models.TopicNodeModel({parent: topicNode1, title:'Algebra', description: dummyDescription});
	var topicNode4 = new Models.TopicNodeModel({parent: topicNode1, title:'Trigonometry', description: dummyDescription});
	var topicNode5 = new Models.TopicNodeModel({parent: topicNode1, title:'Geometry', description: dummyDescription});
	var topicNode6 = new Models.TopicNodeModel({parent: topicNode1, title:'Addition and Subtraction', description: dummyDescription});
	var topicNode8 = new Models.TopicNodeModel({parent: topicNode1, title:'Practice Tests', description: dummyDescription});
	var topicNode9 = new Models.TopicNodeModel({parent: topicNode1, title:'Homework', description: dummyDescription});
	var contentNode3 = new Models.ContentNodeModel({parent: topicNode1, title: "About", description: dummyDescription, author:"Anyonymous"});
	var contentNode4 = new Models.ContentNodeModel({parent: topicNode1, title: "Learning about shapes", description: dummyDescription, author:"Anyonymous"});

	//Content Container 3
	var topicNode7 = new Models.TopicNodeModel({parent: topicNode5, title:'Geology', description: dummyDescription});
	var contentNode5 = new Models.ContentNodeModel({parent: topicNode5, title: "Review", description: dummyDescription, author:"Anyonymous"});

	var topicNodeCollection = new Models.TopicNodeCollection([rootTopicNode, topicNode1, topicNode2, topicNode3, topicNode4, topicNode5, topicNode6, topicNode7, topicNode8, topicNode9]);
	var contentNodeCollection = new Models.ContentNodeCollection([contentNode1, contentNode2, contentNode3, contentNode4, contentNode5]);
	
	/*Todo: when data connected -
	var topicnodes = new Models.TopicNodeCollection().fetch();
	var contentnodes = new Models.ContentNodeCollection().fetch().then(function(){
		var view = new Views.BaseView({
			url: '/api',
			el: $("#channel-edit-container"),
			model: {topicnodes: topicnodes, contentnodes: contentnodes, topic: rootTopicNode}
		});
	});	
	*/
	var view = new Views.BaseView({
		el: $("#channel-edit-container"),
		model: {topicnodes: topicNodeCollection, contentnodes: contentNodeCollection, topic: topicTree}
	});
});
},{"edit_channel/models":16,"edit_channel/views":33}],33:[function(require,module,exports){
var Backbone = require("backbone");
var _ = require("underscore");

/* Depending on implementation, might create one view for each page to keep data from resetting 
var EditViews = require("edit_channel/tree_edit/views");
var PreviewViews = require("edit_channel/tree_preview/views");
var TrashViews = require("edit_channel/trash/views");
*/
var clipboardContent = [];

var BaseView = Backbone.View.extend({
	template: require("./hbtemplates/channel_edit.handlebars"),
	url: '/api',
	initialize: function() {
		_.bindAll(this, 'open_edit', 'open_preview', 'open_trash', 'open_publish','open_clipboard');
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		$("#clipboard-toggler").show();
		var EditViews = require("edit_channel/tree_edit/views");
		new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: true
		});
	},
	events: {
		'click #channel-edit-button': 'open_edit',
		'click #channel-preview-button': 'open_preview',
		'click #channel-trash-button':'open_trash',
		'click #channel-publish-button': 'open_publish',
		'click #clipboard-toggler' : 'open_clipboard'
	},
	
	open_edit: function(){
		$("#clipboard-toggler").show();
		var EditViews = require("edit_channel/tree_edit/views");
		new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: true
		});
	},
	
	open_preview: function(){
		$("#clipboard-toggler").hide();
		$("#clipboard").hide();
		var PreviewViews = require("edit_channel/tree_preview/views");
		new PreviewViews.TreePreviewView({
			el: $("#main-content-area"),
			model: this.model,
			edit: false
		});
	},

	open_trash: function(){
		$("#clipboard-toggler").show();
		var TrashViews = require("edit_channel/trash/views");
		new TrashViews.TrashView({
			el: $("#main-content-area"),
			model: this.model
		});
	},
	open_clipboard: function(){
		var ClipboardViews = require("edit_channel/clipboard/views");
		new ClipboardViews.ClipboardListView({
			el: $("#clipboard-area"),
			model: this.model
		});
	},

	//Todo: Change to actually publish the channel (i.e. add to published tree)
	open_publish: function(){
		if(confirm("Are you sure you want to publish?")){
			console.log("Publishing Channel");
		}
	}
});

function addToClipboard(topic_nodes, content_nodes){
	//clipboardContent
}

module.exports = {
	BaseView: BaseView
}
},{"./hbtemplates/channel_edit.handlebars":11,"backbone":64,"edit_channel/clipboard/views":10,"edit_channel/trash/views":26,"edit_channel/tree_edit/views":27,"edit_channel/tree_preview/views":28,"underscore":174}],28:[function(require,module,exports){
var Backbone = require("backbone");
var _ = require("underscore");
var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var TextHelper = require("edit_channel/utils/TextHelper");
var PreviewerViews = require("edit_channel/previewer/views");

require("preview.less");
var container_number; // Better to find other way to identify unique container

var TreePreviewView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),

	initialize: function(options) {
		_.bindAll(this, 'open_folder', 'preview_file','expand_folder','minimize_folder');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		container_number = 0;
		container_number = LoadHelper.loadContainer(null, this.model.topic.get("root_node"), this.model.topicnodes, 
												this.model.contentnodes, container_number, this.edit, true, 0); 
	},
	events: {
		'click .folder': 'open_folder',
		'click .file': 'preview_file',
		'click .filler': 'expand_folder',
		'click .minimize':'minimize_folder'
	},
	expand_folder: function(event){
		TextHelper.manageFolder(event, true);
	},
	minimize_folder: function(event){
		TextHelper.manageFolder(event, false);
	},
	open_folder: function(event){
		var el = DOMHelper.getParentOfTag(event.target, "label");
		container_number = LoadHelper.loadContainer(el, $("#"+el.parentNode.id).data("data"), this.model.topicnodes, 
												this.model.contentnodes, container_number, this.edit, false);
	},
	preview_file: function(event){
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: file.data("data"),
			file: file
		});
	}
});

module.exports = {
	TreePreviewView: TreePreviewView
}
},{"./../hbtemplates/container_area.handlebars":12,"backbone":64,"edit_channel/previewer/views":22,"edit_channel/utils/DOMHelper":29,"edit_channel/utils/LoadHelper":31,"edit_channel/utils/TextHelper":32,"preview.less":59,"underscore":174}],59:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "@font{font-family:\"Open Sans\";src:url(\"../fonts/OpenSans-Regular.ttf\") format(\"truetype\")}.inline-block{display:inline-block}body{background:#292a2b}a{text-decoration:none;cursor:pointer;color:black}#container-wrapper{overflow:hidden;overflow-x:auto}.content-container{height:80vh;background-color:transparent;min-height:500px;display:inline-block;width:390px;position:relative;margin-left:0;margin-right:-5px;padding:0}.content-container *{padding:0;margin:0}.content-container ::-webkit-scrollbar{display:none}.content-container canvas{position:absolute;height:69vh;min-height:489px;border:5px solid white;border-right:none;width:38px;box-shadow:-3px 3px 3px black;z-index:100}.content-container .title-bar{position:relative;z-index:100;margin-left:90px;width:180px;font-size:22px;color:white;background-color:#292a2b;margin-bottom:-21px;padding-bottom:10px}.content-container .container-interior{position:absolute;height:69vh;min-height:489px;width:360px;border:5px solid white;box-shadow:-3px 3px 3px black;background-color:#292a2b}.content-container .content-list{width:390px;overflow-y:auto;overflow-x:hidden;margin-top:16px;padding-top:5px;margin-left:none}.content-container .content-list input[type=\"radio\"]{display:none}.content-container .content-list ul{position:relative;z-index:150}.content-container .content-list ul span{display:none}.content-container .content-list ul .default-item{font-style:italic;margin-left:40px;font-size:18px;color:white}.content-container .content-list ul label{vertical-align:middle;font-weight:normal;cursor:pointer;padding:0;margin-bottom:10px;margin-left:10px;width:292px;border:.5px solid black;box-shadow:3px 3px 3px #8d8f90;background-color:white}.content-container .content-list ul label *{padding-right:10px}.content-container .content-list ul label .filler,.content-container .content-list ul label .minimize{font-weight:bold;font-style:italic}.content-container .content-list ul .folder{height:120px}.content-container .content-list ul .folder h3{font-size:17px;font-weight:bold;padding-left:10px;padding-bottom:10px}.content-container .content-list ul .folder .glyphicon{display:inline}.content-container .content-list ul .folder p{font-size:14px;padding-left:10px;width:292px}.content-container .content-list ul .folder p a{text-decoration:none;color:black}.content-container .content-list ul .file{border-radius:10px}.content-container .content-list ul .file h4{font-size:17px;padding:10px}.content-container .content-list ul .file .glyphicon{display:inline}.content-container .content-list ul input[type=checkbox]:checked+.file,.content-container .content-list ul .file:hover{background-color:#b6b6b7}#preview h1{font-size:20px;margin-bottom:20px;color:white}#preview .content-container canvas{background-color:#87a3c6}#preview .content-list{padding-left:40px}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],27:[function(require,module,exports){
var Backbone = require("backbone");
var _ = require("underscore");
require("edit.less");

var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var TextHelper = require("edit_channel/utils/TextHelper");
var LessHelper = require("edit_channel/utils/LessHelper");
var ClipboardViews = require("edit_channel/clipboard/views");
var PreviewerViews = require("edit_channel/previewer/views");

var container_number; //Used to create unique identifier for directories

var TreeEditView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_folder', 'preview_node', 'add_content','edit_file','add_folder',
					'copy_content','delete_content','open_folder','expand_folder','minimize_folder');
		//this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
		this.edit = options.edit;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		container_number = 0;
		container_number = LoadHelper.loadContainer(null,this.model.topic.get("root_node"), this.model.topicnodes,
												this.model.contentnodes,container_number,this.edit, true, 0);
	},
	
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .edit_file_button': 'edit_file',
		'click .preview_button': 'preview_node',
		'click .add_content_button':'add_content',
		'click .add_folder_button':'add_folder',
		'click .copy' : 'copy_content',
		'click .delete' : 'delete_content',
		'click .open_folder':'open_folder',
		'click .filler' : 'expand_folder',
		'click .minimize' : 'minimize_folder'
	},
	expand_folder: function(event){
		TextHelper.manageFolder(event, true);
	},
	minimize_folder: function(event){
		TextHelper.manageFolder(event, false);
	},
	open_folder:function(event){
		event.preventDefault();
		var el = DOMHelper.getParentOfTag(event.target, "label");
		container_number = LoadHelper.loadContainer(el,$("#"+el.parentNode.id).data("data"),this.model.topicnodes,
												this.model.contentnodes,container_number,this.edit, false, "#CCCCCC");
		if($("#is_editing").val() == "y"){
			$(".edit_folder_button").css('visibility','hidden');
			$(".edit_file_button").css('visibility','hidden');
			$(".content_options button").prop('disabled',true);
		}
	},
	edit_folder: function(event){
		event.preventDefault();
		openClipboard();
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			model: $("#"+ DOMHelper.getParentOfTag(event.target, "li").id).data("data"),
			edit: true
		});
		$("#clipboard").slideDown();
	},
	
	edit_file: function(event){
		event.preventDefault();
		openClipboard();
		new ClipboardViews.ClipboardEditFileView({
			el: $("#clipboard-area"),
			model: $("#"+ DOMHelper.getParentOfTag(event.target, "li").id).data("data")
		});
		$("#clipboard").slideDown();
	},
	
	preview_node: function(event){
		event.preventDefault();
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model:  file.data("data"),
			file: file
		});
		
	},
	
	add_content: function(event){
		event.preventDefault();
		var file_template = require("./../hbtemplates/content_file.handlebars");
		newContent(file_template, event.target);
		new ClipboardViews.ClipboardAddContentView({
			el: $("#clipboard-area"),
			model: $("#" + DOMHelper.getParentOfClass(event.target, "content-container").id).data("channel")
		});
		
		$("#clipboard").slideDown();
	},
	
	add_folder: function(event){
		event.preventDefault();
		var folder_template = require("./../hbtemplates/content_folder.handlebars");
		newContent(folder_template, event.target);
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			//model: event.target.parentnode... //include topic tree root to know which tree to add to
			edit: false
		});
		$("#clipboard").slideDown();
	},
	
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Content");
			var selected = $('#edit').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				console.log($("#"+selected[i].parentNode.id).data("data").attributes);
				selected[i].parentNode.remove();
			}
		}
	},
	
	copy_content: function(event){
		var list = $('.content-container').find('input:checked + label').parent();
		var clipboard_list = [];
		for(var i = 0; i< list.length; i++)
			clipboard_list.push({data: $("#" + list[i].id).data("data"), folder: $("#" + list[i].id + " .folder").length != 0});
		ClipboardViews.addItems(clipboard_list);
	}
});

function newContent(template, content){
	openClipboard();
	//LessHelper.loadLessVariablesFor("#" + content.id + " label");
	var containerid = "#" + DOMHelper.getParentOfClass(content, "content-container").id;
	var index = containerid.match(/\d+/)[0];
	$(containerid + " .content_options").after(template({index: index , list_index: "new", edit: edit}));
	$("#item_" + index + "_new label").css("background-color", "#89C0B1");
	$("#item_" + index + "_new").attr("class","newcontent");
	$("#item_" + index + "_new div").css("display","none");
	$("#item_" + index + "_new input").css("visibility","hidden");
	
}

function openClipboard(){
	$("#is_editing").val("y");
	$(".content_options button").prop('disabled',true);
	$(".edit_folder_button").css('visibility','hidden');
	$(".edit_file_button").css('visibility','hidden');
}

module.exports = {
	TreeEditView: TreeEditView
}
},{"./../hbtemplates/container_area.handlebars":12,"./../hbtemplates/content_file.handlebars":14,"./../hbtemplates/content_folder.handlebars":15,"backbone":64,"edit.less":57,"edit_channel/clipboard/views":10,"edit_channel/previewer/views":22,"edit_channel/utils/DOMHelper":29,"edit_channel/utils/LessHelper":30,"edit_channel/utils/LoadHelper":31,"edit_channel/utils/TextHelper":32,"underscore":174}],57:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "@font{font-family:\"Open Sans\";src:url(\"../fonts/OpenSans-Regular.ttf\") format(\"truetype\")}.inline-block{display:inline-block}body{background:#292a2b}a{text-decoration:none;cursor:pointer;color:black}#container-wrapper{overflow:hidden;overflow-x:auto}.content-container{height:80vh;background-color:transparent;min-height:500px;display:inline-block;width:390px;position:relative;margin-left:0;margin-right:-5px;padding:0}.content-container *{padding:0;margin:0}.content-container ::-webkit-scrollbar{display:none}.content-container canvas{position:absolute;height:69vh;min-height:489px;border:5px solid white;border-right:none;width:38px;box-shadow:-3px 3px 3px black;z-index:100}.content-container .title-bar{position:relative;z-index:100;margin-left:90px;width:180px;font-size:22px;color:white;background-color:#292a2b;margin-bottom:-21px;padding-bottom:10px}.content-container .container-interior{position:absolute;height:69vh;min-height:489px;width:360px;border:5px solid white;box-shadow:-3px 3px 3px black;background-color:#292a2b}.content-container .content-list{width:390px;overflow-y:auto;overflow-x:hidden;margin-top:16px;padding-top:5px;margin-left:none}.content-container .content-list input[type=\"radio\"]{display:none}.content-container .content-list ul{position:relative;z-index:150}.content-container .content-list ul span{display:none}.content-container .content-list ul .default-item{font-style:italic;margin-left:40px;font-size:18px;color:white}.content-container .content-list ul label{vertical-align:middle;font-weight:normal;cursor:pointer;padding:0;margin-bottom:10px;margin-left:10px;width:292px;border:.5px solid black;box-shadow:3px 3px 3px #8d8f90;background-color:white}.content-container .content-list ul label *{padding-right:10px}.content-container .content-list ul label .filler,.content-container .content-list ul label .minimize{font-weight:bold;font-style:italic}.content-container .content-list ul .folder{height:120px}.content-container .content-list ul .folder h3{font-size:17px;font-weight:bold;padding-left:10px;padding-bottom:10px}.content-container .content-list ul .folder .glyphicon{display:inline}.content-container .content-list ul .folder p{font-size:14px;padding-left:10px;width:292px}.content-container .content-list ul .folder p a{text-decoration:none;color:black}.content-container .content-list ul .file{border-radius:10px}.content-container .content-list ul .file h4{font-size:17px;padding:10px}.content-container .content-list ul .file .glyphicon{display:inline}.content-container .content-list ul input[type=checkbox]:checked+.file,.content-container .content-list ul .file:hover{background-color:#b6b6b7}#edit #button_bar{margin-bottom:15px}#edit #button_bar a{background-color:#3e5e9f;color:white;border:3px solid white;width:130px;font-size:16px;padding:5px;margin-right:15px;vertical-align:middle}#edit .content-container canvas{background-color:#ccc}#edit .content-container .content-list{padding-left:9.5px}#edit .content-container .content-list ul .options{display:none}#edit .content-container .content-list ul input[type=checkbox]{display:inline-block;width:24px;height:24px;vertical-align:middle;margin-right:2px}#edit .content-container .content-list ul .folder_options{height:120px;width:40px}#edit .content-container .content-list ul input[type=checkbox]:checked+label .options,#edit .content-container .content-list ul label:hover .options{display:inline-block}#edit .content-container .content-list ul input[type=checkbox]:checked+label .options .glyphicon,#edit .content-container .content-list ul label:hover .options .glyphicon{font-size:25px}#edit .content-container .content-list ul .content_options{margin-left:38px;width:100%;height:50px}#edit .content-container .content-list ul .content_options button{background-color:#a684c8;padding:5px;width:140px;color:black;border:3px solid white;border-radius:0;margin-right:10px;font-size:14px}#edit .content-container .content-list ul .content_options button .glyphicon{font-size:17px}#edit .content-container .content-list ul .content_options button span{margin-right:10px;display:inline-block}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],30:[function(require,module,exports){
/* Helper function returns less variables for a selector */
function loadLessVariablesFor(selector){
	var oLess = {};
	$.each(document.styleSheets,function(i,sheet){
		$.each(sheet.cssRules,function(i,rule){
			var sRule = rule.cssText;
			if (sRule.substr(0,5)==selector) {
				var aKey = sRule.match(/\.(\w+)/);
				var aVal = sRule.match(/(\d+)/);
				if (aKey&&aVal) oLess[aKey[1]] = aVal[0]<<0;
			}
		});
	});
	console.log(oLess);
}

module.exports = {
	loadLessVariablesFor: loadLessVariablesFor
}
},{}],26:[function(require,module,exports){
var Backbone = require("backbone");
var _ = require("underscore");
require("trash.less");
var view_model;
var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var PreviewerViews = require("edit_channel/previewer/views");

/* Todo: figure out how to display archived files after deleted */
var TrashView = Backbone.View.extend({
	template: require("./hbtemplates/trash.handlebars"),
	initialize: function() {
		_.bindAll(this, 'delete_selected', 'restore_selected','select_all','toggle_file_item','preview_list_item','check_item','toggle_folder_item');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.view_model = this.model;
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		var folder_template = require("./hbtemplates/trash_collapsed.handlebars");
		var file_template = require("./hbtemplates/trash_collapsed.handlebars");
		$(".trash_list_container ul").empty();
		var index = LoadHelper.loadList(this.model.topic.root_node, this.view_model, folder_template, file_template, ".trash_list_container ul", 50, null, 0, 0);
		if(index == 0) $("#trash_list").append("<h5 class=\"default-item\">No content found.</h5>");
	},
	
	events: {
		'click #delete-selected-button': 'delete_selected',
		'click #restore-selected-button': 'restore_selected',
		'click #select_all': 'select_all',
		'click .tog_file': 'toggle_file_item',
		'click .tog_folder': 'toggle_folder_item',
		'click .prev': 'preview_list_item',
		'change #trash [type=checkbox]' : 'check_item'
	},
	delete_selected: function(event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Selected... ");
			var selected = $('.trash_list_container').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				selected[i].parentNode.remove();
			}
		}
	},
	restore_selected: function(event){
		console.log("Restoring Selected... ");
		var selected = $('.trash_list_container').find('input:checked + label');
		for(var i = 0; i < selected.length; i++){
			selected[i].parentNode.remove();
		}
	},
	
	select_all: function(event){
		if(event.target.checked){
			$(".select_all_span .sidebar").css("display", "inline-block");
			$(".select_all_span").css("background-color", "#E6E6E6");
		}
		else {
			$(".select_all_span .sidebar").css("display", "none");
			$(".select_all_span").css("background-color", "transparent");
		}
		var selected = $('.trash_list_container').find('input[type=checkbox]');
		for(var i = 0; i < selected.length; i++){
			selected[i].checked = event.target.checked;
			checkItem("#" + selected[i].parentNode.id, event.target.checked);
		}
	},
	toggle_folder_item: function(event){
		event.preventDefault();
		var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id;
		if($(el).data("collapsed")){
			$(el + "_sub").slideDown();
			$(el+" .glyphicon-chevron-right").attr("class", "tog_folder glyphicon glyphicon-chevron-down");
			$(el).data("collapsed", false);
		}
		else{
			$(el + "_sub").slideUp();
			$(el).data("collapsed", true);
			$(el+" .glyphicon-chevron-down").attr("class", "tog_folder glyphicon glyphicon-chevron-right");
		}
	},
	toggle_file_item: function(event){
		event.preventDefault();
		var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id;
		if($(el).data("collapsed")){
			$(el).data("collapsed", false);
			$(el + " .details").slideDown();
			$(el+" .glyphicon-chevron-right").attr("class", "tog_file glyphicon glyphicon-chevron-down");
			$(el).css("height", "300px");
			var textHelper = require("edit_channel/utils/TextHelper");
			$(el + " #bottom-right p").html(textHelper.trimText($(el + " #bottom-right p").text(), "...", 100, false));

			
			if($(el+" input[type=checkbox]").prop("checked") == false)
				$(el + " .detail-bar").css({"height" : $(el).height(), "display" : "inline"});
			else{
				$(el + " .sidebar").css("height", $(el).height());
				$(el + " .prev").css("color", "black");
			}
		}
		else{
			$(el).data("collapsed", true);
			$(el+" .glyphicon-chevron-down").attr("class", "tog_file glyphicon glyphicon-chevron-right");
			$(el + " .details").slideUp();
			$(el + " .detail-bar").css("display", "none");
			$(el).css("height", "50px");
			$(el + " .sidebar").css("height", $(el).height());
		}
	},
	preview_list_item: function(event){
		event.preventDefault();
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: file.data("data"),
			file: file
		});
		var addon_template = require("./hbtemplates/trash_preview_add_on.handlebars");
		$("#previewer").append(addon_template());
	},
	check_item: function(event){
		if(event.target.parentNode.nodeName != "DIV")
			checkItem("#" + event.target.parentNode.id, event.target.checked);
	}
});

function checkItem(el, checked){
	if(checked){
		$(el + " .sidebar").css("height", $(el).height());
		$(el + " .sidebar").css("display", "inline-block");
		$(el + " .detail-bar").css("display", "none");
		$(el).css("background-color", "#E6E6E6");
	}
	else {
		$(el + " .sidebar").css("display", "none");
		$(el).css("background-color", "transparent");
		if(!$(el).data("collapsed")){
			$(el + " .detail-bar").css("height", $(el).height());
			$(el + " .detail-bar").css("display", "inline");
		}
	}
}

module.exports = {
	TrashView: TrashView
}
},{"./hbtemplates/trash.handlebars":23,"./hbtemplates/trash_collapsed.handlebars":24,"./hbtemplates/trash_preview_add_on.handlebars":25,"backbone":64,"edit_channel/previewer/views":22,"edit_channel/utils/DOMHelper":29,"edit_channel/utils/LoadHelper":31,"edit_channel/utils/TextHelper":32,"trash.less":62,"underscore":174}],62:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "@font{font-family:\"Open Sans\";src:url(\"../fonts/OpenSans-Regular.ttf\") format(\"truetype\")}.inline-block{display:inline-block}body{background:#292a2b}a{text-decoration:none;cursor:pointer;color:black}#trash{min-height:400px}#trash h3{width:633.33333333px;font-size:18px;color:white}#trash nav{margin-bottom:20px}#trash nav a{height:40px;width:100px;border:3px solid #a4aab0;padding:5px;background-color:#3e5e9f;color:white;font-size:17px;margin-left:10px}#trash nav a .glyphicon{height:25px;width:auto;margin:0 7px}#trash input[type=checkbox]{display:inline-block;width:20px;height:20px;cursor:pointer;margin-left:10px;position:relative;z-index:5;vertical-align:middle}#trash #trash_background{position:absolute;background-color:white;border:4px solid #8098d2;width:950px;height:570px;z-index:-100}#trash #trash_content_area{min-height:400px;width:970px;height:570px;z-index:-20}#trash #trash_content_area h1{margin:0;padding-left:10px;height:50px;z-index:100;background-color:#8098d2;width:950px;color:white}#trash #trash_content_area .default-item{font-style:italic;margin-left:30px;margin-left:38px;font-size:20px}#trash #trash_content_area canvas{width:42px;height:570px;border-bottom:4px solid #8098d2;border-left:4px solid #8098d2;min-height:400px;background-color:#ccc;position:absolute;z-index:-10}#trash #trash_content_area .select_all_span{border-bottom:1px solid #ccc;width:950px;position:relative;height:33.33333333px;z-index:100}#trash #trash_content_area .select_all_span label{margin-left:10px;font-size:17px;padding:5px;cursor:pointer;width:808px}#trash #trash_content_area .select_all_span .sidebar{height:33.33333333px}#trash #trash_content_area .sidebar,#trash #trash_content_area .detail-bar{display:none;background-color:#8da9db;width:42px;margin:0;border-right:4px solid #2d8ecb;z-index:2;position:absolute}#trash #trash_content_area .trash_list_container{overflow:auto;height:480px;width:100%}#trash #trash_content_area .trash_list_container .subdirectory{display:none}#trash #trash_content_area .trash_list_container ul{position:relative;font-size:18px}#trash #trash_content_area .trash_list_container ul span{display:none}#trash #trash_content_area .trash_list_container ul span label{font-size:20px;font-weight:bold}#trash #trash_content_area .trash_list_container ul li{border-right:4px solid #8098d2;width:950px;height:50px}#trash #trash_content_area .trash_list_container ul .glyphicon{font-size:18px;display:inline-block;margin-left:10px}#trash #trash_content_area .trash_list_container ul label{font-weight:normal;height:100%;cursor:pointer;width:893px;vertical-align:middle;padding-left:5px;padding-right:10px;z-index:5;border:1px solid #ccc}#trash #trash_content_area .trash_list_container ul label h5{font-size:15px;font-weight:bold}#trash #trash_content_area .trash_list_container ul label a{text-decoration:none;color:black}#trash #trash_content_area .trash_list_container ul label p{font-style:italic;font-size:14px;width:90%}#trash #trash_content_area .trash_list_container ul label .details{display:none;width:90%;height:250px}#trash #trash_content_area .trash_list_container ul label .details .row-fluid:first-child{border-bottom:1px dotted gray}#trash #trash_content_area .trash_list_container ul label .details .row-fluid div{display:inline-block;width:45%;font-size:15px;height:100px;padding:10px}#trash #trash_content_area .trash_list_container ul label .details #top-right,#trash #trash_content_area .trash_list_container ul label .details #bottom-right{border-left:1px dotted gray}#trash #trash_content_area .trash_list_container ul li input[type=checkbox]:checked+label span,#trash #trash_content_area .trash_list_container ul li:hover span{display:inline-block}#trash #trash_content_area .trash_list_container ul .prev{right:.1em;cursor:pointer;margin-top:10px;z-index:10}#trash #trash_content_area .trash_list_container ul .detail-bar{right:5px;width:52px}#trash #trash_content_area .trash_list_container ul .item-details{height:250px}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],25:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div id=\"trash_preview_add_on\">\r\n	<a class = \"btn btn-default pull-left\">Restore</a>\r\n	<a class = \"btn btn-default pull-right\">Delete</a>\r\n</div>";
  });

},{"hbsfy/runtime":93}],24:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "<span class=\"detail-bar pull-right\"></span>";
  }

function program3(depth0,data) {
  
  
  return "<span class=\"tog_folder glyphicon glyphicon-chevron-right\" aria-hidden=\"true\"></span>\r\n			";
  }

function program5(depth0,data) {
  
  
  return "\r\n				<span class=\"prev glyphicon glyphicon-search\" aria-hidden=\"true\"></span>\r\n				<span class=\"tog_file glyphicon glyphicon-chevron-right\" aria-hidden=\"true\"></span>\r\n			";
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n			<div class=\"details container\">\r\n				<div class=\"row-fluid\">\r\n					<div id=\"top-left\">\r\n						<h5>Author</h5>\r\n						<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.author), {hash:{},inverse:self.program(10, program10, data),fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n					</div>\r\n					<div id=\"top-right\">\r\n						<h5>Tags</h5>\r\n						<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.tag)),stack1 == null || stack1 === false ? stack1 : stack1.length), {hash:{},inverse:self.program(15, program15, data),fn:self.program(12, program12, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n					</div>\r\n				</div>\r\n				<div class=\"row-fluid\">\r\n					<div id=\"bottom-left\">\r\n						<h5>License</h5>\r\n						<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.license)),stack1 == null || stack1 === false ? stack1 : stack1.name), {hash:{},inverse:self.program(19, program19, data),fn:self.program(17, program17, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n					</div>\r\n					<div id=\"bottom-right\">\r\n						<h5>Description</h5>\r\n						<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.description), {hash:{},inverse:self.program(23, program23, data),fn:self.program(21, program21, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n					</div>\r\n				</div>\r\n			</div>\r\n		";
  return buffer;
  }
function program8(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.author)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program10(depth0,data) {
  
  
  return "No authors found.";
  }

function program12(depth0,data) {
  
  var stack1;
  stack1 = helpers.each.call(depth0, (depth0 && depth0.tag), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { return stack1; }
  else { return ''; }
  }
function program13(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.tag)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program15(depth0,data) {
  
  
  return "No tags found.";
  }

function program17(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.license)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program19(depth0,data) {
  
  
  return "No license found.";
  }

function program21(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program23(depth0,data) {
  
  
  return "No description found.";
  }

function program25(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<ul id=\"item_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_sub\" class=\"list-unstyled subdirectory\"></ul>";
  return buffer;
  }

  buffer += "<li id=\"item_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n	<span class=\"sidebar pull-left\"></span>\r\n	<input type=\"checkbox\" id=\"file_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"></input>\r\n	<label  for=\"file_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"trash_item\">\r\n		";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n		<h4>\r\n			";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.program(5, program5, data),fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			<span class=\"glyphicon glyphicon-";
  if (helper = helpers.file_icon) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.file_icon); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" aria-hidden=\"true\"></span>\r\n			"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\r\n		</h4>\r\n		";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n	</label>\r\n</li>\r\n\r\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.noop,fn:self.program(25, program25, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

},{"hbsfy/runtime":93}],23:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div id=\"trash\" class=\"container-fluid\">\r\n	<h3>Trash contains content you've removed from your course. Choose to restore them or delete them permanently.</h3>\r\n	<nav id=\"button_bar\" class=\"col-m-2\">\r\n		<a id=\"restore-selected-button\" class=\"btn btn-default delete\">Restore</a>\r\n		<a id=\"delete-selected-button\" class=\"btn btn-default copy\">Delete</a>\r\n	</nav>\r\n	\r\n	<div id=\"trash_content_area\">\r\n		<div id=\"trash_background\"></div>\r\n		<canvas class=\"pull-left\"></canvas>\r\n		<h1>Trash</h1>\r\n		<div class=\"select_all_span\">\r\n			<span class=\"sidebar pull-left\"></span>\r\n			<input type=\"checkbox\" id=\"select_all\"/><label for=\"select_all\">Select all</label>\r\n		</div>\r\n		<div class=\"trash_list_container\">\r\n			<ul class=\"list-unstyled\">\r\n			</ul>\r\n		</div>\r\n	</div>\r\n</div>";
  });

},{"hbsfy/runtime":93}],16:[function(require,module,exports){
var Backbone = require("backbone");
var _= require("underscore");

/* TODO: CHANGE TO ChannelEditDataModel.EXTEND */
var TopicNodeModel = Backbone.Model.extend({
	urlRoot: '/api/topics/',
	defaults: {
        color1:"",
		color2:"",
		color3:"",
		title:"Untitled",
		description:"This is the description generated by default"
    }
});

var TopicTreeModel = Backbone.Model.extend({
	urlRoot: '/api/topictree/',
	defaults: {
		name: "Untitled Tree",
		is_published: false
	}
});

var ContentNodeModel = Backbone.Model.extend({
	urlRoot: '/api/content/',
	defaults: {
		title: "Untitled Content",
		author: "Anonymous",
		license_owner: "No license found",
		description:"This is the description generated by default"
    }
});

var ChannelModel = Backbone.Model.extend({
	urlRoot: '/api/channel/',
	defaults: {
		title: "Untitled Content",
		author: "Anonymous",
		license_owner: "No license found",
		description:"This is the description generated by default"
    }
});

var TopicNodeCollection = Backbone.Collection.extend({
	urlRoot: '/api/topics/',
	model: TopicNodeModel
});

var ContentNodeCollection = Backbone.Collection.extend({
	urlRoot: '/api/content/',
	model: ContentNodeModel
});

module.exports = {
	TopicNodeModel: TopicNodeModel,
	TopicNodeCollection: TopicNodeCollection,
	ChannelModel: ChannelModel,
	TopicTreeModel:TopicTreeModel,
	ContentNodeModel: ContentNodeModel,
	ContentNodeCollection: ContentNodeCollection
}
},{"backbone":64,"underscore":174}],12:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\"edit\"";
  }

function program3(depth0,data) {
  
  
  return "\"preview\"";
  }

function program5(depth0,data) {
  
  
  return "\r\n	<nav id=\"button_bar\" class=\"col-m-2\">\r\n		<a class=\"btn btn-default copy\">Copy</a>\r\n		<a class=\"btn btn-default delete\">Delete</a>\r\n	</nav>\r\n	";
  }

function program7(depth0,data) {
  
  
  return "\r\n		<h1>Select content to preview.</h1>\r\n	";
  }

  buffer += "<div id=";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " class=\"container-fluid\">\r\n	<input type=\"hidden\" id=\"is_editing\" value = \"n\" />\r\n	";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n	<div id=\"container-wrapper\">\r\n		<div id=\"container_area\" class=\"container-fluid row\"></div>\r\n	</div>\r\n</div>";
  return buffer;
  });

},{"hbsfy/runtime":93}],11:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<nav class=\"navbar navbar-default collapse navbar-collapse\" id=\"secondary-nav\">\r\n	<ul class=\"nav navbar-nav\">\r\n		<li id=\"channel-edit-button\" class=\"text-center pull-left\">Edit</li>\r\n		<li id=\"channel-preview-button\" class=\"text-center pull-left\">Preview</li>\r\n		<li id=\"channel-trash-button\" class=\"text-center pull-left\">Trash</li>\r\n	</ul>\r\n	<ul class=\"nav navbar-nav\" id=\"publish\">\r\n		<li id=\"channel-publish-button\" class=\"text-center pull-right\">Publish</li>\r\n	</ul>\r\n</nav>\r\n<button class=\"btn btn-primary\" type=\"button\" id=\"clipboard-toggler\">\r\n	<span class=\"glyphicon glyphicon-menu-down\" aria-hidden=\"true\"></span>\r\n	Clipboard\r\n	<span class=\"badge\"></span>\r\n</button>\r\n\r\n<div id=\"main-content-area\" class=\"container-fluid\"></div>\r\n<div id=\"previewer-area\" class=\"container pull-right\"></div>\r\n<div id=\"clipboard-area\" class=\"container pull-right\"></div>";
  });

},{"hbsfy/runtime":93}],10:[function(require,module,exports){
var Backbone = require("backbone");
var _ = require("underscore");
require("clipboard.less");

var PreviewerViews = require("edit_channel/previewer/views");
var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var CHAR_LIMIT = 300;

var list_item_template = require("./hbtemplates/clipboard_list_item.handlebars");
var prevTemplate;
var list_index;

var clipboard_list_items = [];
var temp_list_items = [];

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardListView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_list.handlebars"),
	initialize: function() {
            _.bindAll(this, 'add_content', 'collapse_clipboard','delete_content','toggle_folder');
            //this.listenTo(clipboard_list_items, "change:clipboard_list_items.length", this.render);
            this.render();
			$("#clipboard").slideDown();
        },
        render: function() {
			this.$el.html(this.template());
			loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: true, meta: false});
        },
		
		events: {
			'click .clipboard_add_content': 'add_content',
			'click .collapse_clipboard':'collapse_clipboard',
			'click .delete_content': 'delete_content',
			'click .tog_folder': 'toggle_folder'
		},
		collapse_clipboard: function(event){
			$("#clipboard").slideUp();
		},
		add_content: function(event){
			new ClipboardAddContentView({
				el: $("#clipboard-area")
			});
		},
		delete_content:function(event){
			if(confirm("Are you sure you want to delete this file?")){
				var el = DOMHelper.getParentOfTag(event.target, "li");
				var i = clipboard_list_items.indexOf($("#" + el.id).data("data"));
				console.log($("#" + el.id).data("data"));
				console.log(clipboard_list_items[0]);
				if(i != -1) console.log(clipboard_list_items[i]);
				//clipboard_list_items.remove(i);
				el.remove();
				
			}
		},
		toggle_folder: function(event){
			event.preventDefault();
			var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id;
			if($(el).data("collapsed")){
				$(el + "_sub").slideDown();
				$(el).data("collapsed", false);
			}
			else{
				$(el + "_sub").slideUp();
				$(el).data("collapsed", true);
			}
		}
});

/* Loaded when user clicks edit icon on folder or "Add Folder" button */
var ClipboardEditFolderView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_edit_folder.handlebars"),
	initialize: function(options) {
		this.edit = options.edit;
            _.bindAll(this, 'update_folder', 'toggle_clipboard','update_count');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
			this.$el.html(this.template({folder: ((this.edit)? this.model.attributes : null), edit: this.edit, 
								limit: ((this.edit)? CHAR_LIMIT - this.model.attributes.description.length : CHAR_LIMIT)}));
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
				//RELOAD TREE 
				closeClipboard();
			}
		},
		toggle_clipboard: function(event){
			closeClipboard();
		},
		update_count: function(event){
			updateCount();
		}
});

/* Loaded when user clicks edit icon on file*/
var ClipboardEditFileView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_edit_file.handlebars"),
	initialize: function() {
		_.bindAll(this, 'toggle_clipboard', 'update_file', 'update_count');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template({file: this.model.attributes, limit: CHAR_LIMIT - this.model.attributes.description.length}));
	},
	
	events: {
		'click .toggle_clipboard':'toggle_clipboard',
		'click .clipboard_update_file':'update_file',
		'keyup textarea': 'update_count',
		'keydown textarea': 'update_count',
		'paste textarea': 'update_count'
	},
	
	toggle_clipboard: function(event){
		closeNew();
		$("#clipboard").hide();
	},
	update_file: function(event){
		if($("#content_name").val().trim() == "")
				$("#name_err").css("display", "inline");
		else{
			//RELOAD TREE 
			closeClipboard();
		}
	},
	update_count: function(event){
		updateCount();
	}
});

/* Loaded when user clicks "Add Content" button */
var ClipboardAddContentView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_header.handlebars"),
	initialize: function() {
		_.bindAll(this, 'toggle_clipboard','computer_choose_content', 'channel_choose_content', 'choose_file', 'back_to_1', 'to_step_3','previous','preview_file','open_folder', 'close_file', 'open_folder_path', 'add_folder_to_list','add_tag','toggle_folder', 'clipboard_finish','choose_channel','add_file_to_list', 'update_count','remove_item');
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
		'click .toggle_clipboard':'toggle_clipboard',
		'click .computer_choose_content':'computer_choose_content',
		'click .channel_choose_content':'channel_choose_content',
		'click .clipboard_previous':'previous',
		'click #choose_nav':'previous',
		'click .clipboard_2_previous':'back_to_1',
		'click #source_nav':'back_to_1',
		'click .choose_file':'choose_file',
		'change select':'choose_channel',
		'click .file_plus':'add_file_to_list',
		'click .clipboard_next':'to_step_3',
		'click #meta_nav': 'to_step_3',
		'click .close_file':'close_file',
		'click .preview_file': 'preview_file',
		'click .folder': 'open_folder',
		'click .folder_plus': 'add_folder_to_list',
		'click .folder_path': 'open_folder_path',
		'click .plus':'add_tag',
		'click .toggle_folder':'toggle_folder',
		'click .clipboard_finish':'clipboard_finish',
		'keyup textarea': 'update_count',
		'keydown textarea': 'update_count',
		'paste textarea': 'update_count',
		'click .remove_item':'remove_item'
	},
	remove_item: function(event){
		DOMHelper.getParentOfTag(event.target, "li").remove();
	},
	update_count: function(event){
		updateCount();
	},
	/* Functions shared across steps*/
	toggle_clipboard: function(event){
		closeClipboard();
	},
	open_folder: function(event){
		console.log("Opening folder...");
	},
	close_file: function(event){
		event.target.parentNode.remove();
	},
	preview_file: function(event){
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model:  file.data("data"),
			file: file
		});
	},
	
	/* Step 1: choose content from computer or channel */
	computer_choose_content: function(event){
		prevTemplate = require("./hbtemplates/clipboard_step_2_computer.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(prevTemplate(this.model));	
		switchTab($("#source_nav"), $("#choose_nav"));	
	},
	channel_choose_content:  function(event){
		prevTemplate = require("./hbtemplates/clipboard_step_2_channel.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(prevTemplate(this.model));
		switchTab($("#source_nav"), $("#choose_nav"));	
	},
	
	/* Step 2: select files to be added */
	back_to_1: function(event){
		var add_template = require("./hbtemplates/clipboard_step_1.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(add_template(this.model));

		switchTab($("#choose_nav"), $("#source_nav"));	
	},
	add_folder_to_list: function(event){
		console.log("Adding folder to list...");
		//temp_list_items
		//Todo: change clipboard_list_items
		loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: false, meta: false});
		//list_index = listHelper.appendList(file, list_item_template, "#selected_content_area ul", list_index);
	},
	add_file_to_list: function(event){
		console.log("Adding file to list...");
		loadListItems(clipboard_list_items, ".list_content ul", this.model, {selected: true, list: false, meta: false});
		//list_index = listHelper.appendList(file, list_item_template, "#selected_content_area ul", list_index);
	},
	choose_file: function(event){
		$("#fileinput").trigger("click");
		 $('#fileinput').change(function(evt) {
			var selected = $(this).context.files;
			for(var i = 0; i < selected.length; i++)
				temp_list_items.push({data: {attributes: {content_file: selected[i], retrieved_on: new Date(), title: selected[i].name, parent: this.model}}});
			loadListItems(temp_list_items, "#selected_content_area ul", null, {selected: true, list: false, meta: false});			
		});
	},
	choose_channel: function(event){
		loadListItems(temp_list_items, "#selected_content_area ul", this.model, {selected: true, list: false, meta: true});	
	},
	to_step_3: function(event){
		var meta_template = require("./hbtemplates/clipboard_step_3.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(meta_template({content: this.model, limit: CHAR_LIMIT}));
		switchTab($("#choose_nav"), $("#meta_nav"));
		loadListItems(temp_list_items, "#metalist ul", this.model, {selected: true, list: false, meta: true});	
	},

	/* Step 3: review metadata */
	previous: function(event){
		$("#clipboard_content").empty();
		$("#clipboard_content").append(prevTemplate(this.model));
		switchTab($("#meta_nav"), $("#choose_nav"));
	},
	open_folder_path: function(event){
		
	},
	add_tag: function(event){
		console.log("Adding tag...");
	},
	toggle_folder: function(event){
		console.log("Toggling folder...");
	},
	clipboard_finish: function(event){
		console.log("Finishing...");
		closeClipboard();
	}
});

function closeClipboard(){
	$("#edit").find(".content_options button").prop('disabled',false);
	$("#edit").find(".edit_folder_button").css('visibility','visible');
	$("#edit").find(".edit_file_button").css('visibility','visible');
	$("#is_editing").val("n");
	$("#edit").find(".newcontent").remove();
	$("#clipboard").hide();
}

function updateCount(){
	console.log($("#clipboard textarea").val());
	var char_length = CHAR_LIMIT - $("#clipboard textarea").val().length;
	$(".counter").html(char_length);
	if(char_length  == 1) $(".char_counter").html($(".char_counter").html().replace("Chars", "Char"));
	else if(char_length  == 2 || char_length  == 0)
		$(".char_counter").html( $(".char_counter").html().replace("Char ", "Chars "));
	if(char_length == 0)
		$(".char_counter").css("color", "red");
	else $(".char_counter").css("color", "black");
}

function switchTab(oldTab, newTab){
	$(".clipboard_navigation a").css("border-bottom", "1px solid black");	
	newTab.css("border-bottom", "5px solid #8DA9DB");
	newTab.prop("disabled", false);
}

function addItems(list){
	clipboard_list_items.push.apply(clipboard_list_items, list);
	$(".badge").html(clipboard_list_items.length);
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
			index = LoadHelper.loadList(list[i].data, model, list_item_template, list_item_template, 
									listid + " #item_" + index + "_sub", 30, {selected: true, 
									list: true, meta: false}, index + 1, 1);
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
},{"./hbtemplates/clipboard_edit_file.handlebars":1,"./hbtemplates/clipboard_edit_folder.handlebars":2,"./hbtemplates/clipboard_header.handlebars":3,"./hbtemplates/clipboard_list.handlebars":4,"./hbtemplates/clipboard_list_item.handlebars":5,"./hbtemplates/clipboard_step_1.handlebars":6,"./hbtemplates/clipboard_step_2_channel.handlebars":7,"./hbtemplates/clipboard_step_2_computer.handlebars":8,"./hbtemplates/clipboard_step_3.handlebars":9,"backbone":64,"clipboard.less":56,"edit_channel/previewer/views":22,"edit_channel/utils/DOMHelper":29,"edit_channel/utils/LoadHelper":31,"underscore":174}],56:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "@font{font-family:\"Open Sans\";src:url(\"../fonts/OpenSans-Regular.ttf\") format(\"truetype\")}.inline-block{display:inline-block}body{background:#292a2b}a{text-decoration:none;cursor:pointer;color:black}#clipboard{background-color:#e8e8e8;display:none;position:absolute;z-index:20000;height:85vh;min-height:600px;width:600px;right:0;top:7em;overflow-x:hidden;overflow-y:auto}#clipboard .btn-link{background-color:#4f4f4f;padding:5px 20px;color:white;text-decoration:none}#clipboard .clipboard_header{padding:15px;border-bottom:3px solid black;width:100%}#clipboard .clipboard_header h3{width:100%;font-size:20px}#clipboard .clipboard_header h3 .pull-left{margin-right:20px}#clipboard .clipboard_header .toggle_clipboard,#clipboard .clipboard_header .collapse_clipboard{cursor:pointer}#clipboard .clipboard_navigation{background-color:white;font-size:15px}#clipboard .clipboard_navigation a{border:1px solid black}#clipboard #clipboard_content{width:100%;padding:0 15px;overflow-y:auto;margin:10px}#clipboard #clipboard_content .error{color:#c0171b;font-style:italic;display:none;font-size:15px}#clipboard #clipboard_content .hiddenfile{width:0;height:0;overflow:hidden}#clipboard #clipboard_content .char_counter{font-weight:bold;font-size:14px}#clipboard #clipboard_content select{margin-left:10px;width:200px}#clipboard #clipboard_content .select_option{padding-top:20px;margin-left:30px}#clipboard #clipboard_content input[type=text],#clipboard #clipboard_content textarea{font-weight:normal;font-size:14px;margin-top:20px;width:100%;border:3px solid #8da9db;padding:5px}#clipboard #clipboard_content input[type=text]{height:25px}#clipboard #clipboard_content textarea{resize:none;height:150px}#clipboard #clipboard_content .content_tags{width:440px}#clipboard #clipboard_content #add_content_area{width:100%;padding:10px 20px;height:25%;vertical-align:middle;border:3px dashed gray;font-weight:strong;padding:10px}#clipboard #clipboard_content #add_content_area *{margin-top:10px}#clipboard #clipboard_content h5{padding:5px;font-size:15px;margin-bottom:0}#clipboard #clipboard_content .subdirectory{display:none}#clipboard #clipboard_content .list_content{width:100%;overflow:auto;height:60vh}#clipboard #clipboard_content .list_content #list_background{width:535px;position:absolute;border:3px solid #8da9db;background-color:white;height:inherit}#clipboard #clipboard_content .list_content ul{position:relative}#clipboard #clipboard_content .list_content ul li{margin:0;padding:0;width:100%;height:40px}#clipboard #clipboard_content .list_content ul li label{width:535px;vertical-align:middle;cursor:pointer;height:100%;font-size:16px;border:1px solid #8da9db}#clipboard #clipboard_content .list_content ul li label .pull-right{padding-right:10px;color:#8da9db;cursor:pointer}#clipboard #clipboard_content .list_content ul li label .pull-left{background-color:#8da9db;color:white;height:100%;padding:0 10px;margin-right:10px;font-weight:bold;cursor:pointer}#clipboard #clipboard_content .list_content ul li label .preview_file{background-color:#d3d3d3;padding:5px;height:100%}#clipboard #clipboard_content .list_content ul li label .glyphicon{padding:5px;height:100%}#clipboard #clipboard_content #files_content_area,#clipboard #clipboard_content #selected_content_area{height:20vh}#clipboard #clipboard_content #list{height:60vh;margin-right:20px}#clipboard #clipboard_content #list .pull-right{visibility:hidden}#clipboard #clipboard_content #list input[type=checkbox]{display:inline-block;width:20px;height:20px;cursor:pointer;margin-left:10px;position:relative;z-index:5;vertical-align:middle}#clipboard #clipboard_content #list label{margin-left:5px;width:495px}#clipboard #clipboard_content #list li input[type=checkbox]:checked+label .pull-right,#clipboard #clipboard_content #list li:hover .pull-right{visibility:visible}#clipboard #clipboard_content #list canvas{position:absolute;background-color:#ccc;width:40px;height:60vh;border:3px solid #8da9db;border-right:none}#clipboard #clipboard_content #selected_content_area{margin-bottom:20px}#clipboard #clipboard_content #meta-wrapper{height:60vh;margin-bottom:20px}#clipboard #clipboard_content #metalist,#clipboard #clipboard_content #metaform-wrapper{width:50%;display:inline-block}#clipboard #clipboard_content #metalist #list_background,#clipboard #clipboard_content #metaform-wrapper #list_background{width:235px}#clipboard #clipboard_content #metalist textarea,#clipboard #clipboard_content #metaform-wrapper textarea{height:20vh}#clipboard #clipboard_content #metalist .clipboard_item,#clipboard #clipboard_content #metaform-wrapper .clipboard_item{width:235px}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],31:[function(require,module,exports){
/* Helper function loads the next directory's files */
function loadContainer(folder, topic_node, topic_nodes, content_nodes, container_number, edit, rendering){
	var channel_template = require("./../hbtemplates/content_container.handlebars");
	var folder_template = require("./../hbtemplates/content_folder.handlebars");
	var file_template = require("./../hbtemplates/content_file.handlebars");
	var DOMHelper = require("edit_channel/utils/DOMHelper");
	if(!rendering){
		var ind = folder.parentNode.getAttribute('data-val');
		while(container_number - ind >= 1){ //opening folder from earlier directory
			$("#container_"+container_number).remove();
			container_number--;
		}
		var notSelected = $("#container_"+container_number).find('.folder');
		$("#container_"+container_number + " label").off();
		for(var i = 0; i < notSelected.length; i++){
			if(notSelected[i].parentNode.id.indexOf("new") >= 0) continue;
			// Todo: Might be better to figure out "default" folder settings by accessing less variables
			notSelected[i].style.backgroundColor="white";
			notSelected[i].style.border="none";
			notSelected[i].style.width = "292px";
			notSelected[i].style.paddingRight = "0px";
		}
		folder.style.backgroundColor= (edit) ? "#CCCCCC" : "#87A3C6";
		folder.style.border="4px solid white";
		folder.style.borderRight="none";
		folder.style.boxShadow="none";
		$("#" + DOMHelper.getParentOfClass(folder, "content-container").id + " .content-list").css("border", "none");
		
		/* Attach event listener to opened folder */
		$("#" + folder.parentNode.id + " label").on("offset_changed", function(){
			var container = $("#" + DOMHelper.getParentOfClass(folder, "content-container").id + " .content-list");
			var el = $("#" + folder.parentNode.id);
			
			if(container.offset().top > el.offset().top + el.height())
				container.css("border-top", "4px solid white");
			else if (container.offset().top + container.height() < el.offset().top)
				container.css("border-bottom", "4px solid white");
			else
				container.css("border", "none");
		});
		
		$("#" + folder.parentNode.id + " label").onOffsetChanged(function(){
			 $("#" + folder.parentNode.id + " label").trigger('offset_changed');
		});
		$("#" + folder.parentNode.id + " label").animate({width: '340px'}, { queue: false });
		$("#" + folder.parentNode.id + " label").animate({paddingRight: '49px'}, { queue: false });
	}
	
	/* Create unique id for next container */
	container_number++;
	var containerid = "#container_" + container_number;
	//$("#container_"+(container_number-1)).css('z-index', '100');
	
	//handle titles that are too long
	var title = topic_node.attributes.title;
	$(containerid).data("channel", topic_node);
	if(edit) handleDrop(containerid);

	$("#container_area").append(channel_template({title: title, index: container_number, topic: topic_node.attributes, edit: edit}));
	$("#container_area").css("width", $("#container_" + container_number).innerWidth() * (container_number + 1));
	$(containerid).css({'margin-left': -$(containerid).outerWidth(),
						'z-index': 1000 - container_number});
	$(containerid + " .container-interior").css('margin-top', (-$(containerid + " .title-bar").height() + 22) + "px");
	$(containerid + " canvas").css('margin-top', (-$(containerid + " .title-bar").height() + 22) + "px");
	$(containerid + " .content-list").height(($(containerid + " canvas").height() - $(containerid + " .title-bar").height() + 6) + "px");
	$(containerid).animate({
		marginLeft: parseInt($(containerid).css('marginLeft'),10) == 0?
			$(containerid).outerWidth() : 0
	});
	
	var textHelper = require("edit_channel/utils/TextHelper");
	
	/* Retreive all content nodes that are a child of parent */
	/* Todo: figure out better way of doing this... */
	var list_index = 0;
	topic_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			$(containerid + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes, edit: edit}));
			var itemid = "#item_"+container_number+"_"+list_index;
			$(itemid).data("data",entry);
			if(edit) handleDrag(itemid);
			$(itemid + " h3").html(textHelper.trimText($(itemid + " h3").text(), "...", 22, false));
			$(itemid + " p").html(textHelper.trimText($(itemid + " p").text(), "... read more", 120, true));
			list_index ++;
		}
	});
	
	content_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			$(containerid+ " ul").append(file_template({index: container_number, list_index: list_index, file: entry.attributes, edit: edit}));
			var itemid = "#item_"+container_number+"_"+list_index;
			$(itemid).data("data", entry);
			$(itemid + " h4").html(textHelper.trimText($(itemid + " h4").text(), "...", 25, false));
			if(edit) handleDrag(itemid);
			list_index ++;
		}
	});

	if(list_index ==0)
		$(containerid + " ul").append("<h5 class=\"default-item\">No content found.</h5>");
	
	return container_number;
}


/* Helper function loads previewer */
function loadList(root_node, model, folder_template, file_template, list_id, indent, options, list_index, indenter){	
	model.topicnodes.forEach(function(entry){
		if(entry.attributes.parent == root_node){
			$(list_id).append(folder_template({index: list_index, file: entry.attributes, folder: true, file_icon: "folder-open", options: options}));
			$("#item_"+list_index).data("data",entry);
			$("#item_"+list_index).data("collapsed", true);
			$("#item_"+list_index+" label").css("margin-left",  indent*indenter + "px");
			$("#item_"+list_index+" label").width($("#item_"+list_index+" label").width() - (indent*indenter));
			var temp_index = loadList(entry, model, folder_template, file_template, "#item_"+list_index+"_sub", indent, options, list_index + 1, indenter + 1);
			if(temp_index == list_index + 1){ //No sub items found
				$("#item_"+list_index+" label .tog_folder").prop("disabled", true);
				$("#item_"+list_index+" label .tog_folder").css("cursor", "not-allowed");
			}
			list_index = temp_index;
		}
	});
	model.contentnodes.forEach(function(entry){
		if(entry.attributes.parent == root_node){
			var file_type = ""; //getExtension(this.file.data("data").attributes.content_file.[filename]);
			var icon;
			switch(file_type){
				case "pdf":
					icon = "file";
					break;
				case 'm4v':
				case 'avi':
				case 'mpg':
				case 'mp4':
					icon = "volume-up";
					break;
				default: //video by default
					icon = "facetime-video";
			}
			$(list_id).append(file_template({index: list_index, file: entry.attributes, folder: false, file_icon: icon, options: options}));
			$("#item_"+list_index).data("data", entry);
			$("#item_"+list_index).data("collapsed", true);
			$("#item_"+list_index+" label").css("margin-left",  indent*indenter + "px");
			$("#item_"+list_index+" label").width($("#item_"+list_index+" label").width() - (indent*indenter));
			list_index ++;
		}
	});
	return list_index;
}


function appendList(file,template, list_id, index)
{
	$(list_id).append(template({index: index, file: file.attributes}));
	$("#item_"+index).data("data", file);
	$("#item_"+index).data("collapsed", true);
	return index + 1;
}

$.fn.onOffsetChanged = function (trigger, millis) {
    if (millis == null) millis = 100;
    var o = $(this[0]); // our jquery object
    if (o.length < 1) return o;

    var lastOff = null;
    setInterval(function () {
        if (o == null || o.length < 1) return o;
        if (lastOff == null) lastOff = o.offset();
        var newOff = o.offset();
        if (lastOff.top != newOff.top) {
            $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff});
            if (typeof (trigger) == "function") trigger(lastOff, newOff);
            lastOff= o.offset();
        }
    }, millis);

    return o;
};

function handleDrag(itemid){
	$(itemid).attr("draggable", "true");
	$(itemid).on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", $("#"+e.target.id).data("data"));
		e.target.style.opacity = '0.4';
		
		/* Todo: Go through all checked items to move*/
		if($(itemid + " input[checkbox]").checked){
		console.log("CHECKED");
		}
		
		//console.log(e);
	});
	$(itemid).on("dragend", function(e){
		//e.target.remove();
	});
}

function handleDrop(containerid){
	$(containerid).on('dragover', function(e){
	//	e.preventDefault();
		console.log(" DRAGGED");
	});
	$(containerid).on('dragenter', function(e){
		console.log(" ENTERED");
		e.preventDefault();
		e.stopPropagation();
	});
	$(containerid).on('drop', function(e){
		//e.preventDefault();
		console.log("DROPPED");
		var data = e.originalEvent.dataTransfer.getData("data");
		console.log(data);
		
		 if (e.stopPropagation) {
			e.stopPropagation(); // stops the browser from redirecting.
		  }
		
		
		//console.log(e.originalEvent.target.id + " DROPPED");
		//var data = ev.data;
		/*
		if(e.originalEvent.dataTransfer){
			if(e.originalEvent.dataTransfer.files.length) {
				e.preventDefault();
				e.stopPropagation();
				
				upload(e.originalEvent.dataTransfer.files);
			}   
		}
		*/
	});
}

/*

function handleDragStart(e) {
  e.target.style.opacity = '0.4';  // this / e.target is the source node.
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Necessary. Allows us to drop.
  }

  e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

  return false;
}

function handleDragEnter(e) {
  // this / e.target is the current hover target.
  this.classList.add('over');
}

function handleDragLeave(e) {
  this.classList.remove('over');  // this / e.target is previous target element.
}
*/
module.exports = {
	loadContainer: loadContainer,
	loadList: loadList,
	appendList: appendList
}
},{"./../hbtemplates/content_container.handlebars":13,"./../hbtemplates/content_file.handlebars":14,"./../hbtemplates/content_folder.handlebars":15,"edit_channel/utils/DOMHelper":29,"edit_channel/utils/TextHelper":32}],32:[function(require,module,exports){
/* Helper function trims text if it is too long for container */
function trimText(string, filler, limit, link){
	if(string.trim().length > limit)
		string = string.trim().substring(0, limit - filler.length) + ((link) ? "<a class=\"filler\" title=\"" + string + "\">" + filler + "</a>" : filler);
	return string;
}
/* Helper function expands or minimizes size of folder based on description length*/
function manageFolder(event, expanding){
	event.preventDefault();
	event.stopPropagation();
	var DOMHelper = require("edit_channel/utils/DOMHelper");
	var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id + " label";
	
	if(expanding)
		$(el + " p").html($(el + " p a").prop("title") + "<br/><a title=\"" + $(el + " p a").prop("title") +"\" class=\"minimize\">See Less</a>");
	else
		$(el + " p").html(trimText($(el + " p a").prop("title") , "... read more", 120, true));
	$(el).animate({height: $(el + " p").height() + 35});
}
module.exports = {
	trimText: trimText,
	manageFolder: manageFolder
}
},{"edit_channel/utils/DOMHelper":29}],15:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<input type=\"checkbox\" id=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"/>\r\n	";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<input type=\"radio\" name=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" id=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"/>";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "\r\n			<div class=\"folder_options pull-right\">\r\n				<div class=\"options\">\r\n					<span class=\"edit_folder_button glyphicon glyphicon-pencil\" aria-hidden=\"true\"></span>\r\n					<span class=\"open_folder glyphicon glyphicon-menu-right\" aria-hidden=\"true\"></span>\r\n				</div>\r\n			</div>\r\n		";
  }

function program7(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.folder)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program9(depth0,data) {
  
  
  return "Folder Name";
  }

function program11(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.folder)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program13(depth0,data) {
  
  
  return "Description of the folder";
  }

  buffer += "<li id=\"item_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-val=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n	";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n	<label class=\"folder\" for=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" title=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.folder)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\r\n		";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n		<h3>";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.program(9, program9, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\r\n		<p class=\"description\">";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.program(13, program13, data),fn:self.program(11, program11, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n	</label>\r\n</li>";
  return buffer;
  });

},{"hbsfy/runtime":93}],14:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<input type=\"checkbox\" id=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"/>\r\n	";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<input type=\"radio\" name=\"selected\" id=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"/>";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "\r\n			<div class=\"options pull-right\">\r\n				<span class=\"glyphicon glyphicon-pencil edit_file_button\" aria-hidden=\"true\"></span>\r\n				<span class=\"glyphicon glyphicon-search preview_button\" aria-hidden=\"true\"></span>\r\n			</div>\r\n		";
  }

function program7(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program9(depth0,data) {
  
  
  return "Content Name";
  }

  buffer += "<li id=\"item_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n	";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n	<label class=\"file\" for=\"";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_";
  if (helper = helpers.list_index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.list_index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" title=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">	\r\n		";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n		<h4>";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.file), {hash:{},inverse:self.program(9, program9, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h4>\r\n	</label>\r\n</li>";
  return buffer;
  });

},{"hbsfy/runtime":93}],13:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\r\n				<li class=\"content_options text-center\">\r\n					<button class=\"btn btn-default pull-left add_folder_button\" name=\"";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n						<span class=\"glyphicon glyphicon-plus-sign\" aria-hidden=\"true\"></span>Add Folder</button>\r\n					<button class=\"btn btn-default pull-left add_content_button\" name=\"";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n						<span class=\"glyphicon glyphicon-plus-sign\" aria-hidden=\"true\"></span>Add Content</button>\r\n				</li>\r\n			";
  return buffer;
  }

  buffer += "<div id=\"container_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"container content-container pull-left\">\r\n	<h2 class=\"text-center title-bar\">";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h2>\r\n	<canvas class=\"pull-left\"> </canvas>\r\n	<div class=\"container-interior\"></div>\r\n	<div class=\"content-list\">\r\n		<span id=\"top_border\" class=\"boundary\">&nbsp;</span>\r\n		<ul class=\"list-unstyled\">\r\n			";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n		</ul>\r\n		<span id=\"bottom_border\" class=\"boundary\">&nbsp;</span>\r\n	</div>\r\n</div>";
  return buffer;
  });

},{"hbsfy/runtime":93}],29:[function(require,module,exports){
function getParentOfTag(el, type){
	while(el.nodeName != type.toUpperCase())
		el = el.parentNode;
	return el;
}

function getParentOfClass(el, className){
	while(el && el.className.indexOf(className.trim()) <= -1)
		el = el.parentNode;
	return el;
}

module.exports = {
	getParentOfTag: getParentOfTag,
	getParentOfClass: getParentOfClass
}
},{}],22:[function(require,module,exports){
var Backbone = require("backbone");
var _ = require("underscore");
require("previewer.less");

var PreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer.handlebars"),
	initialize: function(options) {
        _.bindAll(this, 'toggle_preview', 'open_pdf', 'open_audio', 'open_video', 'toggle_details', 'load_description', 'load_details');
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.file = options.file;
        this.render();
    },
    render: function() {
        this.$el.html(this.template(this.model));
		$(".file").css("border", "1px solid black");
		$(".trash_item").css("border", "1px solid #CCCCCC");
		$(".clipboard_item").css("border", "1px solid #8DA9DB");
		$(this.file.selector + " label").css("border", "4px solid #8098D2");
		
		
		var content_view;
		var file_type = "";//getExtension(this.model.attributes.content_file.name);
		switch(file_type){
			case "pdf":
				content_view =  require("./hbtemplates/previewer_pdf.handlebars");
				break;
			case 'm4v':
			case 'avi':
			case 'mpg':
			case 'mp4':
				content_view =  require("./hbtemplates/previewer_audio.handlebars");
				break;
			case 'mp4':
			case 'webm':
			case 'ogv':
			case 'ogg':
			case 'avi':
			case 'mov':
			case 'wmv':
				content_view =  require("./hbtemplates/previewer_video.handlebars");
				break;
			default:
				content_view =  require("./hbtemplates/previewer_filler.handlebars");
		}
		$("#preview_window").append(content_view({file: this.model}));
		var parent_data = this.model;
		while(parent_data.attributes.parent){
			parent_data = parent_data.attributes.parent;
			$(".breadcrumb").prepend("<li>" + parent_data.attributes.title + "</li>");
		}
		$(".details").css("display", "none");
		$("#previewer").css("margin-right", - $("#previewer").outerWidth());
		$("#previewer").animate({
			marginRight: parseInt($("#previewer").css('marginRight'),10) == 0 ?
				$("#previewer").outerWidth() : 0
		}); 
    },
		
	events: {
		'click .toggle_previewer': 'toggle_preview',
		'click .toggle_details':'toggle_details',
		'click #description_nav' : 'load_description',
		'click #detail_nav' : 'load_details',
		'click .pdf_sample': 'open_pdf',
		'click .audio_sample': 'open_audio',
		'click .video_sample': 'open_video'
		
	},

	toggle_preview: function(event){
		$(".file").css("border", "1px solid black");
		$("#previewer").hide();
	},
	toggle_details: function(event){
		if($(".toggle_details").hasClass("glyphicon-menu-down")){
			$(".toggle_details").attr("class", "pull-right toggle_details glyphicon glyphicon-menu-up");
			$(".details").slideDown();
		}
		else{
			$(".toggle_details").attr("class", "pull-right toggle_details glyphicon glyphicon-menu-down");
			$(".details").slideUp();
		}
	},
	
	load_description: function(event){
		$("#description_nav").css("border-bottom", "5px solid #8DA9DB");
		$("#detail_nav").css("border-bottom", "1px solid black");
		$("#file_detail_info").css("display", "none");
		$("#file_description_info").css("display", "block");
	},
	
	load_details: function(event){
		$("#detail_nav").css("border-bottom", "5px solid #8DA9DB");
		$("#description_nav").css("border-bottom", "1px solid black");
		$("#file_description_info").css("display", "none");
		$("#file_detail_info").css("display", "block");
	},
	
	/* Going to be determined by this.file_type (testing purposes only) */
	open_pdf: function(event){
		this.file_type = "pdf";
		var content_view =  require("./hbtemplates/previewer_pdf.handlebars");
		$("#preview_window").empty();
		$("#preview_window").append(content_view(this.model));
	},
	open_audio: function(event){
		this.file_type = "audio";
		var content_view =  require("./hbtemplates/previewer_audio.handlebars");
		$("#preview_window").empty();
		$("#preview_window").append(content_view(this.model));
	},
	open_video: function(event){
		this.file_type = "video";
		var content_view =  require("./hbtemplates/previewer_video.handlebars");
		$("#preview_window").empty();
		$("#preview_window").append(content_view(this.model));
	}
	
});

module.exports = {
	PreviewerView: PreviewerView
}
},{"./hbtemplates/previewer.handlebars":17,"./hbtemplates/previewer_audio.handlebars":18,"./hbtemplates/previewer_filler.handlebars":19,"./hbtemplates/previewer_pdf.handlebars":20,"./hbtemplates/previewer_video.handlebars":21,"backbone":64,"previewer.less":60,"underscore":174}],60:[function(require,module,exports){
(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';var css = "@font{font-family:\"Open Sans\";src:url(\"../fonts/OpenSans-Regular.ttf\") format(\"truetype\")}.inline-block{display:inline-block}body{background:#292a2b}a{text-decoration:none;cursor:pointer;color:black}#previewer{width:40vw;min-width:500px;border:2px solid #a4aab0;background-color:#e9eaea;overflow-y:auto;overflow-x:hidden;margin:-20px 0 0 -10px;height:100vh;min-height:600px;position:absolute;z-index:50000;right:0;top:8.5em;box-shadow:-7px 10px 5px black;padding-right:15px}#previewer h2,#previewer h3{font-size:20px}#previewer #title{border-bottom:3px solid black}#previewer h3{padding-top:10px;padding-bottom:5px;margin-bottom:10px}#previewer .glyphicon{font-size:20px;margin-left:10px;cursor:pointer}#previewer .tag{background-color:#d6d3d3;border:1px solid black;margin:5px;text-align:center;padding:5px;font-size:15px;cursor:pointer}#previewer .details{width:100%;height:150px;overflow:auto;padding:10px}#previewer .details nav{background-color:white;font-size:15px}#previewer .details nav a{border:1px solid black}#previewer .details #file_detail_info{display:none}#previewer .details #description_nav{border-bottom:5px solid #8da9db}#previewer .details .row-fluid{margin-top:10px;border-bottom:1px solid gray}#previewer .details .row-fluid div{width:30%;border-right:1px solid gray;padding:10px;display:inline-block}#previewer .details .row-fluid div:last-child{border-right:none}#previewer .details .description{border-top:1px solid gray;margin-top:20px}#previewer .details p{padding:5px}#previewer #preview_window{margin-top:20px}#previewer #preview_window iframe,#previewer #preview_window video,#previewer #preview_window audio{width:100%}#previewer #preview_window iframe{border:1px solid gray;min-height:70vh}#previewer #preview_window video{border:1px solid gray}#previewer #preview_window audio{margin-top:10%}#previewer #preview_window .filler{width:100%;height:70vh;background-color:white;border:1px solid black;margin-bottom:30px}#previewer #preview_window .filler h3{maring-top:30%;text-align:center;font-size:20px;font-style:italic}#previewer #trash_preview_add_on{padding-bottom:10px}";if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())
},{}],21:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!-- Todo: Change back to content_file -->\r\n<video id=\"video\" controls>\r\n	<source src=\"http://techslides.com/demos/sample-videos/small.mp4\" type=\"video/mp4\">\r\n	Your browser does not support the video element.\r\n</video>";
  });

},{"hbsfy/runtime":93}],20:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!-- Todo: Change back to be content_file -->\r\n<iframe src=\"http://arxiv.org/pdf/math/0305018v1.pdf\"></iframe>";
  });

},{"hbsfy/runtime":93}],19:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"filler\">\r\n	<h3>Content could not be loaded</h3>\r\n</div>";
  });

},{"hbsfy/runtime":93}],18:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!-- Todo: change back to content_file -->\r\n<audio controls>\r\n	<source src=\"http://www.mp3classicalmusic.net/48Music/Joplin48/Maple%20Leaf%20Rag.mp3\"type=\"audio/mp3\">\r\n	Your browser does not support this audio clip.\r\n</audio>";
  });

},{"hbsfy/runtime":93}],17:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.author)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program3(depth0,data) {
  
  
  return "No authors found.";
  }

function program5(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.published_on)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program7(depth0,data) {
  
  
  return "No date found.";
  }

function program9(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.license)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program11(depth0,data) {
  
  
  return "No license found.";
  }

function program13(depth0,data) {
  
  var stack1;
  stack1 = helpers.each.call(depth0, ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.tag), {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack1 || stack1 === 0) { return stack1; }
  else { return ''; }
  }
function program14(depth0,data) {
  
  var stack1, helper;
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  return escapeExpression(stack1);
  }

function program16(depth0,data) {
  
  
  return "No tags found.";
  }

function program18(depth0,data) {
  
  var stack1;
  return escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1));
  }

function program20(depth0,data) {
  
  
  return "No description found.";
  }

  buffer += "<div id = \"previewer\" class=\"container-fluid pull-left viewer\">\r\n	<h6>\r\n		<ol class=\"breadcrumb\"></ol>\r\n		<span class=\"pull-right toggle_previewer glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>\r\n		<span class=\"pull-right toggle_details glyphicon glyphicon-menu-down\" aria-hidden=\"true\"></span>\r\n	</h6>\r\n	<h2 id=\"title\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\r\n	\r\n	For Testing Purposes: \r\n	<a class=\"pdf_sample\">View PDF</a>\r\n	<a class=\"audio_sample\">View Audio</a>\r\n	<a class=\"video_sample\">View Video</a>\r\n	\r\n	<div class=\"details\">\r\n		<nav class=\"btn-group btn-group-justified\" role=\"group\">\r\n			<a class=\"btn btn-defult\" id=\"description_nav\">Description</a>\r\n			<a class=\"btn btn-defult\" id=\"detail_nav\">Details</a>\r\n		</nav>\r\n		<div id=\"file_detail_info\">\r\n			<div class=\"row-fluid\">\r\n				<div>\r\n					<h2>Author</h2>\r\n					<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.author), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n				</div>\r\n				<div>\r\n					<h2>Date Added</h2>\r\n					<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.published_on), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n				</div>\r\n				<div>\r\n					<h2>License</h2>\r\n					<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.license)),stack1 == null || stack1 === false ? stack1 : stack1.name), {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n				</div>\r\n			</div>\r\n			<h3>Tags</h3>\r\n			<ul class=\"list-inline\">\r\n				";
  stack1 = helpers['if'].call(depth0, ((stack1 = ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.tag)),stack1 == null || stack1 === false ? stack1 : stack1.length), {hash:{},inverse:self.program(16, program16, data),fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			</ul>\r\n		</div>\r\n		<div id=\"file_description_info\">\r\n			<p>";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.description), {hash:{},inverse:self.program(20, program20, data),fn:self.program(18, program18, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\r\n		</div>\r\n	</div>\r\n	\r\n	<div id=\"preview_window\" class=\"container-fluid\"></div>\r\n</div>";
  return buffer;
  });

},{"hbsfy/runtime":93}],9:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<h4>3. Review metadata</h4>\r\n<br/>\r\n<div id=\"meta-wrapper\">\r\n	<div id = \"metalist\" class=\"list_content pull-left\">\r\n		<div id=\"list_background\"></div>\r\n		<ul></ul>\r\n	</div>\r\n	<div id=\"metaform-wrapper\" class=\"pull-left\">\r\n		<form id=\"metaform\">\r\n			<input type=\"text\" id=\"name\" placeholder=\"Name\"/>\r\n			<input type=\"text\" id=\"author\" placeholder = \"Author\"/>\r\n			<input type=\"text\" id=\"license\" placeholder = \"License\"/>\r\n			<input type=\"text\" class=\"metatags\" placeholder = \"Tags (press 'Enter' to add tag)\"/>\r\n			<textarea id=\"description\" placeholder=\"Description\" maxlength=\"";
  if (helper = helpers.limit) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.limit); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"></textarea>\r\n			<div class=\"char_counter\" align=\"right\"><span class=\"counter\">";
  if (helper = helpers.limit) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.limit); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span> Chars Left</div>\r\n		</form>\r\n	</div>\r\n</div>\r\n<br/>\r\n<nav>\r\n	<a class=\"btn pull-left btn-link clipboard_previous\">Previous</a>\r\n	<a class=\"btn pull-right btn-link clipboard_finish\">Finish</a>\r\n</nav>";
  return buffer;
  });

},{"hbsfy/runtime":93}],8:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<h4>2. Adding content from My Computer</h4>\r\n<div id = \"add_content_area\" class = \"container text-center\">\r\n	<h5>Drag and drop <br/> from your computer</h5>\r\n	<p>or</p>\r\n	<div class=\"choose_file btn btn-link\">Choose File...</div>\r\n	<div class=\"hiddenfile\">\r\n	  <input name=\"upload\" type=\"file\" id=\"fileinput\" multiple/>\r\n	</div>\r\n</div>\r\n<h5>Files or folders to be added:</h5>\r\n\r\n<div id = \"selected_content_area\" class=\"list_content\">\r\n	<div id=\"list_background\"></div>\r\n	<ul></ul>\r\n</div>\r\n<br/>\r\n<nav>\r\n	<a class=\"btn pull-left btn-link clipboard_2_previous\">Previous</a>\r\n	<a class=\"btn pull-right btn-link clipboard_next\">Next</a>\r\n</nav>";
  });

},{"hbsfy/runtime":93}],7:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\r\n		<option>";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</option>\r\n	";
  return buffer;
  }

  buffer += "<h4>2. Adding content from a channel</h4>\r\n<select>\r\n	";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.topic), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n</select>\r\n<h5>Path: <div class=\"path\"></div></h5>\r\n<div id = \"files_content_area\" class=\"list_content\">\r\n	<div id=\"list_background\"></div>\r\n	<ul></ul>\r\n</div>\r\n<h5>Files or folders to be added:</h5>\r\n<div id = \"selected_content_area\" class=\"list_content\">\r\n	<div id=\"list_background\"></div>\r\n	<ul></ul>\r\n</div>\r\n<br/>\r\n<nav>\r\n	<a class=\"btn pull-left btn-link clipboard_2_previous\">Previous</a>\r\n	<a class=\"btn pull-right btn-link clipboard_next\">Next</a>\r\n</nav>";
  return buffer;
  });

},{"hbsfy/runtime":93}],6:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<h4>1. Where do you want to add content from?</h4>\r\n<p class=\"select_option\">A. <a class=\"btn btn-link computer_choose_content\">From my computer</a></p>\r\n<p class=\"select_option\">B. <a class=\"btn btn-link channel_choose_content\">From a channel</a></p>";
  });

},{"hbsfy/runtime":93}],5:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "\"checkbox\"";
  }

function program3(depth0,data) {
  
  
  return "\"radio\"";
  }

function program5(depth0,data) {
  
  
  return "<span class=\"pull-left tog_folder glyphicon glyphicon-menu-down\"></span>\r\n		";
  }

function program7(depth0,data) {
  
  
  return "<span class=\"pull-left preview_file glyphicon glyphicon-search\"></span>";
  }

function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n			"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\r\n			<span class=\"pull-right delete_content glyphicon glyphicon-trash\" aria-hidden=\"true\"></span>\r\n			<span class=\"pull-right edit_content glyphicon glyphicon-pencil\" aria-hidden=\"true\"></span>\r\n		";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n			";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(14, program14, data),fn:self.program(12, program12, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n		";
  return buffer;
  }
function program12(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n				"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\r\n				<span class=\"pull-right glyphicon glyphicon-remove remove_item\" aria-hidden=\"true\"></span>\r\n			";
  return buffer;
  }

function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\r\n				<span class=\"pull-left folder_plus glyphicon glyphicon-plus\"></span>\r\n				"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\r\n			";
  return buffer;
  }

function program16(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<ul id=\"item_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "_sub\" class=\"list-unstyled subdirectory\"></ul>";
  return buffer;
  }

  buffer += "<li id=\"item_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\r\n	<input type=";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.list), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " id=\"file_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" name=\"clipboard_list_files\"></input>\r\n	<label for=\"file_";
  if (helper = helpers.index) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.index); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"clipboard_item\">\r\n		";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n		\r\n		<span class=\"glyphicon glyphicon-";
  if (helper = helpers.file_icon) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.file_icon); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"></span>\r\n		\r\n		";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.options)),stack1 == null || stack1 === false ? stack1 : stack1.list), {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n	</label>\r\n</li>\r\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.folder), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

},{"hbsfy/runtime":93}],4:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div id=\"clipboard\" class=\"pull-right\">\r\n	<div class=\"clipboard_header\">\r\n		<h3>\r\n			<span class=\"collapse_clipboard pull-left glyphicon glyphicon-menu-up\" aria-hidden=\"true\"></span>\r\n			Clipboard\r\n			<a class=\"btn pull-right btn-link clipboard_add_content\">\r\n				<span class=\"pull-left glyphicon glyphicon-plus\" aria-hidden=\"true\"></span>\r\n				Add Content\r\n			</a>\r\n		</h3>\r\n	</div>\r\n	<div id=\"clipboard_content\">\r\n		<div id = \"list\" class=\"list_content\">\r\n			<div id=\"list_background\"></div>\r\n			<canvas></canvas>\r\n			<ul class=\"list-unstyled\"></ul>\r\n		</div>\r\n	</div>\r\n</div>";
  });

},{"hbsfy/runtime":93}],3:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div id=\"clipboard\" class=\"pull-right\">\r\n	<div class=\"clipboard_header\">\r\n		<h3>\r\n			<span class=\"pull-left glyphicon glyphicon-folder-open\"></span>\r\n			Adding Content to Topic\r\n			<span class=\"toggle_clipboard pull-right glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>\r\n		</h3>\r\n	</div>\r\n	<nav class=\"clipboard_navigation text-center btn-group btn-group-justified\" role=\"group\">\r\n		<a class=\"btn btn-defult\" id=\"source_nav\">Source</a>\r\n		<a class=\"btn btn-defult\" id=\"choose_nav\">Choose Content</a>\r\n		<a class=\"btn btn-defult\" id=\"meta_nav\">Metadata</a>\r\n	</nav>\r\n	<div id=\"clipboard_content\"></div>\r\n</div>";
  });

},{"hbsfy/runtime":93}],2:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  
  return "Editing Folder";
  }

function program3(depth0,data) {
  
  
  return "Adding Folder";
  }

function program5(depth0,data) {
  
  
  return "Update";
  }

function program7(depth0,data) {
  
  
  return "Add";
  }

  buffer += "<div id=\"clipboard\" class=\"pull-right\">\r\n	<div class=\"clipboard_header\">\r\n		<h3>\r\n			<span class=\"pull-left glyphicon glyphicon-folder-open\" aria-hidden=\"true\"></span>\r\n			";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\r\n			<span class=\"toggle_clipboard pull-right glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>\r\n		</h3>\r\n	</div>\r\n	<div id=\"clipboard_content\"> \r\n		<h6 class=\"error\" id=\"name_err\">Please input a valid name</h6>\r\n		<input type=\"text\" id=\"folder_name\" value=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.folder)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" placeholder=\"Name\"/>\r\n		<textarea id=\"folder_description\" placeholder=\"Description\" maxlength=\"";
  if (helper = helpers.limit) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.limit); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.folder)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</textarea>\r\n		<div class=\"char_counter\" align=\"right\"><span class=\"counter\">";
  if (helper = helpers.limit) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.limit); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span> Chars Left</div>\r\n		<div class=\"text-center\"> \r\n			<a class=\"btn btn-link clipboard_update_folder\">";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.edit), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</a>\r\n		</div>\r\n	</div>\r\n</div>";
  return buffer;
  });

},{"hbsfy/runtime":93}],1:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div id=\"clipboard\" class=\"pull-right\">\r\n	<div class=\"clipboard_header\">\r\n		<h3>\r\n			<span class=\"pull-left glyphicon glyphicon-folder-open\" aria-hidden=\"true\"></span>\r\n			Editing Content\r\n			<span class=\"toggle_clipboard pull-right glyphicon glyphicon-remove\" aria-hidden=\"true\"></span>\r\n		</h3>\r\n	</div>\r\n	<div id=\"clipboard_content\">\r\n		<h6 class=\"error\" id=\"name_err\">Please input a valid name</h6>\r\n		<input type=\"text\" id=\"content_name\" value=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" placeholder=\"Name\"/>\r\n		<input type=\"text\" id=\"content_author\" value=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.author)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" placeholder=\"Author\"/>\r\n		<input type=\"text\" id=\"content_license\" value=\""
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.license)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" placeholder=\"License\"/>\r\n		<label for=\"content_tags\">Tags</label><input type=\"text\" class=\"content_tags\" placeholder=\"Tags (press 'Enter' to add tag)\"/>\r\n		<textarea id=\"file_description\" placeholder=\"Description\" maxlength=\"";
  if (helper = helpers.limit) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.limit); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.file)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</textarea>\r\n		<div class=\"char_counter\" align=\"right\"><span class=\"counter\">";
  if (helper = helpers.limit) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.limit); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span> Chars Left</div>\r\n		<div class=\"text-center\"> \r\n			<a class=\"btn btn-link clipboard_update_file pull-right\">Update</a>\r\n		</div>\r\n	</div>\r\n</div>";
  return buffer;
  });

},{"hbsfy/runtime":93}]},{},["channel_edit"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uXFxub2RlX21vZHVsZXNcXGZhY3Rvci1idW5kbGVcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvYnVuZGxlX21vZHVsZXMvY2hhbm5lbF9lZGl0LmpzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvdmlld3MuanMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC90cmVlX3ByZXZpZXcvdmlld3MuanMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2xlc3MvcHJldmlldy5sZXNzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvdHJlZV9lZGl0L3ZpZXdzLmpzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9sZXNzL2VkaXQubGVzcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3V0aWxzL0xlc3NIZWxwZXIuanMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC90cmFzaC92aWV3cy5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvbGVzcy90cmFzaC5sZXNzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvdHJhc2gvaGJ0ZW1wbGF0ZXMvdHJhc2hfcHJldmlld19hZGRfb24uaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3RyYXNoL2hidGVtcGxhdGVzL3RyYXNoX2NvbGxhcHNlZC5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvdHJhc2gvaGJ0ZW1wbGF0ZXMvdHJhc2guaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL21vZGVscy5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2hidGVtcGxhdGVzL2NvbnRhaW5lcl9hcmVhLmhhbmRsZWJhcnMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC9oYnRlbXBsYXRlcy9jaGFubmVsX2VkaXQuaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2NsaXBib2FyZC92aWV3cy5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvbGVzcy9jbGlwYm9hcmQubGVzcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3V0aWxzL0xvYWRIZWxwZXIuanMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC91dGlscy9UZXh0SGVscGVyLmpzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvaGJ0ZW1wbGF0ZXMvY29udGVudF9mb2xkZXIuaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2hidGVtcGxhdGVzL2NvbnRlbnRfZmlsZS5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvaGJ0ZW1wbGF0ZXMvY29udGVudF9jb250YWluZXIuaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3V0aWxzL0RPTUhlbHBlci5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3ByZXZpZXdlci92aWV3cy5qcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvbGVzcy9wcmV2aWV3ZXIubGVzcyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3ByZXZpZXdlci9oYnRlbXBsYXRlcy9wcmV2aWV3ZXJfdmlkZW8uaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL3ByZXZpZXdlci9oYnRlbXBsYXRlcy9wcmV2aWV3ZXJfcGRmLmhhbmRsZWJhcnMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC9wcmV2aWV3ZXIvaGJ0ZW1wbGF0ZXMvcHJldmlld2VyX2ZpbGxlci5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvcHJldmlld2VyL2hidGVtcGxhdGVzL3ByZXZpZXdlcl9hdWRpby5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvcHJldmlld2VyL2hidGVtcGxhdGVzL3ByZXZpZXdlci5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvY2xpcGJvYXJkL2hidGVtcGxhdGVzL2NsaXBib2FyZF9zdGVwXzMuaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2NsaXBib2FyZC9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfc3RlcF8yX2NvbXB1dGVyLmhhbmRsZWJhcnMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC9jbGlwYm9hcmQvaGJ0ZW1wbGF0ZXMvY2xpcGJvYXJkX3N0ZXBfMl9jaGFubmVsLmhhbmRsZWJhcnMiLCJjb250ZW50Y3VyYXRpb24vc3RhdGljL2pzL2VkaXRfY2hhbm5lbC9jbGlwYm9hcmQvaGJ0ZW1wbGF0ZXMvY2xpcGJvYXJkX3N0ZXBfMS5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvY2xpcGJvYXJkL2hidGVtcGxhdGVzL2NsaXBib2FyZF9saXN0X2l0ZW0uaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2NsaXBib2FyZC9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfbGlzdC5oYW5kbGViYXJzIiwiY29udGVudGN1cmF0aW9uL3N0YXRpYy9qcy9lZGl0X2NoYW5uZWwvY2xpcGJvYXJkL2hidGVtcGxhdGVzL2NsaXBib2FyZF9oZWFkZXIuaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2NsaXBib2FyZC9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfZWRpdF9mb2xkZXIuaGFuZGxlYmFycyIsImNvbnRlbnRjdXJhdGlvbi9zdGF0aWMvanMvZWRpdF9jaGFubmVsL2NsaXBib2FyZC9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfZWRpdF9maWxlLmhhbmRsZWJhcnMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlZBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC92aWV3c1wiKTtcclxudmFyIE1vZGVscyA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvbW9kZWxzXCIpO1xyXG5cclxuJChmdW5jdGlvbigpIHtcclxuXHJcblx0LyogVG9kbzogcmVtb3ZlIG9uY2UgZGF0YSBzdHJ1Y3R1cmVzIGltcGxlbWVudGVkICovXHJcblx0dmFyIGNoYW5uZWxNb2RlbCA9IG5ldyBNb2RlbHMuQ2hhbm5lbE1vZGVsKHtuYW1lOiAnS2hhbiBBY2FkZW15JywgZGVzY3JpcHRpb246ICdEZWZhdWx0IHZhbHVlIGZvciB0ZXN0aW5nIHB1cnBvc2VzJ30pO1xyXG5cdHZhciByb290VG9waWNOb2RlID0gbmV3IE1vZGVscy5Ub3BpY05vZGVNb2RlbCh7dGl0bGU6J0toYW4gQWNhZGVteScsIGRlc2NyaXB0aW9uOidUaGlzIGlzIGEgc2FtcGxlIGRlc2NyaXB0aW9uJ30pO1xyXG5cdHZhciB0b3BpY1RyZWUgPSBuZXcgTW9kZWxzLlRvcGljVHJlZU1vZGVsKHtuYW1lOiBcIlVudGl0bGVkIFRyZWVcIiwgaXNfcHVibGlzaGVkOiBmYWxzZSwgcm9vdF9ub2RlOiByb290VG9waWNOb2RlLCBjaGFubmVsOiBjaGFubmVsTW9kZWx9KTtcclxuXHR2YXIgZHVtbXlEZXNjcmlwdGlvbiA9IFwiTG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2ljaW5nIGVsaXQsIHNlZCBkbyBlaXVzbW9kIHRlbXBvciBpbmNpZGlkdW50IHV0IGxhYm9yZSBldCBkb2xvcmUgbWFnbmEgYWxpcXVhXCI7XHJcblxyXG5cdC8vQ29udGVudCBDb250YWluZXIgMVxyXG5cdHZhciB0b3BpY05vZGUxID0gbmV3IE1vZGVscy5Ub3BpY05vZGVNb2RlbCh7cGFyZW50OiByb290VG9waWNOb2RlLCB0aXRsZTonVGhpcyBpcyBhIHZlcnkgbG9uZyB0aXRsZSBuYW1lIGZvciBhIGZpbGUnLCBkZXNjcmlwdGlvbjogZHVtbXlEZXNjcmlwdGlvbiArIGR1bW15RGVzY3JpcHRpb24gKyBkdW1teURlc2NyaXB0aW9uICsgZHVtbXlEZXNjcmlwdGlvbiArIGR1bW15RGVzY3JpcHRpb24gKyBkdW1teURlc2NyaXB0aW9uICsgZHVtbXlEZXNjcmlwdGlvbiArIGR1bW15RGVzY3JpcHRpb24gKyBkdW1teURlc2NyaXB0aW9uICtkdW1teURlc2NyaXB0aW9uICsgZHVtbXlEZXNjcmlwdGlvbiArIGR1bW15RGVzY3JpcHRpb259KTtcclxuXHR2YXIgdG9waWNOb2RlMiA9IG5ldyBNb2RlbHMuVG9waWNOb2RlTW9kZWwoe3BhcmVudDogcm9vdFRvcGljTm9kZSwgdGl0bGU6J1NjaWVuY2UnLCBkZXNjcmlwdGlvbjogXCJTaG9ydGVyIGRlc2NyaXB0aW9uXCJ9KTtcclxuXHR2YXIgY29udGVudE5vZGUxID0gbmV3IE1vZGVscy5Db250ZW50Tm9kZU1vZGVsKHtwYXJlbnQ6IHJvb3RUb3BpY05vZGUsIHRpdGxlOiBcIkludHJvIHZpZGVvXCIsIGRlc2NyaXB0aW9uOiBkdW1teURlc2NyaXB0aW9uLCBhdXRob3I6XCJBbnlvbnltb3VzXCJ9KTtcclxuXHR2YXIgY29udGVudE5vZGUyID0gbmV3IE1vZGVscy5Db250ZW50Tm9kZU1vZGVsKHtwYXJlbnQ6IHJvb3RUb3BpY05vZGUsIHRpdGxlOiBcIlRoaXMgaXMgYSB2ZXJ5IGxvbmcgdGl0bGUgbmFtZSBmb3IgYSBmaWxlXCIsIGRlc2NyaXB0aW9uOiBkdW1teURlc2NyaXB0aW9uLCBhdXRob3I6XCJBbnlvbnltb3VzXCJ9KTtcclxuXHRcclxuXHQvL0NvbnRlbnQgQ29udGFpbmVyIDJcdFx0XHRcdFx0XHRcdFx0XHRcdFxyXG5cdHZhciB0b3BpY05vZGUzID0gbmV3IE1vZGVscy5Ub3BpY05vZGVNb2RlbCh7cGFyZW50OiB0b3BpY05vZGUxLCB0aXRsZTonQWxnZWJyYScsIGRlc2NyaXB0aW9uOiBkdW1teURlc2NyaXB0aW9ufSk7XHJcblx0dmFyIHRvcGljTm9kZTQgPSBuZXcgTW9kZWxzLlRvcGljTm9kZU1vZGVsKHtwYXJlbnQ6IHRvcGljTm9kZTEsIHRpdGxlOidUcmlnb25vbWV0cnknLCBkZXNjcmlwdGlvbjogZHVtbXlEZXNjcmlwdGlvbn0pO1xyXG5cdHZhciB0b3BpY05vZGU1ID0gbmV3IE1vZGVscy5Ub3BpY05vZGVNb2RlbCh7cGFyZW50OiB0b3BpY05vZGUxLCB0aXRsZTonR2VvbWV0cnknLCBkZXNjcmlwdGlvbjogZHVtbXlEZXNjcmlwdGlvbn0pO1xyXG5cdHZhciB0b3BpY05vZGU2ID0gbmV3IE1vZGVscy5Ub3BpY05vZGVNb2RlbCh7cGFyZW50OiB0b3BpY05vZGUxLCB0aXRsZTonQWRkaXRpb24gYW5kIFN1YnRyYWN0aW9uJywgZGVzY3JpcHRpb246IGR1bW15RGVzY3JpcHRpb259KTtcclxuXHR2YXIgdG9waWNOb2RlOCA9IG5ldyBNb2RlbHMuVG9waWNOb2RlTW9kZWwoe3BhcmVudDogdG9waWNOb2RlMSwgdGl0bGU6J1ByYWN0aWNlIFRlc3RzJywgZGVzY3JpcHRpb246IGR1bW15RGVzY3JpcHRpb259KTtcclxuXHR2YXIgdG9waWNOb2RlOSA9IG5ldyBNb2RlbHMuVG9waWNOb2RlTW9kZWwoe3BhcmVudDogdG9waWNOb2RlMSwgdGl0bGU6J0hvbWV3b3JrJywgZGVzY3JpcHRpb246IGR1bW15RGVzY3JpcHRpb259KTtcclxuXHR2YXIgY29udGVudE5vZGUzID0gbmV3IE1vZGVscy5Db250ZW50Tm9kZU1vZGVsKHtwYXJlbnQ6IHRvcGljTm9kZTEsIHRpdGxlOiBcIkFib3V0XCIsIGRlc2NyaXB0aW9uOiBkdW1teURlc2NyaXB0aW9uLCBhdXRob3I6XCJBbnlvbnltb3VzXCJ9KTtcclxuXHR2YXIgY29udGVudE5vZGU0ID0gbmV3IE1vZGVscy5Db250ZW50Tm9kZU1vZGVsKHtwYXJlbnQ6IHRvcGljTm9kZTEsIHRpdGxlOiBcIkxlYXJuaW5nIGFib3V0IHNoYXBlc1wiLCBkZXNjcmlwdGlvbjogZHVtbXlEZXNjcmlwdGlvbiwgYXV0aG9yOlwiQW55b255bW91c1wifSk7XHJcblxyXG5cdC8vQ29udGVudCBDb250YWluZXIgM1xyXG5cdHZhciB0b3BpY05vZGU3ID0gbmV3IE1vZGVscy5Ub3BpY05vZGVNb2RlbCh7cGFyZW50OiB0b3BpY05vZGU1LCB0aXRsZTonR2VvbG9neScsIGRlc2NyaXB0aW9uOiBkdW1teURlc2NyaXB0aW9ufSk7XHJcblx0dmFyIGNvbnRlbnROb2RlNSA9IG5ldyBNb2RlbHMuQ29udGVudE5vZGVNb2RlbCh7cGFyZW50OiB0b3BpY05vZGU1LCB0aXRsZTogXCJSZXZpZXdcIiwgZGVzY3JpcHRpb246IGR1bW15RGVzY3JpcHRpb24sIGF1dGhvcjpcIkFueW9ueW1vdXNcIn0pO1xyXG5cclxuXHR2YXIgdG9waWNOb2RlQ29sbGVjdGlvbiA9IG5ldyBNb2RlbHMuVG9waWNOb2RlQ29sbGVjdGlvbihbcm9vdFRvcGljTm9kZSwgdG9waWNOb2RlMSwgdG9waWNOb2RlMiwgdG9waWNOb2RlMywgdG9waWNOb2RlNCwgdG9waWNOb2RlNSwgdG9waWNOb2RlNiwgdG9waWNOb2RlNywgdG9waWNOb2RlOCwgdG9waWNOb2RlOV0pO1xyXG5cdHZhciBjb250ZW50Tm9kZUNvbGxlY3Rpb24gPSBuZXcgTW9kZWxzLkNvbnRlbnROb2RlQ29sbGVjdGlvbihbY29udGVudE5vZGUxLCBjb250ZW50Tm9kZTIsIGNvbnRlbnROb2RlMywgY29udGVudE5vZGU0LCBjb250ZW50Tm9kZTVdKTtcclxuXHRcclxuXHQvKlRvZG86IHdoZW4gZGF0YSBjb25uZWN0ZWQgLVxyXG5cdHZhciB0b3BpY25vZGVzID0gbmV3IE1vZGVscy5Ub3BpY05vZGVDb2xsZWN0aW9uKCkuZmV0Y2goKTtcclxuXHR2YXIgY29udGVudG5vZGVzID0gbmV3IE1vZGVscy5Db250ZW50Tm9kZUNvbGxlY3Rpb24oKS5mZXRjaCgpLnRoZW4oZnVuY3Rpb24oKXtcclxuXHRcdHZhciB2aWV3ID0gbmV3IFZpZXdzLkJhc2VWaWV3KHtcclxuXHRcdFx0dXJsOiAnL2FwaScsXHJcblx0XHRcdGVsOiAkKFwiI2NoYW5uZWwtZWRpdC1jb250YWluZXJcIiksXHJcblx0XHRcdG1vZGVsOiB7dG9waWNub2RlczogdG9waWNub2RlcywgY29udGVudG5vZGVzOiBjb250ZW50bm9kZXMsIHRvcGljOiByb290VG9waWNOb2RlfVxyXG5cdFx0fSk7XHJcblx0fSk7XHRcclxuXHQqL1xyXG5cdHZhciB2aWV3ID0gbmV3IFZpZXdzLkJhc2VWaWV3KHtcclxuXHRcdGVsOiAkKFwiI2NoYW5uZWwtZWRpdC1jb250YWluZXJcIiksXHJcblx0XHRtb2RlbDoge3RvcGljbm9kZXM6IHRvcGljTm9kZUNvbGxlY3Rpb24sIGNvbnRlbnRub2RlczogY29udGVudE5vZGVDb2xsZWN0aW9uLCB0b3BpYzogdG9waWNUcmVlfVxyXG5cdH0pO1xyXG59KTsiLCJ2YXIgQmFja2JvbmUgPSByZXF1aXJlKFwiYmFja2JvbmVcIik7XHJcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XHJcblxyXG4vKiBEZXBlbmRpbmcgb24gaW1wbGVtZW50YXRpb24sIG1pZ2h0IGNyZWF0ZSBvbmUgdmlldyBmb3IgZWFjaCBwYWdlIHRvIGtlZXAgZGF0YSBmcm9tIHJlc2V0dGluZyBcclxudmFyIEVkaXRWaWV3cyA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdHJlZV9lZGl0L3ZpZXdzXCIpO1xyXG52YXIgUHJldmlld1ZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC90cmVlX3ByZXZpZXcvdmlld3NcIik7XHJcbnZhciBUcmFzaFZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC90cmFzaC92aWV3c1wiKTtcclxuKi9cclxudmFyIGNsaXBib2FyZENvbnRlbnQgPSBbXTtcclxuXHJcbnZhciBCYXNlVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcclxuXHR0ZW1wbGF0ZTogcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvY2hhbm5lbF9lZGl0LmhhbmRsZWJhcnNcIiksXHJcblx0dXJsOiAnL2FwaScsXHJcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XHJcblx0XHRfLmJpbmRBbGwodGhpcywgJ29wZW5fZWRpdCcsICdvcGVuX3ByZXZpZXcnLCAnb3Blbl90cmFzaCcsICdvcGVuX3B1Ymxpc2gnLCdvcGVuX2NsaXBib2FyZCcpO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9LFxyXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbCkpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmQtdG9nZ2xlclwiKS5zaG93KCk7XHJcblx0XHR2YXIgRWRpdFZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC90cmVlX2VkaXQvdmlld3NcIik7XHJcblx0XHRuZXcgRWRpdFZpZXdzLlRyZWVFZGl0Vmlldyh7XHJcblx0XHRcdGVsOiAkKFwiI21haW4tY29udGVudC1hcmVhXCIpLFxyXG5cdFx0XHRtb2RlbDogdGhpcy5tb2RlbCxcclxuXHRcdFx0ZWRpdDogdHJ1ZVxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRldmVudHM6IHtcclxuXHRcdCdjbGljayAjY2hhbm5lbC1lZGl0LWJ1dHRvbic6ICdvcGVuX2VkaXQnLFxyXG5cdFx0J2NsaWNrICNjaGFubmVsLXByZXZpZXctYnV0dG9uJzogJ29wZW5fcHJldmlldycsXHJcblx0XHQnY2xpY2sgI2NoYW5uZWwtdHJhc2gtYnV0dG9uJzonb3Blbl90cmFzaCcsXHJcblx0XHQnY2xpY2sgI2NoYW5uZWwtcHVibGlzaC1idXR0b24nOiAnb3Blbl9wdWJsaXNoJyxcclxuXHRcdCdjbGljayAjY2xpcGJvYXJkLXRvZ2dsZXInIDogJ29wZW5fY2xpcGJvYXJkJ1xyXG5cdH0sXHJcblx0XHJcblx0b3Blbl9lZGl0OiBmdW5jdGlvbigpe1xyXG5cdFx0JChcIiNjbGlwYm9hcmQtdG9nZ2xlclwiKS5zaG93KCk7XHJcblx0XHR2YXIgRWRpdFZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC90cmVlX2VkaXQvdmlld3NcIik7XHJcblx0XHRuZXcgRWRpdFZpZXdzLlRyZWVFZGl0Vmlldyh7XHJcblx0XHRcdGVsOiAkKFwiI21haW4tY29udGVudC1hcmVhXCIpLFxyXG5cdFx0XHRtb2RlbDogdGhpcy5tb2RlbCxcclxuXHRcdFx0ZWRpdDogdHJ1ZVxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHRcclxuXHRvcGVuX3ByZXZpZXc6IGZ1bmN0aW9uKCl7XHJcblx0XHQkKFwiI2NsaXBib2FyZC10b2dnbGVyXCIpLmhpZGUoKTtcclxuXHRcdCQoXCIjY2xpcGJvYXJkXCIpLmhpZGUoKTtcclxuXHRcdHZhciBQcmV2aWV3Vmlld3MgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3RyZWVfcHJldmlldy92aWV3c1wiKTtcclxuXHRcdG5ldyBQcmV2aWV3Vmlld3MuVHJlZVByZXZpZXdWaWV3KHtcclxuXHRcdFx0ZWw6ICQoXCIjbWFpbi1jb250ZW50LWFyZWFcIiksXHJcblx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsLFxyXG5cdFx0XHRlZGl0OiBmYWxzZVxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHJcblx0b3Blbl90cmFzaDogZnVuY3Rpb24oKXtcclxuXHRcdCQoXCIjY2xpcGJvYXJkLXRvZ2dsZXJcIikuc2hvdygpO1xyXG5cdFx0dmFyIFRyYXNoVmlld3MgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3RyYXNoL3ZpZXdzXCIpO1xyXG5cdFx0bmV3IFRyYXNoVmlld3MuVHJhc2hWaWV3KHtcclxuXHRcdFx0ZWw6ICQoXCIjbWFpbi1jb250ZW50LWFyZWFcIiksXHJcblx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsXHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdG9wZW5fY2xpcGJvYXJkOiBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIENsaXBib2FyZFZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC9jbGlwYm9hcmQvdmlld3NcIik7XHJcblx0XHRuZXcgQ2xpcGJvYXJkVmlld3MuQ2xpcGJvYXJkTGlzdFZpZXcoe1xyXG5cdFx0XHRlbDogJChcIiNjbGlwYm9hcmQtYXJlYVwiKSxcclxuXHRcdFx0bW9kZWw6IHRoaXMubW9kZWxcclxuXHRcdH0pO1xyXG5cdH0sXHJcblxyXG5cdC8vVG9kbzogQ2hhbmdlIHRvIGFjdHVhbGx5IHB1Ymxpc2ggdGhlIGNoYW5uZWwgKGkuZS4gYWRkIHRvIHB1Ymxpc2hlZCB0cmVlKVxyXG5cdG9wZW5fcHVibGlzaDogZnVuY3Rpb24oKXtcclxuXHRcdGlmKGNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gcHVibGlzaD9cIikpe1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlB1Ymxpc2hpbmcgQ2hhbm5lbFwiKTtcclxuXHRcdH1cclxuXHR9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gYWRkVG9DbGlwYm9hcmQodG9waWNfbm9kZXMsIGNvbnRlbnRfbm9kZXMpe1xyXG5cdC8vY2xpcGJvYXJkQ29udGVudFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRCYXNlVmlldzogQmFzZVZpZXdcclxufSIsInZhciBCYWNrYm9uZSA9IHJlcXVpcmUoXCJiYWNrYm9uZVwiKTtcclxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcclxudmFyIExvYWRIZWxwZXIgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3V0aWxzL0xvYWRIZWxwZXJcIik7XHJcbnZhciBET01IZWxwZXIgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3V0aWxzL0RPTUhlbHBlclwiKTtcclxudmFyIFRleHRIZWxwZXIgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3V0aWxzL1RleHRIZWxwZXJcIik7XHJcbnZhciBQcmV2aWV3ZXJWaWV3cyA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvcHJldmlld2VyL3ZpZXdzXCIpO1xyXG5cclxucmVxdWlyZShcInByZXZpZXcubGVzc1wiKTtcclxudmFyIGNvbnRhaW5lcl9udW1iZXI7IC8vIEJldHRlciB0byBmaW5kIG90aGVyIHdheSB0byBpZGVudGlmeSB1bmlxdWUgY29udGFpbmVyXHJcblxyXG52YXIgVHJlZVByZXZpZXdWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG5cdHRlbXBsYXRlOiByZXF1aXJlKFwiLi8uLi9oYnRlbXBsYXRlcy9jb250YWluZXJfYXJlYS5oYW5kbGViYXJzXCIpLFxyXG5cclxuXHRpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XHJcblx0XHRfLmJpbmRBbGwodGhpcywgJ29wZW5fZm9sZGVyJywgJ3ByZXZpZXdfZmlsZScsJ2V4cGFuZF9mb2xkZXInLCdtaW5pbWl6ZV9mb2xkZXInKTtcclxuXHRcdC8vdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTpudW1iZXJfb2ZfdG9waWNzXCIsIHRoaXMucmVuZGVyKTtcclxuXHRcdHRoaXMuZWRpdCA9IG9wdGlvbnMuZWRpdDtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fSxcclxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHtlZGl0OiB0aGlzLmVkaXR9KSk7XHJcblx0XHRjb250YWluZXJfbnVtYmVyID0gMDtcclxuXHRcdGNvbnRhaW5lcl9udW1iZXIgPSBMb2FkSGVscGVyLmxvYWRDb250YWluZXIobnVsbCwgdGhpcy5tb2RlbC50b3BpYy5nZXQoXCJyb290X25vZGVcIiksIHRoaXMubW9kZWwudG9waWNub2RlcywgXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubW9kZWwuY29udGVudG5vZGVzLCBjb250YWluZXJfbnVtYmVyLCB0aGlzLmVkaXQsIHRydWUsIDApOyBcclxuXHR9LFxyXG5cdGV2ZW50czoge1xyXG5cdFx0J2NsaWNrIC5mb2xkZXInOiAnb3Blbl9mb2xkZXInLFxyXG5cdFx0J2NsaWNrIC5maWxlJzogJ3ByZXZpZXdfZmlsZScsXHJcblx0XHQnY2xpY2sgLmZpbGxlcic6ICdleHBhbmRfZm9sZGVyJyxcclxuXHRcdCdjbGljayAubWluaW1pemUnOidtaW5pbWl6ZV9mb2xkZXInXHJcblx0fSxcclxuXHRleHBhbmRfZm9sZGVyOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRUZXh0SGVscGVyLm1hbmFnZUZvbGRlcihldmVudCwgdHJ1ZSk7XHJcblx0fSxcclxuXHRtaW5pbWl6ZV9mb2xkZXI6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdFRleHRIZWxwZXIubWFuYWdlRm9sZGVyKGV2ZW50LCBmYWxzZSk7XHJcblx0fSxcclxuXHRvcGVuX2ZvbGRlcjogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0dmFyIGVsID0gRE9NSGVscGVyLmdldFBhcmVudE9mVGFnKGV2ZW50LnRhcmdldCwgXCJsYWJlbFwiKTtcclxuXHRcdGNvbnRhaW5lcl9udW1iZXIgPSBMb2FkSGVscGVyLmxvYWRDb250YWluZXIoZWwsICQoXCIjXCIrZWwucGFyZW50Tm9kZS5pZCkuZGF0YShcImRhdGFcIiksIHRoaXMubW9kZWwudG9waWNub2RlcywgXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubW9kZWwuY29udGVudG5vZGVzLCBjb250YWluZXJfbnVtYmVyLCB0aGlzLmVkaXQsIGZhbHNlKTtcclxuXHR9LFxyXG5cdHByZXZpZXdfZmlsZTogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0dmFyIGZpbGUgPSAkKFwiI1wiKyBET01IZWxwZXIuZ2V0UGFyZW50T2ZUYWcoZXZlbnQudGFyZ2V0LCBcImxpXCIpLmlkKTtcclxuXHRcdHZhciB2aWV3ID0gbmV3IFByZXZpZXdlclZpZXdzLlByZXZpZXdlclZpZXcoe1xyXG5cdFx0XHRlbDogJChcIiNwcmV2aWV3ZXItYXJlYVwiKSxcclxuXHRcdFx0bW9kZWw6IGZpbGUuZGF0YShcImRhdGFcIiksXHJcblx0XHRcdGZpbGU6IGZpbGVcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRUcmVlUHJldmlld1ZpZXc6IFRyZWVQcmV2aWV3Vmlld1xyXG59IiwiKGZ1bmN0aW9uKCkgeyB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07IHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7IHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO3ZhciBjc3MgPSBcIkBmb250e2ZvbnQtZmFtaWx5OlxcXCJPcGVuIFNhbnNcXFwiO3NyYzp1cmwoXFxcIi4uL2ZvbnRzL09wZW5TYW5zLVJlZ3VsYXIudHRmXFxcIikgZm9ybWF0KFxcXCJ0cnVldHlwZVxcXCIpfS5pbmxpbmUtYmxvY2t7ZGlzcGxheTppbmxpbmUtYmxvY2t9Ym9keXtiYWNrZ3JvdW5kOiMyOTJhMmJ9YXt0ZXh0LWRlY29yYXRpb246bm9uZTtjdXJzb3I6cG9pbnRlcjtjb2xvcjpibGFja30jY29udGFpbmVyLXdyYXBwZXJ7b3ZlcmZsb3c6aGlkZGVuO292ZXJmbG93LXg6YXV0b30uY29udGVudC1jb250YWluZXJ7aGVpZ2h0Ojgwdmg7YmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDttaW4taGVpZ2h0OjUwMHB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3dpZHRoOjM5MHB4O3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi1sZWZ0OjA7bWFyZ2luLXJpZ2h0Oi01cHg7cGFkZGluZzowfS5jb250ZW50LWNvbnRhaW5lciAqe3BhZGRpbmc6MDttYXJnaW46MH0uY29udGVudC1jb250YWluZXIgOjotd2Via2l0LXNjcm9sbGJhcntkaXNwbGF5Om5vbmV9LmNvbnRlbnQtY29udGFpbmVyIGNhbnZhc3twb3NpdGlvbjphYnNvbHV0ZTtoZWlnaHQ6Njl2aDttaW4taGVpZ2h0OjQ4OXB4O2JvcmRlcjo1cHggc29saWQgd2hpdGU7Ym9yZGVyLXJpZ2h0Om5vbmU7d2lkdGg6MzhweDtib3gtc2hhZG93Oi0zcHggM3B4IDNweCBibGFjazt6LWluZGV4OjEwMH0uY29udGVudC1jb250YWluZXIgLnRpdGxlLWJhcntwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjEwMDttYXJnaW4tbGVmdDo5MHB4O3dpZHRoOjE4MHB4O2ZvbnQtc2l6ZToyMnB4O2NvbG9yOndoaXRlO2JhY2tncm91bmQtY29sb3I6IzI5MmEyYjttYXJnaW4tYm90dG9tOi0yMXB4O3BhZGRpbmctYm90dG9tOjEwcHh9LmNvbnRlbnQtY29udGFpbmVyIC5jb250YWluZXItaW50ZXJpb3J7cG9zaXRpb246YWJzb2x1dGU7aGVpZ2h0OjY5dmg7bWluLWhlaWdodDo0ODlweDt3aWR0aDozNjBweDtib3JkZXI6NXB4IHNvbGlkIHdoaXRlO2JveC1zaGFkb3c6LTNweCAzcHggM3B4IGJsYWNrO2JhY2tncm91bmQtY29sb3I6IzI5MmEyYn0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdHt3aWR0aDozOTBweDtvdmVyZmxvdy15OmF1dG87b3ZlcmZsb3cteDpoaWRkZW47bWFyZ2luLXRvcDoxNnB4O3BhZGRpbmctdG9wOjVweDttYXJnaW4tbGVmdDpub25lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl17ZGlzcGxheTpub25lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVse3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTUwfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIHNwYW57ZGlzcGxheTpub25lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5kZWZhdWx0LWl0ZW17Zm9udC1zdHlsZTppdGFsaWM7bWFyZ2luLWxlZnQ6NDBweDtmb250LXNpemU6MThweDtjb2xvcjp3aGl0ZX0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCBsYWJlbHt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7Zm9udC13ZWlnaHQ6bm9ybWFsO2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDttYXJnaW4tYm90dG9tOjEwcHg7bWFyZ2luLWxlZnQ6MTBweDt3aWR0aDoyOTJweDtib3JkZXI6LjVweCBzb2xpZCBibGFjaztib3gtc2hhZG93OjNweCAzcHggM3B4ICM4ZDhmOTA7YmFja2dyb3VuZC1jb2xvcjp3aGl0ZX0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCBsYWJlbCAqe3BhZGRpbmctcmlnaHQ6MTBweH0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCBsYWJlbCAuZmlsbGVyLC5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGxhYmVsIC5taW5pbWl6ZXtmb250LXdlaWdodDpib2xkO2ZvbnQtc3R5bGU6aXRhbGljfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5mb2xkZXJ7aGVpZ2h0OjEyMHB4fS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5mb2xkZXIgaDN7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6Ym9sZDtwYWRkaW5nLWxlZnQ6MTBweDtwYWRkaW5nLWJvdHRvbToxMHB4fS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5mb2xkZXIgLmdseXBoaWNvbntkaXNwbGF5OmlubGluZX0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCAuZm9sZGVyIHB7Zm9udC1zaXplOjE0cHg7cGFkZGluZy1sZWZ0OjEwcHg7d2lkdGg6MjkycHh9LmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZvbGRlciBwIGF7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6YmxhY2t9LmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZpbGV7Ym9yZGVyLXJhZGl1czoxMHB4fS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5maWxlIGg0e2ZvbnQtc2l6ZToxN3B4O3BhZGRpbmc6MTBweH0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCAuZmlsZSAuZ2x5cGhpY29ue2Rpc3BsYXk6aW5saW5lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGlucHV0W3R5cGU9Y2hlY2tib3hdOmNoZWNrZWQrLmZpbGUsLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZpbGU6aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojYjZiNmI3fSNwcmV2aWV3IGgxe2ZvbnQtc2l6ZToyMHB4O21hcmdpbi1ib3R0b206MjBweDtjb2xvcjp3aGl0ZX0jcHJldmlldyAuY29udGVudC1jb250YWluZXIgY2FudmFze2JhY2tncm91bmQtY29sb3I6Izg3YTNjNn0jcHJldmlldyAuY29udGVudC1saXN0e3BhZGRpbmctbGVmdDo0MHB4fVwiO2lmIChzdHlsZS5zdHlsZVNoZWV0KXsgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzOyB9IGVsc2UgeyBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTsgfSBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTt9KCkpIiwidmFyIEJhY2tib25lID0gcmVxdWlyZShcImJhY2tib25lXCIpO1xyXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xyXG5yZXF1aXJlKFwiZWRpdC5sZXNzXCIpO1xyXG5cclxudmFyIExvYWRIZWxwZXIgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3V0aWxzL0xvYWRIZWxwZXJcIik7XHJcbnZhciBET01IZWxwZXIgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3V0aWxzL0RPTUhlbHBlclwiKTtcclxudmFyIFRleHRIZWxwZXIgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3V0aWxzL1RleHRIZWxwZXJcIik7XHJcbnZhciBMZXNzSGVscGVyID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC91dGlscy9MZXNzSGVscGVyXCIpO1xyXG52YXIgQ2xpcGJvYXJkVmlld3MgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL2NsaXBib2FyZC92aWV3c1wiKTtcclxudmFyIFByZXZpZXdlclZpZXdzID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC9wcmV2aWV3ZXIvdmlld3NcIik7XHJcblxyXG52YXIgY29udGFpbmVyX251bWJlcjsgLy9Vc2VkIHRvIGNyZWF0ZSB1bmlxdWUgaWRlbnRpZmllciBmb3IgZGlyZWN0b3JpZXNcclxuXHJcbnZhciBUcmVlRWRpdFZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XHJcblx0dGVtcGxhdGU6IHJlcXVpcmUoXCIuLy4uL2hidGVtcGxhdGVzL2NvbnRhaW5lcl9hcmVhLmhhbmRsZWJhcnNcIiksXHJcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cdFx0Xy5iaW5kQWxsKHRoaXMsICdlZGl0X2ZvbGRlcicsICdwcmV2aWV3X25vZGUnLCAnYWRkX2NvbnRlbnQnLCdlZGl0X2ZpbGUnLCdhZGRfZm9sZGVyJyxcclxuXHRcdFx0XHRcdCdjb3B5X2NvbnRlbnQnLCdkZWxldGVfY29udGVudCcsJ29wZW5fZm9sZGVyJywnZXhwYW5kX2ZvbGRlcicsJ21pbmltaXplX2ZvbGRlcicpO1xyXG5cdFx0Ly90aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOm5ld3RvcGljbm9kZXMgb3IgY29udGVudG5vZGVzXCIsIHRoaXMucmVuZGVyKTtcclxuXHRcdHRoaXMuZWRpdCA9IG9wdGlvbnMuZWRpdDtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fSxcclxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHtlZGl0OiB0aGlzLmVkaXR9KSk7XHJcblx0XHRjb250YWluZXJfbnVtYmVyID0gMDtcclxuXHRcdGNvbnRhaW5lcl9udW1iZXIgPSBMb2FkSGVscGVyLmxvYWRDb250YWluZXIobnVsbCx0aGlzLm1vZGVsLnRvcGljLmdldChcInJvb3Rfbm9kZVwiKSwgdGhpcy5tb2RlbC50b3BpY25vZGVzLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLm1vZGVsLmNvbnRlbnRub2Rlcyxjb250YWluZXJfbnVtYmVyLHRoaXMuZWRpdCwgdHJ1ZSwgMCk7XHJcblx0fSxcclxuXHRcclxuXHRldmVudHM6IHtcclxuXHRcdCdjbGljayAuZWRpdF9mb2xkZXJfYnV0dG9uJzogJ2VkaXRfZm9sZGVyJyxcclxuXHRcdCdjbGljayAuZWRpdF9maWxlX2J1dHRvbic6ICdlZGl0X2ZpbGUnLFxyXG5cdFx0J2NsaWNrIC5wcmV2aWV3X2J1dHRvbic6ICdwcmV2aWV3X25vZGUnLFxyXG5cdFx0J2NsaWNrIC5hZGRfY29udGVudF9idXR0b24nOidhZGRfY29udGVudCcsXHJcblx0XHQnY2xpY2sgLmFkZF9mb2xkZXJfYnV0dG9uJzonYWRkX2ZvbGRlcicsXHJcblx0XHQnY2xpY2sgLmNvcHknIDogJ2NvcHlfY29udGVudCcsXHJcblx0XHQnY2xpY2sgLmRlbGV0ZScgOiAnZGVsZXRlX2NvbnRlbnQnLFxyXG5cdFx0J2NsaWNrIC5vcGVuX2ZvbGRlcic6J29wZW5fZm9sZGVyJyxcclxuXHRcdCdjbGljayAuZmlsbGVyJyA6ICdleHBhbmRfZm9sZGVyJyxcclxuXHRcdCdjbGljayAubWluaW1pemUnIDogJ21pbmltaXplX2ZvbGRlcidcclxuXHR9LFxyXG5cdGV4cGFuZF9mb2xkZXI6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdFRleHRIZWxwZXIubWFuYWdlRm9sZGVyKGV2ZW50LCB0cnVlKTtcclxuXHR9LFxyXG5cdG1pbmltaXplX2ZvbGRlcjogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0VGV4dEhlbHBlci5tYW5hZ2VGb2xkZXIoZXZlbnQsIGZhbHNlKTtcclxuXHR9LFxyXG5cdG9wZW5fZm9sZGVyOmZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHR2YXIgZWwgPSBET01IZWxwZXIuZ2V0UGFyZW50T2ZUYWcoZXZlbnQudGFyZ2V0LCBcImxhYmVsXCIpO1xyXG5cdFx0Y29udGFpbmVyX251bWJlciA9IExvYWRIZWxwZXIubG9hZENvbnRhaW5lcihlbCwkKFwiI1wiK2VsLnBhcmVudE5vZGUuaWQpLmRhdGEoXCJkYXRhXCIpLHRoaXMubW9kZWwudG9waWNub2RlcyxcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5tb2RlbC5jb250ZW50bm9kZXMsY29udGFpbmVyX251bWJlcix0aGlzLmVkaXQsIGZhbHNlLCBcIiNDQ0NDQ0NcIik7XHJcblx0XHRpZigkKFwiI2lzX2VkaXRpbmdcIikudmFsKCkgPT0gXCJ5XCIpe1xyXG5cdFx0XHQkKFwiLmVkaXRfZm9sZGVyX2J1dHRvblwiKS5jc3MoJ3Zpc2liaWxpdHknLCdoaWRkZW4nKTtcclxuXHRcdFx0JChcIi5lZGl0X2ZpbGVfYnV0dG9uXCIpLmNzcygndmlzaWJpbGl0eScsJ2hpZGRlbicpO1xyXG5cdFx0XHQkKFwiLmNvbnRlbnRfb3B0aW9ucyBidXR0b25cIikucHJvcCgnZGlzYWJsZWQnLHRydWUpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0ZWRpdF9mb2xkZXI6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRvcGVuQ2xpcGJvYXJkKCk7XHJcblx0XHR2YXIgdmlldyA9IG5ldyBDbGlwYm9hcmRWaWV3cy5DbGlwYm9hcmRFZGl0Rm9sZGVyVmlldyh7XHJcblx0XHRcdGVsOiAkKFwiI2NsaXBib2FyZC1hcmVhXCIpLFxyXG5cdFx0XHRtb2RlbDogJChcIiNcIisgRE9NSGVscGVyLmdldFBhcmVudE9mVGFnKGV2ZW50LnRhcmdldCwgXCJsaVwiKS5pZCkuZGF0YShcImRhdGFcIiksXHJcblx0XHRcdGVkaXQ6IHRydWVcclxuXHRcdH0pO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRcIikuc2xpZGVEb3duKCk7XHJcblx0fSxcclxuXHRcclxuXHRlZGl0X2ZpbGU6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRvcGVuQ2xpcGJvYXJkKCk7XHJcblx0XHRuZXcgQ2xpcGJvYXJkVmlld3MuQ2xpcGJvYXJkRWRpdEZpbGVWaWV3KHtcclxuXHRcdFx0ZWw6ICQoXCIjY2xpcGJvYXJkLWFyZWFcIiksXHJcblx0XHRcdG1vZGVsOiAkKFwiI1wiKyBET01IZWxwZXIuZ2V0UGFyZW50T2ZUYWcoZXZlbnQudGFyZ2V0LCBcImxpXCIpLmlkKS5kYXRhKFwiZGF0YVwiKVxyXG5cdFx0fSk7XHJcblx0XHQkKFwiI2NsaXBib2FyZFwiKS5zbGlkZURvd24oKTtcclxuXHR9LFxyXG5cdFxyXG5cdHByZXZpZXdfbm9kZTogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdHZhciBmaWxlID0gJChcIiNcIisgRE9NSGVscGVyLmdldFBhcmVudE9mVGFnKGV2ZW50LnRhcmdldCwgXCJsaVwiKS5pZCk7XHJcblx0XHR2YXIgdmlldyA9IG5ldyBQcmV2aWV3ZXJWaWV3cy5QcmV2aWV3ZXJWaWV3KHtcclxuXHRcdFx0ZWw6ICQoXCIjcHJldmlld2VyLWFyZWFcIiksXHJcblx0XHRcdG1vZGVsOiAgZmlsZS5kYXRhKFwiZGF0YVwiKSxcclxuXHRcdFx0ZmlsZTogZmlsZVxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHR9LFxyXG5cdFxyXG5cdGFkZF9jb250ZW50OiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0dmFyIGZpbGVfdGVtcGxhdGUgPSByZXF1aXJlKFwiLi8uLi9oYnRlbXBsYXRlcy9jb250ZW50X2ZpbGUuaGFuZGxlYmFyc1wiKTtcclxuXHRcdG5ld0NvbnRlbnQoZmlsZV90ZW1wbGF0ZSwgZXZlbnQudGFyZ2V0KTtcclxuXHRcdG5ldyBDbGlwYm9hcmRWaWV3cy5DbGlwYm9hcmRBZGRDb250ZW50Vmlldyh7XHJcblx0XHRcdGVsOiAkKFwiI2NsaXBib2FyZC1hcmVhXCIpLFxyXG5cdFx0XHRtb2RlbDogJChcIiNcIiArIERPTUhlbHBlci5nZXRQYXJlbnRPZkNsYXNzKGV2ZW50LnRhcmdldCwgXCJjb250ZW50LWNvbnRhaW5lclwiKS5pZCkuZGF0YShcImNoYW5uZWxcIilcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHQkKFwiI2NsaXBib2FyZFwiKS5zbGlkZURvd24oKTtcclxuXHR9LFxyXG5cdFxyXG5cdGFkZF9mb2xkZXI6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHR2YXIgZm9sZGVyX3RlbXBsYXRlID0gcmVxdWlyZShcIi4vLi4vaGJ0ZW1wbGF0ZXMvY29udGVudF9mb2xkZXIuaGFuZGxlYmFyc1wiKTtcclxuXHRcdG5ld0NvbnRlbnQoZm9sZGVyX3RlbXBsYXRlLCBldmVudC50YXJnZXQpO1xyXG5cdFx0dmFyIHZpZXcgPSBuZXcgQ2xpcGJvYXJkVmlld3MuQ2xpcGJvYXJkRWRpdEZvbGRlclZpZXcoe1xyXG5cdFx0XHRlbDogJChcIiNjbGlwYm9hcmQtYXJlYVwiKSxcclxuXHRcdFx0Ly9tb2RlbDogZXZlbnQudGFyZ2V0LnBhcmVudG5vZGUuLi4gLy9pbmNsdWRlIHRvcGljIHRyZWUgcm9vdCB0byBrbm93IHdoaWNoIHRyZWUgdG8gYWRkIHRvXHJcblx0XHRcdGVkaXQ6IGZhbHNlXHJcblx0XHR9KTtcclxuXHRcdCQoXCIjY2xpcGJvYXJkXCIpLnNsaWRlRG93bigpO1xyXG5cdH0sXHJcblx0XHJcblx0ZGVsZXRlX2NvbnRlbnQ6IGZ1bmN0aW9uIChldmVudCl7XHJcblx0XHRpZihjb25maXJtKFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGUgc2VsZWN0ZWQgZmlsZXM/XCIpKXtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJEZWxldGluZyBDb250ZW50XCIpO1xyXG5cdFx0XHR2YXIgc2VsZWN0ZWQgPSAkKCcjZWRpdCcpLmZpbmQoJ2lucHV0OmNoZWNrZWQgKyBsYWJlbCcpO1xyXG5cdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgc2VsZWN0ZWQubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCQoXCIjXCIrc2VsZWN0ZWRbaV0ucGFyZW50Tm9kZS5pZCkuZGF0YShcImRhdGFcIikuYXR0cmlidXRlcyk7XHJcblx0XHRcdFx0c2VsZWN0ZWRbaV0ucGFyZW50Tm9kZS5yZW1vdmUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0Y29weV9jb250ZW50OiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR2YXIgbGlzdCA9ICQoJy5jb250ZW50LWNvbnRhaW5lcicpLmZpbmQoJ2lucHV0OmNoZWNrZWQgKyBsYWJlbCcpLnBhcmVudCgpO1xyXG5cdFx0dmFyIGNsaXBib2FyZF9saXN0ID0gW107XHJcblx0XHRmb3IodmFyIGkgPSAwOyBpPCBsaXN0Lmxlbmd0aDsgaSsrKVxyXG5cdFx0XHRjbGlwYm9hcmRfbGlzdC5wdXNoKHtkYXRhOiAkKFwiI1wiICsgbGlzdFtpXS5pZCkuZGF0YShcImRhdGFcIiksIGZvbGRlcjogJChcIiNcIiArIGxpc3RbaV0uaWQgKyBcIiAuZm9sZGVyXCIpLmxlbmd0aCAhPSAwfSk7XHJcblx0XHRDbGlwYm9hcmRWaWV3cy5hZGRJdGVtcyhjbGlwYm9hcmRfbGlzdCk7XHJcblx0fVxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIG5ld0NvbnRlbnQodGVtcGxhdGUsIGNvbnRlbnQpe1xyXG5cdG9wZW5DbGlwYm9hcmQoKTtcclxuXHQvL0xlc3NIZWxwZXIubG9hZExlc3NWYXJpYWJsZXNGb3IoXCIjXCIgKyBjb250ZW50LmlkICsgXCIgbGFiZWxcIik7XHJcblx0dmFyIGNvbnRhaW5lcmlkID0gXCIjXCIgKyBET01IZWxwZXIuZ2V0UGFyZW50T2ZDbGFzcyhjb250ZW50LCBcImNvbnRlbnQtY29udGFpbmVyXCIpLmlkO1xyXG5cdHZhciBpbmRleCA9IGNvbnRhaW5lcmlkLm1hdGNoKC9cXGQrLylbMF07XHJcblx0JChjb250YWluZXJpZCArIFwiIC5jb250ZW50X29wdGlvbnNcIikuYWZ0ZXIodGVtcGxhdGUoe2luZGV4OiBpbmRleCAsIGxpc3RfaW5kZXg6IFwibmV3XCIsIGVkaXQ6IGVkaXR9KSk7XHJcblx0JChcIiNpdGVtX1wiICsgaW5kZXggKyBcIl9uZXcgbGFiZWxcIikuY3NzKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcIiM4OUMwQjFcIik7XHJcblx0JChcIiNpdGVtX1wiICsgaW5kZXggKyBcIl9uZXdcIikuYXR0cihcImNsYXNzXCIsXCJuZXdjb250ZW50XCIpO1xyXG5cdCQoXCIjaXRlbV9cIiArIGluZGV4ICsgXCJfbmV3IGRpdlwiKS5jc3MoXCJkaXNwbGF5XCIsXCJub25lXCIpO1xyXG5cdCQoXCIjaXRlbV9cIiArIGluZGV4ICsgXCJfbmV3IGlucHV0XCIpLmNzcyhcInZpc2liaWxpdHlcIixcImhpZGRlblwiKTtcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gb3BlbkNsaXBib2FyZCgpe1xyXG5cdCQoXCIjaXNfZWRpdGluZ1wiKS52YWwoXCJ5XCIpO1xyXG5cdCQoXCIuY29udGVudF9vcHRpb25zIGJ1dHRvblwiKS5wcm9wKCdkaXNhYmxlZCcsdHJ1ZSk7XHJcblx0JChcIi5lZGl0X2ZvbGRlcl9idXR0b25cIikuY3NzKCd2aXNpYmlsaXR5JywnaGlkZGVuJyk7XHJcblx0JChcIi5lZGl0X2ZpbGVfYnV0dG9uXCIpLmNzcygndmlzaWJpbGl0eScsJ2hpZGRlbicpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRUcmVlRWRpdFZpZXc6IFRyZWVFZGl0Vmlld1xyXG59IiwiKGZ1bmN0aW9uKCkgeyB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07IHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7IHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO3ZhciBjc3MgPSBcIkBmb250e2ZvbnQtZmFtaWx5OlxcXCJPcGVuIFNhbnNcXFwiO3NyYzp1cmwoXFxcIi4uL2ZvbnRzL09wZW5TYW5zLVJlZ3VsYXIudHRmXFxcIikgZm9ybWF0KFxcXCJ0cnVldHlwZVxcXCIpfS5pbmxpbmUtYmxvY2t7ZGlzcGxheTppbmxpbmUtYmxvY2t9Ym9keXtiYWNrZ3JvdW5kOiMyOTJhMmJ9YXt0ZXh0LWRlY29yYXRpb246bm9uZTtjdXJzb3I6cG9pbnRlcjtjb2xvcjpibGFja30jY29udGFpbmVyLXdyYXBwZXJ7b3ZlcmZsb3c6aGlkZGVuO292ZXJmbG93LXg6YXV0b30uY29udGVudC1jb250YWluZXJ7aGVpZ2h0Ojgwdmg7YmFja2dyb3VuZC1jb2xvcjp0cmFuc3BhcmVudDttaW4taGVpZ2h0OjUwMHB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrO3dpZHRoOjM5MHB4O3Bvc2l0aW9uOnJlbGF0aXZlO21hcmdpbi1sZWZ0OjA7bWFyZ2luLXJpZ2h0Oi01cHg7cGFkZGluZzowfS5jb250ZW50LWNvbnRhaW5lciAqe3BhZGRpbmc6MDttYXJnaW46MH0uY29udGVudC1jb250YWluZXIgOjotd2Via2l0LXNjcm9sbGJhcntkaXNwbGF5Om5vbmV9LmNvbnRlbnQtY29udGFpbmVyIGNhbnZhc3twb3NpdGlvbjphYnNvbHV0ZTtoZWlnaHQ6Njl2aDttaW4taGVpZ2h0OjQ4OXB4O2JvcmRlcjo1cHggc29saWQgd2hpdGU7Ym9yZGVyLXJpZ2h0Om5vbmU7d2lkdGg6MzhweDtib3gtc2hhZG93Oi0zcHggM3B4IDNweCBibGFjazt6LWluZGV4OjEwMH0uY29udGVudC1jb250YWluZXIgLnRpdGxlLWJhcntwb3NpdGlvbjpyZWxhdGl2ZTt6LWluZGV4OjEwMDttYXJnaW4tbGVmdDo5MHB4O3dpZHRoOjE4MHB4O2ZvbnQtc2l6ZToyMnB4O2NvbG9yOndoaXRlO2JhY2tncm91bmQtY29sb3I6IzI5MmEyYjttYXJnaW4tYm90dG9tOi0yMXB4O3BhZGRpbmctYm90dG9tOjEwcHh9LmNvbnRlbnQtY29udGFpbmVyIC5jb250YWluZXItaW50ZXJpb3J7cG9zaXRpb246YWJzb2x1dGU7aGVpZ2h0OjY5dmg7bWluLWhlaWdodDo0ODlweDt3aWR0aDozNjBweDtib3JkZXI6NXB4IHNvbGlkIHdoaXRlO2JveC1zaGFkb3c6LTNweCAzcHggM3B4IGJsYWNrO2JhY2tncm91bmQtY29sb3I6IzI5MmEyYn0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdHt3aWR0aDozOTBweDtvdmVyZmxvdy15OmF1dG87b3ZlcmZsb3cteDpoaWRkZW47bWFyZ2luLXRvcDoxNnB4O3BhZGRpbmctdG9wOjVweDttYXJnaW4tbGVmdDpub25lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IGlucHV0W3R5cGU9XFxcInJhZGlvXFxcIl17ZGlzcGxheTpub25lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVse3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTUwfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIHNwYW57ZGlzcGxheTpub25lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5kZWZhdWx0LWl0ZW17Zm9udC1zdHlsZTppdGFsaWM7bWFyZ2luLWxlZnQ6NDBweDtmb250LXNpemU6MThweDtjb2xvcjp3aGl0ZX0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCBsYWJlbHt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7Zm9udC13ZWlnaHQ6bm9ybWFsO2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDttYXJnaW4tYm90dG9tOjEwcHg7bWFyZ2luLWxlZnQ6MTBweDt3aWR0aDoyOTJweDtib3JkZXI6LjVweCBzb2xpZCBibGFjaztib3gtc2hhZG93OjNweCAzcHggM3B4ICM4ZDhmOTA7YmFja2dyb3VuZC1jb2xvcjp3aGl0ZX0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCBsYWJlbCAqe3BhZGRpbmctcmlnaHQ6MTBweH0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCBsYWJlbCAuZmlsbGVyLC5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGxhYmVsIC5taW5pbWl6ZXtmb250LXdlaWdodDpib2xkO2ZvbnQtc3R5bGU6aXRhbGljfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5mb2xkZXJ7aGVpZ2h0OjEyMHB4fS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5mb2xkZXIgaDN7Zm9udC1zaXplOjE3cHg7Zm9udC13ZWlnaHQ6Ym9sZDtwYWRkaW5nLWxlZnQ6MTBweDtwYWRkaW5nLWJvdHRvbToxMHB4fS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5mb2xkZXIgLmdseXBoaWNvbntkaXNwbGF5OmlubGluZX0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCAuZm9sZGVyIHB7Zm9udC1zaXplOjE0cHg7cGFkZGluZy1sZWZ0OjEwcHg7d2lkdGg6MjkycHh9LmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZvbGRlciBwIGF7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6YmxhY2t9LmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZpbGV7Ym9yZGVyLXJhZGl1czoxMHB4fS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5maWxlIGg0e2ZvbnQtc2l6ZToxN3B4O3BhZGRpbmc6MTBweH0uY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdCB1bCAuZmlsZSAuZ2x5cGhpY29ue2Rpc3BsYXk6aW5saW5lfS5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGlucHV0W3R5cGU9Y2hlY2tib3hdOmNoZWNrZWQrLmZpbGUsLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZpbGU6aG92ZXJ7YmFja2dyb3VuZC1jb2xvcjojYjZiNmI3fSNlZGl0ICNidXR0b25fYmFye21hcmdpbi1ib3R0b206MTVweH0jZWRpdCAjYnV0dG9uX2JhciBhe2JhY2tncm91bmQtY29sb3I6IzNlNWU5Zjtjb2xvcjp3aGl0ZTtib3JkZXI6M3B4IHNvbGlkIHdoaXRlO3dpZHRoOjEzMHB4O2ZvbnQtc2l6ZToxNnB4O3BhZGRpbmc6NXB4O21hcmdpbi1yaWdodDoxNXB4O3ZlcnRpY2FsLWFsaWduOm1pZGRsZX0jZWRpdCAuY29udGVudC1jb250YWluZXIgY2FudmFze2JhY2tncm91bmQtY29sb3I6I2NjY30jZWRpdCAuY29udGVudC1jb250YWluZXIgLmNvbnRlbnQtbGlzdHtwYWRkaW5nLWxlZnQ6OS41cHh9I2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLm9wdGlvbnN7ZGlzcGxheTpub25lfSNlZGl0IC5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGlucHV0W3R5cGU9Y2hlY2tib3hde2Rpc3BsYXk6aW5saW5lLWJsb2NrO3dpZHRoOjI0cHg7aGVpZ2h0OjI0cHg7dmVydGljYWwtYWxpZ246bWlkZGxlO21hcmdpbi1yaWdodDoycHh9I2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmZvbGRlcl9vcHRpb25ze2hlaWdodDoxMjBweDt3aWR0aDo0MHB4fSNlZGl0IC5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGlucHV0W3R5cGU9Y2hlY2tib3hdOmNoZWNrZWQrbGFiZWwgLm9wdGlvbnMsI2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgbGFiZWw6aG92ZXIgLm9wdGlvbnN7ZGlzcGxheTppbmxpbmUtYmxvY2t9I2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgaW5wdXRbdHlwZT1jaGVja2JveF06Y2hlY2tlZCtsYWJlbCAub3B0aW9ucyAuZ2x5cGhpY29uLCNlZGl0IC5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIGxhYmVsOmhvdmVyIC5vcHRpb25zIC5nbHlwaGljb257Zm9udC1zaXplOjI1cHh9I2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmNvbnRlbnRfb3B0aW9uc3ttYXJnaW4tbGVmdDozOHB4O3dpZHRoOjEwMCU7aGVpZ2h0OjUwcHh9I2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmNvbnRlbnRfb3B0aW9ucyBidXR0b257YmFja2dyb3VuZC1jb2xvcjojYTY4NGM4O3BhZGRpbmc6NXB4O3dpZHRoOjE0MHB4O2NvbG9yOmJsYWNrO2JvcmRlcjozcHggc29saWQgd2hpdGU7Ym9yZGVyLXJhZGl1czowO21hcmdpbi1yaWdodDoxMHB4O2ZvbnQtc2l6ZToxNHB4fSNlZGl0IC5jb250ZW50LWNvbnRhaW5lciAuY29udGVudC1saXN0IHVsIC5jb250ZW50X29wdGlvbnMgYnV0dG9uIC5nbHlwaGljb257Zm9udC1zaXplOjE3cHh9I2VkaXQgLmNvbnRlbnQtY29udGFpbmVyIC5jb250ZW50LWxpc3QgdWwgLmNvbnRlbnRfb3B0aW9ucyBidXR0b24gc3BhbnttYXJnaW4tcmlnaHQ6MTBweDtkaXNwbGF5OmlubGluZS1ibG9ja31cIjtpZiAoc3R5bGUuc3R5bGVTaGVldCl7IHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzczsgfSBlbHNlIHsgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7IH0gaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7fSgpKSIsIi8qIEhlbHBlciBmdW5jdGlvbiByZXR1cm5zIGxlc3MgdmFyaWFibGVzIGZvciBhIHNlbGVjdG9yICovXHJcbmZ1bmN0aW9uIGxvYWRMZXNzVmFyaWFibGVzRm9yKHNlbGVjdG9yKXtcclxuXHR2YXIgb0xlc3MgPSB7fTtcclxuXHQkLmVhY2goZG9jdW1lbnQuc3R5bGVTaGVldHMsZnVuY3Rpb24oaSxzaGVldCl7XHJcblx0XHQkLmVhY2goc2hlZXQuY3NzUnVsZXMsZnVuY3Rpb24oaSxydWxlKXtcclxuXHRcdFx0dmFyIHNSdWxlID0gcnVsZS5jc3NUZXh0O1xyXG5cdFx0XHRpZiAoc1J1bGUuc3Vic3RyKDAsNSk9PXNlbGVjdG9yKSB7XHJcblx0XHRcdFx0dmFyIGFLZXkgPSBzUnVsZS5tYXRjaCgvXFwuKFxcdyspLyk7XHJcblx0XHRcdFx0dmFyIGFWYWwgPSBzUnVsZS5tYXRjaCgvKFxcZCspLyk7XHJcblx0XHRcdFx0aWYgKGFLZXkmJmFWYWwpIG9MZXNzW2FLZXlbMV1dID0gYVZhbFswXTw8MDtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblx0Y29uc29sZS5sb2cob0xlc3MpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRsb2FkTGVzc1ZhcmlhYmxlc0ZvcjogbG9hZExlc3NWYXJpYWJsZXNGb3JcclxufSIsInZhciBCYWNrYm9uZSA9IHJlcXVpcmUoXCJiYWNrYm9uZVwiKTtcclxudmFyIF8gPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKTtcclxucmVxdWlyZShcInRyYXNoLmxlc3NcIik7XHJcbnZhciB2aWV3X21vZGVsO1xyXG52YXIgTG9hZEhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvTG9hZEhlbHBlclwiKTtcclxudmFyIERPTUhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvRE9NSGVscGVyXCIpO1xyXG52YXIgUHJldmlld2VyVmlld3MgPSByZXF1aXJlKFwiZWRpdF9jaGFubmVsL3ByZXZpZXdlci92aWV3c1wiKTtcclxuXHJcbi8qIFRvZG86IGZpZ3VyZSBvdXQgaG93IHRvIGRpc3BsYXkgYXJjaGl2ZWQgZmlsZXMgYWZ0ZXIgZGVsZXRlZCAqL1xyXG52YXIgVHJhc2hWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG5cdHRlbXBsYXRlOiByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy90cmFzaC5oYW5kbGViYXJzXCIpLFxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0Xy5iaW5kQWxsKHRoaXMsICdkZWxldGVfc2VsZWN0ZWQnLCAncmVzdG9yZV9zZWxlY3RlZCcsJ3NlbGVjdF9hbGwnLCd0b2dnbGVfZmlsZV9pdGVtJywncHJldmlld19saXN0X2l0ZW0nLCdjaGVja19pdGVtJywndG9nZ2xlX2ZvbGRlcl9pdGVtJyk7XHJcblx0XHQvL3RoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6bnVtYmVyX29mX2hleGFnb25zXCIsIHRoaXMucmVuZGVyKTtcclxuXHRcdHRoaXMudmlld19tb2RlbCA9IHRoaXMubW9kZWw7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH0sXHJcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLm1vZGVsKSk7XHJcblx0XHR2YXIgZm9sZGVyX3RlbXBsYXRlID0gcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvdHJhc2hfY29sbGFwc2VkLmhhbmRsZWJhcnNcIik7XHJcblx0XHR2YXIgZmlsZV90ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL3RyYXNoX2NvbGxhcHNlZC5oYW5kbGViYXJzXCIpO1xyXG5cdFx0JChcIi50cmFzaF9saXN0X2NvbnRhaW5lciB1bFwiKS5lbXB0eSgpO1xyXG5cdFx0dmFyIGluZGV4ID0gTG9hZEhlbHBlci5sb2FkTGlzdCh0aGlzLm1vZGVsLnRvcGljLnJvb3Rfbm9kZSwgdGhpcy52aWV3X21vZGVsLCBmb2xkZXJfdGVtcGxhdGUsIGZpbGVfdGVtcGxhdGUsIFwiLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsXCIsIDUwLCBudWxsLCAwLCAwKTtcclxuXHRcdGlmKGluZGV4ID09IDApICQoXCIjdHJhc2hfbGlzdFwiKS5hcHBlbmQoXCI8aDUgY2xhc3M9XFxcImRlZmF1bHQtaXRlbVxcXCI+Tm8gY29udGVudCBmb3VuZC48L2g1PlwiKTtcclxuXHR9LFxyXG5cdFxyXG5cdGV2ZW50czoge1xyXG5cdFx0J2NsaWNrICNkZWxldGUtc2VsZWN0ZWQtYnV0dG9uJzogJ2RlbGV0ZV9zZWxlY3RlZCcsXHJcblx0XHQnY2xpY2sgI3Jlc3RvcmUtc2VsZWN0ZWQtYnV0dG9uJzogJ3Jlc3RvcmVfc2VsZWN0ZWQnLFxyXG5cdFx0J2NsaWNrICNzZWxlY3RfYWxsJzogJ3NlbGVjdF9hbGwnLFxyXG5cdFx0J2NsaWNrIC50b2dfZmlsZSc6ICd0b2dnbGVfZmlsZV9pdGVtJyxcclxuXHRcdCdjbGljayAudG9nX2ZvbGRlcic6ICd0b2dnbGVfZm9sZGVyX2l0ZW0nLFxyXG5cdFx0J2NsaWNrIC5wcmV2JzogJ3ByZXZpZXdfbGlzdF9pdGVtJyxcclxuXHRcdCdjaGFuZ2UgI3RyYXNoIFt0eXBlPWNoZWNrYm94XScgOiAnY2hlY2tfaXRlbSdcclxuXHR9LFxyXG5cdGRlbGV0ZV9zZWxlY3RlZDogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0aWYoY29uZmlybShcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhlIHNlbGVjdGVkIGZpbGVzP1wiKSl7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiRGVsZXRpbmcgU2VsZWN0ZWQuLi4gXCIpO1xyXG5cdFx0XHR2YXIgc2VsZWN0ZWQgPSAkKCcudHJhc2hfbGlzdF9jb250YWluZXInKS5maW5kKCdpbnB1dDpjaGVja2VkICsgbGFiZWwnKTtcclxuXHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IHNlbGVjdGVkLmxlbmd0aDsgaSsrKXtcclxuXHRcdFx0XHRzZWxlY3RlZFtpXS5wYXJlbnROb2RlLnJlbW92ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRyZXN0b3JlX3NlbGVjdGVkOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRjb25zb2xlLmxvZyhcIlJlc3RvcmluZyBTZWxlY3RlZC4uLiBcIik7XHJcblx0XHR2YXIgc2VsZWN0ZWQgPSAkKCcudHJhc2hfbGlzdF9jb250YWluZXInKS5maW5kKCdpbnB1dDpjaGVja2VkICsgbGFiZWwnKTtcclxuXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBzZWxlY3RlZC5sZW5ndGg7IGkrKyl7XHJcblx0XHRcdHNlbGVjdGVkW2ldLnBhcmVudE5vZGUucmVtb3ZlKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHRcclxuXHRzZWxlY3RfYWxsOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRpZihldmVudC50YXJnZXQuY2hlY2tlZCl7XHJcblx0XHRcdCQoXCIuc2VsZWN0X2FsbF9zcGFuIC5zaWRlYmFyXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJpbmxpbmUtYmxvY2tcIik7XHJcblx0XHRcdCQoXCIuc2VsZWN0X2FsbF9zcGFuXCIpLmNzcyhcImJhY2tncm91bmQtY29sb3JcIiwgXCIjRTZFNkU2XCIpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdCQoXCIuc2VsZWN0X2FsbF9zcGFuIC5zaWRlYmFyXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xyXG5cdFx0XHQkKFwiLnNlbGVjdF9hbGxfc3BhblwiKS5jc3MoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwidHJhbnNwYXJlbnRcIik7XHJcblx0XHR9XHJcblx0XHR2YXIgc2VsZWN0ZWQgPSAkKCcudHJhc2hfbGlzdF9jb250YWluZXInKS5maW5kKCdpbnB1dFt0eXBlPWNoZWNrYm94XScpO1xyXG5cdFx0Zm9yKHZhciBpID0gMDsgaSA8IHNlbGVjdGVkLmxlbmd0aDsgaSsrKXtcclxuXHRcdFx0c2VsZWN0ZWRbaV0uY2hlY2tlZCA9IGV2ZW50LnRhcmdldC5jaGVja2VkO1xyXG5cdFx0XHRjaGVja0l0ZW0oXCIjXCIgKyBzZWxlY3RlZFtpXS5wYXJlbnROb2RlLmlkLCBldmVudC50YXJnZXQuY2hlY2tlZCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHR0b2dnbGVfZm9sZGVyX2l0ZW06IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHR2YXIgZWwgPSBcIiNcIiArIERPTUhlbHBlci5nZXRQYXJlbnRPZlRhZyhldmVudC50YXJnZXQsIFwibGlcIikuaWQ7XHJcblx0XHRpZigkKGVsKS5kYXRhKFwiY29sbGFwc2VkXCIpKXtcclxuXHRcdFx0JChlbCArIFwiX3N1YlwiKS5zbGlkZURvd24oKTtcclxuXHRcdFx0JChlbCtcIiAuZ2x5cGhpY29uLWNoZXZyb24tcmlnaHRcIikuYXR0cihcImNsYXNzXCIsIFwidG9nX2ZvbGRlciBnbHlwaGljb24gZ2x5cGhpY29uLWNoZXZyb24tZG93blwiKTtcclxuXHRcdFx0JChlbCkuZGF0YShcImNvbGxhcHNlZFwiLCBmYWxzZSk7XHJcblx0XHR9XHJcblx0XHRlbHNle1xyXG5cdFx0XHQkKGVsICsgXCJfc3ViXCIpLnNsaWRlVXAoKTtcclxuXHRcdFx0JChlbCkuZGF0YShcImNvbGxhcHNlZFwiLCB0cnVlKTtcclxuXHRcdFx0JChlbCtcIiAuZ2x5cGhpY29uLWNoZXZyb24tZG93blwiKS5hdHRyKFwiY2xhc3NcIiwgXCJ0b2dfZm9sZGVyIGdseXBoaWNvbiBnbHlwaGljb24tY2hldnJvbi1yaWdodFwiKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdHRvZ2dsZV9maWxlX2l0ZW06IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHR2YXIgZWwgPSBcIiNcIiArIERPTUhlbHBlci5nZXRQYXJlbnRPZlRhZyhldmVudC50YXJnZXQsIFwibGlcIikuaWQ7XHJcblx0XHRpZigkKGVsKS5kYXRhKFwiY29sbGFwc2VkXCIpKXtcclxuXHRcdFx0JChlbCkuZGF0YShcImNvbGxhcHNlZFwiLCBmYWxzZSk7XHJcblx0XHRcdCQoZWwgKyBcIiAuZGV0YWlsc1wiKS5zbGlkZURvd24oKTtcclxuXHRcdFx0JChlbCtcIiAuZ2x5cGhpY29uLWNoZXZyb24tcmlnaHRcIikuYXR0cihcImNsYXNzXCIsIFwidG9nX2ZpbGUgZ2x5cGhpY29uIGdseXBoaWNvbi1jaGV2cm9uLWRvd25cIik7XHJcblx0XHRcdCQoZWwpLmNzcyhcImhlaWdodFwiLCBcIjMwMHB4XCIpO1xyXG5cdFx0XHR2YXIgdGV4dEhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvVGV4dEhlbHBlclwiKTtcclxuXHRcdFx0JChlbCArIFwiICNib3R0b20tcmlnaHQgcFwiKS5odG1sKHRleHRIZWxwZXIudHJpbVRleHQoJChlbCArIFwiICNib3R0b20tcmlnaHQgcFwiKS50ZXh0KCksIFwiLi4uXCIsIDEwMCwgZmFsc2UpKTtcclxuXHJcblx0XHRcdFxyXG5cdFx0XHRpZigkKGVsK1wiIGlucHV0W3R5cGU9Y2hlY2tib3hdXCIpLnByb3AoXCJjaGVja2VkXCIpID09IGZhbHNlKVxyXG5cdFx0XHRcdCQoZWwgKyBcIiAuZGV0YWlsLWJhclwiKS5jc3Moe1wiaGVpZ2h0XCIgOiAkKGVsKS5oZWlnaHQoKSwgXCJkaXNwbGF5XCIgOiBcImlubGluZVwifSk7XHJcblx0XHRcdGVsc2V7XHJcblx0XHRcdFx0JChlbCArIFwiIC5zaWRlYmFyXCIpLmNzcyhcImhlaWdodFwiLCAkKGVsKS5oZWlnaHQoKSk7XHJcblx0XHRcdFx0JChlbCArIFwiIC5wcmV2XCIpLmNzcyhcImNvbG9yXCIsIFwiYmxhY2tcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdCQoZWwpLmRhdGEoXCJjb2xsYXBzZWRcIiwgdHJ1ZSk7XHJcblx0XHRcdCQoZWwrXCIgLmdseXBoaWNvbi1jaGV2cm9uLWRvd25cIikuYXR0cihcImNsYXNzXCIsIFwidG9nX2ZpbGUgZ2x5cGhpY29uIGdseXBoaWNvbi1jaGV2cm9uLXJpZ2h0XCIpO1xyXG5cdFx0XHQkKGVsICsgXCIgLmRldGFpbHNcIikuc2xpZGVVcCgpO1xyXG5cdFx0XHQkKGVsICsgXCIgLmRldGFpbC1iYXJcIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XHJcblx0XHRcdCQoZWwpLmNzcyhcImhlaWdodFwiLCBcIjUwcHhcIik7XHJcblx0XHRcdCQoZWwgKyBcIiAuc2lkZWJhclwiKS5jc3MoXCJoZWlnaHRcIiwgJChlbCkuaGVpZ2h0KCkpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0cHJldmlld19saXN0X2l0ZW06IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHR2YXIgZmlsZSA9ICQoXCIjXCIrIERPTUhlbHBlci5nZXRQYXJlbnRPZlRhZyhldmVudC50YXJnZXQsIFwibGlcIikuaWQpO1xyXG5cdFx0dmFyIHZpZXcgPSBuZXcgUHJldmlld2VyVmlld3MuUHJldmlld2VyVmlldyh7XHJcblx0XHRcdGVsOiAkKFwiI3ByZXZpZXdlci1hcmVhXCIpLFxyXG5cdFx0XHRtb2RlbDogZmlsZS5kYXRhKFwiZGF0YVwiKSxcclxuXHRcdFx0ZmlsZTogZmlsZVxyXG5cdFx0fSk7XHJcblx0XHR2YXIgYWRkb25fdGVtcGxhdGUgPSByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy90cmFzaF9wcmV2aWV3X2FkZF9vbi5oYW5kbGViYXJzXCIpO1xyXG5cdFx0JChcIiNwcmV2aWV3ZXJcIikuYXBwZW5kKGFkZG9uX3RlbXBsYXRlKCkpO1xyXG5cdH0sXHJcblx0Y2hlY2tfaXRlbTogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0aWYoZXZlbnQudGFyZ2V0LnBhcmVudE5vZGUubm9kZU5hbWUgIT0gXCJESVZcIilcclxuXHRcdFx0Y2hlY2tJdGVtKFwiI1wiICsgZXZlbnQudGFyZ2V0LnBhcmVudE5vZGUuaWQsIGV2ZW50LnRhcmdldC5jaGVja2VkKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY2hlY2tJdGVtKGVsLCBjaGVja2VkKXtcclxuXHRpZihjaGVja2VkKXtcclxuXHRcdCQoZWwgKyBcIiAuc2lkZWJhclwiKS5jc3MoXCJoZWlnaHRcIiwgJChlbCkuaGVpZ2h0KCkpO1xyXG5cdFx0JChlbCArIFwiIC5zaWRlYmFyXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJpbmxpbmUtYmxvY2tcIik7XHJcblx0XHQkKGVsICsgXCIgLmRldGFpbC1iYXJcIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XHJcblx0XHQkKGVsKS5jc3MoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI0U2RTZFNlwiKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQkKGVsICsgXCIgLnNpZGViYXJcIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XHJcblx0XHQkKGVsKS5jc3MoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwidHJhbnNwYXJlbnRcIik7XHJcblx0XHRpZighJChlbCkuZGF0YShcImNvbGxhcHNlZFwiKSl7XHJcblx0XHRcdCQoZWwgKyBcIiAuZGV0YWlsLWJhclwiKS5jc3MoXCJoZWlnaHRcIiwgJChlbCkuaGVpZ2h0KCkpO1xyXG5cdFx0XHQkKGVsICsgXCIgLmRldGFpbC1iYXJcIikuY3NzKFwiZGlzcGxheVwiLCBcImlubGluZVwiKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdFRyYXNoVmlldzogVHJhc2hWaWV3XHJcbn0iLCIoZnVuY3Rpb24oKSB7IHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTsgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTsgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7dmFyIGNzcyA9IFwiQGZvbnR7Zm9udC1mYW1pbHk6XFxcIk9wZW4gU2Fuc1xcXCI7c3JjOnVybChcXFwiLi4vZm9udHMvT3BlblNhbnMtUmVndWxhci50dGZcXFwiKSBmb3JtYXQoXFxcInRydWV0eXBlXFxcIil9LmlubGluZS1ibG9ja3tkaXNwbGF5OmlubGluZS1ibG9ja31ib2R5e2JhY2tncm91bmQ6IzI5MmEyYn1he3RleHQtZGVjb3JhdGlvbjpub25lO2N1cnNvcjpwb2ludGVyO2NvbG9yOmJsYWNrfSN0cmFzaHttaW4taGVpZ2h0OjQwMHB4fSN0cmFzaCBoM3t3aWR0aDo2MzMuMzMzMzMzMzNweDtmb250LXNpemU6MThweDtjb2xvcjp3aGl0ZX0jdHJhc2ggbmF2e21hcmdpbi1ib3R0b206MjBweH0jdHJhc2ggbmF2IGF7aGVpZ2h0OjQwcHg7d2lkdGg6MTAwcHg7Ym9yZGVyOjNweCBzb2xpZCAjYTRhYWIwO3BhZGRpbmc6NXB4O2JhY2tncm91bmQtY29sb3I6IzNlNWU5Zjtjb2xvcjp3aGl0ZTtmb250LXNpemU6MTdweDttYXJnaW4tbGVmdDoxMHB4fSN0cmFzaCBuYXYgYSAuZ2x5cGhpY29ue2hlaWdodDoyNXB4O3dpZHRoOmF1dG87bWFyZ2luOjAgN3B4fSN0cmFzaCBpbnB1dFt0eXBlPWNoZWNrYm94XXtkaXNwbGF5OmlubGluZS1ibG9jazt3aWR0aDoyMHB4O2hlaWdodDoyMHB4O2N1cnNvcjpwb2ludGVyO21hcmdpbi1sZWZ0OjEwcHg7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDo1O3ZlcnRpY2FsLWFsaWduOm1pZGRsZX0jdHJhc2ggI3RyYXNoX2JhY2tncm91bmR7cG9zaXRpb246YWJzb2x1dGU7YmFja2dyb3VuZC1jb2xvcjp3aGl0ZTtib3JkZXI6NHB4IHNvbGlkICM4MDk4ZDI7d2lkdGg6OTUwcHg7aGVpZ2h0OjU3MHB4O3otaW5kZXg6LTEwMH0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYXttaW4taGVpZ2h0OjQwMHB4O3dpZHRoOjk3MHB4O2hlaWdodDo1NzBweDt6LWluZGV4Oi0yMH0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYSBoMXttYXJnaW46MDtwYWRkaW5nLWxlZnQ6MTBweDtoZWlnaHQ6NTBweDt6LWluZGV4OjEwMDtiYWNrZ3JvdW5kLWNvbG9yOiM4MDk4ZDI7d2lkdGg6OTUwcHg7Y29sb3I6d2hpdGV9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLmRlZmF1bHQtaXRlbXtmb250LXN0eWxlOml0YWxpYzttYXJnaW4tbGVmdDozMHB4O21hcmdpbi1sZWZ0OjM4cHg7Zm9udC1zaXplOjIwcHh9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgY2FudmFze3dpZHRoOjQycHg7aGVpZ2h0OjU3MHB4O2JvcmRlci1ib3R0b206NHB4IHNvbGlkICM4MDk4ZDI7Ym9yZGVyLWxlZnQ6NHB4IHNvbGlkICM4MDk4ZDI7bWluLWhlaWdodDo0MDBweDtiYWNrZ3JvdW5kLWNvbG9yOiNjY2M7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDotMTB9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnNlbGVjdF9hbGxfc3Bhbntib3JkZXItYm90dG9tOjFweCBzb2xpZCAjY2NjO3dpZHRoOjk1MHB4O3Bvc2l0aW9uOnJlbGF0aXZlO2hlaWdodDozMy4zMzMzMzMzM3B4O3otaW5kZXg6MTAwfSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC5zZWxlY3RfYWxsX3NwYW4gbGFiZWx7bWFyZ2luLWxlZnQ6MTBweDtmb250LXNpemU6MTdweDtwYWRkaW5nOjVweDtjdXJzb3I6cG9pbnRlcjt3aWR0aDo4MDhweH0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYSAuc2VsZWN0X2FsbF9zcGFuIC5zaWRlYmFye2hlaWdodDozMy4zMzMzMzMzM3B4fSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC5zaWRlYmFyLCN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC5kZXRhaWwtYmFye2Rpc3BsYXk6bm9uZTtiYWNrZ3JvdW5kLWNvbG9yOiM4ZGE5ZGI7d2lkdGg6NDJweDttYXJnaW46MDtib3JkZXItcmlnaHQ6NHB4IHNvbGlkICMyZDhlY2I7ei1pbmRleDoyO3Bvc2l0aW9uOmFic29sdXRlfSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lcntvdmVyZmxvdzphdXRvO2hlaWdodDo0ODBweDt3aWR0aDoxMDAlfSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lciAuc3ViZGlyZWN0b3J5e2Rpc3BsYXk6bm9uZX0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYSAudHJhc2hfbGlzdF9jb250YWluZXIgdWx7cG9zaXRpb246cmVsYXRpdmU7Zm9udC1zaXplOjE4cHh9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIHNwYW57ZGlzcGxheTpub25lfSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lciB1bCBzcGFuIGxhYmVse2ZvbnQtc2l6ZToyMHB4O2ZvbnQtd2VpZ2h0OmJvbGR9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxpe2JvcmRlci1yaWdodDo0cHggc29saWQgIzgwOThkMjt3aWR0aDo5NTBweDtoZWlnaHQ6NTBweH0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYSAudHJhc2hfbGlzdF9jb250YWluZXIgdWwgLmdseXBoaWNvbntmb250LXNpemU6MThweDtkaXNwbGF5OmlubGluZS1ibG9jazttYXJnaW4tbGVmdDoxMHB4fSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lciB1bCBsYWJlbHtmb250LXdlaWdodDpub3JtYWw7aGVpZ2h0OjEwMCU7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6ODkzcHg7dmVydGljYWwtYWxpZ246bWlkZGxlO3BhZGRpbmctbGVmdDo1cHg7cGFkZGluZy1yaWdodDoxMHB4O3otaW5kZXg6NTtib3JkZXI6MXB4IHNvbGlkICNjY2N9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxhYmVsIGg1e2ZvbnQtc2l6ZToxNXB4O2ZvbnQtd2VpZ2h0OmJvbGR9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxhYmVsIGF7dGV4dC1kZWNvcmF0aW9uOm5vbmU7Y29sb3I6YmxhY2t9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxhYmVsIHB7Zm9udC1zdHlsZTppdGFsaWM7Zm9udC1zaXplOjE0cHg7d2lkdGg6OTAlfSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lciB1bCBsYWJlbCAuZGV0YWlsc3tkaXNwbGF5Om5vbmU7d2lkdGg6OTAlO2hlaWdodDoyNTBweH0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYSAudHJhc2hfbGlzdF9jb250YWluZXIgdWwgbGFiZWwgLmRldGFpbHMgLnJvdy1mbHVpZDpmaXJzdC1jaGlsZHtib3JkZXItYm90dG9tOjFweCBkb3R0ZWQgZ3JheX0jdHJhc2ggI3RyYXNoX2NvbnRlbnRfYXJlYSAudHJhc2hfbGlzdF9jb250YWluZXIgdWwgbGFiZWwgLmRldGFpbHMgLnJvdy1mbHVpZCBkaXZ7ZGlzcGxheTppbmxpbmUtYmxvY2s7d2lkdGg6NDUlO2ZvbnQtc2l6ZToxNXB4O2hlaWdodDoxMDBweDtwYWRkaW5nOjEwcHh9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxhYmVsIC5kZXRhaWxzICN0b3AtcmlnaHQsI3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxhYmVsIC5kZXRhaWxzICNib3R0b20tcmlnaHR7Ym9yZGVyLWxlZnQ6MXB4IGRvdHRlZCBncmF5fSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lciB1bCBsaSBpbnB1dFt0eXBlPWNoZWNrYm94XTpjaGVja2VkK2xhYmVsIHNwYW4sI3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIGxpOmhvdmVyIHNwYW57ZGlzcGxheTppbmxpbmUtYmxvY2t9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIC5wcmV2e3JpZ2h0Oi4xZW07Y3Vyc29yOnBvaW50ZXI7bWFyZ2luLXRvcDoxMHB4O3otaW5kZXg6MTB9I3RyYXNoICN0cmFzaF9jb250ZW50X2FyZWEgLnRyYXNoX2xpc3RfY29udGFpbmVyIHVsIC5kZXRhaWwtYmFye3JpZ2h0OjVweDt3aWR0aDo1MnB4fSN0cmFzaCAjdHJhc2hfY29udGVudF9hcmVhIC50cmFzaF9saXN0X2NvbnRhaW5lciB1bCAuaXRlbS1kZXRhaWxze2hlaWdodDoyNTBweH1cIjtpZiAoc3R5bGUuc3R5bGVTaGVldCl7IHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzczsgfSBlbHNlIHsgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7IH0gaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7fSgpKSIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8ZGl2IGlkPVxcXCJ0cmFzaF9wcmV2aWV3X2FkZF9vblxcXCI+XFxyXFxuXHQ8YSBjbGFzcyA9IFxcXCJidG4gYnRuLWRlZmF1bHQgcHVsbC1sZWZ0XFxcIj5SZXN0b3JlPC9hPlxcclxcblx0PGEgY2xhc3MgPSBcXFwiYnRuIGJ0bi1kZWZhdWx0IHB1bGwtcmlnaHRcXFwiPkRlbGV0ZTwvYT5cXHJcXG48L2Rpdj5cIjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCI8c3BhbiBjbGFzcz1cXFwiZGV0YWlsLWJhciBwdWxsLXJpZ2h0XFxcIj48L3NwYW4+XCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCI8c3BhbiBjbGFzcz1cXFwidG9nX2ZvbGRlciBnbHlwaGljb24gZ2x5cGhpY29uLWNoZXZyb24tcmlnaHRcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuXHRcdFx0XCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXHJcXG5cdFx0XHRcdDxzcGFuIGNsYXNzPVxcXCJwcmV2IGdseXBoaWNvbiBnbHlwaGljb24tc2VhcmNoXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcblx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcInRvZ19maWxlIGdseXBoaWNvbiBnbHlwaGljb24tY2hldnJvbi1yaWdodFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxyXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZGV0YWlscyBjb250YWluZXJcXFwiPlxcclxcblx0XHRcdFx0PGRpdiBjbGFzcz1cXFwicm93LWZsdWlkXFxcIj5cXHJcXG5cdFx0XHRcdFx0PGRpdiBpZD1cXFwidG9wLWxlZnRcXFwiPlxcclxcblx0XHRcdFx0XHRcdDxoNT5BdXRob3I8L2g1Plxcclxcblx0XHRcdFx0XHRcdDxwPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmZpbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmF1dGhvciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxyXFxuXHRcdFx0XHRcdDwvZGl2Plxcclxcblx0XHRcdFx0XHQ8ZGl2IGlkPVxcXCJ0b3AtcmlnaHRcXFwiPlxcclxcblx0XHRcdFx0XHRcdDxoNT5UYWdzPC9oNT5cXHJcXG5cdFx0XHRcdFx0XHQ8cD5cIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC50YWcpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxlbmd0aCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDE1LCBwcm9ncmFtMTUsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXHJcXG5cdFx0XHRcdFx0PC9kaXY+XFxyXFxuXHRcdFx0XHQ8L2Rpdj5cXHJcXG5cdFx0XHRcdDxkaXYgY2xhc3M9XFxcInJvdy1mbHVpZFxcXCI+XFxyXFxuXHRcdFx0XHRcdDxkaXYgaWQ9XFxcImJvdHRvbS1sZWZ0XFxcIj5cXHJcXG5cdFx0XHRcdFx0XHQ8aDU+TGljZW5zZTwvaDU+XFxyXFxuXHRcdFx0XHRcdFx0PHA+XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5saWNlbnNlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5uYW1lKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMTksIHByb2dyYW0xOSwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDE3LCBwcm9ncmFtMTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcclxcblx0XHRcdFx0XHQ8L2Rpdj5cXHJcXG5cdFx0XHRcdFx0PGRpdiBpZD1cXFwiYm90dG9tLXJpZ2h0XFxcIj5cXHJcXG5cdFx0XHRcdFx0XHQ8aDU+RGVzY3JpcHRpb248L2g1Plxcclxcblx0XHRcdFx0XHRcdDxwPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmZpbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmRlc2NyaXB0aW9uKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMjMsIHByb2dyYW0yMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDIxLCBwcm9ncmFtMjEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcclxcblx0XHRcdFx0XHQ8L2Rpdj5cXHJcXG5cdFx0XHRcdDwvZGl2Plxcclxcblx0XHRcdDwvZGl2Plxcclxcblx0XHRcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5hdXRob3IpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIk5vIGF1dGhvcnMgZm91bmQuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLnRhZyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyByZXR1cm4gc3RhY2sxOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICByZXR1cm4gZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAudGFnKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5uYW1lKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKTtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJObyB0YWdzIGZvdW5kLlwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMTtcbiAgcmV0dXJuIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuZmlsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGljZW5zZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSk7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE5KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiTm8gbGljZW5zZSBmb3VuZC5cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kZXNjcmlwdGlvbikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSk7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiTm8gZGVzY3JpcHRpb24gZm91bmQuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXI7XG4gIGJ1ZmZlciArPSBcIjx1bCBpZD1cXFwiaXRlbV9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiX3N1YlxcXCIgY2xhc3M9XFxcImxpc3QtdW5zdHlsZWQgc3ViZGlyZWN0b3J5XFxcIj48L3VsPlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGxpIGlkPVxcXCJpdGVtX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcclxcblx0PHNwYW4gY2xhc3M9XFxcInNpZGViYXIgcHVsbC1sZWZ0XFxcIj48L3NwYW4+XFxyXFxuXHQ8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJmaWxlX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPjwvaW5wdXQ+XFxyXFxuXHQ8bGFiZWwgIGZvcj1cXFwiZmlsZV9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwidHJhc2hfaXRlbVxcXCI+XFxyXFxuXHRcdFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLnVubGVzcy5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZm9sZGVyKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0XHQ8aDQ+XFxyXFxuXHRcdFx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmZvbGRlciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxyXFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmZpbGVfaWNvbikgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlX2ljb24pOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcblx0XHRcdFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxyXFxuXHRcdDwvaDQ+XFxyXFxuXHRcdFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLnVubGVzcy5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZm9sZGVyKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0PC9sYWJlbD5cXHJcXG48L2xpPlxcclxcblxcclxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5mb2xkZXIpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjUsIHByb2dyYW0yNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICByZXR1cm4gYnVmZmVyO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8ZGl2IGlkPVxcXCJ0cmFzaFxcXCIgY2xhc3M9XFxcImNvbnRhaW5lci1mbHVpZFxcXCI+XFxyXFxuXHQ8aDM+VHJhc2ggY29udGFpbnMgY29udGVudCB5b3UndmUgcmVtb3ZlZCBmcm9tIHlvdXIgY291cnNlLiBDaG9vc2UgdG8gcmVzdG9yZSB0aGVtIG9yIGRlbGV0ZSB0aGVtIHBlcm1hbmVudGx5LjwvaDM+XFxyXFxuXHQ8bmF2IGlkPVxcXCJidXR0b25fYmFyXFxcIiBjbGFzcz1cXFwiY29sLW0tMlxcXCI+XFxyXFxuXHRcdDxhIGlkPVxcXCJyZXN0b3JlLXNlbGVjdGVkLWJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBkZWxldGVcXFwiPlJlc3RvcmU8L2E+XFxyXFxuXHRcdDxhIGlkPVxcXCJkZWxldGUtc2VsZWN0ZWQtYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGNvcHlcXFwiPkRlbGV0ZTwvYT5cXHJcXG5cdDwvbmF2Plxcclxcblx0XFxyXFxuXHQ8ZGl2IGlkPVxcXCJ0cmFzaF9jb250ZW50X2FyZWFcXFwiPlxcclxcblx0XHQ8ZGl2IGlkPVxcXCJ0cmFzaF9iYWNrZ3JvdW5kXFxcIj48L2Rpdj5cXHJcXG5cdFx0PGNhbnZhcyBjbGFzcz1cXFwicHVsbC1sZWZ0XFxcIj48L2NhbnZhcz5cXHJcXG5cdFx0PGgxPlRyYXNoPC9oMT5cXHJcXG5cdFx0PGRpdiBjbGFzcz1cXFwic2VsZWN0X2FsbF9zcGFuXFxcIj5cXHJcXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwic2lkZWJhciBwdWxsLWxlZnRcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJzZWxlY3RfYWxsXFxcIi8+PGxhYmVsIGZvcj1cXFwic2VsZWN0X2FsbFxcXCI+U2VsZWN0IGFsbDwvbGFiZWw+XFxyXFxuXHRcdDwvZGl2Plxcclxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ0cmFzaF9saXN0X2NvbnRhaW5lclxcXCI+XFxyXFxuXHRcdFx0PHVsIGNsYXNzPVxcXCJsaXN0LXVuc3R5bGVkXFxcIj5cXHJcXG5cdFx0XHQ8L3VsPlxcclxcblx0XHQ8L2Rpdj5cXHJcXG5cdDwvZGl2PlxcclxcbjwvZGl2PlwiO1xuICB9KTtcbiIsInZhciBCYWNrYm9uZSA9IHJlcXVpcmUoXCJiYWNrYm9uZVwiKTtcclxudmFyIF89IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xyXG5cclxuLyogVE9ETzogQ0hBTkdFIFRPIENoYW5uZWxFZGl0RGF0YU1vZGVsLkVYVEVORCAqL1xyXG52YXIgVG9waWNOb2RlTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xyXG5cdHVybFJvb3Q6ICcvYXBpL3RvcGljcy8nLFxyXG5cdGRlZmF1bHRzOiB7XHJcbiAgICAgICAgY29sb3IxOlwiXCIsXHJcblx0XHRjb2xvcjI6XCJcIixcclxuXHRcdGNvbG9yMzpcIlwiLFxyXG5cdFx0dGl0bGU6XCJVbnRpdGxlZFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246XCJUaGlzIGlzIHRoZSBkZXNjcmlwdGlvbiBnZW5lcmF0ZWQgYnkgZGVmYXVsdFwiXHJcbiAgICB9XHJcbn0pO1xyXG5cclxudmFyIFRvcGljVHJlZU1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcclxuXHR1cmxSb290OiAnL2FwaS90b3BpY3RyZWUvJyxcclxuXHRkZWZhdWx0czoge1xyXG5cdFx0bmFtZTogXCJVbnRpdGxlZCBUcmVlXCIsXHJcblx0XHRpc19wdWJsaXNoZWQ6IGZhbHNlXHJcblx0fVxyXG59KTtcclxuXHJcbnZhciBDb250ZW50Tm9kZU1vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcclxuXHR1cmxSb290OiAnL2FwaS9jb250ZW50LycsXHJcblx0ZGVmYXVsdHM6IHtcclxuXHRcdHRpdGxlOiBcIlVudGl0bGVkIENvbnRlbnRcIixcclxuXHRcdGF1dGhvcjogXCJBbm9ueW1vdXNcIixcclxuXHRcdGxpY2Vuc2Vfb3duZXI6IFwiTm8gbGljZW5zZSBmb3VuZFwiLFxyXG5cdFx0ZGVzY3JpcHRpb246XCJUaGlzIGlzIHRoZSBkZXNjcmlwdGlvbiBnZW5lcmF0ZWQgYnkgZGVmYXVsdFwiXHJcbiAgICB9XHJcbn0pO1xyXG5cclxudmFyIENoYW5uZWxNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XHJcblx0dXJsUm9vdDogJy9hcGkvY2hhbm5lbC8nLFxyXG5cdGRlZmF1bHRzOiB7XHJcblx0XHR0aXRsZTogXCJVbnRpdGxlZCBDb250ZW50XCIsXHJcblx0XHRhdXRob3I6IFwiQW5vbnltb3VzXCIsXHJcblx0XHRsaWNlbnNlX293bmVyOiBcIk5vIGxpY2Vuc2UgZm91bmRcIixcclxuXHRcdGRlc2NyaXB0aW9uOlwiVGhpcyBpcyB0aGUgZGVzY3JpcHRpb24gZ2VuZXJhdGVkIGJ5IGRlZmF1bHRcIlxyXG4gICAgfVxyXG59KTtcclxuXHJcbnZhciBUb3BpY05vZGVDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xyXG5cdHVybFJvb3Q6ICcvYXBpL3RvcGljcy8nLFxyXG5cdG1vZGVsOiBUb3BpY05vZGVNb2RlbFxyXG59KTtcclxuXHJcbnZhciBDb250ZW50Tm9kZUNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XHJcblx0dXJsUm9vdDogJy9hcGkvY29udGVudC8nLFxyXG5cdG1vZGVsOiBDb250ZW50Tm9kZU1vZGVsXHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0VG9waWNOb2RlTW9kZWw6IFRvcGljTm9kZU1vZGVsLFxyXG5cdFRvcGljTm9kZUNvbGxlY3Rpb246IFRvcGljTm9kZUNvbGxlY3Rpb24sXHJcblx0Q2hhbm5lbE1vZGVsOiBDaGFubmVsTW9kZWwsXHJcblx0VG9waWNUcmVlTW9kZWw6VG9waWNUcmVlTW9kZWwsXHJcblx0Q29udGVudE5vZGVNb2RlbDogQ29udGVudE5vZGVNb2RlbCxcclxuXHRDb250ZW50Tm9kZUNvbGxlY3Rpb246IENvbnRlbnROb2RlQ29sbGVjdGlvblxyXG59IiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxcImVkaXRcXFwiXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXFwicHJldmlld1xcXCJcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIlxcclxcblx0PG5hdiBpZD1cXFwiYnV0dG9uX2JhclxcXCIgY2xhc3M9XFxcImNvbC1tLTJcXFwiPlxcclxcblx0XHQ8YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGNvcHlcXFwiPkNvcHk8L2E+XFxyXFxuXHRcdDxhIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgZGVsZXRlXFxcIj5EZWxldGU8L2E+XFxyXFxuXHQ8L25hdj5cXHJcXG5cdFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxyXFxuXHRcdDxoMT5TZWxlY3QgY29udGVudCB0byBwcmV2aWV3LjwvaDE+XFxyXFxuXHRcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgaWQ9XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBjbGFzcz1cXFwiY29udGFpbmVyLWZsdWlkXFxcIj5cXHJcXG5cdDxpbnB1dCB0eXBlPVxcXCJoaWRkZW5cXFwiIGlkPVxcXCJpc19lZGl0aW5nXFxcIiB2YWx1ZSA9IFxcXCJuXFxcIiAvPlxcclxcblx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0PGRpdiBpZD1cXFwiY29udGFpbmVyLXdyYXBwZXJcXFwiPlxcclxcblx0XHQ8ZGl2IGlkPVxcXCJjb250YWluZXJfYXJlYVxcXCIgY2xhc3M9XFxcImNvbnRhaW5lci1mbHVpZCByb3dcXFwiPjwvZGl2Plxcclxcblx0PC9kaXY+XFxyXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxuYXYgY2xhc3M9XFxcIm5hdmJhciBuYXZiYXItZGVmYXVsdCBjb2xsYXBzZSBuYXZiYXItY29sbGFwc2VcXFwiIGlkPVxcXCJzZWNvbmRhcnktbmF2XFxcIj5cXHJcXG5cdDx1bCBjbGFzcz1cXFwibmF2IG5hdmJhci1uYXZcXFwiPlxcclxcblx0XHQ8bGkgaWQ9XFxcImNoYW5uZWwtZWRpdC1idXR0b25cXFwiIGNsYXNzPVxcXCJ0ZXh0LWNlbnRlciBwdWxsLWxlZnRcXFwiPkVkaXQ8L2xpPlxcclxcblx0XHQ8bGkgaWQ9XFxcImNoYW5uZWwtcHJldmlldy1idXR0b25cXFwiIGNsYXNzPVxcXCJ0ZXh0LWNlbnRlciBwdWxsLWxlZnRcXFwiPlByZXZpZXc8L2xpPlxcclxcblx0XHQ8bGkgaWQ9XFxcImNoYW5uZWwtdHJhc2gtYnV0dG9uXFxcIiBjbGFzcz1cXFwidGV4dC1jZW50ZXIgcHVsbC1sZWZ0XFxcIj5UcmFzaDwvbGk+XFxyXFxuXHQ8L3VsPlxcclxcblx0PHVsIGNsYXNzPVxcXCJuYXYgbmF2YmFyLW5hdlxcXCIgaWQ9XFxcInB1Ymxpc2hcXFwiPlxcclxcblx0XHQ8bGkgaWQ9XFxcImNoYW5uZWwtcHVibGlzaC1idXR0b25cXFwiIGNsYXNzPVxcXCJ0ZXh0LWNlbnRlciBwdWxsLXJpZ2h0XFxcIj5QdWJsaXNoPC9saT5cXHJcXG5cdDwvdWw+XFxyXFxuPC9uYXY+XFxyXFxuPGJ1dHRvbiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIiB0eXBlPVxcXCJidXR0b25cXFwiIGlkPVxcXCJjbGlwYm9hcmQtdG9nZ2xlclxcXCI+XFxyXFxuXHQ8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1tZW51LWRvd25cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuXHRDbGlwYm9hcmRcXHJcXG5cdDxzcGFuIGNsYXNzPVxcXCJiYWRnZVxcXCI+PC9zcGFuPlxcclxcbjwvYnV0dG9uPlxcclxcblxcclxcbjxkaXYgaWQ9XFxcIm1haW4tY29udGVudC1hcmVhXFxcIiBjbGFzcz1cXFwiY29udGFpbmVyLWZsdWlkXFxcIj48L2Rpdj5cXHJcXG48ZGl2IGlkPVxcXCJwcmV2aWV3ZXItYXJlYVxcXCIgY2xhc3M9XFxcImNvbnRhaW5lciBwdWxsLXJpZ2h0XFxcIj48L2Rpdj5cXHJcXG48ZGl2IGlkPVxcXCJjbGlwYm9hcmQtYXJlYVxcXCIgY2xhc3M9XFxcImNvbnRhaW5lciBwdWxsLXJpZ2h0XFxcIj48L2Rpdj5cIjtcbiAgfSk7XG4iLCJ2YXIgQmFja2JvbmUgPSByZXF1aXJlKFwiYmFja2JvbmVcIik7XHJcbnZhciBfID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIik7XHJcbnJlcXVpcmUoXCJjbGlwYm9hcmQubGVzc1wiKTtcclxuXHJcbnZhciBQcmV2aWV3ZXJWaWV3cyA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvcHJldmlld2VyL3ZpZXdzXCIpO1xyXG52YXIgTG9hZEhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvTG9hZEhlbHBlclwiKTtcclxudmFyIERPTUhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvRE9NSGVscGVyXCIpO1xyXG52YXIgQ0hBUl9MSU1JVCA9IDMwMDtcclxuXHJcbnZhciBsaXN0X2l0ZW1fdGVtcGxhdGUgPSByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfbGlzdF9pdGVtLmhhbmRsZWJhcnNcIik7XHJcbnZhciBwcmV2VGVtcGxhdGU7XHJcbnZhciBsaXN0X2luZGV4O1xyXG5cclxudmFyIGNsaXBib2FyZF9saXN0X2l0ZW1zID0gW107XHJcbnZhciB0ZW1wX2xpc3RfaXRlbXMgPSBbXTtcclxuXHJcbi8qIExvYWRlZCB3aGVuIHVzZXIgY2xpY2tzIGNsaXBib2FyZCBidXR0b24gYmVsb3cgbmF2aWdhdGlvbiBiYXIgKi9cclxudmFyIENsaXBib2FyZExpc3RWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG5cdHRlbXBsYXRlOiByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfbGlzdC5oYW5kbGViYXJzXCIpLFxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBfLmJpbmRBbGwodGhpcywgJ2FkZF9jb250ZW50JywgJ2NvbGxhcHNlX2NsaXBib2FyZCcsJ2RlbGV0ZV9jb250ZW50JywndG9nZ2xlX2ZvbGRlcicpO1xyXG4gICAgICAgICAgICAvL3RoaXMubGlzdGVuVG8oY2xpcGJvYXJkX2xpc3RfaXRlbXMsIFwiY2hhbmdlOmNsaXBib2FyZF9saXN0X2l0ZW1zLmxlbmd0aFwiLCB0aGlzLnJlbmRlcik7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcblx0XHRcdCQoXCIjY2xpcGJvYXJkXCIpLnNsaWRlRG93bigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKCkpO1xyXG5cdFx0XHRsb2FkTGlzdEl0ZW1zKGNsaXBib2FyZF9saXN0X2l0ZW1zLCBcIi5saXN0X2NvbnRlbnQgdWxcIiwgdGhpcy5tb2RlbCwge3NlbGVjdGVkOiB0cnVlLCBsaXN0OiB0cnVlLCBtZXRhOiBmYWxzZX0pO1xyXG4gICAgICAgIH0sXHJcblx0XHRcclxuXHRcdGV2ZW50czoge1xyXG5cdFx0XHQnY2xpY2sgLmNsaXBib2FyZF9hZGRfY29udGVudCc6ICdhZGRfY29udGVudCcsXHJcblx0XHRcdCdjbGljayAuY29sbGFwc2VfY2xpcGJvYXJkJzonY29sbGFwc2VfY2xpcGJvYXJkJyxcclxuXHRcdFx0J2NsaWNrIC5kZWxldGVfY29udGVudCc6ICdkZWxldGVfY29udGVudCcsXHJcblx0XHRcdCdjbGljayAudG9nX2ZvbGRlcic6ICd0b2dnbGVfZm9sZGVyJ1xyXG5cdFx0fSxcclxuXHRcdGNvbGxhcHNlX2NsaXBib2FyZDogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0XHQkKFwiI2NsaXBib2FyZFwiKS5zbGlkZVVwKCk7XHJcblx0XHR9LFxyXG5cdFx0YWRkX2NvbnRlbnQ6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdFx0bmV3IENsaXBib2FyZEFkZENvbnRlbnRWaWV3KHtcclxuXHRcdFx0XHRlbDogJChcIiNjbGlwYm9hcmQtYXJlYVwiKVxyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblx0XHRkZWxldGVfY29udGVudDpmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdGlmKGNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgZmlsZT9cIikpe1xyXG5cdFx0XHRcdHZhciBlbCA9IERPTUhlbHBlci5nZXRQYXJlbnRPZlRhZyhldmVudC50YXJnZXQsIFwibGlcIik7XHJcblx0XHRcdFx0dmFyIGkgPSBjbGlwYm9hcmRfbGlzdF9pdGVtcy5pbmRleE9mKCQoXCIjXCIgKyBlbC5pZCkuZGF0YShcImRhdGFcIikpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCQoXCIjXCIgKyBlbC5pZCkuZGF0YShcImRhdGFcIikpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGNsaXBib2FyZF9saXN0X2l0ZW1zWzBdKTtcclxuXHRcdFx0XHRpZihpICE9IC0xKSBjb25zb2xlLmxvZyhjbGlwYm9hcmRfbGlzdF9pdGVtc1tpXSk7XHJcblx0XHRcdFx0Ly9jbGlwYm9hcmRfbGlzdF9pdGVtcy5yZW1vdmUoaSk7XHJcblx0XHRcdFx0ZWwucmVtb3ZlKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHR0b2dnbGVfZm9sZGVyOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdHZhciBlbCA9IFwiI1wiICsgRE9NSGVscGVyLmdldFBhcmVudE9mVGFnKGV2ZW50LnRhcmdldCwgXCJsaVwiKS5pZDtcclxuXHRcdFx0aWYoJChlbCkuZGF0YShcImNvbGxhcHNlZFwiKSl7XHJcblx0XHRcdFx0JChlbCArIFwiX3N1YlwiKS5zbGlkZURvd24oKTtcclxuXHRcdFx0XHQkKGVsKS5kYXRhKFwiY29sbGFwc2VkXCIsIGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNle1xyXG5cdFx0XHRcdCQoZWwgKyBcIl9zdWJcIikuc2xpZGVVcCgpO1xyXG5cdFx0XHRcdCQoZWwpLmRhdGEoXCJjb2xsYXBzZWRcIiwgdHJ1ZSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxufSk7XHJcblxyXG4vKiBMb2FkZWQgd2hlbiB1c2VyIGNsaWNrcyBlZGl0IGljb24gb24gZm9sZGVyIG9yIFwiQWRkIEZvbGRlclwiIGJ1dHRvbiAqL1xyXG52YXIgQ2xpcGJvYXJkRWRpdEZvbGRlclZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XHJcblx0dGVtcGxhdGU6IHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL2NsaXBib2FyZF9lZGl0X2ZvbGRlci5oYW5kbGViYXJzXCIpLFxyXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuXHRcdHRoaXMuZWRpdCA9IG9wdGlvbnMuZWRpdDtcclxuICAgICAgICAgICAgXy5iaW5kQWxsKHRoaXMsICd1cGRhdGVfZm9sZGVyJywgJ3RvZ2dsZV9jbGlwYm9hcmQnLCd1cGRhdGVfY291bnQnKTtcclxuICAgICAgICAgICAgLy90aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOm51bWJlcl9vZl9oZXhhZ29uc1wiLCB0aGlzLnJlbmRlcik7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUoe2ZvbGRlcjogKCh0aGlzLmVkaXQpPyB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMgOiBudWxsKSwgZWRpdDogdGhpcy5lZGl0LCBcclxuXHRcdFx0XHRcdFx0XHRcdGxpbWl0OiAoKHRoaXMuZWRpdCk/IENIQVJfTElNSVQgLSB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMuZGVzY3JpcHRpb24ubGVuZ3RoIDogQ0hBUl9MSU1JVCl9KSk7XHJcbiAgICAgICAgfSxcclxuXHRcdGV2ZW50czoge1xyXG5cdFx0XHQnY2xpY2sgLmNsaXBib2FyZF91cGRhdGVfZm9sZGVyJzogJ3VwZGF0ZV9mb2xkZXInLFxyXG5cdFx0XHQnY2xpY2sgLnRvZ2dsZV9jbGlwYm9hcmQnOid0b2dnbGVfY2xpcGJvYXJkJyxcclxuXHRcdFx0J2tleXVwIHRleHRhcmVhJzogJ3VwZGF0ZV9jb3VudCcsXHJcblx0XHRcdCdrZXlkb3duIHRleHRhcmVhJzogJ3VwZGF0ZV9jb3VudCcsXHJcblx0XHRcdCdwYXN0ZSB0ZXh0YXJlYSc6ICd1cGRhdGVfY291bnQnXHJcblx0XHR9LFxyXG5cdFx0dXBkYXRlX2ZvbGRlcjogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0XHRpZigkKFwiI2ZvbGRlcl9uYW1lXCIpLnZhbCgpLnRyaW0oKSA9PSBcIlwiKVxyXG5cdFx0XHRcdCQoXCIjbmFtZV9lcnJcIikuY3NzKFwiZGlzcGxheVwiLCBcImlubGluZVwiKTtcclxuXHRcdFx0ZWxzZXtcclxuXHRcdFx0XHQvL1JFTE9BRCBUUkVFIFxyXG5cdFx0XHRcdGNsb3NlQ2xpcGJvYXJkKCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHR0b2dnbGVfY2xpcGJvYXJkOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdGNsb3NlQ2xpcGJvYXJkKCk7XHJcblx0XHR9LFxyXG5cdFx0dXBkYXRlX2NvdW50OiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRcdHVwZGF0ZUNvdW50KCk7XHJcblx0XHR9XHJcbn0pO1xyXG5cclxuLyogTG9hZGVkIHdoZW4gdXNlciBjbGlja3MgZWRpdCBpY29uIG9uIGZpbGUqL1xyXG52YXIgQ2xpcGJvYXJkRWRpdEZpbGVWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG5cdHRlbXBsYXRlOiByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfZWRpdF9maWxlLmhhbmRsZWJhcnNcIiksXHJcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XHJcblx0XHRfLmJpbmRBbGwodGhpcywgJ3RvZ2dsZV9jbGlwYm9hcmQnLCAndXBkYXRlX2ZpbGUnLCAndXBkYXRlX2NvdW50Jyk7XHJcblx0XHQvL3RoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6bnVtYmVyX29mX2hleGFnb25zXCIsIHRoaXMucmVuZGVyKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fSxcclxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHtmaWxlOiB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMsIGxpbWl0OiBDSEFSX0xJTUlUIC0gdGhpcy5tb2RlbC5hdHRyaWJ1dGVzLmRlc2NyaXB0aW9uLmxlbmd0aH0pKTtcclxuXHR9LFxyXG5cdFxyXG5cdGV2ZW50czoge1xyXG5cdFx0J2NsaWNrIC50b2dnbGVfY2xpcGJvYXJkJzondG9nZ2xlX2NsaXBib2FyZCcsXHJcblx0XHQnY2xpY2sgLmNsaXBib2FyZF91cGRhdGVfZmlsZSc6J3VwZGF0ZV9maWxlJyxcclxuXHRcdCdrZXl1cCB0ZXh0YXJlYSc6ICd1cGRhdGVfY291bnQnLFxyXG5cdFx0J2tleWRvd24gdGV4dGFyZWEnOiAndXBkYXRlX2NvdW50JyxcclxuXHRcdCdwYXN0ZSB0ZXh0YXJlYSc6ICd1cGRhdGVfY291bnQnXHJcblx0fSxcclxuXHRcclxuXHR0b2dnbGVfY2xpcGJvYXJkOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRjbG9zZU5ldygpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRcIikuaGlkZSgpO1xyXG5cdH0sXHJcblx0dXBkYXRlX2ZpbGU6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGlmKCQoXCIjY29udGVudF9uYW1lXCIpLnZhbCgpLnRyaW0oKSA9PSBcIlwiKVxyXG5cdFx0XHRcdCQoXCIjbmFtZV9lcnJcIikuY3NzKFwiZGlzcGxheVwiLCBcImlubGluZVwiKTtcclxuXHRcdGVsc2V7XHJcblx0XHRcdC8vUkVMT0FEIFRSRUUgXHJcblx0XHRcdGNsb3NlQ2xpcGJvYXJkKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHR1cGRhdGVfY291bnQ6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdHVwZGF0ZUNvdW50KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8qIExvYWRlZCB3aGVuIHVzZXIgY2xpY2tzIFwiQWRkIENvbnRlbnRcIiBidXR0b24gKi9cclxudmFyIENsaXBib2FyZEFkZENvbnRlbnRWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG5cdHRlbXBsYXRlOiByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfaGVhZGVyLmhhbmRsZWJhcnNcIiksXHJcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XHJcblx0XHRfLmJpbmRBbGwodGhpcywgJ3RvZ2dsZV9jbGlwYm9hcmQnLCdjb21wdXRlcl9jaG9vc2VfY29udGVudCcsICdjaGFubmVsX2Nob29zZV9jb250ZW50JywgJ2Nob29zZV9maWxlJywgJ2JhY2tfdG9fMScsICd0b19zdGVwXzMnLCdwcmV2aW91cycsJ3ByZXZpZXdfZmlsZScsJ29wZW5fZm9sZGVyJywgJ2Nsb3NlX2ZpbGUnLCAnb3Blbl9mb2xkZXJfcGF0aCcsICdhZGRfZm9sZGVyX3RvX2xpc3QnLCdhZGRfdGFnJywndG9nZ2xlX2ZvbGRlcicsICdjbGlwYm9hcmRfZmluaXNoJywnY2hvb3NlX2NoYW5uZWwnLCdhZGRfZmlsZV90b19saXN0JywgJ3VwZGF0ZV9jb3VudCcsJ3JlbW92ZV9pdGVtJyk7XHJcblx0XHQvL3RoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6bnVtYmVyX29mX2hleGFnb25zXCIsIHRoaXMucmVuZGVyKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fSxcclxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwpKTtcclxuXHRcdHZhciBjaG9vc2VfdGVtcGxhdGUgPSByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy9jbGlwYm9hcmRfc3RlcF8xLmhhbmRsZWJhcnNcIik7XHJcblx0XHQkKFwiI2NsaXBib2FyZF9jb250ZW50XCIpLmFwcGVuZChjaG9vc2VfdGVtcGxhdGUodGhpcy5tb2RlbCkpO1xyXG5cdFx0JChcIiNzb3VyY2VfbmF2XCIpLmNzcyhcImJvcmRlci1ib3R0b21cIiwgXCI1cHggc29saWQgIzhEQTlEQlwiKTtcclxuXHRcdCQoXCIjY2hvb3NlX25hdlwiKS5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XHJcblx0XHQkKFwiI21ldGFfbmF2XCIpLnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKTtcclxuXHR9LFxyXG5cdFxyXG5cdGV2ZW50czoge1xyXG5cdFx0J2NsaWNrIC50b2dnbGVfY2xpcGJvYXJkJzondG9nZ2xlX2NsaXBib2FyZCcsXHJcblx0XHQnY2xpY2sgLmNvbXB1dGVyX2Nob29zZV9jb250ZW50JzonY29tcHV0ZXJfY2hvb3NlX2NvbnRlbnQnLFxyXG5cdFx0J2NsaWNrIC5jaGFubmVsX2Nob29zZV9jb250ZW50JzonY2hhbm5lbF9jaG9vc2VfY29udGVudCcsXHJcblx0XHQnY2xpY2sgLmNsaXBib2FyZF9wcmV2aW91cyc6J3ByZXZpb3VzJyxcclxuXHRcdCdjbGljayAjY2hvb3NlX25hdic6J3ByZXZpb3VzJyxcclxuXHRcdCdjbGljayAuY2xpcGJvYXJkXzJfcHJldmlvdXMnOidiYWNrX3RvXzEnLFxyXG5cdFx0J2NsaWNrICNzb3VyY2VfbmF2JzonYmFja190b18xJyxcclxuXHRcdCdjbGljayAuY2hvb3NlX2ZpbGUnOidjaG9vc2VfZmlsZScsXHJcblx0XHQnY2hhbmdlIHNlbGVjdCc6J2Nob29zZV9jaGFubmVsJyxcclxuXHRcdCdjbGljayAuZmlsZV9wbHVzJzonYWRkX2ZpbGVfdG9fbGlzdCcsXHJcblx0XHQnY2xpY2sgLmNsaXBib2FyZF9uZXh0JzondG9fc3RlcF8zJyxcclxuXHRcdCdjbGljayAjbWV0YV9uYXYnOiAndG9fc3RlcF8zJyxcclxuXHRcdCdjbGljayAuY2xvc2VfZmlsZSc6J2Nsb3NlX2ZpbGUnLFxyXG5cdFx0J2NsaWNrIC5wcmV2aWV3X2ZpbGUnOiAncHJldmlld19maWxlJyxcclxuXHRcdCdjbGljayAuZm9sZGVyJzogJ29wZW5fZm9sZGVyJyxcclxuXHRcdCdjbGljayAuZm9sZGVyX3BsdXMnOiAnYWRkX2ZvbGRlcl90b19saXN0JyxcclxuXHRcdCdjbGljayAuZm9sZGVyX3BhdGgnOiAnb3Blbl9mb2xkZXJfcGF0aCcsXHJcblx0XHQnY2xpY2sgLnBsdXMnOidhZGRfdGFnJyxcclxuXHRcdCdjbGljayAudG9nZ2xlX2ZvbGRlcic6J3RvZ2dsZV9mb2xkZXInLFxyXG5cdFx0J2NsaWNrIC5jbGlwYm9hcmRfZmluaXNoJzonY2xpcGJvYXJkX2ZpbmlzaCcsXHJcblx0XHQna2V5dXAgdGV4dGFyZWEnOiAndXBkYXRlX2NvdW50JyxcclxuXHRcdCdrZXlkb3duIHRleHRhcmVhJzogJ3VwZGF0ZV9jb3VudCcsXHJcblx0XHQncGFzdGUgdGV4dGFyZWEnOiAndXBkYXRlX2NvdW50JyxcclxuXHRcdCdjbGljayAucmVtb3ZlX2l0ZW0nOidyZW1vdmVfaXRlbSdcclxuXHR9LFxyXG5cdHJlbW92ZV9pdGVtOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRET01IZWxwZXIuZ2V0UGFyZW50T2ZUYWcoZXZlbnQudGFyZ2V0LCBcImxpXCIpLnJlbW92ZSgpO1xyXG5cdH0sXHJcblx0dXBkYXRlX2NvdW50OiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR1cGRhdGVDb3VudCgpO1xyXG5cdH0sXHJcblx0LyogRnVuY3Rpb25zIHNoYXJlZCBhY3Jvc3Mgc3RlcHMqL1xyXG5cdHRvZ2dsZV9jbGlwYm9hcmQ6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGNsb3NlQ2xpcGJvYXJkKCk7XHJcblx0fSxcclxuXHRvcGVuX2ZvbGRlcjogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0Y29uc29sZS5sb2coXCJPcGVuaW5nIGZvbGRlci4uLlwiKTtcclxuXHR9LFxyXG5cdGNsb3NlX2ZpbGU6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGV2ZW50LnRhcmdldC5wYXJlbnROb2RlLnJlbW92ZSgpO1xyXG5cdH0sXHJcblx0cHJldmlld19maWxlOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR2YXIgZmlsZSA9ICQoXCIjXCIrIERPTUhlbHBlci5nZXRQYXJlbnRPZlRhZyhldmVudC50YXJnZXQsIFwibGlcIikuaWQpO1xyXG5cdFx0dmFyIHZpZXcgPSBuZXcgUHJldmlld2VyVmlld3MuUHJldmlld2VyVmlldyh7XHJcblx0XHRcdGVsOiAkKFwiI3ByZXZpZXdlci1hcmVhXCIpLFxyXG5cdFx0XHRtb2RlbDogIGZpbGUuZGF0YShcImRhdGFcIiksXHJcblx0XHRcdGZpbGU6IGZpbGVcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0XHJcblx0LyogU3RlcCAxOiBjaG9vc2UgY29udGVudCBmcm9tIGNvbXB1dGVyIG9yIGNoYW5uZWwgKi9cclxuXHRjb21wdXRlcl9jaG9vc2VfY29udGVudDogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0cHJldlRlbXBsYXRlID0gcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvY2xpcGJvYXJkX3N0ZXBfMl9jb21wdXRlci5oYW5kbGViYXJzXCIpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5lbXB0eSgpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5hcHBlbmQocHJldlRlbXBsYXRlKHRoaXMubW9kZWwpKTtcdFxyXG5cdFx0c3dpdGNoVGFiKCQoXCIjc291cmNlX25hdlwiKSwgJChcIiNjaG9vc2VfbmF2XCIpKTtcdFxyXG5cdH0sXHJcblx0Y2hhbm5lbF9jaG9vc2VfY29udGVudDogIGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdHByZXZUZW1wbGF0ZSA9IHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL2NsaXBib2FyZF9zdGVwXzJfY2hhbm5lbC5oYW5kbGViYXJzXCIpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5lbXB0eSgpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5hcHBlbmQocHJldlRlbXBsYXRlKHRoaXMubW9kZWwpKTtcclxuXHRcdHN3aXRjaFRhYigkKFwiI3NvdXJjZV9uYXZcIiksICQoXCIjY2hvb3NlX25hdlwiKSk7XHRcclxuXHR9LFxyXG5cdFxyXG5cdC8qIFN0ZXAgMjogc2VsZWN0IGZpbGVzIHRvIGJlIGFkZGVkICovXHJcblx0YmFja190b18xOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR2YXIgYWRkX3RlbXBsYXRlID0gcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvY2xpcGJvYXJkX3N0ZXBfMS5oYW5kbGViYXJzXCIpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5lbXB0eSgpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5hcHBlbmQoYWRkX3RlbXBsYXRlKHRoaXMubW9kZWwpKTtcclxuXHJcblx0XHRzd2l0Y2hUYWIoJChcIiNjaG9vc2VfbmF2XCIpLCAkKFwiI3NvdXJjZV9uYXZcIikpO1x0XHJcblx0fSxcclxuXHRhZGRfZm9sZGVyX3RvX2xpc3Q6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGNvbnNvbGUubG9nKFwiQWRkaW5nIGZvbGRlciB0byBsaXN0Li4uXCIpO1xyXG5cdFx0Ly90ZW1wX2xpc3RfaXRlbXNcclxuXHRcdC8vVG9kbzogY2hhbmdlIGNsaXBib2FyZF9saXN0X2l0ZW1zXHJcblx0XHRsb2FkTGlzdEl0ZW1zKGNsaXBib2FyZF9saXN0X2l0ZW1zLCBcIi5saXN0X2NvbnRlbnQgdWxcIiwgdGhpcy5tb2RlbCwge3NlbGVjdGVkOiB0cnVlLCBsaXN0OiBmYWxzZSwgbWV0YTogZmFsc2V9KTtcclxuXHRcdC8vbGlzdF9pbmRleCA9IGxpc3RIZWxwZXIuYXBwZW5kTGlzdChmaWxlLCBsaXN0X2l0ZW1fdGVtcGxhdGUsIFwiI3NlbGVjdGVkX2NvbnRlbnRfYXJlYSB1bFwiLCBsaXN0X2luZGV4KTtcclxuXHR9LFxyXG5cdGFkZF9maWxlX3RvX2xpc3Q6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGNvbnNvbGUubG9nKFwiQWRkaW5nIGZpbGUgdG8gbGlzdC4uLlwiKTtcclxuXHRcdGxvYWRMaXN0SXRlbXMoY2xpcGJvYXJkX2xpc3RfaXRlbXMsIFwiLmxpc3RfY29udGVudCB1bFwiLCB0aGlzLm1vZGVsLCB7c2VsZWN0ZWQ6IHRydWUsIGxpc3Q6IGZhbHNlLCBtZXRhOiBmYWxzZX0pO1xyXG5cdFx0Ly9saXN0X2luZGV4ID0gbGlzdEhlbHBlci5hcHBlbmRMaXN0KGZpbGUsIGxpc3RfaXRlbV90ZW1wbGF0ZSwgXCIjc2VsZWN0ZWRfY29udGVudF9hcmVhIHVsXCIsIGxpc3RfaW5kZXgpO1xyXG5cdH0sXHJcblx0Y2hvb3NlX2ZpbGU6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdCQoXCIjZmlsZWlucHV0XCIpLnRyaWdnZXIoXCJjbGlja1wiKTtcclxuXHRcdCAkKCcjZmlsZWlucHV0JykuY2hhbmdlKGZ1bmN0aW9uKGV2dCkge1xyXG5cdFx0XHR2YXIgc2VsZWN0ZWQgPSAkKHRoaXMpLmNvbnRleHQuZmlsZXM7XHJcblx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBzZWxlY3RlZC5sZW5ndGg7IGkrKylcclxuXHRcdFx0XHR0ZW1wX2xpc3RfaXRlbXMucHVzaCh7ZGF0YToge2F0dHJpYnV0ZXM6IHtjb250ZW50X2ZpbGU6IHNlbGVjdGVkW2ldLCByZXRyaWV2ZWRfb246IG5ldyBEYXRlKCksIHRpdGxlOiBzZWxlY3RlZFtpXS5uYW1lLCBwYXJlbnQ6IHRoaXMubW9kZWx9fX0pO1xyXG5cdFx0XHRsb2FkTGlzdEl0ZW1zKHRlbXBfbGlzdF9pdGVtcywgXCIjc2VsZWN0ZWRfY29udGVudF9hcmVhIHVsXCIsIG51bGwsIHtzZWxlY3RlZDogdHJ1ZSwgbGlzdDogZmFsc2UsIG1ldGE6IGZhbHNlfSk7XHRcdFx0XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdGNob29zZV9jaGFubmVsOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRsb2FkTGlzdEl0ZW1zKHRlbXBfbGlzdF9pdGVtcywgXCIjc2VsZWN0ZWRfY29udGVudF9hcmVhIHVsXCIsIHRoaXMubW9kZWwsIHtzZWxlY3RlZDogdHJ1ZSwgbGlzdDogZmFsc2UsIG1ldGE6IHRydWV9KTtcdFxyXG5cdH0sXHJcblx0dG9fc3RlcF8zOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR2YXIgbWV0YV90ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL2NsaXBib2FyZF9zdGVwXzMuaGFuZGxlYmFyc1wiKTtcclxuXHRcdCQoXCIjY2xpcGJvYXJkX2NvbnRlbnRcIikuZW1wdHkoKTtcclxuXHRcdCQoXCIjY2xpcGJvYXJkX2NvbnRlbnRcIikuYXBwZW5kKG1ldGFfdGVtcGxhdGUoe2NvbnRlbnQ6IHRoaXMubW9kZWwsIGxpbWl0OiBDSEFSX0xJTUlUfSkpO1xyXG5cdFx0c3dpdGNoVGFiKCQoXCIjY2hvb3NlX25hdlwiKSwgJChcIiNtZXRhX25hdlwiKSk7XHJcblx0XHRsb2FkTGlzdEl0ZW1zKHRlbXBfbGlzdF9pdGVtcywgXCIjbWV0YWxpc3QgdWxcIiwgdGhpcy5tb2RlbCwge3NlbGVjdGVkOiB0cnVlLCBsaXN0OiBmYWxzZSwgbWV0YTogdHJ1ZX0pO1x0XHJcblx0fSxcclxuXHJcblx0LyogU3RlcCAzOiByZXZpZXcgbWV0YWRhdGEgKi9cclxuXHRwcmV2aW91czogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5lbXB0eSgpO1xyXG5cdFx0JChcIiNjbGlwYm9hcmRfY29udGVudFwiKS5hcHBlbmQocHJldlRlbXBsYXRlKHRoaXMubW9kZWwpKTtcclxuXHRcdHN3aXRjaFRhYigkKFwiI21ldGFfbmF2XCIpLCAkKFwiI2Nob29zZV9uYXZcIikpO1xyXG5cdH0sXHJcblx0b3Blbl9mb2xkZXJfcGF0aDogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0XHJcblx0fSxcclxuXHRhZGRfdGFnOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRjb25zb2xlLmxvZyhcIkFkZGluZyB0YWcuLi5cIik7XHJcblx0fSxcclxuXHR0b2dnbGVfZm9sZGVyOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRvZ2dsaW5nIGZvbGRlci4uLlwiKTtcclxuXHR9LFxyXG5cdGNsaXBib2FyZF9maW5pc2g6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGNvbnNvbGUubG9nKFwiRmluaXNoaW5nLi4uXCIpO1xyXG5cdFx0Y2xvc2VDbGlwYm9hcmQoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY2xvc2VDbGlwYm9hcmQoKXtcclxuXHQkKFwiI2VkaXRcIikuZmluZChcIi5jb250ZW50X29wdGlvbnMgYnV0dG9uXCIpLnByb3AoJ2Rpc2FibGVkJyxmYWxzZSk7XHJcblx0JChcIiNlZGl0XCIpLmZpbmQoXCIuZWRpdF9mb2xkZXJfYnV0dG9uXCIpLmNzcygndmlzaWJpbGl0eScsJ3Zpc2libGUnKTtcclxuXHQkKFwiI2VkaXRcIikuZmluZChcIi5lZGl0X2ZpbGVfYnV0dG9uXCIpLmNzcygndmlzaWJpbGl0eScsJ3Zpc2libGUnKTtcclxuXHQkKFwiI2lzX2VkaXRpbmdcIikudmFsKFwiblwiKTtcclxuXHQkKFwiI2VkaXRcIikuZmluZChcIi5uZXdjb250ZW50XCIpLnJlbW92ZSgpO1xyXG5cdCQoXCIjY2xpcGJvYXJkXCIpLmhpZGUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ291bnQoKXtcclxuXHRjb25zb2xlLmxvZygkKFwiI2NsaXBib2FyZCB0ZXh0YXJlYVwiKS52YWwoKSk7XHJcblx0dmFyIGNoYXJfbGVuZ3RoID0gQ0hBUl9MSU1JVCAtICQoXCIjY2xpcGJvYXJkIHRleHRhcmVhXCIpLnZhbCgpLmxlbmd0aDtcclxuXHQkKFwiLmNvdW50ZXJcIikuaHRtbChjaGFyX2xlbmd0aCk7XHJcblx0aWYoY2hhcl9sZW5ndGggID09IDEpICQoXCIuY2hhcl9jb3VudGVyXCIpLmh0bWwoJChcIi5jaGFyX2NvdW50ZXJcIikuaHRtbCgpLnJlcGxhY2UoXCJDaGFyc1wiLCBcIkNoYXJcIikpO1xyXG5cdGVsc2UgaWYoY2hhcl9sZW5ndGggID09IDIgfHwgY2hhcl9sZW5ndGggID09IDApXHJcblx0XHQkKFwiLmNoYXJfY291bnRlclwiKS5odG1sKCAkKFwiLmNoYXJfY291bnRlclwiKS5odG1sKCkucmVwbGFjZShcIkNoYXIgXCIsIFwiQ2hhcnMgXCIpKTtcclxuXHRpZihjaGFyX2xlbmd0aCA9PSAwKVxyXG5cdFx0JChcIi5jaGFyX2NvdW50ZXJcIikuY3NzKFwiY29sb3JcIiwgXCJyZWRcIik7XHJcblx0ZWxzZSAkKFwiLmNoYXJfY291bnRlclwiKS5jc3MoXCJjb2xvclwiLCBcImJsYWNrXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzd2l0Y2hUYWIob2xkVGFiLCBuZXdUYWIpe1xyXG5cdCQoXCIuY2xpcGJvYXJkX25hdmlnYXRpb24gYVwiKS5jc3MoXCJib3JkZXItYm90dG9tXCIsIFwiMXB4IHNvbGlkIGJsYWNrXCIpO1x0XHJcblx0bmV3VGFiLmNzcyhcImJvcmRlci1ib3R0b21cIiwgXCI1cHggc29saWQgIzhEQTlEQlwiKTtcclxuXHRuZXdUYWIucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkSXRlbXMobGlzdCl7XHJcblx0Y2xpcGJvYXJkX2xpc3RfaXRlbXMucHVzaC5hcHBseShjbGlwYm9hcmRfbGlzdF9pdGVtcywgbGlzdCk7XHJcblx0JChcIi5iYWRnZVwiKS5odG1sKGNsaXBib2FyZF9saXN0X2l0ZW1zLmxlbmd0aCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRMaXN0SXRlbXMobGlzdCwgbGlzdGlkLCBtb2RlbCwgb3B0aW9ucyl7XHJcblx0JChsaXN0aWQpLmVtcHR5KCk7XHJcblx0dmFyIGluZGV4ID0gMDtcclxuXHRmb3IodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKyl7XHJcblx0XHQkKGxpc3RpZCkuYXBwZW5kKGxpc3RfaXRlbV90ZW1wbGF0ZSh7aW5kZXg6IGluZGV4LCBmaWxlOiBsaXN0W2ldLmRhdGEuYXR0cmlidXRlcywgZm9sZGVyOiBsaXN0W2ldLmZvbGRlciwgXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zOiBvcHRpb25zfSkpO1xyXG5cdFx0JChsaXN0aWQgKyBcIiAjaXRlbV9cIitsaXN0X2luZGV4KS5kYXRhKFwiZGF0YVwiLGxpc3RbaV0uZGF0YSk7XHJcblx0XHQkKGxpc3RpZCArIFwiICNpdGVtX1wiK2xpc3RfaW5kZXgpLmRhdGEoXCJjb2xsYXBzZWRcIiwgdHJ1ZSk7XHJcblx0XHRpZihtb2RlbCl7XHJcblx0XHRcdGluZGV4ID0gTG9hZEhlbHBlci5sb2FkTGlzdChsaXN0W2ldLmRhdGEsIG1vZGVsLCBsaXN0X2l0ZW1fdGVtcGxhdGUsIGxpc3RfaXRlbV90ZW1wbGF0ZSwgXHJcblx0XHRcdFx0XHRcdFx0XHRcdGxpc3RpZCArIFwiICNpdGVtX1wiICsgaW5kZXggKyBcIl9zdWJcIiwgMzAsIHtzZWxlY3RlZDogdHJ1ZSwgXHJcblx0XHRcdFx0XHRcdFx0XHRcdGxpc3Q6IHRydWUsIG1ldGE6IGZhbHNlfSwgaW5kZXggKyAxLCAxKTtcclxuXHRcdH1cclxuXHR9XHJcblx0aWYobW9kZWwgJiYgaW5kZXggPT0gMClcclxuXHRcdCQobGlzdGlkKS5hcHBlbmQoXCI8bGk+PGxhYmVsIHN0eWxlPVxcXCJtYXJnaW4tbGVmdDo0MHB4O3BhZGRpbmctbGVmdDoxMHB4O1xcXCI+PGg0PjxlbT5ObyBpdGVtcyBmb3VuZC48L2VtPjwvaDQ+PC9sYWJlbD48L2xpPlwiKTtcclxufVxyXG5cclxuLypUb2RvOiBleHBvcnQgb25seSBvbmUgQ2xpcGJvYXJkVmlldyBvbmNlIHZpZXdzIGFyZSBhbiBleHRlbnNpb24gb2YgaXQqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRDbGlwYm9hcmRMaXN0VmlldzpDbGlwYm9hcmRMaXN0VmlldyxcclxuXHRDbGlwYm9hcmRFZGl0Rm9sZGVyVmlldzpDbGlwYm9hcmRFZGl0Rm9sZGVyVmlldyxcclxuXHRDbGlwYm9hcmRFZGl0RmlsZVZpZXc6Q2xpcGJvYXJkRWRpdEZpbGVWaWV3LFxyXG5cdENsaXBib2FyZEFkZENvbnRlbnRWaWV3OkNsaXBib2FyZEFkZENvbnRlbnRWaWV3LFxyXG5cdGFkZEl0ZW1zOmFkZEl0ZW1zXHJcbn0iLCIoZnVuY3Rpb24oKSB7IHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTsgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTsgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7dmFyIGNzcyA9IFwiQGZvbnR7Zm9udC1mYW1pbHk6XFxcIk9wZW4gU2Fuc1xcXCI7c3JjOnVybChcXFwiLi4vZm9udHMvT3BlblNhbnMtUmVndWxhci50dGZcXFwiKSBmb3JtYXQoXFxcInRydWV0eXBlXFxcIil9LmlubGluZS1ibG9ja3tkaXNwbGF5OmlubGluZS1ibG9ja31ib2R5e2JhY2tncm91bmQ6IzI5MmEyYn1he3RleHQtZGVjb3JhdGlvbjpub25lO2N1cnNvcjpwb2ludGVyO2NvbG9yOmJsYWNrfSNjbGlwYm9hcmR7YmFja2dyb3VuZC1jb2xvcjojZThlOGU4O2Rpc3BsYXk6bm9uZTtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjIwMDAwO2hlaWdodDo4NXZoO21pbi1oZWlnaHQ6NjAwcHg7d2lkdGg6NjAwcHg7cmlnaHQ6MDt0b3A6N2VtO292ZXJmbG93LXg6aGlkZGVuO292ZXJmbG93LXk6YXV0b30jY2xpcGJvYXJkIC5idG4tbGlua3tiYWNrZ3JvdW5kLWNvbG9yOiM0ZjRmNGY7cGFkZGluZzo1cHggMjBweDtjb2xvcjp3aGl0ZTt0ZXh0LWRlY29yYXRpb246bm9uZX0jY2xpcGJvYXJkIC5jbGlwYm9hcmRfaGVhZGVye3BhZGRpbmc6MTVweDtib3JkZXItYm90dG9tOjNweCBzb2xpZCBibGFjazt3aWR0aDoxMDAlfSNjbGlwYm9hcmQgLmNsaXBib2FyZF9oZWFkZXIgaDN7d2lkdGg6MTAwJTtmb250LXNpemU6MjBweH0jY2xpcGJvYXJkIC5jbGlwYm9hcmRfaGVhZGVyIGgzIC5wdWxsLWxlZnR7bWFyZ2luLXJpZ2h0OjIwcHh9I2NsaXBib2FyZCAuY2xpcGJvYXJkX2hlYWRlciAudG9nZ2xlX2NsaXBib2FyZCwjY2xpcGJvYXJkIC5jbGlwYm9hcmRfaGVhZGVyIC5jb2xsYXBzZV9jbGlwYm9hcmR7Y3Vyc29yOnBvaW50ZXJ9I2NsaXBib2FyZCAuY2xpcGJvYXJkX25hdmlnYXRpb257YmFja2dyb3VuZC1jb2xvcjp3aGl0ZTtmb250LXNpemU6MTVweH0jY2xpcGJvYXJkIC5jbGlwYm9hcmRfbmF2aWdhdGlvbiBhe2JvcmRlcjoxcHggc29saWQgYmxhY2t9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnR7d2lkdGg6MTAwJTtwYWRkaW5nOjAgMTVweDtvdmVyZmxvdy15OmF1dG87bWFyZ2luOjEwcHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgLmVycm9ye2NvbG9yOiNjMDE3MWI7Zm9udC1zdHlsZTppdGFsaWM7ZGlzcGxheTpub25lO2ZvbnQtc2l6ZToxNXB4fSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5oaWRkZW5maWxle3dpZHRoOjA7aGVpZ2h0OjA7b3ZlcmZsb3c6aGlkZGVufSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5jaGFyX2NvdW50ZXJ7Zm9udC13ZWlnaHQ6Ym9sZDtmb250LXNpemU6MTRweH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCBzZWxlY3R7bWFyZ2luLWxlZnQ6MTBweDt3aWR0aDoyMDBweH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAuc2VsZWN0X29wdGlvbntwYWRkaW5nLXRvcDoyMHB4O21hcmdpbi1sZWZ0OjMwcHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgaW5wdXRbdHlwZT10ZXh0XSwjY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCB0ZXh0YXJlYXtmb250LXdlaWdodDpub3JtYWw7Zm9udC1zaXplOjE0cHg7bWFyZ2luLXRvcDoyMHB4O3dpZHRoOjEwMCU7Ym9yZGVyOjNweCBzb2xpZCAjOGRhOWRiO3BhZGRpbmc6NXB4fSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IGlucHV0W3R5cGU9dGV4dF17aGVpZ2h0OjI1cHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgdGV4dGFyZWF7cmVzaXplOm5vbmU7aGVpZ2h0OjE1MHB4fSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5jb250ZW50X3RhZ3N7d2lkdGg6NDQwcHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI2FkZF9jb250ZW50X2FyZWF7d2lkdGg6MTAwJTtwYWRkaW5nOjEwcHggMjBweDtoZWlnaHQ6MjUlO3ZlcnRpY2FsLWFsaWduOm1pZGRsZTtib3JkZXI6M3B4IGRhc2hlZCBncmF5O2ZvbnQtd2VpZ2h0OnN0cm9uZztwYWRkaW5nOjEwcHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI2FkZF9jb250ZW50X2FyZWEgKnttYXJnaW4tdG9wOjEwcHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgaDV7cGFkZGluZzo1cHg7Zm9udC1zaXplOjE1cHg7bWFyZ2luLWJvdHRvbTowfSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5zdWJkaXJlY3Rvcnl7ZGlzcGxheTpub25lfSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5saXN0X2NvbnRlbnR7d2lkdGg6MTAwJTtvdmVyZmxvdzphdXRvO2hlaWdodDo2MHZofSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5saXN0X2NvbnRlbnQgI2xpc3RfYmFja2dyb3VuZHt3aWR0aDo1MzVweDtwb3NpdGlvbjphYnNvbHV0ZTtib3JkZXI6M3B4IHNvbGlkICM4ZGE5ZGI7YmFja2dyb3VuZC1jb2xvcjp3aGl0ZTtoZWlnaHQ6aW5oZXJpdH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAubGlzdF9jb250ZW50IHVse3Bvc2l0aW9uOnJlbGF0aXZlfSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5saXN0X2NvbnRlbnQgdWwgbGl7bWFyZ2luOjA7cGFkZGluZzowO3dpZHRoOjEwMCU7aGVpZ2h0OjQwcHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgLmxpc3RfY29udGVudCB1bCBsaSBsYWJlbHt3aWR0aDo1MzVweDt2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7Y3Vyc29yOnBvaW50ZXI7aGVpZ2h0OjEwMCU7Zm9udC1zaXplOjE2cHg7Ym9yZGVyOjFweCBzb2xpZCAjOGRhOWRifSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5saXN0X2NvbnRlbnQgdWwgbGkgbGFiZWwgLnB1bGwtcmlnaHR7cGFkZGluZy1yaWdodDoxMHB4O2NvbG9yOiM4ZGE5ZGI7Y3Vyc29yOnBvaW50ZXJ9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgLmxpc3RfY29udGVudCB1bCBsaSBsYWJlbCAucHVsbC1sZWZ0e2JhY2tncm91bmQtY29sb3I6IzhkYTlkYjtjb2xvcjp3aGl0ZTtoZWlnaHQ6MTAwJTtwYWRkaW5nOjAgMTBweDttYXJnaW4tcmlnaHQ6MTBweDtmb250LXdlaWdodDpib2xkO2N1cnNvcjpwb2ludGVyfSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50IC5saXN0X2NvbnRlbnQgdWwgbGkgbGFiZWwgLnByZXZpZXdfZmlsZXtiYWNrZ3JvdW5kLWNvbG9yOiNkM2QzZDM7cGFkZGluZzo1cHg7aGVpZ2h0OjEwMCV9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgLmxpc3RfY29udGVudCB1bCBsaSBsYWJlbCAuZ2x5cGhpY29ue3BhZGRpbmc6NXB4O2hlaWdodDoxMDAlfSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50ICNmaWxlc19jb250ZW50X2FyZWEsI2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI3NlbGVjdGVkX2NvbnRlbnRfYXJlYXtoZWlnaHQ6MjB2aH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbGlzdHtoZWlnaHQ6NjB2aDttYXJnaW4tcmlnaHQ6MjBweH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbGlzdCAucHVsbC1yaWdodHt2aXNpYmlsaXR5OmhpZGRlbn0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbGlzdCBpbnB1dFt0eXBlPWNoZWNrYm94XXtkaXNwbGF5OmlubGluZS1ibG9jazt3aWR0aDoyMHB4O2hlaWdodDoyMHB4O2N1cnNvcjpwb2ludGVyO21hcmdpbi1sZWZ0OjEwcHg7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDo1O3ZlcnRpY2FsLWFsaWduOm1pZGRsZX0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbGlzdCBsYWJlbHttYXJnaW4tbGVmdDo1cHg7d2lkdGg6NDk1cHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI2xpc3QgbGkgaW5wdXRbdHlwZT1jaGVja2JveF06Y2hlY2tlZCtsYWJlbCAucHVsbC1yaWdodCwjY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbGlzdCBsaTpob3ZlciAucHVsbC1yaWdodHt2aXNpYmlsaXR5OnZpc2libGV9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI2xpc3QgY2FudmFze3Bvc2l0aW9uOmFic29sdXRlO2JhY2tncm91bmQtY29sb3I6I2NjYzt3aWR0aDo0MHB4O2hlaWdodDo2MHZoO2JvcmRlcjozcHggc29saWQgIzhkYTlkYjtib3JkZXItcmlnaHQ6bm9uZX0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjc2VsZWN0ZWRfY29udGVudF9hcmVhe21hcmdpbi1ib3R0b206MjBweH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbWV0YS13cmFwcGVye2hlaWdodDo2MHZoO21hcmdpbi1ib3R0b206MjBweH0jY2xpcGJvYXJkICNjbGlwYm9hcmRfY29udGVudCAjbWV0YWxpc3QsI2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI21ldGFmb3JtLXdyYXBwZXJ7d2lkdGg6NTAlO2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50ICNtZXRhbGlzdCAjbGlzdF9iYWNrZ3JvdW5kLCNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50ICNtZXRhZm9ybS13cmFwcGVyICNsaXN0X2JhY2tncm91bmR7d2lkdGg6MjM1cHh9I2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI21ldGFsaXN0IHRleHRhcmVhLCNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50ICNtZXRhZm9ybS13cmFwcGVyIHRleHRhcmVhe2hlaWdodDoyMHZofSNjbGlwYm9hcmQgI2NsaXBib2FyZF9jb250ZW50ICNtZXRhbGlzdCAuY2xpcGJvYXJkX2l0ZW0sI2NsaXBib2FyZCAjY2xpcGJvYXJkX2NvbnRlbnQgI21ldGFmb3JtLXdyYXBwZXIgLmNsaXBib2FyZF9pdGVte3dpZHRoOjIzNXB4fVwiO2lmIChzdHlsZS5zdHlsZVNoZWV0KXsgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzOyB9IGVsc2UgeyBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTsgfSBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTt9KCkpIiwiLyogSGVscGVyIGZ1bmN0aW9uIGxvYWRzIHRoZSBuZXh0IGRpcmVjdG9yeSdzIGZpbGVzICovXHJcbmZ1bmN0aW9uIGxvYWRDb250YWluZXIoZm9sZGVyLCB0b3BpY19ub2RlLCB0b3BpY19ub2RlcywgY29udGVudF9ub2RlcywgY29udGFpbmVyX251bWJlciwgZWRpdCwgcmVuZGVyaW5nKXtcclxuXHR2YXIgY2hhbm5lbF90ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuLy4uL2hidGVtcGxhdGVzL2NvbnRlbnRfY29udGFpbmVyLmhhbmRsZWJhcnNcIik7XHJcblx0dmFyIGZvbGRlcl90ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuLy4uL2hidGVtcGxhdGVzL2NvbnRlbnRfZm9sZGVyLmhhbmRsZWJhcnNcIik7XHJcblx0dmFyIGZpbGVfdGVtcGxhdGUgPSByZXF1aXJlKFwiLi8uLi9oYnRlbXBsYXRlcy9jb250ZW50X2ZpbGUuaGFuZGxlYmFyc1wiKTtcclxuXHR2YXIgRE9NSGVscGVyID0gcmVxdWlyZShcImVkaXRfY2hhbm5lbC91dGlscy9ET01IZWxwZXJcIik7XHJcblx0aWYoIXJlbmRlcmluZyl7XHJcblx0XHR2YXIgaW5kID0gZm9sZGVyLnBhcmVudE5vZGUuZ2V0QXR0cmlidXRlKCdkYXRhLXZhbCcpO1xyXG5cdFx0d2hpbGUoY29udGFpbmVyX251bWJlciAtIGluZCA+PSAxKXsgLy9vcGVuaW5nIGZvbGRlciBmcm9tIGVhcmxpZXIgZGlyZWN0b3J5XHJcblx0XHRcdCQoXCIjY29udGFpbmVyX1wiK2NvbnRhaW5lcl9udW1iZXIpLnJlbW92ZSgpO1xyXG5cdFx0XHRjb250YWluZXJfbnVtYmVyLS07XHJcblx0XHR9XHJcblx0XHR2YXIgbm90U2VsZWN0ZWQgPSAkKFwiI2NvbnRhaW5lcl9cIitjb250YWluZXJfbnVtYmVyKS5maW5kKCcuZm9sZGVyJyk7XHJcblx0XHQkKFwiI2NvbnRhaW5lcl9cIitjb250YWluZXJfbnVtYmVyICsgXCIgbGFiZWxcIikub2ZmKCk7XHJcblx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbm90U2VsZWN0ZWQubGVuZ3RoOyBpKyspe1xyXG5cdFx0XHRpZihub3RTZWxlY3RlZFtpXS5wYXJlbnROb2RlLmlkLmluZGV4T2YoXCJuZXdcIikgPj0gMCkgY29udGludWU7XHJcblx0XHRcdC8vIFRvZG86IE1pZ2h0IGJlIGJldHRlciB0byBmaWd1cmUgb3V0IFwiZGVmYXVsdFwiIGZvbGRlciBzZXR0aW5ncyBieSBhY2Nlc3NpbmcgbGVzcyB2YXJpYWJsZXNcclxuXHRcdFx0bm90U2VsZWN0ZWRbaV0uc3R5bGUuYmFja2dyb3VuZENvbG9yPVwid2hpdGVcIjtcclxuXHRcdFx0bm90U2VsZWN0ZWRbaV0uc3R5bGUuYm9yZGVyPVwibm9uZVwiO1xyXG5cdFx0XHRub3RTZWxlY3RlZFtpXS5zdHlsZS53aWR0aCA9IFwiMjkycHhcIjtcclxuXHRcdFx0bm90U2VsZWN0ZWRbaV0uc3R5bGUucGFkZGluZ1JpZ2h0ID0gXCIwcHhcIjtcclxuXHRcdH1cclxuXHRcdGZvbGRlci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3I9IChlZGl0KSA/IFwiI0NDQ0NDQ1wiIDogXCIjODdBM0M2XCI7XHJcblx0XHRmb2xkZXIuc3R5bGUuYm9yZGVyPVwiNHB4IHNvbGlkIHdoaXRlXCI7XHJcblx0XHRmb2xkZXIuc3R5bGUuYm9yZGVyUmlnaHQ9XCJub25lXCI7XHJcblx0XHRmb2xkZXIuc3R5bGUuYm94U2hhZG93PVwibm9uZVwiO1xyXG5cdFx0JChcIiNcIiArIERPTUhlbHBlci5nZXRQYXJlbnRPZkNsYXNzKGZvbGRlciwgXCJjb250ZW50LWNvbnRhaW5lclwiKS5pZCArIFwiIC5jb250ZW50LWxpc3RcIikuY3NzKFwiYm9yZGVyXCIsIFwibm9uZVwiKTtcclxuXHRcdFxyXG5cdFx0LyogQXR0YWNoIGV2ZW50IGxpc3RlbmVyIHRvIG9wZW5lZCBmb2xkZXIgKi9cclxuXHRcdCQoXCIjXCIgKyBmb2xkZXIucGFyZW50Tm9kZS5pZCArIFwiIGxhYmVsXCIpLm9uKFwib2Zmc2V0X2NoYW5nZWRcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGNvbnRhaW5lciA9ICQoXCIjXCIgKyBET01IZWxwZXIuZ2V0UGFyZW50T2ZDbGFzcyhmb2xkZXIsIFwiY29udGVudC1jb250YWluZXJcIikuaWQgKyBcIiAuY29udGVudC1saXN0XCIpO1xyXG5cdFx0XHR2YXIgZWwgPSAkKFwiI1wiICsgZm9sZGVyLnBhcmVudE5vZGUuaWQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYoY29udGFpbmVyLm9mZnNldCgpLnRvcCA+IGVsLm9mZnNldCgpLnRvcCArIGVsLmhlaWdodCgpKVxyXG5cdFx0XHRcdGNvbnRhaW5lci5jc3MoXCJib3JkZXItdG9wXCIsIFwiNHB4IHNvbGlkIHdoaXRlXCIpO1xyXG5cdFx0XHRlbHNlIGlmIChjb250YWluZXIub2Zmc2V0KCkudG9wICsgY29udGFpbmVyLmhlaWdodCgpIDwgZWwub2Zmc2V0KCkudG9wKVxyXG5cdFx0XHRcdGNvbnRhaW5lci5jc3MoXCJib3JkZXItYm90dG9tXCIsIFwiNHB4IHNvbGlkIHdoaXRlXCIpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0Y29udGFpbmVyLmNzcyhcImJvcmRlclwiLCBcIm5vbmVcIik7XHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0JChcIiNcIiArIGZvbGRlci5wYXJlbnROb2RlLmlkICsgXCIgbGFiZWxcIikub25PZmZzZXRDaGFuZ2VkKGZ1bmN0aW9uKCl7XHJcblx0XHRcdCAkKFwiI1wiICsgZm9sZGVyLnBhcmVudE5vZGUuaWQgKyBcIiBsYWJlbFwiKS50cmlnZ2VyKCdvZmZzZXRfY2hhbmdlZCcpO1xyXG5cdFx0fSk7XHJcblx0XHQkKFwiI1wiICsgZm9sZGVyLnBhcmVudE5vZGUuaWQgKyBcIiBsYWJlbFwiKS5hbmltYXRlKHt3aWR0aDogJzM0MHB4J30sIHsgcXVldWU6IGZhbHNlIH0pO1xyXG5cdFx0JChcIiNcIiArIGZvbGRlci5wYXJlbnROb2RlLmlkICsgXCIgbGFiZWxcIikuYW5pbWF0ZSh7cGFkZGluZ1JpZ2h0OiAnNDlweCd9LCB7IHF1ZXVlOiBmYWxzZSB9KTtcclxuXHR9XHJcblx0XHJcblx0LyogQ3JlYXRlIHVuaXF1ZSBpZCBmb3IgbmV4dCBjb250YWluZXIgKi9cclxuXHRjb250YWluZXJfbnVtYmVyKys7XHJcblx0dmFyIGNvbnRhaW5lcmlkID0gXCIjY29udGFpbmVyX1wiICsgY29udGFpbmVyX251bWJlcjtcclxuXHQvLyQoXCIjY29udGFpbmVyX1wiKyhjb250YWluZXJfbnVtYmVyLTEpKS5jc3MoJ3otaW5kZXgnLCAnMTAwJyk7XHJcblx0XHJcblx0Ly9oYW5kbGUgdGl0bGVzIHRoYXQgYXJlIHRvbyBsb25nXHJcblx0dmFyIHRpdGxlID0gdG9waWNfbm9kZS5hdHRyaWJ1dGVzLnRpdGxlO1xyXG5cdCQoY29udGFpbmVyaWQpLmRhdGEoXCJjaGFubmVsXCIsIHRvcGljX25vZGUpO1xyXG5cdGlmKGVkaXQpIGhhbmRsZURyb3AoY29udGFpbmVyaWQpO1xyXG5cclxuXHQkKFwiI2NvbnRhaW5lcl9hcmVhXCIpLmFwcGVuZChjaGFubmVsX3RlbXBsYXRlKHt0aXRsZTogdGl0bGUsIGluZGV4OiBjb250YWluZXJfbnVtYmVyLCB0b3BpYzogdG9waWNfbm9kZS5hdHRyaWJ1dGVzLCBlZGl0OiBlZGl0fSkpO1xyXG5cdCQoXCIjY29udGFpbmVyX2FyZWFcIikuY3NzKFwid2lkdGhcIiwgJChcIiNjb250YWluZXJfXCIgKyBjb250YWluZXJfbnVtYmVyKS5pbm5lcldpZHRoKCkgKiAoY29udGFpbmVyX251bWJlciArIDEpKTtcclxuXHQkKGNvbnRhaW5lcmlkKS5jc3MoeydtYXJnaW4tbGVmdCc6IC0kKGNvbnRhaW5lcmlkKS5vdXRlcldpZHRoKCksXHJcblx0XHRcdFx0XHRcdCd6LWluZGV4JzogMTAwMCAtIGNvbnRhaW5lcl9udW1iZXJ9KTtcclxuXHQkKGNvbnRhaW5lcmlkICsgXCIgLmNvbnRhaW5lci1pbnRlcmlvclwiKS5jc3MoJ21hcmdpbi10b3AnLCAoLSQoY29udGFpbmVyaWQgKyBcIiAudGl0bGUtYmFyXCIpLmhlaWdodCgpICsgMjIpICsgXCJweFwiKTtcclxuXHQkKGNvbnRhaW5lcmlkICsgXCIgY2FudmFzXCIpLmNzcygnbWFyZ2luLXRvcCcsICgtJChjb250YWluZXJpZCArIFwiIC50aXRsZS1iYXJcIikuaGVpZ2h0KCkgKyAyMikgKyBcInB4XCIpO1xyXG5cdCQoY29udGFpbmVyaWQgKyBcIiAuY29udGVudC1saXN0XCIpLmhlaWdodCgoJChjb250YWluZXJpZCArIFwiIGNhbnZhc1wiKS5oZWlnaHQoKSAtICQoY29udGFpbmVyaWQgKyBcIiAudGl0bGUtYmFyXCIpLmhlaWdodCgpICsgNikgKyBcInB4XCIpO1xyXG5cdCQoY29udGFpbmVyaWQpLmFuaW1hdGUoe1xyXG5cdFx0bWFyZ2luTGVmdDogcGFyc2VJbnQoJChjb250YWluZXJpZCkuY3NzKCdtYXJnaW5MZWZ0JyksMTApID09IDA/XHJcblx0XHRcdCQoY29udGFpbmVyaWQpLm91dGVyV2lkdGgoKSA6IDBcclxuXHR9KTtcclxuXHRcclxuXHR2YXIgdGV4dEhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvVGV4dEhlbHBlclwiKTtcclxuXHRcclxuXHQvKiBSZXRyZWl2ZSBhbGwgY29udGVudCBub2RlcyB0aGF0IGFyZSBhIGNoaWxkIG9mIHBhcmVudCAqL1xyXG5cdC8qIFRvZG86IGZpZ3VyZSBvdXQgYmV0dGVyIHdheSBvZiBkb2luZyB0aGlzLi4uICovXHJcblx0dmFyIGxpc3RfaW5kZXggPSAwO1xyXG5cdHRvcGljX25vZGVzLmZvckVhY2goZnVuY3Rpb24oZW50cnkpe1xyXG5cdFx0aWYoZW50cnkuYXR0cmlidXRlcy5wYXJlbnQgPT0gdG9waWNfbm9kZSl7XHJcblx0XHRcdCQoY29udGFpbmVyaWQgKyBcIiB1bFwiKS5hcHBlbmQoZm9sZGVyX3RlbXBsYXRlKHtpbmRleDogY29udGFpbmVyX251bWJlciwgbGlzdF9pbmRleDogbGlzdF9pbmRleCwgZm9sZGVyOiBlbnRyeS5hdHRyaWJ1dGVzLCBlZGl0OiBlZGl0fSkpO1xyXG5cdFx0XHR2YXIgaXRlbWlkID0gXCIjaXRlbV9cIitjb250YWluZXJfbnVtYmVyK1wiX1wiK2xpc3RfaW5kZXg7XHJcblx0XHRcdCQoaXRlbWlkKS5kYXRhKFwiZGF0YVwiLGVudHJ5KTtcclxuXHRcdFx0aWYoZWRpdCkgaGFuZGxlRHJhZyhpdGVtaWQpO1xyXG5cdFx0XHQkKGl0ZW1pZCArIFwiIGgzXCIpLmh0bWwodGV4dEhlbHBlci50cmltVGV4dCgkKGl0ZW1pZCArIFwiIGgzXCIpLnRleHQoKSwgXCIuLi5cIiwgMjIsIGZhbHNlKSk7XHJcblx0XHRcdCQoaXRlbWlkICsgXCIgcFwiKS5odG1sKHRleHRIZWxwZXIudHJpbVRleHQoJChpdGVtaWQgKyBcIiBwXCIpLnRleHQoKSwgXCIuLi4gcmVhZCBtb3JlXCIsIDEyMCwgdHJ1ZSkpO1xyXG5cdFx0XHRsaXN0X2luZGV4ICsrO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cdFxyXG5cdGNvbnRlbnRfbm9kZXMuZm9yRWFjaChmdW5jdGlvbihlbnRyeSl7XHJcblx0XHRpZihlbnRyeS5hdHRyaWJ1dGVzLnBhcmVudCA9PSB0b3BpY19ub2RlKXtcclxuXHRcdFx0JChjb250YWluZXJpZCsgXCIgdWxcIikuYXBwZW5kKGZpbGVfdGVtcGxhdGUoe2luZGV4OiBjb250YWluZXJfbnVtYmVyLCBsaXN0X2luZGV4OiBsaXN0X2luZGV4LCBmaWxlOiBlbnRyeS5hdHRyaWJ1dGVzLCBlZGl0OiBlZGl0fSkpO1xyXG5cdFx0XHR2YXIgaXRlbWlkID0gXCIjaXRlbV9cIitjb250YWluZXJfbnVtYmVyK1wiX1wiK2xpc3RfaW5kZXg7XHJcblx0XHRcdCQoaXRlbWlkKS5kYXRhKFwiZGF0YVwiLCBlbnRyeSk7XHJcblx0XHRcdCQoaXRlbWlkICsgXCIgaDRcIikuaHRtbCh0ZXh0SGVscGVyLnRyaW1UZXh0KCQoaXRlbWlkICsgXCIgaDRcIikudGV4dCgpLCBcIi4uLlwiLCAyNSwgZmFsc2UpKTtcclxuXHRcdFx0aWYoZWRpdCkgaGFuZGxlRHJhZyhpdGVtaWQpO1xyXG5cdFx0XHRsaXN0X2luZGV4ICsrO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRpZihsaXN0X2luZGV4ID09MClcclxuXHRcdCQoY29udGFpbmVyaWQgKyBcIiB1bFwiKS5hcHBlbmQoXCI8aDUgY2xhc3M9XFxcImRlZmF1bHQtaXRlbVxcXCI+Tm8gY29udGVudCBmb3VuZC48L2g1PlwiKTtcclxuXHRcclxuXHRyZXR1cm4gY29udGFpbmVyX251bWJlcjtcclxufVxyXG5cclxuXHJcbi8qIEhlbHBlciBmdW5jdGlvbiBsb2FkcyBwcmV2aWV3ZXIgKi9cclxuZnVuY3Rpb24gbG9hZExpc3Qocm9vdF9ub2RlLCBtb2RlbCwgZm9sZGVyX3RlbXBsYXRlLCBmaWxlX3RlbXBsYXRlLCBsaXN0X2lkLCBpbmRlbnQsIG9wdGlvbnMsIGxpc3RfaW5kZXgsIGluZGVudGVyKXtcdFxyXG5cdG1vZGVsLnRvcGljbm9kZXMuZm9yRWFjaChmdW5jdGlvbihlbnRyeSl7XHJcblx0XHRpZihlbnRyeS5hdHRyaWJ1dGVzLnBhcmVudCA9PSByb290X25vZGUpe1xyXG5cdFx0XHQkKGxpc3RfaWQpLmFwcGVuZChmb2xkZXJfdGVtcGxhdGUoe2luZGV4OiBsaXN0X2luZGV4LCBmaWxlOiBlbnRyeS5hdHRyaWJ1dGVzLCBmb2xkZXI6IHRydWUsIGZpbGVfaWNvbjogXCJmb2xkZXItb3BlblwiLCBvcHRpb25zOiBvcHRpb25zfSkpO1xyXG5cdFx0XHQkKFwiI2l0ZW1fXCIrbGlzdF9pbmRleCkuZGF0YShcImRhdGFcIixlbnRyeSk7XHJcblx0XHRcdCQoXCIjaXRlbV9cIitsaXN0X2luZGV4KS5kYXRhKFwiY29sbGFwc2VkXCIsIHRydWUpO1xyXG5cdFx0XHQkKFwiI2l0ZW1fXCIrbGlzdF9pbmRleCtcIiBsYWJlbFwiKS5jc3MoXCJtYXJnaW4tbGVmdFwiLCAgaW5kZW50KmluZGVudGVyICsgXCJweFwiKTtcclxuXHRcdFx0JChcIiNpdGVtX1wiK2xpc3RfaW5kZXgrXCIgbGFiZWxcIikud2lkdGgoJChcIiNpdGVtX1wiK2xpc3RfaW5kZXgrXCIgbGFiZWxcIikud2lkdGgoKSAtIChpbmRlbnQqaW5kZW50ZXIpKTtcclxuXHRcdFx0dmFyIHRlbXBfaW5kZXggPSBsb2FkTGlzdChlbnRyeSwgbW9kZWwsIGZvbGRlcl90ZW1wbGF0ZSwgZmlsZV90ZW1wbGF0ZSwgXCIjaXRlbV9cIitsaXN0X2luZGV4K1wiX3N1YlwiLCBpbmRlbnQsIG9wdGlvbnMsIGxpc3RfaW5kZXggKyAxLCBpbmRlbnRlciArIDEpO1xyXG5cdFx0XHRpZih0ZW1wX2luZGV4ID09IGxpc3RfaW5kZXggKyAxKXsgLy9ObyBzdWIgaXRlbXMgZm91bmRcclxuXHRcdFx0XHQkKFwiI2l0ZW1fXCIrbGlzdF9pbmRleCtcIiBsYWJlbCAudG9nX2ZvbGRlclwiKS5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XHJcblx0XHRcdFx0JChcIiNpdGVtX1wiK2xpc3RfaW5kZXgrXCIgbGFiZWwgLnRvZ19mb2xkZXJcIikuY3NzKFwiY3Vyc29yXCIsIFwibm90LWFsbG93ZWRcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0bGlzdF9pbmRleCA9IHRlbXBfaW5kZXg7XHJcblx0XHR9XHJcblx0fSk7XHJcblx0bW9kZWwuY29udGVudG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZW50cnkpe1xyXG5cdFx0aWYoZW50cnkuYXR0cmlidXRlcy5wYXJlbnQgPT0gcm9vdF9ub2RlKXtcclxuXHRcdFx0dmFyIGZpbGVfdHlwZSA9IFwiXCI7IC8vZ2V0RXh0ZW5zaW9uKHRoaXMuZmlsZS5kYXRhKFwiZGF0YVwiKS5hdHRyaWJ1dGVzLmNvbnRlbnRfZmlsZS5bZmlsZW5hbWVdKTtcclxuXHRcdFx0dmFyIGljb247XHJcblx0XHRcdHN3aXRjaChmaWxlX3R5cGUpe1xyXG5cdFx0XHRcdGNhc2UgXCJwZGZcIjpcclxuXHRcdFx0XHRcdGljb24gPSBcImZpbGVcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ200dic6XHJcblx0XHRcdFx0Y2FzZSAnYXZpJzpcclxuXHRcdFx0XHRjYXNlICdtcGcnOlxyXG5cdFx0XHRcdGNhc2UgJ21wNCc6XHJcblx0XHRcdFx0XHRpY29uID0gXCJ2b2x1bWUtdXBcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6IC8vdmlkZW8gYnkgZGVmYXVsdFxyXG5cdFx0XHRcdFx0aWNvbiA9IFwiZmFjZXRpbWUtdmlkZW9cIjtcclxuXHRcdFx0fVxyXG5cdFx0XHQkKGxpc3RfaWQpLmFwcGVuZChmaWxlX3RlbXBsYXRlKHtpbmRleDogbGlzdF9pbmRleCwgZmlsZTogZW50cnkuYXR0cmlidXRlcywgZm9sZGVyOiBmYWxzZSwgZmlsZV9pY29uOiBpY29uLCBvcHRpb25zOiBvcHRpb25zfSkpO1xyXG5cdFx0XHQkKFwiI2l0ZW1fXCIrbGlzdF9pbmRleCkuZGF0YShcImRhdGFcIiwgZW50cnkpO1xyXG5cdFx0XHQkKFwiI2l0ZW1fXCIrbGlzdF9pbmRleCkuZGF0YShcImNvbGxhcHNlZFwiLCB0cnVlKTtcclxuXHRcdFx0JChcIiNpdGVtX1wiK2xpc3RfaW5kZXgrXCIgbGFiZWxcIikuY3NzKFwibWFyZ2luLWxlZnRcIiwgIGluZGVudCppbmRlbnRlciArIFwicHhcIik7XHJcblx0XHRcdCQoXCIjaXRlbV9cIitsaXN0X2luZGV4K1wiIGxhYmVsXCIpLndpZHRoKCQoXCIjaXRlbV9cIitsaXN0X2luZGV4K1wiIGxhYmVsXCIpLndpZHRoKCkgLSAoaW5kZW50KmluZGVudGVyKSk7XHJcblx0XHRcdGxpc3RfaW5kZXggKys7XHJcblx0XHR9XHJcblx0fSk7XHJcblx0cmV0dXJuIGxpc3RfaW5kZXg7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBhcHBlbmRMaXN0KGZpbGUsdGVtcGxhdGUsIGxpc3RfaWQsIGluZGV4KVxyXG57XHJcblx0JChsaXN0X2lkKS5hcHBlbmQodGVtcGxhdGUoe2luZGV4OiBpbmRleCwgZmlsZTogZmlsZS5hdHRyaWJ1dGVzfSkpO1xyXG5cdCQoXCIjaXRlbV9cIitpbmRleCkuZGF0YShcImRhdGFcIiwgZmlsZSk7XHJcblx0JChcIiNpdGVtX1wiK2luZGV4KS5kYXRhKFwiY29sbGFwc2VkXCIsIHRydWUpO1xyXG5cdHJldHVybiBpbmRleCArIDE7XHJcbn1cclxuXHJcbiQuZm4ub25PZmZzZXRDaGFuZ2VkID0gZnVuY3Rpb24gKHRyaWdnZXIsIG1pbGxpcykge1xyXG4gICAgaWYgKG1pbGxpcyA9PSBudWxsKSBtaWxsaXMgPSAxMDA7XHJcbiAgICB2YXIgbyA9ICQodGhpc1swXSk7IC8vIG91ciBqcXVlcnkgb2JqZWN0XHJcbiAgICBpZiAoby5sZW5ndGggPCAxKSByZXR1cm4gbztcclxuXHJcbiAgICB2YXIgbGFzdE9mZiA9IG51bGw7XHJcbiAgICBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKG8gPT0gbnVsbCB8fCBvLmxlbmd0aCA8IDEpIHJldHVybiBvO1xyXG4gICAgICAgIGlmIChsYXN0T2ZmID09IG51bGwpIGxhc3RPZmYgPSBvLm9mZnNldCgpO1xyXG4gICAgICAgIHZhciBuZXdPZmYgPSBvLm9mZnNldCgpO1xyXG4gICAgICAgIGlmIChsYXN0T2ZmLnRvcCAhPSBuZXdPZmYudG9wKSB7XHJcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignb25PZmZzZXRDaGFuZ2VkJywgeyBsYXN0T2ZmOiBsYXN0T2ZmLCBuZXdPZmY6IG5ld09mZn0pO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mICh0cmlnZ2VyKSA9PSBcImZ1bmN0aW9uXCIpIHRyaWdnZXIobGFzdE9mZiwgbmV3T2ZmKTtcclxuICAgICAgICAgICAgbGFzdE9mZj0gby5vZmZzZXQoKTtcclxuICAgICAgICB9XHJcbiAgICB9LCBtaWxsaXMpO1xyXG5cclxuICAgIHJldHVybiBvO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gaGFuZGxlRHJhZyhpdGVtaWQpe1xyXG5cdCQoaXRlbWlkKS5hdHRyKFwiZHJhZ2dhYmxlXCIsIFwidHJ1ZVwiKTtcclxuXHQkKGl0ZW1pZCkub24oXCJkcmFnc3RhcnRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHRlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLnNldERhdGEoXCJkYXRhXCIsICQoXCIjXCIrZS50YXJnZXQuaWQpLmRhdGEoXCJkYXRhXCIpKTtcclxuXHRcdGUudGFyZ2V0LnN0eWxlLm9wYWNpdHkgPSAnMC40JztcclxuXHRcdFxyXG5cdFx0LyogVG9kbzogR28gdGhyb3VnaCBhbGwgY2hlY2tlZCBpdGVtcyB0byBtb3ZlKi9cclxuXHRcdGlmKCQoaXRlbWlkICsgXCIgaW5wdXRbY2hlY2tib3hdXCIpLmNoZWNrZWQpe1xyXG5cdFx0Y29uc29sZS5sb2coXCJDSEVDS0VEXCIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvL2NvbnNvbGUubG9nKGUpO1xyXG5cdH0pO1xyXG5cdCQoaXRlbWlkKS5vbihcImRyYWdlbmRcIiwgZnVuY3Rpb24oZSl7XHJcblx0XHQvL2UudGFyZ2V0LnJlbW92ZSgpO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVEcm9wKGNvbnRhaW5lcmlkKXtcclxuXHQkKGNvbnRhaW5lcmlkKS5vbignZHJhZ292ZXInLCBmdW5jdGlvbihlKXtcclxuXHQvL1x0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0Y29uc29sZS5sb2coXCIgRFJBR0dFRFwiKTtcclxuXHR9KTtcclxuXHQkKGNvbnRhaW5lcmlkKS5vbignZHJhZ2VudGVyJywgZnVuY3Rpb24oZSl7XHJcblx0XHRjb25zb2xlLmxvZyhcIiBFTlRFUkVEXCIpO1xyXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHR9KTtcclxuXHQkKGNvbnRhaW5lcmlkKS5vbignZHJvcCcsIGZ1bmN0aW9uKGUpe1xyXG5cdFx0Ly9lLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkRST1BQRURcIik7XHJcblx0XHR2YXIgZGF0YSA9IGUub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZ2V0RGF0YShcImRhdGFcIik7XHJcblx0XHRjb25zb2xlLmxvZyhkYXRhKTtcclxuXHRcdFxyXG5cdFx0IGlmIChlLnN0b3BQcm9wYWdhdGlvbikge1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpOyAvLyBzdG9wcyB0aGUgYnJvd3NlciBmcm9tIHJlZGlyZWN0aW5nLlxyXG5cdFx0ICB9XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0Ly9jb25zb2xlLmxvZyhlLm9yaWdpbmFsRXZlbnQudGFyZ2V0LmlkICsgXCIgRFJPUFBFRFwiKTtcclxuXHRcdC8vdmFyIGRhdGEgPSBldi5kYXRhO1xyXG5cdFx0LypcclxuXHRcdGlmKGUub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIpe1xyXG5cdFx0XHRpZihlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHVwbG9hZChlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzKTtcclxuXHRcdFx0fSAgIFxyXG5cdFx0fVxyXG5cdFx0Ki9cclxuXHR9KTtcclxufVxyXG5cclxuLypcclxuXHJcbmZ1bmN0aW9uIGhhbmRsZURyYWdTdGFydChlKSB7XHJcbiAgZS50YXJnZXQuc3R5bGUub3BhY2l0eSA9ICcwLjQnOyAgLy8gdGhpcyAvIGUudGFyZ2V0IGlzIHRoZSBzb3VyY2Ugbm9kZS5cclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlRHJhZ092ZXIoZSkge1xyXG4gIGlmIChlLnByZXZlbnREZWZhdWx0KSB7XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7IC8vIE5lY2Vzc2FyeS4gQWxsb3dzIHVzIHRvIGRyb3AuXHJcbiAgfVxyXG5cclxuICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ21vdmUnOyAgLy8gU2VlIHRoZSBzZWN0aW9uIG9uIHRoZSBEYXRhVHJhbnNmZXIgb2JqZWN0LlxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZURyYWdFbnRlcihlKSB7XHJcbiAgLy8gdGhpcyAvIGUudGFyZ2V0IGlzIHRoZSBjdXJyZW50IGhvdmVyIHRhcmdldC5cclxuICB0aGlzLmNsYXNzTGlzdC5hZGQoJ292ZXInKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlRHJhZ0xlYXZlKGUpIHtcclxuICB0aGlzLmNsYXNzTGlzdC5yZW1vdmUoJ292ZXInKTsgIC8vIHRoaXMgLyBlLnRhcmdldCBpcyBwcmV2aW91cyB0YXJnZXQgZWxlbWVudC5cclxufVxyXG4qL1xyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRsb2FkQ29udGFpbmVyOiBsb2FkQ29udGFpbmVyLFxyXG5cdGxvYWRMaXN0OiBsb2FkTGlzdCxcclxuXHRhcHBlbmRMaXN0OiBhcHBlbmRMaXN0XHJcbn0iLCIvKiBIZWxwZXIgZnVuY3Rpb24gdHJpbXMgdGV4dCBpZiBpdCBpcyB0b28gbG9uZyBmb3IgY29udGFpbmVyICovXHJcbmZ1bmN0aW9uIHRyaW1UZXh0KHN0cmluZywgZmlsbGVyLCBsaW1pdCwgbGluayl7XHJcblx0aWYoc3RyaW5nLnRyaW0oKS5sZW5ndGggPiBsaW1pdClcclxuXHRcdHN0cmluZyA9IHN0cmluZy50cmltKCkuc3Vic3RyaW5nKDAsIGxpbWl0IC0gZmlsbGVyLmxlbmd0aCkgKyAoKGxpbmspID8gXCI8YSBjbGFzcz1cXFwiZmlsbGVyXFxcIiB0aXRsZT1cXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCI+XCIgKyBmaWxsZXIgKyBcIjwvYT5cIiA6IGZpbGxlcik7XHJcblx0cmV0dXJuIHN0cmluZztcclxufVxyXG4vKiBIZWxwZXIgZnVuY3Rpb24gZXhwYW5kcyBvciBtaW5pbWl6ZXMgc2l6ZSBvZiBmb2xkZXIgYmFzZWQgb24gZGVzY3JpcHRpb24gbGVuZ3RoKi9cclxuZnVuY3Rpb24gbWFuYWdlRm9sZGVyKGV2ZW50LCBleHBhbmRpbmcpe1xyXG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0dmFyIERPTUhlbHBlciA9IHJlcXVpcmUoXCJlZGl0X2NoYW5uZWwvdXRpbHMvRE9NSGVscGVyXCIpO1xyXG5cdHZhciBlbCA9IFwiI1wiICsgRE9NSGVscGVyLmdldFBhcmVudE9mVGFnKGV2ZW50LnRhcmdldCwgXCJsaVwiKS5pZCArIFwiIGxhYmVsXCI7XHJcblx0XHJcblx0aWYoZXhwYW5kaW5nKVxyXG5cdFx0JChlbCArIFwiIHBcIikuaHRtbCgkKGVsICsgXCIgcCBhXCIpLnByb3AoXCJ0aXRsZVwiKSArIFwiPGJyLz48YSB0aXRsZT1cXFwiXCIgKyAkKGVsICsgXCIgcCBhXCIpLnByb3AoXCJ0aXRsZVwiKSArXCJcXFwiIGNsYXNzPVxcXCJtaW5pbWl6ZVxcXCI+U2VlIExlc3M8L2E+XCIpO1xyXG5cdGVsc2VcclxuXHRcdCQoZWwgKyBcIiBwXCIpLmh0bWwodHJpbVRleHQoJChlbCArIFwiIHAgYVwiKS5wcm9wKFwidGl0bGVcIikgLCBcIi4uLiByZWFkIG1vcmVcIiwgMTIwLCB0cnVlKSk7XHJcblx0JChlbCkuYW5pbWF0ZSh7aGVpZ2h0OiAkKGVsICsgXCIgcFwiKS5oZWlnaHQoKSArIDM1fSk7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0dHJpbVRleHQ6IHRyaW1UZXh0LFxyXG5cdG1hbmFnZUZvbGRlcjogbWFuYWdlRm9sZGVyXHJcbn0iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmluZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmluZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIl9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubGlzdF9pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saXN0X2luZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIvPlxcclxcblx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiPGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiBuYW1lPVxcXCJcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmluZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmluZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIl9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubGlzdF9pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saXN0X2luZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIvPlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxyXFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwiZm9sZGVyX29wdGlvbnMgcHVsbC1yaWdodFxcXCI+XFxyXFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVxcXCJvcHRpb25zXFxcIj5cXHJcXG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcImVkaXRfZm9sZGVyX2J1dHRvbiBnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcIm9wZW5fZm9sZGVyIGdseXBoaWNvbiBnbHlwaGljb24tbWVudS1yaWdodFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRcdDwvZGl2Plxcclxcblx0XHRcdDwvZGl2Plxcclxcblx0XHRcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMTtcbiAgcmV0dXJuIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmZvbGRlcikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGl0bGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiRm9sZGVyIE5hbWVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5mb2xkZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmRlc2NyaXB0aW9uKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKTtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJEZXNjcmlwdGlvbiBvZiB0aGUgZm9sZGVyXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8bGkgaWQ9XFxcIml0ZW1fXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmluZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmluZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIl9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubGlzdF9pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saXN0X2luZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgZGF0YS12YWw9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcclxcblx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0PGxhYmVsIGNsYXNzPVxcXCJmb2xkZXJcXFwiIGZvcj1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmluZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmluZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIl9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubGlzdF9pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saXN0X2luZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5mb2xkZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRpdGxlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlxcclxcblx0XHRcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZWRpdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXHJcXG5cdFx0PGgzPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5mb2xkZXIpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxyXFxuXHRcdDxwIGNsYXNzPVxcXCJkZXNjcmlwdGlvblxcXCI+XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmZvbGRlciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgxMSwgcHJvZ3JhbTExLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXHJcXG5cdDwvbGFiZWw+XFxyXFxuPC9saT5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmluZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmluZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIl9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubGlzdF9pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saXN0X2luZGV4KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIvPlxcclxcblx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiPGlucHV0IHR5cGU9XFxcInJhZGlvXFxcIiBuYW1lPVxcXCJzZWxlY3RlZFxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJfXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmxpc3RfaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAubGlzdF9pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiLz5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIlxcclxcblx0XHRcdDxkaXYgY2xhc3M9XFxcIm9wdGlvbnMgcHVsbC1yaWdodFxcXCI+XFxyXFxuXHRcdFx0XHQ8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wZW5jaWwgZWRpdF9maWxlX2J1dHRvblxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRcdDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXNlYXJjaCBwcmV2aWV3X2J1dHRvblxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHQ8L2Rpdj5cXHJcXG5cdFx0XCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSk7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJDb250ZW50IE5hbWVcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxsaSBpZD1cXFwiaXRlbV9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5saXN0X2luZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmxpc3RfaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXHJcXG5cdFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5lZGl0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXHJcXG5cdDxsYWJlbCBjbGFzcz1cXFwiZmlsZVxcXCIgZm9yPVxcXCJcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5saXN0X2luZGV4KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmxpc3RfaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmZpbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRpdGxlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlx0XFxyXFxuXHRcdFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5lZGl0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0XHQ8aDQ+XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmZpbGUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxyXFxuXHQ8L2xhYmVsPlxcclxcbjwvbGk+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXI7XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0XHRcdFx0PGxpIGNsYXNzPVxcXCJjb250ZW50X29wdGlvbnMgdGV4dC1jZW50ZXJcXFwiPlxcclxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgcHVsbC1sZWZ0IGFkZF9mb2xkZXJfYnV0dG9uXFxcIiBuYW1lPVxcXCJcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudGl0bGUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXHJcXG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzLXNpZ25cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+QWRkIEZvbGRlcjwvYnV0dG9uPlxcclxcblx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgcHVsbC1sZWZ0IGFkZF9jb250ZW50X2J1dHRvblxcXCIgbmFtZT1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLnRpdGxlKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxyXFxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGx1cy1zaWduXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPkFkZCBDb250ZW50PC9idXR0b24+XFxyXFxuXHRcdFx0XHQ8L2xpPlxcclxcblx0XHRcdFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBpZD1cXFwiY29udGFpbmVyX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGNsYXNzPVxcXCJjb250YWluZXIgY29udGVudC1jb250YWluZXIgcHVsbC1sZWZ0XFxcIj5cXHJcXG5cdDxoMiBjbGFzcz1cXFwidGV4dC1jZW50ZXIgdGl0bGUtYmFyXFxcIj5cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudGl0bGUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9oMj5cXHJcXG5cdDxjYW52YXMgY2xhc3M9XFxcInB1bGwtbGVmdFxcXCI+IDwvY2FudmFzPlxcclxcblx0PGRpdiBjbGFzcz1cXFwiY29udGFpbmVyLWludGVyaW9yXFxcIj48L2Rpdj5cXHJcXG5cdDxkaXYgY2xhc3M9XFxcImNvbnRlbnQtbGlzdFxcXCI+XFxyXFxuXHRcdDxzcGFuIGlkPVxcXCJ0b3BfYm9yZGVyXFxcIiBjbGFzcz1cXFwiYm91bmRhcnlcXFwiPiZuYnNwOzwvc3Bhbj5cXHJcXG5cdFx0PHVsIGNsYXNzPVxcXCJsaXN0LXVuc3R5bGVkXFxcIj5cXHJcXG5cdFx0XHRcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZWRpdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXHJcXG5cdFx0PC91bD5cXHJcXG5cdFx0PHNwYW4gaWQ9XFxcImJvdHRvbV9ib3JkZXJcXFwiIGNsYXNzPVxcXCJib3VuZGFyeVxcXCI+Jm5ic3A7PC9zcGFuPlxcclxcblx0PC9kaXY+XFxyXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwiZnVuY3Rpb24gZ2V0UGFyZW50T2ZUYWcoZWwsIHR5cGUpe1xyXG5cdHdoaWxlKGVsLm5vZGVOYW1lICE9IHR5cGUudG9VcHBlckNhc2UoKSlcclxuXHRcdGVsID0gZWwucGFyZW50Tm9kZTtcclxuXHRyZXR1cm4gZWw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBhcmVudE9mQ2xhc3MoZWwsIGNsYXNzTmFtZSl7XHJcblx0d2hpbGUoZWwgJiYgZWwuY2xhc3NOYW1lLmluZGV4T2YoY2xhc3NOYW1lLnRyaW0oKSkgPD0gLTEpXHJcblx0XHRlbCA9IGVsLnBhcmVudE5vZGU7XHJcblx0cmV0dXJuIGVsO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRnZXRQYXJlbnRPZlRhZzogZ2V0UGFyZW50T2ZUYWcsXHJcblx0Z2V0UGFyZW50T2ZDbGFzczogZ2V0UGFyZW50T2ZDbGFzc1xyXG59IiwidmFyIEJhY2tib25lID0gcmVxdWlyZShcImJhY2tib25lXCIpO1xyXG52YXIgXyA9IHJlcXVpcmUoXCJ1bmRlcnNjb3JlXCIpO1xyXG5yZXF1aXJlKFwicHJldmlld2VyLmxlc3NcIik7XHJcblxyXG52YXIgUHJldmlld2VyVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcclxuXHR0ZW1wbGF0ZTogcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvcHJldmlld2VyLmhhbmRsZWJhcnNcIiksXHJcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgICAgIF8uYmluZEFsbCh0aGlzLCAndG9nZ2xlX3ByZXZpZXcnLCAnb3Blbl9wZGYnLCAnb3Blbl9hdWRpbycsICdvcGVuX3ZpZGVvJywgJ3RvZ2dsZV9kZXRhaWxzJywgJ2xvYWRfZGVzY3JpcHRpb24nLCAnbG9hZF9kZXRhaWxzJyk7XHJcbiAgICAgICAgLy90aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOm51bWJlcl9vZl9oZXhhZ29uc1wiLCB0aGlzLnJlbmRlcik7XHJcblx0XHR0aGlzLmZpbGUgPSBvcHRpb25zLmZpbGU7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH0sXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLm1vZGVsKSk7XHJcblx0XHQkKFwiLmZpbGVcIikuY3NzKFwiYm9yZGVyXCIsIFwiMXB4IHNvbGlkIGJsYWNrXCIpO1xyXG5cdFx0JChcIi50cmFzaF9pdGVtXCIpLmNzcyhcImJvcmRlclwiLCBcIjFweCBzb2xpZCAjQ0NDQ0NDXCIpO1xyXG5cdFx0JChcIi5jbGlwYm9hcmRfaXRlbVwiKS5jc3MoXCJib3JkZXJcIiwgXCIxcHggc29saWQgIzhEQTlEQlwiKTtcclxuXHRcdCQodGhpcy5maWxlLnNlbGVjdG9yICsgXCIgbGFiZWxcIikuY3NzKFwiYm9yZGVyXCIsIFwiNHB4IHNvbGlkICM4MDk4RDJcIik7XHJcblx0XHRcclxuXHRcdFxyXG5cdFx0dmFyIGNvbnRlbnRfdmlldztcclxuXHRcdHZhciBmaWxlX3R5cGUgPSBcIlwiOy8vZ2V0RXh0ZW5zaW9uKHRoaXMubW9kZWwuYXR0cmlidXRlcy5jb250ZW50X2ZpbGUubmFtZSk7XHJcblx0XHRzd2l0Y2goZmlsZV90eXBlKXtcclxuXHRcdFx0Y2FzZSBcInBkZlwiOlxyXG5cdFx0XHRcdGNvbnRlbnRfdmlldyA9ICByZXF1aXJlKFwiLi9oYnRlbXBsYXRlcy9wcmV2aWV3ZXJfcGRmLmhhbmRsZWJhcnNcIik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgJ200dic6XHJcblx0XHRcdGNhc2UgJ2F2aSc6XHJcblx0XHRcdGNhc2UgJ21wZyc6XHJcblx0XHRcdGNhc2UgJ21wNCc6XHJcblx0XHRcdFx0Y29udGVudF92aWV3ID0gIHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL3ByZXZpZXdlcl9hdWRpby5oYW5kbGViYXJzXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlICdtcDQnOlxyXG5cdFx0XHRjYXNlICd3ZWJtJzpcclxuXHRcdFx0Y2FzZSAnb2d2JzpcclxuXHRcdFx0Y2FzZSAnb2dnJzpcclxuXHRcdFx0Y2FzZSAnYXZpJzpcclxuXHRcdFx0Y2FzZSAnbW92JzpcclxuXHRcdFx0Y2FzZSAnd212JzpcclxuXHRcdFx0XHRjb250ZW50X3ZpZXcgPSAgcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvcHJldmlld2VyX3ZpZGVvLmhhbmRsZWJhcnNcIik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0Y29udGVudF92aWV3ID0gIHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL3ByZXZpZXdlcl9maWxsZXIuaGFuZGxlYmFyc1wiKTtcclxuXHRcdH1cclxuXHRcdCQoXCIjcHJldmlld193aW5kb3dcIikuYXBwZW5kKGNvbnRlbnRfdmlldyh7ZmlsZTogdGhpcy5tb2RlbH0pKTtcclxuXHRcdHZhciBwYXJlbnRfZGF0YSA9IHRoaXMubW9kZWw7XHJcblx0XHR3aGlsZShwYXJlbnRfZGF0YS5hdHRyaWJ1dGVzLnBhcmVudCl7XHJcblx0XHRcdHBhcmVudF9kYXRhID0gcGFyZW50X2RhdGEuYXR0cmlidXRlcy5wYXJlbnQ7XHJcblx0XHRcdCQoXCIuYnJlYWRjcnVtYlwiKS5wcmVwZW5kKFwiPGxpPlwiICsgcGFyZW50X2RhdGEuYXR0cmlidXRlcy50aXRsZSArIFwiPC9saT5cIik7XHJcblx0XHR9XHJcblx0XHQkKFwiLmRldGFpbHNcIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XHJcblx0XHQkKFwiI3ByZXZpZXdlclwiKS5jc3MoXCJtYXJnaW4tcmlnaHRcIiwgLSAkKFwiI3ByZXZpZXdlclwiKS5vdXRlcldpZHRoKCkpO1xyXG5cdFx0JChcIiNwcmV2aWV3ZXJcIikuYW5pbWF0ZSh7XHJcblx0XHRcdG1hcmdpblJpZ2h0OiBwYXJzZUludCgkKFwiI3ByZXZpZXdlclwiKS5jc3MoJ21hcmdpblJpZ2h0JyksMTApID09IDAgP1xyXG5cdFx0XHRcdCQoXCIjcHJldmlld2VyXCIpLm91dGVyV2lkdGgoKSA6IDBcclxuXHRcdH0pOyBcclxuICAgIH0sXHJcblx0XHRcclxuXHRldmVudHM6IHtcclxuXHRcdCdjbGljayAudG9nZ2xlX3ByZXZpZXdlcic6ICd0b2dnbGVfcHJldmlldycsXHJcblx0XHQnY2xpY2sgLnRvZ2dsZV9kZXRhaWxzJzondG9nZ2xlX2RldGFpbHMnLFxyXG5cdFx0J2NsaWNrICNkZXNjcmlwdGlvbl9uYXYnIDogJ2xvYWRfZGVzY3JpcHRpb24nLFxyXG5cdFx0J2NsaWNrICNkZXRhaWxfbmF2JyA6ICdsb2FkX2RldGFpbHMnLFxyXG5cdFx0J2NsaWNrIC5wZGZfc2FtcGxlJzogJ29wZW5fcGRmJyxcclxuXHRcdCdjbGljayAuYXVkaW9fc2FtcGxlJzogJ29wZW5fYXVkaW8nLFxyXG5cdFx0J2NsaWNrIC52aWRlb19zYW1wbGUnOiAnb3Blbl92aWRlbydcclxuXHRcdFxyXG5cdH0sXHJcblxyXG5cdHRvZ2dsZV9wcmV2aWV3OiBmdW5jdGlvbihldmVudCl7XHJcblx0XHQkKFwiLmZpbGVcIikuY3NzKFwiYm9yZGVyXCIsIFwiMXB4IHNvbGlkIGJsYWNrXCIpO1xyXG5cdFx0JChcIiNwcmV2aWV3ZXJcIikuaGlkZSgpO1xyXG5cdH0sXHJcblx0dG9nZ2xlX2RldGFpbHM6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdGlmKCQoXCIudG9nZ2xlX2RldGFpbHNcIikuaGFzQ2xhc3MoXCJnbHlwaGljb24tbWVudS1kb3duXCIpKXtcclxuXHRcdFx0JChcIi50b2dnbGVfZGV0YWlsc1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJwdWxsLXJpZ2h0IHRvZ2dsZV9kZXRhaWxzIGdseXBoaWNvbiBnbHlwaGljb24tbWVudS11cFwiKTtcclxuXHRcdFx0JChcIi5kZXRhaWxzXCIpLnNsaWRlRG93bigpO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0JChcIi50b2dnbGVfZGV0YWlsc1wiKS5hdHRyKFwiY2xhc3NcIiwgXCJwdWxsLXJpZ2h0IHRvZ2dsZV9kZXRhaWxzIGdseXBoaWNvbiBnbHlwaGljb24tbWVudS1kb3duXCIpO1xyXG5cdFx0XHQkKFwiLmRldGFpbHNcIikuc2xpZGVVcCgpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0XHJcblx0bG9hZF9kZXNjcmlwdGlvbjogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0JChcIiNkZXNjcmlwdGlvbl9uYXZcIikuY3NzKFwiYm9yZGVyLWJvdHRvbVwiLCBcIjVweCBzb2xpZCAjOERBOURCXCIpO1xyXG5cdFx0JChcIiNkZXRhaWxfbmF2XCIpLmNzcyhcImJvcmRlci1ib3R0b21cIiwgXCIxcHggc29saWQgYmxhY2tcIik7XHJcblx0XHQkKFwiI2ZpbGVfZGV0YWlsX2luZm9cIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XHJcblx0XHQkKFwiI2ZpbGVfZGVzY3JpcHRpb25faW5mb1wiKS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XHJcblx0fSxcclxuXHRcclxuXHRsb2FkX2RldGFpbHM6IGZ1bmN0aW9uKGV2ZW50KXtcclxuXHRcdCQoXCIjZGV0YWlsX25hdlwiKS5jc3MoXCJib3JkZXItYm90dG9tXCIsIFwiNXB4IHNvbGlkICM4REE5REJcIik7XHJcblx0XHQkKFwiI2Rlc2NyaXB0aW9uX25hdlwiKS5jc3MoXCJib3JkZXItYm90dG9tXCIsIFwiMXB4IHNvbGlkIGJsYWNrXCIpO1xyXG5cdFx0JChcIiNmaWxlX2Rlc2NyaXB0aW9uX2luZm9cIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XHJcblx0XHQkKFwiI2ZpbGVfZGV0YWlsX2luZm9cIikuY3NzKFwiZGlzcGxheVwiLCBcImJsb2NrXCIpO1xyXG5cdH0sXHJcblx0XHJcblx0LyogR29pbmcgdG8gYmUgZGV0ZXJtaW5lZCBieSB0aGlzLmZpbGVfdHlwZSAodGVzdGluZyBwdXJwb3NlcyBvbmx5KSAqL1xyXG5cdG9wZW5fcGRmOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR0aGlzLmZpbGVfdHlwZSA9IFwicGRmXCI7XHJcblx0XHR2YXIgY29udGVudF92aWV3ID0gIHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL3ByZXZpZXdlcl9wZGYuaGFuZGxlYmFyc1wiKTtcclxuXHRcdCQoXCIjcHJldmlld193aW5kb3dcIikuZW1wdHkoKTtcclxuXHRcdCQoXCIjcHJldmlld193aW5kb3dcIikuYXBwZW5kKGNvbnRlbnRfdmlldyh0aGlzLm1vZGVsKSk7XHJcblx0fSxcclxuXHRvcGVuX2F1ZGlvOiBmdW5jdGlvbihldmVudCl7XHJcblx0XHR0aGlzLmZpbGVfdHlwZSA9IFwiYXVkaW9cIjtcclxuXHRcdHZhciBjb250ZW50X3ZpZXcgPSAgcmVxdWlyZShcIi4vaGJ0ZW1wbGF0ZXMvcHJldmlld2VyX2F1ZGlvLmhhbmRsZWJhcnNcIik7XHJcblx0XHQkKFwiI3ByZXZpZXdfd2luZG93XCIpLmVtcHR5KCk7XHJcblx0XHQkKFwiI3ByZXZpZXdfd2luZG93XCIpLmFwcGVuZChjb250ZW50X3ZpZXcodGhpcy5tb2RlbCkpO1xyXG5cdH0sXHJcblx0b3Blbl92aWRlbzogZnVuY3Rpb24oZXZlbnQpe1xyXG5cdFx0dGhpcy5maWxlX3R5cGUgPSBcInZpZGVvXCI7XHJcblx0XHR2YXIgY29udGVudF92aWV3ID0gIHJlcXVpcmUoXCIuL2hidGVtcGxhdGVzL3ByZXZpZXdlcl92aWRlby5oYW5kbGViYXJzXCIpO1xyXG5cdFx0JChcIiNwcmV2aWV3X3dpbmRvd1wiKS5lbXB0eSgpO1xyXG5cdFx0JChcIiNwcmV2aWV3X3dpbmRvd1wiKS5hcHBlbmQoY29udGVudF92aWV3KHRoaXMubW9kZWwpKTtcclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0UHJldmlld2VyVmlldzogUHJldmlld2VyVmlld1xyXG59IiwiKGZ1bmN0aW9uKCkgeyB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07IHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7IHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO3ZhciBjc3MgPSBcIkBmb250e2ZvbnQtZmFtaWx5OlxcXCJPcGVuIFNhbnNcXFwiO3NyYzp1cmwoXFxcIi4uL2ZvbnRzL09wZW5TYW5zLVJlZ3VsYXIudHRmXFxcIikgZm9ybWF0KFxcXCJ0cnVldHlwZVxcXCIpfS5pbmxpbmUtYmxvY2t7ZGlzcGxheTppbmxpbmUtYmxvY2t9Ym9keXtiYWNrZ3JvdW5kOiMyOTJhMmJ9YXt0ZXh0LWRlY29yYXRpb246bm9uZTtjdXJzb3I6cG9pbnRlcjtjb2xvcjpibGFja30jcHJldmlld2Vye3dpZHRoOjQwdnc7bWluLXdpZHRoOjUwMHB4O2JvcmRlcjoycHggc29saWQgI2E0YWFiMDtiYWNrZ3JvdW5kLWNvbG9yOiNlOWVhZWE7b3ZlcmZsb3cteTphdXRvO292ZXJmbG93LXg6aGlkZGVuO21hcmdpbjotMjBweCAwIDAgLTEwcHg7aGVpZ2h0OjEwMHZoO21pbi1oZWlnaHQ6NjAwcHg7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDo1MDAwMDtyaWdodDowO3RvcDo4LjVlbTtib3gtc2hhZG93Oi03cHggMTBweCA1cHggYmxhY2s7cGFkZGluZy1yaWdodDoxNXB4fSNwcmV2aWV3ZXIgaDIsI3ByZXZpZXdlciBoM3tmb250LXNpemU6MjBweH0jcHJldmlld2VyICN0aXRsZXtib3JkZXItYm90dG9tOjNweCBzb2xpZCBibGFja30jcHJldmlld2VyIGgze3BhZGRpbmctdG9wOjEwcHg7cGFkZGluZy1ib3R0b206NXB4O21hcmdpbi1ib3R0b206MTBweH0jcHJldmlld2VyIC5nbHlwaGljb257Zm9udC1zaXplOjIwcHg7bWFyZ2luLWxlZnQ6MTBweDtjdXJzb3I6cG9pbnRlcn0jcHJldmlld2VyIC50YWd7YmFja2dyb3VuZC1jb2xvcjojZDZkM2QzO2JvcmRlcjoxcHggc29saWQgYmxhY2s7bWFyZ2luOjVweDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjVweDtmb250LXNpemU6MTVweDtjdXJzb3I6cG9pbnRlcn0jcHJldmlld2VyIC5kZXRhaWxze3dpZHRoOjEwMCU7aGVpZ2h0OjE1MHB4O292ZXJmbG93OmF1dG87cGFkZGluZzoxMHB4fSNwcmV2aWV3ZXIgLmRldGFpbHMgbmF2e2JhY2tncm91bmQtY29sb3I6d2hpdGU7Zm9udC1zaXplOjE1cHh9I3ByZXZpZXdlciAuZGV0YWlscyBuYXYgYXtib3JkZXI6MXB4IHNvbGlkIGJsYWNrfSNwcmV2aWV3ZXIgLmRldGFpbHMgI2ZpbGVfZGV0YWlsX2luZm97ZGlzcGxheTpub25lfSNwcmV2aWV3ZXIgLmRldGFpbHMgI2Rlc2NyaXB0aW9uX25hdntib3JkZXItYm90dG9tOjVweCBzb2xpZCAjOGRhOWRifSNwcmV2aWV3ZXIgLmRldGFpbHMgLnJvdy1mbHVpZHttYXJnaW4tdG9wOjEwcHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgZ3JheX0jcHJldmlld2VyIC5kZXRhaWxzIC5yb3ctZmx1aWQgZGl2e3dpZHRoOjMwJTtib3JkZXItcmlnaHQ6MXB4IHNvbGlkIGdyYXk7cGFkZGluZzoxMHB4O2Rpc3BsYXk6aW5saW5lLWJsb2NrfSNwcmV2aWV3ZXIgLmRldGFpbHMgLnJvdy1mbHVpZCBkaXY6bGFzdC1jaGlsZHtib3JkZXItcmlnaHQ6bm9uZX0jcHJldmlld2VyIC5kZXRhaWxzIC5kZXNjcmlwdGlvbntib3JkZXItdG9wOjFweCBzb2xpZCBncmF5O21hcmdpbi10b3A6MjBweH0jcHJldmlld2VyIC5kZXRhaWxzIHB7cGFkZGluZzo1cHh9I3ByZXZpZXdlciAjcHJldmlld193aW5kb3d7bWFyZ2luLXRvcDoyMHB4fSNwcmV2aWV3ZXIgI3ByZXZpZXdfd2luZG93IGlmcmFtZSwjcHJldmlld2VyICNwcmV2aWV3X3dpbmRvdyB2aWRlbywjcHJldmlld2VyICNwcmV2aWV3X3dpbmRvdyBhdWRpb3t3aWR0aDoxMDAlfSNwcmV2aWV3ZXIgI3ByZXZpZXdfd2luZG93IGlmcmFtZXtib3JkZXI6MXB4IHNvbGlkIGdyYXk7bWluLWhlaWdodDo3MHZofSNwcmV2aWV3ZXIgI3ByZXZpZXdfd2luZG93IHZpZGVve2JvcmRlcjoxcHggc29saWQgZ3JheX0jcHJldmlld2VyICNwcmV2aWV3X3dpbmRvdyBhdWRpb3ttYXJnaW4tdG9wOjEwJX0jcHJldmlld2VyICNwcmV2aWV3X3dpbmRvdyAuZmlsbGVye3dpZHRoOjEwMCU7aGVpZ2h0Ojcwdmg7YmFja2dyb3VuZC1jb2xvcjp3aGl0ZTtib3JkZXI6MXB4IHNvbGlkIGJsYWNrO21hcmdpbi1ib3R0b206MzBweH0jcHJldmlld2VyICNwcmV2aWV3X3dpbmRvdyAuZmlsbGVyIGgze21hcmluZy10b3A6MzAlO3RleHQtYWxpZ246Y2VudGVyO2ZvbnQtc2l6ZToyMHB4O2ZvbnQtc3R5bGU6aXRhbGljfSNwcmV2aWV3ZXIgI3RyYXNoX3ByZXZpZXdfYWRkX29ue3BhZGRpbmctYm90dG9tOjEwcHh9XCI7aWYgKHN0eWxlLnN0eWxlU2hlZXQpeyBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7IH0gZWxzZSB7IHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpOyB9IGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO30oKSkiLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLSBUb2RvOiBDaGFuZ2UgYmFjayB0byBjb250ZW50X2ZpbGUgLS0+XFxyXFxuPHZpZGVvIGlkPVxcXCJ2aWRlb1xcXCIgY29udHJvbHM+XFxyXFxuXHQ8c291cmNlIHNyYz1cXFwiaHR0cDovL3RlY2hzbGlkZXMuY29tL2RlbW9zL3NhbXBsZS12aWRlb3Mvc21hbGwubXA0XFxcIiB0eXBlPVxcXCJ2aWRlby9tcDRcXFwiPlxcclxcblx0WW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdGhlIHZpZGVvIGVsZW1lbnQuXFxyXFxuPC92aWRlbz5cIjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLSBUb2RvOiBDaGFuZ2UgYmFjayB0byBiZSBjb250ZW50X2ZpbGUgLS0+XFxyXFxuPGlmcmFtZSBzcmM9XFxcImh0dHA6Ly9hcnhpdi5vcmcvcGRmL21hdGgvMDMwNTAxOHYxLnBkZlxcXCI+PC9pZnJhbWU+XCI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImZpbGxlclxcXCI+XFxyXFxuXHQ8aDM+Q29udGVudCBjb3VsZCBub3QgYmUgbG9hZGVkPC9oMz5cXHJcXG48L2Rpdj5cIjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLSBUb2RvOiBjaGFuZ2UgYmFjayB0byBjb250ZW50X2ZpbGUgLS0+XFxyXFxuPGF1ZGlvIGNvbnRyb2xzPlxcclxcblx0PHNvdXJjZSBzcmM9XFxcImh0dHA6Ly93d3cubXAzY2xhc3NpY2FsbXVzaWMubmV0LzQ4TXVzaWMvSm9wbGluNDgvTWFwbGUlMjBMZWFmJTIwUmFnLm1wM1xcXCJ0eXBlPVxcXCJhdWRpby9tcDNcXFwiPlxcclxcblx0WW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdGhpcyBhdWRpbyBjbGlwLlxcclxcbjwvYXVkaW8+XCI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMTtcbiAgcmV0dXJuIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmF0dHJpYnV0ZXMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmF1dGhvcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSk7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJObyBhdXRob3JzIGZvdW5kLlwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICByZXR1cm4gZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYXR0cmlidXRlcykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucHVibGlzaGVkX29uKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKTtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIk5vIGRhdGUgZm91bmQuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmF0dHJpYnV0ZXMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxpY2Vuc2UpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm5hbWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIk5vIGxpY2Vuc2UgZm91bmQuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYXR0cmlidXRlcykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGFnKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IHJldHVybiBzdGFjazE7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazEsIGhlbHBlcjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudGl0bGUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSk7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiTm8gdGFncyBmb3VuZC5cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHJldHVybiBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5hdHRyaWJ1dGVzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kZXNjcmlwdGlvbikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSk7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiTm8gZGVzY3JpcHRpb24gZm91bmQuXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGlkID0gXFxcInByZXZpZXdlclxcXCIgY2xhc3M9XFxcImNvbnRhaW5lci1mbHVpZCBwdWxsLWxlZnQgdmlld2VyXFxcIj5cXHJcXG5cdDxoNj5cXHJcXG5cdFx0PG9sIGNsYXNzPVxcXCJicmVhZGNydW1iXFxcIj48L29sPlxcclxcblx0XHQ8c3BhbiBjbGFzcz1cXFwicHVsbC1yaWdodCB0b2dnbGVfcHJldmlld2VyIGdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcblx0XHQ8c3BhbiBjbGFzcz1cXFwicHVsbC1yaWdodCB0b2dnbGVfZGV0YWlscyBnbHlwaGljb24gZ2x5cGhpY29uLW1lbnUtZG93blxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdDwvaDY+XFxyXFxuXHQ8aDIgaWQ9XFxcInRpdGxlXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYXR0cmlidXRlcykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGl0bGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxyXFxuXHRcXHJcXG5cdEZvciBUZXN0aW5nIFB1cnBvc2VzOiBcXHJcXG5cdDxhIGNsYXNzPVxcXCJwZGZfc2FtcGxlXFxcIj5WaWV3IFBERjwvYT5cXHJcXG5cdDxhIGNsYXNzPVxcXCJhdWRpb19zYW1wbGVcXFwiPlZpZXcgQXVkaW88L2E+XFxyXFxuXHQ8YSBjbGFzcz1cXFwidmlkZW9fc2FtcGxlXFxcIj5WaWV3IFZpZGVvPC9hPlxcclxcblx0XFxyXFxuXHQ8ZGl2IGNsYXNzPVxcXCJkZXRhaWxzXFxcIj5cXHJcXG5cdFx0PG5hdiBjbGFzcz1cXFwiYnRuLWdyb3VwIGJ0bi1ncm91cC1qdXN0aWZpZWRcXFwiIHJvbGU9XFxcImdyb3VwXFxcIj5cXHJcXG5cdFx0XHQ8YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZ1bHRcXFwiIGlkPVxcXCJkZXNjcmlwdGlvbl9uYXZcXFwiPkRlc2NyaXB0aW9uPC9hPlxcclxcblx0XHRcdDxhIGNsYXNzPVxcXCJidG4gYnRuLWRlZnVsdFxcXCIgaWQ9XFxcImRldGFpbF9uYXZcXFwiPkRldGFpbHM8L2E+XFxyXFxuXHRcdDwvbmF2Plxcclxcblx0XHQ8ZGl2IGlkPVxcXCJmaWxlX2RldGFpbF9pbmZvXFxcIj5cXHJcXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJyb3ctZmx1aWRcXFwiPlxcclxcblx0XHRcdFx0PGRpdj5cXHJcXG5cdFx0XHRcdFx0PGgyPkF1dGhvcjwvaDI+XFxyXFxuXHRcdFx0XHRcdDxwPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmF0dHJpYnV0ZXMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmF1dGhvciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcclxcblx0XHRcdFx0PC9kaXY+XFxyXFxuXHRcdFx0XHQ8ZGl2Plxcclxcblx0XHRcdFx0XHQ8aDI+RGF0ZSBBZGRlZDwvaDI+XFxyXFxuXHRcdFx0XHRcdDxwPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmF0dHJpYnV0ZXMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnB1Ymxpc2hlZF9vbiksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcclxcblx0XHRcdFx0PC9kaXY+XFxyXFxuXHRcdFx0XHQ8ZGl2Plxcclxcblx0XHRcdFx0XHQ8aDI+TGljZW5zZTwvaDI+XFxyXFxuXHRcdFx0XHRcdDxwPlwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYXR0cmlidXRlcykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGljZW5zZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDExLCBwcm9ncmFtMTEsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxyXFxuXHRcdFx0XHQ8L2Rpdj5cXHJcXG5cdFx0XHQ8L2Rpdj5cXHJcXG5cdFx0XHQ8aDM+VGFnczwvaDM+XFxyXFxuXHRcdFx0PHVsIGNsYXNzPVxcXCJsaXN0LWlubGluZVxcXCI+XFxyXFxuXHRcdFx0XHRcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmF0dHJpYnV0ZXMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRhZykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGVuZ3RoKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxyXFxuXHRcdFx0PC91bD5cXHJcXG5cdFx0PC9kaXY+XFxyXFxuXHRcdDxkaXYgaWQ9XFxcImZpbGVfZGVzY3JpcHRpb25faW5mb1xcXCI+XFxyXFxuXHRcdFx0PHA+XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuYXR0cmlidXRlcykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZGVzY3JpcHRpb24pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMTgsIHByb2dyYW0xOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxyXFxuXHRcdDwvZGl2Plxcclxcblx0PC9kaXY+XFxyXFxuXHRcXHJcXG5cdDxkaXYgaWQ9XFxcInByZXZpZXdfd2luZG93XFxcIiBjbGFzcz1cXFwiY29udGFpbmVyLWZsdWlkXFxcIj48L2Rpdj5cXHJcXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8aDQ+My4gUmV2aWV3IG1ldGFkYXRhPC9oND5cXHJcXG48YnIvPlxcclxcbjxkaXYgaWQ9XFxcIm1ldGEtd3JhcHBlclxcXCI+XFxyXFxuXHQ8ZGl2IGlkID0gXFxcIm1ldGFsaXN0XFxcIiBjbGFzcz1cXFwibGlzdF9jb250ZW50IHB1bGwtbGVmdFxcXCI+XFxyXFxuXHRcdDxkaXYgaWQ9XFxcImxpc3RfYmFja2dyb3VuZFxcXCI+PC9kaXY+XFxyXFxuXHRcdDx1bD48L3VsPlxcclxcblx0PC9kaXY+XFxyXFxuXHQ8ZGl2IGlkPVxcXCJtZXRhZm9ybS13cmFwcGVyXFxcIiBjbGFzcz1cXFwicHVsbC1sZWZ0XFxcIj5cXHJcXG5cdFx0PGZvcm0gaWQ9XFxcIm1ldGFmb3JtXFxcIj5cXHJcXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcIm5hbWVcXFwiIHBsYWNlaG9sZGVyPVxcXCJOYW1lXFxcIi8+XFxyXFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIGlkPVxcXCJhdXRob3JcXFwiIHBsYWNlaG9sZGVyID0gXFxcIkF1dGhvclxcXCIvPlxcclxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwibGljZW5zZVxcXCIgcGxhY2Vob2xkZXIgPSBcXFwiTGljZW5zZVxcXCIvPlxcclxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBjbGFzcz1cXFwibWV0YXRhZ3NcXFwiIHBsYWNlaG9sZGVyID0gXFxcIlRhZ3MgKHByZXNzICdFbnRlcicgdG8gYWRkIHRhZylcXFwiLz5cXHJcXG5cdFx0XHQ8dGV4dGFyZWEgaWQ9XFxcImRlc2NyaXB0aW9uXFxcIiBwbGFjZWhvbGRlcj1cXFwiRGVzY3JpcHRpb25cXFwiIG1heGxlbmd0aD1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmxpbWl0KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmxpbWl0KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+PC90ZXh0YXJlYT5cXHJcXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJjaGFyX2NvdW50ZXJcXFwiIGFsaWduPVxcXCJyaWdodFxcXCI+PHNwYW4gY2xhc3M9XFxcImNvdW50ZXJcXFwiPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5saW1pdCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saW1pdCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+IENoYXJzIExlZnQ8L2Rpdj5cXHJcXG5cdFx0PC9mb3JtPlxcclxcblx0PC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuPGJyLz5cXHJcXG48bmF2Plxcclxcblx0PGEgY2xhc3M9XFxcImJ0biBwdWxsLWxlZnQgYnRuLWxpbmsgY2xpcGJvYXJkX3ByZXZpb3VzXFxcIj5QcmV2aW91czwvYT5cXHJcXG5cdDxhIGNsYXNzPVxcXCJidG4gcHVsbC1yaWdodCBidG4tbGluayBjbGlwYm9hcmRfZmluaXNoXFxcIj5GaW5pc2g8L2E+XFxyXFxuPC9uYXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjxoND4yLiBBZGRpbmcgY29udGVudCBmcm9tIE15IENvbXB1dGVyPC9oND5cXHJcXG48ZGl2IGlkID0gXFxcImFkZF9jb250ZW50X2FyZWFcXFwiIGNsYXNzID0gXFxcImNvbnRhaW5lciB0ZXh0LWNlbnRlclxcXCI+XFxyXFxuXHQ8aDU+RHJhZyBhbmQgZHJvcCA8YnIvPiBmcm9tIHlvdXIgY29tcHV0ZXI8L2g1Plxcclxcblx0PHA+b3I8L3A+XFxyXFxuXHQ8ZGl2IGNsYXNzPVxcXCJjaG9vc2VfZmlsZSBidG4gYnRuLWxpbmtcXFwiPkNob29zZSBGaWxlLi4uPC9kaXY+XFxyXFxuXHQ8ZGl2IGNsYXNzPVxcXCJoaWRkZW5maWxlXFxcIj5cXHJcXG5cdCAgPGlucHV0IG5hbWU9XFxcInVwbG9hZFxcXCIgdHlwZT1cXFwiZmlsZVxcXCIgaWQ9XFxcImZpbGVpbnB1dFxcXCIgbXVsdGlwbGUvPlxcclxcblx0PC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuPGg1PkZpbGVzIG9yIGZvbGRlcnMgdG8gYmUgYWRkZWQ6PC9oNT5cXHJcXG5cXHJcXG48ZGl2IGlkID0gXFxcInNlbGVjdGVkX2NvbnRlbnRfYXJlYVxcXCIgY2xhc3M9XFxcImxpc3RfY29udGVudFxcXCI+XFxyXFxuXHQ8ZGl2IGlkPVxcXCJsaXN0X2JhY2tncm91bmRcXFwiPjwvZGl2Plxcclxcblx0PHVsPjwvdWw+XFxyXFxuPC9kaXY+XFxyXFxuPGJyLz5cXHJcXG48bmF2Plxcclxcblx0PGEgY2xhc3M9XFxcImJ0biBwdWxsLWxlZnQgYnRuLWxpbmsgY2xpcGJvYXJkXzJfcHJldmlvdXNcXFwiPlByZXZpb3VzPC9hPlxcclxcblx0PGEgY2xhc3M9XFxcImJ0biBwdWxsLXJpZ2h0IGJ0bi1saW5rIGNsaXBib2FyZF9uZXh0XFxcIj5OZXh0PC9hPlxcclxcbjwvbmF2PlwiO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxyXFxuXHRcdDxvcHRpb24+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLnRpdGxlKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvb3B0aW9uPlxcclxcblx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8aDQ+Mi4gQWRkaW5nIGNvbnRlbnQgZnJvbSBhIGNoYW5uZWw8L2g0PlxcclxcbjxzZWxlY3Q+XFxyXFxuXHRcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC50b3BpYyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXHJcXG48L3NlbGVjdD5cXHJcXG48aDU+UGF0aDogPGRpdiBjbGFzcz1cXFwicGF0aFxcXCI+PC9kaXY+PC9oNT5cXHJcXG48ZGl2IGlkID0gXFxcImZpbGVzX2NvbnRlbnRfYXJlYVxcXCIgY2xhc3M9XFxcImxpc3RfY29udGVudFxcXCI+XFxyXFxuXHQ8ZGl2IGlkPVxcXCJsaXN0X2JhY2tncm91bmRcXFwiPjwvZGl2Plxcclxcblx0PHVsPjwvdWw+XFxyXFxuPC9kaXY+XFxyXFxuPGg1PkZpbGVzIG9yIGZvbGRlcnMgdG8gYmUgYWRkZWQ6PC9oNT5cXHJcXG48ZGl2IGlkID0gXFxcInNlbGVjdGVkX2NvbnRlbnRfYXJlYVxcXCIgY2xhc3M9XFxcImxpc3RfY29udGVudFxcXCI+XFxyXFxuXHQ8ZGl2IGlkPVxcXCJsaXN0X2JhY2tncm91bmRcXFwiPjwvZGl2Plxcclxcblx0PHVsPjwvdWw+XFxyXFxuPC9kaXY+XFxyXFxuPGJyLz5cXHJcXG48bmF2Plxcclxcblx0PGEgY2xhc3M9XFxcImJ0biBwdWxsLWxlZnQgYnRuLWxpbmsgY2xpcGJvYXJkXzJfcHJldmlvdXNcXFwiPlByZXZpb3VzPC9hPlxcclxcblx0PGEgY2xhc3M9XFxcImJ0biBwdWxsLXJpZ2h0IGJ0bi1saW5rIGNsaXBib2FyZF9uZXh0XFxcIj5OZXh0PC9hPlxcclxcbjwvbmF2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8aDQ+MS4gV2hlcmUgZG8geW91IHdhbnQgdG8gYWRkIGNvbnRlbnQgZnJvbT88L2g0PlxcclxcbjxwIGNsYXNzPVxcXCJzZWxlY3Rfb3B0aW9uXFxcIj5BLiA8YSBjbGFzcz1cXFwiYnRuIGJ0bi1saW5rIGNvbXB1dGVyX2Nob29zZV9jb250ZW50XFxcIj5Gcm9tIG15IGNvbXB1dGVyPC9hPjwvcD5cXHJcXG48cCBjbGFzcz1cXFwic2VsZWN0X29wdGlvblxcXCI+Qi4gPGEgY2xhc3M9XFxcImJ0biBidG4tbGluayBjaGFubmVsX2Nob29zZV9jb250ZW50XFxcIj5Gcm9tIGEgY2hhbm5lbDwvYT48L3A+XCI7XG4gIH0pO1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxcImNoZWNrYm94XFxcIlwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxcInJhZGlvXFxcIlwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiPHNwYW4gY2xhc3M9XFxcInB1bGwtbGVmdCB0b2dfZm9sZGVyIGdseXBoaWNvbiBnbHlwaGljb24tbWVudS1kb3duXFxcIj48L3NwYW4+XFxyXFxuXHRcdFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiPHNwYW4gY2xhc3M9XFxcInB1bGwtbGVmdCBwcmV2aWV3X2ZpbGUgZ2x5cGhpY29uIGdseXBoaWNvbi1zZWFyY2hcXFwiPjwvc3Bhbj5cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxyXFxuXHRcdFx0XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmZpbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRpdGxlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXHJcXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwicHVsbC1yaWdodCBkZWxldGVfY29udGVudCBnbHlwaGljb24gZ2x5cGhpY29uLXRyYXNoXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJwdWxsLXJpZ2h0IGVkaXRfY29udGVudCBnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXHJcXG5cdFx0XHRcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5vcHRpb25zKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0XHRcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXHJcXG5cdFx0XHRcdFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxyXFxuXHRcdFx0XHQ8c3BhbiBjbGFzcz1cXFwicHVsbC1yaWdodCBnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZSByZW1vdmVfaXRlbVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0XHRcdFx0PHNwYW4gY2xhc3M9XFxcInB1bGwtbGVmdCBmb2xkZXJfcGx1cyBnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRcdFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxyXFxuXHRcdFx0XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXI7XG4gIGJ1ZmZlciArPSBcIjx1bCBpZD1cXFwiaXRlbV9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiX3N1YlxcXCIgY2xhc3M9XFxcImxpc3QtdW5zdHlsZWQgc3ViZGlyZWN0b3J5XFxcIj48L3VsPlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGxpIGlkPVxcXCJpdGVtX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcclxcblx0PGlucHV0IHR5cGU9XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGlzdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIGlkPVxcXCJmaWxlX1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbmRleCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5pbmRleCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcImNsaXBib2FyZF9saXN0X2ZpbGVzXFxcIj48L2lucHV0Plxcclxcblx0PGxhYmVsIGZvcj1cXFwiZmlsZV9cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuaW5kZXgpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuaW5kZXgpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwiY2xpcGJvYXJkX2l0ZW1cXFwiPlxcclxcblx0XHRcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZm9sZGVyKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXHJcXG5cdFx0XFxyXFxuXHRcdDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLVwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5maWxlX2ljb24pIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuZmlsZV9pY29uKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+PC9zcGFuPlxcclxcblx0XHRcXHJcXG5cdFx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGlzdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDExLCBwcm9ncmFtMTEsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXHJcXG5cdDwvbGFiZWw+XFxyXFxuPC9saT5cXHJcXG5cIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZm9sZGVyKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPGRpdiBpZD1cXFwiY2xpcGJvYXJkXFxcIiBjbGFzcz1cXFwicHVsbC1yaWdodFxcXCI+XFxyXFxuXHQ8ZGl2IGNsYXNzPVxcXCJjbGlwYm9hcmRfaGVhZGVyXFxcIj5cXHJcXG5cdFx0PGgzPlxcclxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJjb2xsYXBzZV9jbGlwYm9hcmQgcHVsbC1sZWZ0IGdseXBoaWNvbiBnbHlwaGljb24tbWVudS11cFxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0XHRDbGlwYm9hcmRcXHJcXG5cdFx0XHQ8YSBjbGFzcz1cXFwiYnRuIHB1bGwtcmlnaHQgYnRuLWxpbmsgY2xpcGJvYXJkX2FkZF9jb250ZW50XFxcIj5cXHJcXG5cdFx0XHRcdDxzcGFuIGNsYXNzPVxcXCJwdWxsLWxlZnQgZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcblx0XHRcdFx0QWRkIENvbnRlbnRcXHJcXG5cdFx0XHQ8L2E+XFxyXFxuXHRcdDwvaDM+XFxyXFxuXHQ8L2Rpdj5cXHJcXG5cdDxkaXYgaWQ9XFxcImNsaXBib2FyZF9jb250ZW50XFxcIj5cXHJcXG5cdFx0PGRpdiBpZCA9IFxcXCJsaXN0XFxcIiBjbGFzcz1cXFwibGlzdF9jb250ZW50XFxcIj5cXHJcXG5cdFx0XHQ8ZGl2IGlkPVxcXCJsaXN0X2JhY2tncm91bmRcXFwiPjwvZGl2Plxcclxcblx0XHRcdDxjYW52YXM+PC9jYW52YXM+XFxyXFxuXHRcdFx0PHVsIGNsYXNzPVxcXCJsaXN0LXVuc3R5bGVkXFxcIj48L3VsPlxcclxcblx0XHQ8L2Rpdj5cXHJcXG5cdDwvZGl2PlxcclxcbjwvZGl2PlwiO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8ZGl2IGlkPVxcXCJjbGlwYm9hcmRcXFwiIGNsYXNzPVxcXCJwdWxsLXJpZ2h0XFxcIj5cXHJcXG5cdDxkaXYgY2xhc3M9XFxcImNsaXBib2FyZF9oZWFkZXJcXFwiPlxcclxcblx0XHQ8aDM+XFxyXFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInB1bGwtbGVmdCBnbHlwaGljb24gZ2x5cGhpY29uLWZvbGRlci1vcGVuXFxcIj48L3NwYW4+XFxyXFxuXHRcdFx0QWRkaW5nIENvbnRlbnQgdG8gVG9waWNcXHJcXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwidG9nZ2xlX2NsaXBib2FyZCBwdWxsLXJpZ2h0IGdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPlxcclxcblx0XHQ8L2gzPlxcclxcblx0PC9kaXY+XFxyXFxuXHQ8bmF2IGNsYXNzPVxcXCJjbGlwYm9hcmRfbmF2aWdhdGlvbiB0ZXh0LWNlbnRlciBidG4tZ3JvdXAgYnRuLWdyb3VwLWp1c3RpZmllZFxcXCIgcm9sZT1cXFwiZ3JvdXBcXFwiPlxcclxcblx0XHQ8YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZ1bHRcXFwiIGlkPVxcXCJzb3VyY2VfbmF2XFxcIj5Tb3VyY2U8L2E+XFxyXFxuXHRcdDxhIGNsYXNzPVxcXCJidG4gYnRuLWRlZnVsdFxcXCIgaWQ9XFxcImNob29zZV9uYXZcXFwiPkNob29zZSBDb250ZW50PC9hPlxcclxcblx0XHQ8YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZ1bHRcXFwiIGlkPVxcXCJtZXRhX25hdlxcXCI+TWV0YWRhdGE8L2E+XFxyXFxuXHQ8L25hdj5cXHJcXG5cdDxkaXYgaWQ9XFxcImNsaXBib2FyZF9jb250ZW50XFxcIj48L2Rpdj5cXHJcXG48L2Rpdj5cIjtcbiAgfSk7XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJFZGl0aW5nIEZvbGRlclwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiQWRkaW5nIEZvbGRlclwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiVXBkYXRlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJBZGRcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgaWQ9XFxcImNsaXBib2FyZFxcXCIgY2xhc3M9XFxcInB1bGwtcmlnaHRcXFwiPlxcclxcblx0PGRpdiBjbGFzcz1cXFwiY2xpcGJvYXJkX2hlYWRlclxcXCI+XFxyXFxuXHRcdDxoMz5cXHJcXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwicHVsbC1sZWZ0IGdseXBoaWNvbiBnbHlwaGljb24tZm9sZGVyLW9wZW5cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuXHRcdFx0XCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcclxcblx0XHRcdDxzcGFuIGNsYXNzPVxcXCJ0b2dnbGVfY2xpcGJvYXJkIHB1bGwtcmlnaHQgZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuXHRcdDwvaDM+XFxyXFxuXHQ8L2Rpdj5cXHJcXG5cdDxkaXYgaWQ9XFxcImNsaXBib2FyZF9jb250ZW50XFxcIj4gXFxyXFxuXHRcdDxoNiBjbGFzcz1cXFwiZXJyb3JcXFwiIGlkPVxcXCJuYW1lX2VyclxcXCI+UGxlYXNlIGlucHV0IGEgdmFsaWQgbmFtZTwvaDY+XFxyXFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwiZm9sZGVyX25hbWVcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuZm9sZGVyKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiTmFtZVxcXCIvPlxcclxcblx0XHQ8dGV4dGFyZWEgaWQ9XFxcImZvbGRlcl9kZXNjcmlwdGlvblxcXCIgcGxhY2Vob2xkZXI9XFxcIkRlc2NyaXB0aW9uXFxcIiBtYXhsZW5ndGg9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5saW1pdCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saW1pdCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5mb2xkZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmRlc2NyaXB0aW9uKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3RleHRhcmVhPlxcclxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjaGFyX2NvdW50ZXJcXFwiIGFsaWduPVxcXCJyaWdodFxcXCI+PHNwYW4gY2xhc3M9XFxcImNvdW50ZXJcXFwiPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5saW1pdCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5saW1pdCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+IENoYXJzIExlZnQ8L2Rpdj5cXHJcXG5cdFx0PGRpdiBjbGFzcz1cXFwidGV4dC1jZW50ZXJcXFwiPiBcXHJcXG5cdFx0XHQ8YSBjbGFzcz1cXFwiYnRuIGJ0bi1saW5rIGNsaXBib2FyZF91cGRhdGVfZm9sZGVyXFxcIj5cIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuZWRpdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9hPlxcclxcblx0XHQ8L2Rpdj5cXHJcXG5cdDwvZGl2PlxcclxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgaWQ9XFxcImNsaXBib2FyZFxcXCIgY2xhc3M9XFxcInB1bGwtcmlnaHRcXFwiPlxcclxcblx0PGRpdiBjbGFzcz1cXFwiY2xpcGJvYXJkX2hlYWRlclxcXCI+XFxyXFxuXHRcdDxoMz5cXHJcXG5cdFx0XHQ8c3BhbiBjbGFzcz1cXFwicHVsbC1sZWZ0IGdseXBoaWNvbiBnbHlwaGljb24tZm9sZGVyLW9wZW5cXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+XFxyXFxuXHRcdFx0RWRpdGluZyBDb250ZW50XFxyXFxuXHRcdFx0PHNwYW4gY2xhc3M9XFxcInRvZ2dsZV9jbGlwYm9hcmQgcHVsbC1yaWdodCBnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZVxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvc3Bhbj5cXHJcXG5cdFx0PC9oMz5cXHJcXG5cdDwvZGl2Plxcclxcblx0PGRpdiBpZD1cXFwiY2xpcGJvYXJkX2NvbnRlbnRcXFwiPlxcclxcblx0XHQ8aDYgY2xhc3M9XFxcImVycm9yXFxcIiBpZD1cXFwibmFtZV9lcnJcXFwiPlBsZWFzZSBpbnB1dCBhIHZhbGlkIG5hbWU8L2g2Plxcclxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcImNvbnRlbnRfbmFtZVxcXCIgdmFsdWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC5maWxlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiTmFtZVxcXCIvPlxcclxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcImNvbnRlbnRfYXV0aG9yXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IChkZXB0aDAgJiYgZGVwdGgwLmZpbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmF1dGhvcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiQXV0aG9yXFxcIi8+XFxyXFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwiY29udGVudF9saWNlbnNlXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuZmlsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGljZW5zZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubmFtZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiTGljZW5zZVxcXCIvPlxcclxcblx0XHQ8bGFiZWwgZm9yPVxcXCJjb250ZW50X3RhZ3NcXFwiPlRhZ3M8L2xhYmVsPjxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBjbGFzcz1cXFwiY29udGVudF90YWdzXFxcIiBwbGFjZWhvbGRlcj1cXFwiVGFncyAocHJlc3MgJ0VudGVyJyB0byBhZGQgdGFnKVxcXCIvPlxcclxcblx0XHQ8dGV4dGFyZWEgaWQ9XFxcImZpbGVfZGVzY3JpcHRpb25cXFwiIHBsYWNlaG9sZGVyPVxcXCJEZXNjcmlwdGlvblxcXCIgbWF4bGVuZ3RoPVxcXCJcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMubGltaXQpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAubGltaXQpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAuZmlsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZGVzY3JpcHRpb24pKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvdGV4dGFyZWE+XFxyXFxuXHRcdDxkaXYgY2xhc3M9XFxcImNoYXJfY291bnRlclxcXCIgYWxpZ249XFxcInJpZ2h0XFxcIj48c3BhbiBjbGFzcz1cXFwiY291bnRlclxcXCI+XCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmxpbWl0KSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmxpbWl0KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj4gQ2hhcnMgTGVmdDwvZGl2Plxcclxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJ0ZXh0LWNlbnRlclxcXCI+IFxcclxcblx0XHRcdDxhIGNsYXNzPVxcXCJidG4gYnRuLWxpbmsgY2xpcGJvYXJkX3VwZGF0ZV9maWxlIHB1bGwtcmlnaHRcXFwiPlVwZGF0ZTwvYT5cXHJcXG5cdFx0PC9kaXY+XFxyXFxuXHQ8L2Rpdj5cXHJcXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSk7XG4iXX0=
