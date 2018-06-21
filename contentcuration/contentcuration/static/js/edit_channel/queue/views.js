var Backbone = require("backbone");
var _ = require("underscore");
var Vibrant = require('node-vibrant');

require("queue.less");
var BaseViews = require("./../views");
var Models = require("./../models");
var DragHelper = require("edit_channel/utils/drag_drop");
var dialog = require("edit_channel/utils/dialog");

var NAMESPACE = "queue";
var MESSAGES = {
    "clipboard_label": "CLIPBOARD",
    "import": "Import from Channels",
    "create_exercise": "Create Exercise",
    "upload_files": "Upload Files",
    "add_topics": "Add Topics",
    "clipboard_empty": "This is your clipboard. Use this space to save and send content to other channels",
    "drop_text": "Drop here to add to clipboard",
    "recently_added": "Recently Added",
}

/* Loaded when user clicks clipboard button below navigation bar */
var Queue = BaseViews.BaseWorkspaceView.extend({
	template: require("./hbtemplates/queue.handlebars"),
	clipboard_queue:null,
	trash_queue:null,
	clipboard_selector: "#clipboard-queue",
	name: NAMESPACE,
    $trs: MESSAGES,

	initialize: function(options) {
		_.bindAll(this, 'toggle_queue', 'open_queue', 'close_queue', 'add_to_clipboard',
							'drop_in_clipboard');
		this.clipboard_root = options.clipboard_root;
		this.trash_root = options.trash_root;
		this.collection = options.collection;
		this.render();
		window.workspace_manager.set_queue_view(this);
	},
	render: function() {
		this.$el.html(this.template(null,  {
            data: this.get_intl_data()
        }));
		this.clipboard_queue = new ClipboardList({
			collection: this.collection,
			model: this.clipboard_root,
			el: this.$(this.clipboard_selector),
			add_controls : true,
			container: this,
			content_node_view:null,
			is_root: true,
		});
		this.handle_checked();
		DragHelper.addButtonDragDrop(this, this.drop_in_clipboard, this.get_translation_library());
	},
	drop_in_clipboard: function(collection, message) {
		return this.add_to_clipboard(collection, message, 'drag in tree view');
	},
	events: {
		'click .queue-button' : 'toggle_queue',
		"click #queue-back": "close_queue"
	},
	toggle_queue: function(){
		(this.$("#queue").hasClass("closed")) ? this.open_queue() : this.close_queue();
	},
	open_queue:function(){
		this.$("#queue").removeClass("closed").addClass("opened");
	},
	close_queue:function(){
		this.$("#queue").removeClass("opened").addClass("closed");
	},
	handle_checked:function(){
		this.clipboard_queue.handle_checked();
	},
	move_items:function(){
		var list = this.get_selected(true);
		var move_collection = new Models.ContentNodeCollection();
		/* Create list of nodes to move */
		for(var i = 0; i < list.length; i++){
			var model = list[i].model;
			model.view = list[i];
			move_collection.add(model);
		}
		this.move_content(move_collection, "clipboard");
	},
	close_all_popups: function() {
		window.workspace_manager.get_main_view().close_all_popups();
	}
});

function create_channel_node_for_content_items(items, sort_order) {
	// TODO(davidhu): We're currently grouping items by their "source channel",
	// though it may be more ideal to group items by the channel they were
	// directly copied from.
	var first_item = items[0];
	var channel_id = first_item.get_original_channel_id();
	var channel_title = first_item.get_original_channel_title();
	var thumbnail = first_item.get_original_channel_thumbnail();
	var list_ids = _.pluck(items, 'id');

	// We return a ContentNodeModel rather than a ChannelModel because the
	// clipboard view code was written to expect the attribute names on
	// a ContentNodeModel.
	//
	// TODO(davidhu): Create a separate NodeModel from which to base both
	// ContentNodeModel and ChannelModel.
	return new Models.ContentNodeModel({
		id: channel_id,
		title: channel_title,
		children_collection: new Models.ContentNodeCollection(items),
		children: list_ids,
		kind: 'channel',
		sort_order: sort_order,
		thumbnail: thumbnail,
		metadata: {
			resource_count: items.length,
		},
	});
}

