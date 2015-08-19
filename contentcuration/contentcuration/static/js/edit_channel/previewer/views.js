var Backbone = require("backbone");
var _ = require("underscore");
require("previewer.less");

var PreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer.handlebars"),
	initialize: function() {
        _.bindAll(this, 'previous', 'toggle_preview', 'fullscreen', 'open_pdf', 'open_audio', 'open_video', 'toggle_details');
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
		
        this.render();
    },
    render: function() {
        this.$el.html(this.template(this.model));
		var detail_template = require("./hbtemplates/details.handlebars");
		$("#previewer").append(detail_template(this.model.file));
		$(".details").css("display", "none");
    },
		
	events: {
		'click .clipboard_previous':'previous',
		'click .toggle_previewer': 'toggle_preview',
		'click .toggle_details':'toggle_details',
		'click .fullscreen' : 'fullscreen',
		'click .pdf_sample': 'open_pdf',
		'click .audio_sample': 'open_audio',
		'click .video_sample': 'open_video'
	},
		
	previous: function(event){
		console.log("Going back...");
	},
	toggle_preview: function(event){
		console.log("Toggling Previewer...");
		$("#previewer").hide();
	},
	fullscreen: function(event){
		console.log("Opening fullscreen view...");
	},
	open_pdf: function(event){
		var view = new PDFPreviewerView({
				el: $("#preview_window"),
				model: this.model
			});
	},
	open_audio: function(event){
		var view = new AudioPreviewerView({
				el: $("#preview_window"),
				model: this.model
			});
	},
	open_video: function(event){
		var view = new VideoPreviewerView({
				el: $("#preview_window"),
				model: this.model
			});
	},
	toggle_details: function(event){
		$(".details").slideToggle();
		$(".toggle_details").html(($(".toggle_details").html() == "Show Details") ? "Hide Details" : "Show Details");
	}
});

/* Todo: make extension of PreviewerView */
/* Todo: figure out better way to load files onto previewer */
/* Todo: might need to add fullscreen option */

var PDFPreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer_pdf.handlebars"),
	initialize: function() {
        _.bindAll(this);
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
        this.render();
    },
    render: function() {
           this.$el.html(this.template(this.model));
    }
});
var AudioPreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer_audio.handlebars"),
	initialize: function() {
        _.bindAll(this);
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
        this.render();
    },
    render: function() {
           this.$el.html(this.template(this.model));
    }
});
var VideoPreviewerView = Backbone.View.extend({
	template: require("./hbtemplates/previewer_video.handlebars"),
	initialize: function() {
        _.bindAll(this);
        //this.listenTo(this.model, "change:number_of_hexagons", this.render);
        this.render();
    },
    render: function() {
           this.$el.html(this.template(this.model));
    }
});

module.exports = {
	PreviewerView: PreviewerView
}