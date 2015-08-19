var Backbone = require("backbone");
var _ = require("underscore");
require("clipboard.less");

var PreviewerViews = require("edit_channel/previewer/views");
var previousView;

/* Todo: make all views ClipboardView.extend */

/* Loaded when user clicks "Add Folder" button */
var ClipboardAddFolderView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_add_folder.handlebars"),
	initialize: function() {
            _.bindAll(this, 'toggle_clipboard', 'add_folder');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
            this.$el.html(this.template(this.model));
        },
		
		events: {
			'click .toggle_clipboard':'toggle_clipboard',
			'click .clipboard_add_folder':'add_folder'
		},
		add_folder: function(event){
			if($("#folder_name").val().trim() == "")
				$("#name_err").css("display", "inline");
			else{
				console.log("Adding Folder...");
				//RELOAD TREE 
				$("#clipboard").hide();
			}
		},
		
		toggle_clipboard: function(event){
			$("#clipboard").hide();
		}
});

/* Loaded when user clicks edit icon on folder*/
var ClipboardEditFolderView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_edit_folder.handlebars"),
	initialize: function() {
            _.bindAll(this, 'update_folder', 'toggle_clipboard');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
		console.log(this.model);
            this.$el.html(this.template({folder: this.model.toJSON()}));
        },
		
		events: {
			'click .clipboard_update_folder': 'update_folder',
			'click .toggle_clipboard':'toggle_clipboard'
		},

		update_folder: function(event){
			if($("#folder_name").val().trim() == "")
				$("#name_err").css("display", "inline");
			else{
				console.log("Updating Folder...");
				//RELOAD TREE 
				$("#clipboard").hide();
			}
		},
		toggle_clipboard: function(event){
			$("#clipboard").hide();
		}
});

/* Loaded when user clicks edit icon on file*/
var ClipboardEditFileView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_edit_file.handlebars"),
	initialize: function() {
		_.bindAll(this, 'toggle_clipboard', 'update_file');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template({file: this.model.toJSON()}));
	},
	
	events: {
		'click .toggle_clipboard':'toggle_clipboard',
		'click .clipboard_update_file':'update_file'
	},
	
	toggle_clipboard: function(event){
		$("#clipboard").hide();
	},
	update_file: function(event){
		if($("#content_name").val().trim() == "")
				$("#name_err").css("display", "inline");
		else{
			console.log("Updating File...");
			//RELOAD TREE 
			$("#clipboard").hide();
		}
	}
});

/* Loaded when user clicks "Add Content" button */
var ClipboardAddContentView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_step_1.handlebars"),
	initialize: function() {
            _.bindAll(this, 'toggle_clipboard','computer_choose_content', 'channel_choose_content');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
			previousView = this;
            this.render();
        },
        render: function() {
            this.$el.html(this.template(this.model));
        },
		
		events: {
			'click .toggle_clipboard':'toggle_clipboard',
			'click .computer_choose_content':'computer_choose_content',
			'click .channel_choose_content':'channel_choose_content'
		},
		toggle_clipboard: function(event){
			$("#clipboard").hide();
		},
		computer_choose_content: function(event){
			console.log("Selecting from computer...");
			previousView = this;
			new ClipboardAddFromComputerView({
				el: $("#clipboard-area"),
				//model: topicNodeCollection
			});
		},
		channel_choose_content:  function(event){
			console.log("Selecting from channel...");
			previousView = this;
			var view = new ClipboardAddFromChannelView({
				el: $("#clipboard-area"),
				//model: topicNodeCollection
			});
		}
});

/* Loaded when user chooses to select "Choose from Computer" button */
var ClipboardAddFromComputerView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_step_2_computer.handlebars"),
	initialize: function() {
            _.bindAll(this, 'toggle_clipboard', 'to_step_3','previous','preview_file','open_folder', 'close_file');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
			$("#clipboard").css("margin-right", "0px");
        },
		
		events: {
			'click .toggle_clipboard':'toggle_clipboard',
			'click .clipboard_previous':'previous',
			'click .clipboard_next':'to_step_3',
			'click .folder': 'open_folder',
			'click .close_file':'close_file',
			'click .preview_file': 'preview_file'
		},
		toggle_clipboard: function(event){
			console.log("Toggling Clipboard...");
			$("#clipboard").hide();
		},
		to_step_3: function(event){
			console.log("Going to step 3...");
			previousView = this;
			var view = new ClipboardMetaView({
				el: $("#clipboard-area"),
				//model: topicNodeCollection
			});
		},
		previous: function(event){
			console.log("Going back...");
			var view = new ClipboardAddContentView({
				el: $("#clipboard-area"),
				//model: topicNodeCollection
			});
		},
		open_folder: function(event){
			console.log("Opening folder...");
		},
		add_folder_to_list: function(event){
			console.log("Adding folder to list...");
		},
		preview_file: function(event){
			console.log("Previewing file...");
			var view = new PreviewerViews.PreviewerView({
				el: $("#previewer-area"),
				//model: topicNodeCollection
			});
			
		},
		close_file: function(event){
			console.log("Closing file...");
			event.target.parentNode.remove();
		}
});