function group_by_channels(collection) {
	var channel_index = 0;
	var grouped = new Models.ContentNodeCollection(
		collection.chain().groupBy(function(item) {
			return item.get_original_channel_id();
		})
		.map(function(items) {
			channel_index++;
			return create_channel_node_for_content_items(items, channel_index);
		})
		.value()
	);
	grouped.sort_by_order();
	return grouped;
}

var ClipboardList = BaseViews.BaseWorkspaceListView.extend({
	isclipboard: true,
	template: require("./hbtemplates/queue_list.handlebars"),
	selectedClass: "queue-selected",
	default_item: ".queue-list-wrapper >.content-list >.default-item, >.content-list >.default-item",
	list_selector: ".queue-list-wrapper >.content-list, >.content-list",
	badge_selector: ".queue-badge",
	tab_selector: "#switch_to_queue",
	list_wrapper_selector: "#clipboard-queue",
	item_class_selector: ".queue-item",
	name: NAMESPACE,
    $trs: MESSAGES,
	'id': function() {
		return "list_" + this.model.get("id");
	},
	initialize: function(options) {
		_.bindAll(this, 'delete_items', 'edit_items', 'handle_drop', 'move_items', 'update_badge_count', 'load_fetched_collection');
		this.bind_workspace_functions();
		this.collection = options.collection;
		this.container = options.container;
		this.add_controls = options.add_controls;
		this.content_node_view = options.content_node_view;
		this.is_root = options.is_root;
		this.render();
		this.container.lists.push(this);
		this.listenTo(this.model, 'change:children', this.update_views);
		this.listenTo(this.model, 'change:metadata', this.update_badge_count);
	},
	render: function() {
		this.$el.html(this.template({
			is_clipboard : true,
			add_controls : this.add_controls,
			id: this.model.id
		},  {
            data: this.get_intl_data()
        }));
		window.workspace_manager.put_list(this.model.get("id"), this);
		this.$(this.default_item).text(this.get_translation("loading"));

		// Don't make channels draggable, but do make items within channels
		// draggable.
		if (this.is_root) {
			// NOTE(davidhu): Hack: Initialize jQueryUI#sortable()
			// within this element but don't actually make anything draggable,
			// because we have code in drag_drop.js that makes calls like
			// $(".content-list").sortable("disable"), which expects all
			// `.content-list` elements to have been initialized with jQueryUI#sortable.
			this.$el.find(".content-list").sortable({items: ''});
		} else {
			this.make_droppable();
		}

		var children_collection = this.model.get("children_collection");
		if (children_collection) {
			this.load_fetched_collection(children_collection);
		} else {
			this.retrieve_nodes(this.model.get("children")).then(this.load_fetched_collection);
		}
	},
	load_fetched_collection: function(fetched_collection) {
		fetched_collection.sort_by_order();
		this.load_content(fetched_collection);
		this.$(self.default_item).text((this.add_controls)? this.get_translation("clipboard_empty") : this.get_translation("no_items"));
		this.refresh_droppable();
	},
	// Overrides superclass
	load_content: function(collection, default_text) {
		// Save the current position, then load in the new clipboard items, then
		// jump back to the saved scroll position.
		//
		// We do this because the superclass implementation of load_content clears
		// all items and re-adds them one-by-one, and we expand each top-level
		// segment after it gets added.
		//
		// Unfortunately this leads to a situation where if some segments were
		// collapsed before this call, they'll all get re-expanded. This pretty much
		// happens after every add or copy to the clipboard, since this method gets
		// called each time after (by reload_ancestors()).
		//
		// TODO(davidhu): Also save and restore the expansion states of the top-level
		// segments.
		if (this.is_root) {
			var scroll_top = this.$('#clipboard_list').scrollTop();
			collection = group_by_channels(collection);
		}
		BaseViews.BaseWorkspaceListView.prototype.load_content.call(this, collection, default_text);
		if (this.is_root) {
			var self = this;
			setTimeout(function() {
				self.$('#clipboard_list').scrollTop(scroll_top);
			}, 0);
		}
	},
	// Overrides superclass
	add_single_node:function(node, item_map) {
		// Add a single node! Find the right channel to append it to or create a new
		// channel node.
		var new_view = this.create_new_view(node);
		var channel_id = node.get_original_channel_id();

		if (item_map[channel_id]) {
			// Append to the appropriate channel
			var channel_list_view = item_map[channel_id].getSubcontentView();
			channel_list_view.$el.find('.content-list').append(new_view.el);
		} else {
			// ... or create a new channel node, insert as the first item, and append
			// the channel to the list of channels in the clipboard.
			var channel_node = create_channel_node_for_content_items([node], /* sort_order = */ 1);
			var item_view = this.create_new_view(channel_node);
			this.$(this.list_selector).append(item_view.el);
		}
	},
	drop_in_container: function(moved_item, selected_items, orders) {
		this.track_event_for_nodes('Clipboard', 'Drag item out', moved_item);
		return BaseViews.BaseWorkspaceListView.prototype.drop_in_container.call(
				this, moved_item, selected_items, orders);
	},
	// Whether this list is a top-level segment used for UI grouping purposes
	// only, and shouldn't be treated as an actual collection for API purposes.
	//
	// Currently, this returns if the list represents a channel, but can be
	// changed to support any changes on how we segment items.
	is_segment: function() {
		return this.model.get('kind') === 'channel';
	},
	events: {
		'change .select_all' : 'check_all_items',
		'click .delete_items' : 'delete_items',
		'click .edit_items' : 'edit_items',
		'click .move_items' : 'move_items',
		'click .create_new_content' : 'add_topic',
		'click .upload_files_button': 'add_files',
		'click .import_content' : 'import_content',
		'click .create_exercise_button' : 'add_exercise'
	},
	check_all_items: function(event) {
		this.track_analytics_event('Clipboard', 'Select all');
		this.check_all(event);
	},
	update_badge_count:function(){
	  	var self = this;
	  	if(this.add_controls){
	  		self.model.fetch({
	  			success:function(root){
	  				$(self.badge_selector).html(root.get("metadata").resource_count);
	  			}
	  		});
		}
	},
	handle_if_empty:function(){
		this.$(this.default_item).css("display", (this.model.get("children").length > 0) ? "none" : "block");
		this.update_badge_count();
	},
	handle_checked:function(){
		var checked_count = this.$el.find(".queue-selected").length;
		this.$(".queue-disable-none-selected *").prop("disabled", checked_count === 0);
		(checked_count > 0)? this.$(".queue-disable-none-selected *").removeClass("disabled") : this.$(".queue-disable-none-selected *").addClass("disabled");
	},
	create_new_view:function(model){
		var item_view = new ClipboardItem({
				containing_list_view: this,
				model: model,
				container : this.container
			});
			if (item_view.is_segment()) {
				item_view.open_folder(0);
			}
		this.views.push(item_view);
		return item_view;
	},
	delete_items:function(){
    var selected_items = _.pluck(this.get_selected(true), 'model');
		this.track_event_for_nodes('Clipboard', 'Delete items intent', selected_items);
		var self = this;
        dialog.dialog(this.get_translation("warning"), this.get_translation("delete_message"), {
            [this.get_translation("cancel")]:function(){},
            [this.get_translation("delete")]: function(){
        self.track_event_for_nodes('Clipboard', 'Delete items', selected_items);
				self.delete_items_permanently(self.get_translation("deleting_content"));
				self.$(".select_all").attr("checked", false);
            },
        }, null);
	},
	edit_items:function(){
    var selected_items = _.pluck(this.get_selected(true), 'model');
		this.track_event_for_nodes('Clipboard', 'Edit items', selected_items);
		this.container.edit_selected(true);
	},
	move_items:function(){
    var selected_items = _.pluck(this.get_selected(true), 'model');
    this.track_event_for_nodes('Clipboard', 'Move items intent', selected_items);
		this.container.move_items();
	},
	handle_drop:function(collection){
		// Don't handle dropping an item from the clipboard onto nowhere.
		// When one attempts to drag an item from the clipboard onto an empty space,
		// the handle_drop of the item's containing ClipboardList container is
		// invoked. Do nothing in this case by returning a Promise reject to stop
		// further handling.
		//
		// TODO(davidhu): This displays an error in the console. So don't reject the
		// promise, but send a stop signal and make sure handlers can handle that.
		if (!this.is_root) {
			return Promise.reject('handle_drop on child ClipboardList not supported');
		}

		var self = this;
		this.$(this.default_item).css("display", "none");
		return new Promise(function(resolve, reject){
			if(collection.has_related_content()){
				dialog.dialog(self.get_translation("related_content"), self.get_translation("related_content_warning", collection.length), {
		            [self.get_translation("cancel")]:function(){},
		            [self.get_translation("continue")]: function(){
	            		resolve(collection);
		            },
		        }, reject);
			}else{
				resolve(collection)
				/* Implementation for creating copies of nodes when dropped onto clipboard */
				// collection.duplicate(self.model).then(reject);
			}
		});
  	},
  	close_all_popups: function() {
  		this.container.close_all_popups();
  	}
});

var ClipboardItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
	isclipboard: true,
	list_selector: "#clipboard_list",
	template: require("./hbtemplates/queue_item.handlebars"),
	selectedClass: "queue-selected",
	expandedIcon: "expand_more",
	collapsedIcon: "expand_less",
	className: function() {
		return `queue-item ${this.is_segment() ? 'segment' : ''}`;
	},
	name: NAMESPACE,
    $trs: MESSAGES,
	getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
	getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
	'id': function() {
		return this.model.get("id");
	},
	getSubcontentView: function() {
		return this.subcontent_view;
	},
	reload:function(model){
		this.model.set(model.attributes);
		this.$el.find(">div>label .title").text(this.model.get("title"));
		this.$el.find(">div>label .badge").text(this.model.get("metadata").resource_count);
	},
	handle_checked:function(){
		this.checked = this.$el.find(">div>input[type=checkbox]").is(":checked");
		(this.checked)? this.$el.addClass(this.selectedClass) : this.$el.removeClass(this.selectedClass);
		this.container.handle_checked();
	},
	// Whether this item is a top-level segment used for UI grouping purposes
	// only, and shouldn't be treated as an actual collection for API purposes.
	//
	// Currently, this returns if the list represents a channel, but can be
	// changed to support any changes on how we segment items.
	is_segment: function() {
		return this.model.get('kind') === 'channel';
	},

	initialize: function(options) {
		_.bindAll(this, 'delete_content');
		this.bind_workspace_functions();
		this.containing_list_view = options.containing_list_view;
		this.container = options.container;
		this.render();
	},
	render: function(renderData) {
		var is_segment = this.is_segment();
		var channel_id = this.model.get("id");
		var segment_url = (is_segment && channel_id !== 'unknown_channel_id' &&
				`/channels/${channel_id}/view`);


		this.$el.html(this.template({
			node:this.model.toJSON(),
			segment_url: segment_url,
			channel_id: this.model.get("kind") === "channel" && this.model.get("id"),
			isfolder: (this.model.get("kind") === "topic") || is_segment,
			is_segment: is_segment,
			is_clipboard : true,
			checked: this.checked
		},  {
            data: this.get_intl_data()
        }));
		this.handle_checked();
		window.workspace_manager.put_node(this.model.get("id"), this);
		if (!is_segment) {
			this.make_droppable();
			this.create_popover();
		}

		// Color channels' accent bars and their background by the dominant color of
		// the thumbnail.
		if (is_segment && this.model.get('thumbnail')) {
			var self = this;
			setTimeout(function() {
				var v = new Vibrant(self.model.get('thumbnail'));
				v.getPalette(function(err, palette) {
					var colorHex = palette.Muted.getHex();
					var color = palette.Muted.getRgb();
					self.$('label.segment').css({
						'border-left': `10px solid ${colorHex}`,
						'background-color': `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.2)`,
					});
				});
			}, 0);
		}
	},
	create_popover:function(){
		var self = this;
		this.$(".content-options-dropdown").popover({
			animation:false,
			trigger:"manual",
			html: true,
			selector: '[rel="popover"]',
			content: function () {
		        return $("#queue_option_" + self.model.get("id")).html();
		    }
		}).click(function(event){
			self.containing_list_view.close_all_popups();
			if(!$(this).hasClass("active-popover")){
				$(this).popover('show');
	        	$(this).addClass("active-popover");
			}
	        event.preventDefault();
	        event.stopPropagation();
		});
	},
	open_context_menu:function(event){
		if( event.button == 2 ) {
			this.cancel_actions(event);
			var contextmenu = this.$(".context-menu");
			contextmenu.addClass("init");
			contextmenu.offset({
				left: event.pageX + 5,
				top: event.pageY + 5,
			});
			contextmenu.focus();
			contextmenu.removeClass("init");
		}
	},
	events: {
		'click .delete_content' : 'delete_content',
		'click .tog_folder' : 'toggle_item',
		'click .edit_content' : 'edit_item',
		'change input[type=checkbox]': 'handle_checked',
		'contextmenu .queue_item' : 'open_context_menu',
		'click .copy_content': 'copy_content',
		'click .move_content': 'move_content',
		'click .queue_item_title': 'edit_item'
	},
	toggle_item: function(event) {
    // NOTE: This is a bit of hack, checking the DOM to determine whether we're
    // toggling or clicking within the popover menu.
    var $target = $(event.target);
	  if ($target.hasClass('tog_folder') || $target.hasClass('toggle-icon')) {
      this.track_event_for_nodes('Clipboard', 'Toggle folder', this.model);
	  }
		// Don't toggle on click of a link.
		if ($target.hasClass('segment-link-icon')) {
			return;
		}
		this.toggle(event);
	},
	edit_item:function(event){
		if (this.is_segment()) {
			// Don't open channels. Allow propagation so that toggling happens.
			return;
		}

		this.track_event_for_nodes('Clipboard', 'Edit item', this.model);

		event.stopPropagation();
		event.preventDefault();
		this.open_edit(true);
	},
	load_subfiles:function(){
		if(!this.subcontent_view){
			var data = {
				collection: this.containing_list_view.collection,
				el: this.$el.find("#" + this.id() +"_sub"),
				add_controls : false,
				model: this.model,
				container: this.container,
				content_node_view:this
			}
			this.subcontent_view = new ClipboardList(data);
			this.$el.find("#" + this.id() +"_sub").append(this.subcontent_view.el);
		}
	},
	delete_content:function(){
    this.track_event_for_nodes('Clipboard', 'Delete item intent', this.model);
		var self = this;
        dialog.dialog(this.get_translation("warning"), this.get_translation("delete_item_warning", this.model.get("title")), {
            [self.get_translation("cancel")]:function(){},
            [self.get_translation("delete")]: function(){
              self.track_event_for_nodes('Clipboard', 'Delete item', self.model);
            	self.remove();
            	self.destroy(null, function(){
            		self.reload_ancestors(new Models.ContentNodeCollection([self.model]), false);
            	});
            }
        }, null);
	},
	copy_content:function(event){
		this.track_event_for_nodes('Clipboard', 'Copy item', this.model);
		this.cancel_actions(event);
		this.make_copy();
	},
	move_content:function(event){
		this.track_event_for_nodes('Clipboard', 'Move item intent', this.model);
		this.cancel_actions(event);
		this.open_move('clipboard');
	},
});

module.exports = {
	Queue:Queue
}
