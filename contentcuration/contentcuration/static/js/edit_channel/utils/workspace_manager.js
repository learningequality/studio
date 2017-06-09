var _ = require("underscore");
var Models = require("edit_channel/models");

function WorkspaceManager(){
	this.table = {};
	this.main_view = null;
	this.queue_view = null;

	this._map = function(node, list){
		return {
			node: node,
			list: list
		};
	};

	this.set_main_view = function(view){
		this.main_tree_view = view;
	};
	this.set_queue_view = function(view){
		this.queue_view = view;
	};

	this.get_main_view = function(){
		return this.main_tree_view;
	};
	this.get_queue_view = function(){
		return this.queue_view;
	};

	this.put = function(key, node, list){
		this.table[key] = this._map(node, list);
	};
	this.put_node = function(key, node){
		var list = (this.table[key])? this.table[key].list : null;
		this.put(key, node, list);
	};

	this.put_list = function(key, list){
		var node = (this.table[key])? this.table[key].node : null;
		this.put(key, node, list);
	};

	this.get = function(key){
		return this.table[key];
	};

	this.get_node = function(key){
		return this.table[key].node;
	};

	this.get_list = function(key){
		return this.table[key].list;
	};

	this.remove = function(key){
		var n = this.get(key);
		if(n){
			if(n.node){
				if(n.node.containing_list_view) {
					n.node.containing_list_view.remove_view(n.node);
				}
				n.node.remove();
			}
			if(n.list){n.list.close();}
			this.put(key, null, null);
		}
	}

	this.print_values = function(){
		console.log(this.table);
	};

	this.get_published_collection = function(){
		var to_publish = new Models.ContentNodeCollection();
		_.each(this.table, function(item){
			if(item.node && item.node.$el.hasClass("to_publish")){
				to_publish.add(item.node.model);
			}
		});
		return to_publish;
	};
}

module.exports = WorkspaceManager;