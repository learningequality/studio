var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Images = require("edit_channel/image/views");
var stringHelper = require("edit_channel/utils/string_helper");
var dialog = require("edit_channel/utils/dialog");
require("details.less");
var d3Helper = require("edit_channel/utils/d3_helper");

var NAMESPACE = "details";
var MESSAGES = {
    "author": "This {model} features resources created by",
    "aggregator": "Material in this {model} was originally hosted at",
    "provider": "The material in this {model} was provided by",
    "saved": "SAVED!",
    "header": "CHANNEL DETAILS",
    "save_changes": "SAVE CHANGES",
    "channel_name": "Channel Name",
    "channel_name_error": "Channel name cannot be blank.",
    "channel_name_placeholder": "Enter channel name...",
    "channel_description": "Channel Description",
    "description_placeholder": "Enter channel description...",
    "no_license": "No license selected",
    "author_description": "Person or organization who created the content",
    "aggregator_description": "Person or organization who gathered the content together",
    "provider_description": "Person or organization who distributed the content",
    "loading_details": "Loading details...",
    "license": "{count, plural,\n =1 {License}\n other {Licenses}}",
    "copyright_holder": "{count, plural,\n =1 {Copyright Holder}\n other {Copyright Holders}}",
    "auth_info": "Authoring Information",
    "metadata_info": "Content Metadata",
    "summary_info": "Summary",
    "total_resources": "# of Resources",
    "resource_size": "Size",
    "storage": "Storage",
    "visibility_breakdown": "Visibility",
    "content_breakdown": "Content Summary",
    "languages": "Languages",
    "tags": "Content Tags",
    "open": "OPEN CHANNEL",
    "resource_count": "{count, plural,\n =1 {# Resource}\n other {# Resources}}",
    "visibility_count": "{count, plural,\n =1 {# resource is}\n other {# resources are}} visible to {user}",
    "kind_count": "{count, plural,\n =1 {# {kind}}\n other {# {kind_plural}}}",
    "role_description": "Coach content is visible to coaches only in Kolibri",
    "sample_pathway": "Sample Pathway",
    "channel_language": "Language",
    "channel_id": "Channel ID",
    "channel_tokens": "{count, plural,\n =1 {Channel Token}\n other {Channel Tokens}}",
    "unpublished": "Unpublished",
    "last_published": "Last Published",
    "copy": "Copy",
    "copy_text": "Copy the following into Kolibri to import this channel",
    "delete_channel": "DELETE CHANNEL",
    "deleting_channel": "Deleting Channel...",
    "delete_warning": "All content under this channel will be permanently deleted.\nAre you sure you want to delete this channel?",
    "delete_title": "Delete this Channel",
    "delete_prompt": "Once you delete a channel, the channel will be permanently deleted.",
    "save": "SAVE",
    "dont_save": "Discard Changes",
    "keep_open": "Keep Editing",
    "total_resource_count": "{data, plural,\n =1 {Total Resource}\n other {Total Resources}}",
    "create": "CREATE",
    "invalid_channel": "Cannot save invalid channel",
    "original_channels": "Imported Channels",
    "created": "Created",
    "whats_inside": "What's Inside",
    "source": "Source",
    "topic": "topic",
    "using_channel": "Using this Channel",
    "very_small": "Very Small",
    "small": "Small",
    "average": "Average",
    "large": "Large",
    "very_large": "Very Large",
    "includes": "Includes",
    "coach_content": "Coach Content",
    "assessments": "Assessments",
    "accessible_languages": "Subtitles",
    "additional": "Additional",
    "recommended": "(Recommended)",
    "preview": "Preview"
}

var SCALE_TEXT = ["very_small", "very_small", "small", "small", "average", "average", "average", "large", "large", "very_large", "very_large"];

var ChannelDetailsModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/details_modal.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, 'close_details');
        this.parent_view = options.parent_view;
        this.render(this.close_details, {});
        this.allow_edit = options.allow_edit;
        this.details_editor = new ChannelDetailsView({
            el: this.$(".modal-body"),
            modal: this,
            model: options.model,
            onnew: options.onnew,
            ondelete: options.ondelete,
            allow_edit: this.allow_edit
        });
        this.$("#channel_details_modal").on("shown.bs.modal", this.details_editor.create_initial);
    },
    close_details: function(event) {
        if(this.allow_edit && this.details_editor.changed) {
            var self = this;
            dialog.dialog(this.get_translation("unsaved_changes"), this.get_translation("unsaved_changes_text"), {
                [self.get_translation("dont_save")]: function(){
                    self.close();
                    $(".modal-backdrop").remove();
                },
                [self.get_translation("keep_open")]:function(){},
                [self.get_translation("save")]:function(){
                    self.details_editor.submit_changes();
                    self.close();
                    $(".modal-backdrop").remove();
                },
            }, null);
        } else {
            this.close();
            $(".modal-backdrop").remove();
        }
    }
});


