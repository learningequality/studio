var Backbone = require("backbone");
var _ = require("underscore");
require("previewer.less");

var PreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer.handlebars"),
	initialize: function(options) {
        _.bindAll(this, 'toggle_preview', 'open_pdf', 'open_audio', 'open_video', 'toggle_details');
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.file_type = options.file_type;
        this.render();
    },
    render: function() {
        this.$el.html(this.template(this.model));
		var detail_template = require("./hbtemplates/details.handlebars");
		var content_view;
		switch(this.file_type){
			case "pdf":
				content_view =  require("./hbtemplates/previewer_pdf.handlebars");
				detail_template = require("./hbtemplates/pdf_details.handlebars");
				$("#previewer").prepend(detail_template(this.model.file));
				break;
			case "audio":
				content_view =  require("./hbtemplates/previewer_audio.handlebars");
				$("#previewer").append(detail_template(this.model.file));
				break;
			default: //video by default
				content_view =  require("./hbtemplates/previewer_video.handlebars");
				$("#previewer").append(detail_template(this.model.file));
		}
		$("#preview_window").append(content_view(this.model));
		$(".details").css("display", "none");
    },
		
	events: {
		'click .toggle_previewer': 'toggle_preview',
		'click .toggle_details':'toggle_details',
		'click .pdf_sample': 'open_pdf',
		'click .audio_sample': 'open_audio',
		'click .video_sample': 'open_video'
	},

	toggle_preview: function(event){
		$("#previewer").hide();
	},
	toggle_details: function(event){
		$(".details").slideToggle();
		$(".toggle_details").html(($(".toggle_details").html() == "Show Details") ? "Hide Details" : "Show Details");
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