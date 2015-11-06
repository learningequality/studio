var Backbone = require("backbone");
var _ = require("underscore");

var DOMHelper = require("edit_channel/utils/DOMHelper");
var TextHelper = require("edit_channel/utils/TextHelper");
var ContainerHelper = require("edit_channel/utils/ContainerHelper");

var PreviewerViews = require("edit_channel/previewer/views");

var container_count;
var containers = [];
window.TreePreviewView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),

	initialize: function(options) {
		_.bindAll(this, 'add_container');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.root = options.channel.root_node;
		if(!this.root)
			this.root = window.channel_router.generate_folder({title: "[Untitled]"});
		container_count = 1;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		this.add_container(this.root.attributes);
	},
	add_container: function(topic){
		var container_view = new ContainerView({topic: topic, edit: this.edit, model: this.model});
		$("#container_area").append(container_view.el);
		containers.push(container_view);
	}
});

window.ContainerView = Backbone.View.extend({
	template: require("./../hbtemplates/content_container.handlebars"),

	initialize: function(options) {
		_.bindAll(this, 'load_topics', 'load_content');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.topic = options.topic;
		this.model = options.model;
		this.render();
		/* Set starting point of container to animate */
		this.$el.css({'margin-left': - this.$el.outerWidth(), 'z-index': 1000 - container_count});
		/* Increase size of container area to accomodate for size of new container */
		$("#container_area").css('width', $("#container_area").innerWidth() + this.$el.outerWidth());
		
		
		this.$el.animate({ marginLeft: parseInt(this.$el.css('marginLeft'),10) == 0 ? this.$el.outerWidth() : 0});
	//	this.$el.find("canvas").css('margin-top', (- this.$el.find(".title-bar").height() + 22) + "px");
		//this.$el.find(".container-interior").css('margin-top', (- this.$el.find(".title-bar").height() + 22) + "px");
		//this.$el.find(".content-list").height((this.$el.find("canvas").height() - this.$el.find(".title-bar").height() + 6) + "px");
	},
	render: function() {
		this.$el.html(this.template({title: this.topic.title, topic: this.topic, edit: this.edit}));
		this.load_topics(this.topic, this.$el, this.edit, this);
		this.load_content(this.topic, this.$el, this.edit, this);
	},
	load_topics: function(topic, el, edit, container){
		var index = 0;
		this.model.topics.forEach(function(entry){
			if(JSON.stringify(entry.attributes) == JSON.stringify(topic))
				return index;
			index++;
		});
		
		this.model.topics.forEach(function (entry){
			if(entry.attributes.parent == index){
				var folder_view = new FolderView({topic: entry.attributes, edit: edit, container: container});
				el.find("ul").append(folder_view.el);
			}
		});
	}, 
	load_content : function(el, edit){
		this.model.content.forEach(function (entry){
			if(entry.attributes.parent == this.topic){
				var file_view = new FileView({file: entry.attributes, edit: edit, container: container});
				el.find("ul").append(file_view.el);
			}
		});
	}
});


window.FolderView = Backbone.View.extend({
	template: require("./../hbtemplates/content_folder.handlebars"),

	initialize: function(options) {
		_.bindAll(this, 'open_folder', 'expand_folder','minimize_folder');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.container = options.container;
		this.topic = options.topic;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({folder: this.topic, edit: this.edit}));
		this.$el.find("h3").html(TextHelper.trimText(this.$el.find("h3").html(), "...", 22, false));
		this.$el.find("p").html(TextHelper.trimText(this.$el.find("p").html(), "... read more", 120, true));
	},
	events: {
		'click .folder': 'open_folder',
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
		container_number = ContainerHelper.loadContainer(el,$("#"+el.parentNode.id).data("data"), this.edit, this.model.topicnodes, this.model.contentnodes, container_number);
	},
	open_folder:function(event){
		event.preventDefault();
		window.edit_page_view.add_container(this.topic);
	}
});

window.FileView = Backbone.View.extend({
	template: require("./../hbtemplates/content_file.handlebars"),

	initialize: function(options) {
		_.bindAll(this,'preview_file');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.container = options.container;
		this.file = options.file;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({file: this.file, edit: this.edit}));
		this.$el.find("h4").html(TextHelper.trimText(el.find("h4").text(), "...", 25, false));
	},
	events: {
		'click .file': 'preview_file'
	},
	preview_file: function(event){
		event.preventDefault();
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: this.file,
			file: this
		});
	}
});


module.exports = {
	TreePreviewView: TreePreviewView
}