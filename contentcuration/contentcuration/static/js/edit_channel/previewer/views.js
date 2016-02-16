var Backbone = require("backbone");
var _ = require("underscore");
require("previewer.less");

var PreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer.handlebars"),
	initialize: function(options) {
        _.bindAll(this, 'toggle_preview', 'toggle_details', 'load_description', 'load_details');
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.file = options.file;
		this.view_description = true;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
        	file : this.model,
        	view_description : this.view_description
        }));

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
		'click #detail_nav' : 'load_details'
	},

	toggle_preview: function(event){
		this.delete_view();
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
	load_description: function(){
		this.view_description = true;
		this.render();
	},
	load_details: function(){
		this.view_description = false;
		this.render();
	}
});

module.exports = {
	PreviewerView: PreviewerView
}