var ChannelDetailsView = BaseViews.BaseListEditableItemView.extend({
    template: require("./hbtemplates/details_editor.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, "set_thumbnail", "reset_thumbnail", "remove_thumbnail", "init_focus", "create_initial", "submit_changes");
        this.modal = options.modal;
        this.onnew = options.onnew;
        this.ondelete = options.ondelete;
        this.thumbnail_url = this.model.get("thumbnail_url");
        this.thumbnail = this.model.get("thumbnail");
        this.allow_edit = options.allow_edit;
        this.changed = false;
        if(!this.onnew) {
            var main_tree_id = (typeof this.model.get('main_tree') == "string")? this.model.get('main_tree') : this.model.get('main_tree').id;
            this.main_tree = new Models.ContentNodeModel({id: main_tree_id});
        }
        this.render();
    },
    events: {
      "click #submit": "submit_changes",
      "change .input_listener": "register_changes",
      "keyup .input_listener": "register_changes",
      "focus .input-tab-control": "loop_focus",
      "click .copy-id-btn" : "copy_id",
      "click .delete_channel": "delete_channel"
    },
    render: function() {
        this.$el.html(this.template({
            channel: this.model.toJSON(),
            languages: window.languages.toJSON(),
            picture : (this.model.get("thumbnail_encoding") && this.model.get("thumbnail_encoding").base64) || this.model.get("thumbnail_url"),
            language: window.languages.findWhere({"id": this.model.get("language")}),
            can_edit: this.allow_edit,
            is_new: !!this.onnew
        },  {
            data: this.get_intl_data()
        }));
        $("#select_language").val(this.model.get("language") || 0);
        this.$('[data-toggle="tooltip"]').tooltip();

        // Load main tree details
        if(!this.onnew) {
            var self = this;
            var main_tree = this.main_tree || this.model.get("main_tree");
            main_tree.fetch_details().then(function(data) {
                self.settings_view = new DetailsView({
                    el: self.$("#look-inside"),
                    allow_edit: true,
                    model: data,
                    channel_id: self.model.id,
                    model_name: self.get_translation("channel").toLowerCase(),
                    channel: self.model.toJSON()
                });
                $(".details_view").css("display", "block");
            });
        }
        this.create_initial();
    },
    copy_id:function(event){
        event.stopPropagation();
        event.preventDefault();
        var button = $(event.target);
        var self = this;
        $(button.data("text")).focus();
        $(button.data("text")).select();
        try {
            document.execCommand("copy");
            button.text("check");
        } catch(e) {
            button.text("clear");
        }
        setTimeout(function(){
            button.text("content_paste");
        }, 2500);
    },
    create_initial: function() {
        if(this.allow_edit) {
            this.image_upload = new Images.ThumbnailUploadView({
                model: this.model,
                el: this.$("#channel_thumbnail"),
                preset_id: "channel_thumbnail",
                upload_url: window.Urls.thumbnail_upload(),
                acceptedFiles: "image/jpeg,image/jpeg,image/png",
                image_url: this.thumbnail_url,
                default_url: "/static/img/kolibri_placeholder.png",
                onsuccess: this.set_thumbnail,
                onerror: this.reset_thumbnail,
                oncancel:this.enable_submit,
                onstart: this.disable_submit,
                onremove: this.remove_thumbnail,
                allow_edit: true,
                is_channel: true
            });
            this.init_focus();
        }
    },
    init_focus: function(){
        this.set_indices();
        this.set_initial_focus();
        window.scrollTo(0, 0);
    },
    submit_changes:function(){
        var language = $("#select_language").val();
        var self = this;
        $("#submit").html(this.get_translation("saving"))
                            .attr("disabled", "disabled")
                            .addClass("disabled");
        this.save({
            "name": $("#input_title").val().trim(),
            "description": $("#input_description").val(),
            "thumbnail": this.model.get("thumbnail"),
            "language": (language===0)? null : language
        }).then(function(data){
            self.changed = false;
            if (self.onnew) {
                self.onnew(data);
                self.modal && self.modal.close_details();
            } else {
                $("#submit").html(self.get_translation("saved"));
                setTimeout(function(){
                    $("#submit").html(self.get_translation("no_changes_detected"));
                }, 2000);
            }

        });
    },
    register_changes:function(){
        $("#submit").html(this.get_translation((this.onnew)? "create" : "save_changes"));

        var isvalid = $("#input_title").val().trim() !== "";
        $("#channel_error").css("display", (isvalid)? "none" : "inline-block");
        if(isvalid){
            $("#submit").attr("disabled", false).removeClass("disabled").removeAttr("title");
        } else {
            $("#submit").attr("disabled", "disabled").addClass("disabled").attr("title", this.get_translation("invalid_channel"));
        }
        this.changed = true;
    },
    reset_thumbnail:function(){
        this.render();
        this.register_changes();
    },
    remove_thumbnail:function(){
        this.model.set("thumbnail", "/static/img/kolibri_placeholder.png");
        this.register_changes();
    },
    set_thumbnail:function(thumbnail, encoding, formatted_name, path){
        this.model.set("thumbnail", formatted_name);
        this.model.set("thumbnail_encoding", encoding)
        this.register_changes();
    },
    disable_submit:function(){
        this.$("#submit").attr("disabled", "disabled");
        this.$("#submit").addClass("disabled");
    },
    delete_channel: function() {
        var self = this;
        dialog.dialog(this.get_translation("warning"), this.get_translation("delete_warning", this.model.get("name")), {
            [this.get_translation("cancel")]:function(){},
            [this.get_translation("delete_channel")]: function(){
                self.save({"deleted":true}, self.get_translation("deleting_channel")).then(function() {
                    if (self.modal) {
                        self.modal.close_details();
                    }
                    self.ondelete(self.model);
                });
            },
        }, null);
    }
});


