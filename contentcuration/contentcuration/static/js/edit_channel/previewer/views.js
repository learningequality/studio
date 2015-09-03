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
		$(this.file.selector + " label").css("border", "3px solid #3E5E9F");
		
		var content_view;
		var file_type = ""; //getExtension(this.file.data("data").attributes.content_file.[filename]);

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
			default: //video by default
				content_view =  require("./hbtemplates/previewer_video.handlebars");
		}
		$("#preview_window").append(content_view(this.model));
		var parent_data = this.file.data("data");
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