/* Loaded when user chooses to select "Choose from Channel" button */
var ClipboardAddFromChannelView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_step_2_channel.handlebars"),
	initialize: function() {
            _.bindAll(this, 'toggle_clipboard', 'to_step_3','previous', 'open_folder_path', 'preview_file','open_folder', 'add_folder_to_list','close_file');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
            this.$el.html(this.template(this.model));
			$("#clipboard").css("margin-right", "0px");
			//Todo: load dropdown with current channels
        },
		
		events: {
			'click .toggle_clipboard':'toggle_clipboard',
			'click .clipboard_previous':'previous',
			'click .clipboard_next':'to_step_3',
			'click .folder': 'open_folder',
			'click .folder_plus': 'add_folder_to_list',
			'click .folder_path': 'open_folder_path',
			'click .preview_file': 'preview_file',
			'click .close_file':'close_file'
		},
		toggle_clipboard: function(event){
			console.log("Toggling Clipboard...");
			$("#clipboard").hide();
		},
		to_step_3: function(event){
			console.log("Going to step 3...");
			previousView = this;
			var view = new ClipboardMetaView({
				el: $("#clipboard-area"),
				//model: topicNodeCollection
			});
		},
		previous: function(event){
			console.log("Going back...");
			var view = new ClipboardAddContentView({
				el: $("#clipboard-area"),
				//model: topicNodeCollection
			});
		},
		open_folder: function(event){
			console.log("Opening folder...");
		},
		add_folder_to_list: function(event){
			console.log("Adding folder to list...");
		},
		open_folder_path: function(event){
			console.log("Opening folder path...");
		},
		preview_file: function(event){
			console.log("Previewing file...");
			var view = new PreviewerViews.PreviewerView({
				el: $("#previewer-area"),
				//model: topicNodeCollection
			});
		},
		close_file: function(event){
			console.log("Closing file...");
			event.target.parentNode.remove();
		}
});

/* Loaded on last step of adding content */
var ClipboardMetaView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_step_3.handlebars"),
	initialize: function() {
            _.bindAll(this, 'toggle_clipboard','previous','open_folder', 'close_file','add_tag','toggle_folder', 'clipboard_finish');
			console.log("Called initialize in view.js");
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
			console.log("Rendering ClipboardView...");
            this.$el.html(this.template(this.model));
			$("#clipboard").css("margin-right", "0px");
        },
		
		events: {
			'click .toggle_clipboard':'toggle_clipboard',
			'click .clipboard_previous':'previous',
			'click .open_folder': 'open_folder',
			'click .close_file':'close_file',
			'click .plus':'add_tag',
			'click .toggle_folder':'toggle_folder',
			'click .clipboard_finish':'clipboard_finish'
		},
		toggle_clipboard: function(event){
			console.log("Toggling Clipboard...");
		},
		previous: function(event){
			console.log("Going back...");
		},
		open_folder: function(event){
			console.log("Opening folder...");
		},
		close_file: function(event){
			console.log("Closing file...");
			event.target.parentNode.remove();
		},
		add_tag: function(event){
			console.log("Adding tag...");
		},
		toggle_folder: function(event){
			console.log("Toggling folder...");
		},
		clipboard_finish: function(event){
			console.log("Finishing...");
			$("#clipboard").hide();
			$("#item_1_2").show();
		}
});

/*Todo: export only one ClipboardView once views are an extension of it*/
module.exports = {
	ClipboardAddFolderView:ClipboardAddFolderView,
	ClipboardEditFolderView:ClipboardEditFolderView,
	ClipboardEditFileView:ClipboardEditFileView,
	ClipboardAddContentView:ClipboardAddContentView
}