var DetailsView = BaseViews.BaseListEditableItemView.extend({
    template: require("./hbtemplates/details_view.handlebars"),
    tooltip_template: require("./hbtemplates/details_tooltip.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, "render_visuals");
        this.allow_edit = options.allow_edit;
        this.channel_id = options.channel_id;
        this.model_name = options.model_name || this.get_translation("topic");
        this.channel = options.channel;
        this.render();
    },
    render: function() {
        console.log(this.model.get("metadata"))
        var self = this;
        var original_channels = _.map(this.model.get("metadata").original_channels, function(item) {
            return (item.id === self.channel_id) ? {"id": item.id, "name": "Original Content", "count": item.count} : item;
        });
        this.$el.html(this.template({
            details: this.model.get("metadata"),
            resource_count: this.model.get("metadata").resource_count,
            channel_id: this.channel_id,
            allow_edit: this.allow_edit,
            original_channels:original_channels,
            model_name: this.model_name,
            license_count: this.model.get("metadata").licenses.length,
            copyright_holder_count: this.model.get("metadata").copyright_holders.length,
            token_count: this.channel && this.channel.secret_tokens.length,
            channel: this.channel,
            size_bar: this.get_size_bar(this.model.get("metadata").resource_size),
            count_bar: this.get_count_bar(this.model.get("metadata").resource_count),
        },  {
            data: this.get_intl_data()
        }));
        this.$('[data-toggle="tooltip"]').tooltip();
        _.defer(this.render_visuals, 500);
    },
    render_visuals: function() {
        this.render_breakdown();
        this.render_tagcloud();
    },
    render_tagcloud: function() {
        var self = this;
        var tagcloud = new d3Helper.TagCloud("#tagcloud", this.model.get("metadata").tags, {
            key: "tag_name",
            value_key: "count"
        });
    },
    render_breakdown: function() {
        var self = this;
        var total = this.model.get("metadata").resource_count;
        var data = _.map(this.model.get("metadata").kind_count, function(k) {
            return {
                "kind_id": k.kind_id,
                "percent": ((k.count / total) * 100).toFixed(1),
                "count": k.count,
            };
        });

        var color_key = window.contentkinds.map(function(k) { return k.get("kind"); });
        var piechart = new d3Helper.PieChart("#svg_wrapper", data, {
            key: "kind_id",
            width: 350,
            total: stringHelper.format_number(total),
            color_key: color_key,
            center_text: this.get_translation("total_resource_count", this.model.get("metadata").resource_count),
            tooltip: function(d) {
                return self.tooltip_template(d.data, { data: self.get_intl_data() });
            },
        });

        var legend = new d3Helper.Legend("#legend_wrapper", data, {
            key: "kind_id",
            color_key: color_key,
            get_text: function(d) {
                return stringHelper.translate(d.kind_id + "_plural");
            }
        });
    },
    get_size_bar: function(size) {
        var size_index = Math.min(Math.round(size/100000000), 10);
        size_index = 2;
        return {
            "filled": _.range(size_index),
            "text": this.get_translation(SCALE_TEXT[size_index])
        };
    },
    get_count_bar: function(count) {
        var size_index = Math.min(Math.round(count/100), 10);
        var bar = [];
        for(var i = 0; i < 10; ++ i) {
            bar.push(i <= size_index);
        }
        return {
            "filled": bar,
            "text": this.get_translation(SCALE_TEXT[size_index])
        };
    }

    // render_channels: function() {
    //     console.log(this.model.get("metadata"))
    //     var data = this.model.get("metadata").original_channels;
    //     console.log(data);
    //     var barchart = new d3Helper.HorizontalBarChart("#channel_svg_wrapper", data, {
    //         key: "id",
    //         value_key: "count",
    //         width: 500,
    //         height: 200,
    //         // tooltip: function(d) {
    //         //     return self.tooltip_template(d.data, { data: self.get_intl_data() });
    //         // },
    //     });


    // }
});


module.exports = {
    ChannelDetailsView: ChannelDetailsView,
    DetailsView:DetailsView
}
