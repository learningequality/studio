var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("share.less");
var stringHelper = require("edit_channel/utils/string_helper");

var ShareModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/share_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_share_modal");
        this.render();
        this.save_changes = false;
        this.originalData = this.model.toJSON();
        this.share_view = new ShareView({
            el: this.$(".modal-body"),
            container: this,
            model: this.model,
            current_user: options.current_user
        });
    },

    render: function() {
        this.$el.html(this.template({
            channel: this.model.toJSON()
        }));
        $("body").append(this.el);
        this.$(".modal").modal({show: true, backdrop: 'static', keyboard: false});
        this.$(".modal").on("hide.bs.modal", this.close_share_modal);
    },
    close_share_modal:function(){
        this.model.set(this.originalData);
        this.close();
    }
});

var ShareView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/share_dialog.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "send_invite", "save_content");
        this.container = options.container;
        this.current_user = options.current_user;
        this.originalData = this.model.toJSON();
        this.editor_list = this.model.get("editors");
        // this.editor_list.splice(this.editor_list.indexOf(this.current_user.id), 1);
        this.collection = new Models.UserCollection();
        this.collection.get_all_fetch(this.editor_list);

        this.pending_collection = new Models.UserCollection();
        this.pending_collection.get_all_fetch(this.model.get("pending_editors"));

        this.render();
    },
    events:{
        'keypress #share_email_address' : 'send_invite',
         "click #share_invite_button" : "send_invite",
         "click #share_content_submit" : "save_content"
    },

    render: function() {
        this.$el.html(this.template({
            channel:this.model.toJSON(),
            is_empty: this.collection.length == 0
        }));

        this.load_collection(this.collection, false);
        this.load_collection(this.pending_collection, true);
    },
    load_collection: function(collection, pending){
        var self = this;
        collection.forEach(function(editor){
            var share_item = new ShareItem({
                model:editor,
                containing_list_view:self,
                pending:pending
            });
            self.$("#share_list").append(share_item.el);
            self.views.push(share_item);
        });
    },
    send_invite:function(event){
        if((!event || (!event.keyCode || event.keyCode ==13)) && this.$el.find("#share_email_address").val().trim() != ""){
            var email = this.$("#share_email_address").val().trim();
            this.$(".share_list_item").removeClass("error_share_list_item");
            this.$("#share_error").text("");
            var result;
            if(result = this.collection.findWhere({"email": email})){
                this.$("#share_error").text("This person already has editing permission.");
                this.$("#share_item_" + result.get("id")).addClass("error_share_list_item");
                $('#editor_list_wrapper').animate({
                    scrollTop : this.$("#share_item_" + result.get("id")).position().top,
                }, 100);
            }else if(result = this.pending_collection.findWhere({"email": email})){
               this.$("#share_error").text("This person has already been invited.");
               this.$("#share_item_" + result.get("id")).addClass("error_share_list_item");
               $('#editor_list_wrapper').animate({
                    scrollTop : this.$("#share_item_" + result.get("id")).position().top,
                }, 100);
            }

            /* Successfully found user with email who is not already on list */
            else if(result = new Models.UserModel().fetch_by_email(email)){
                this.send_mail(result);
            }

            else{
                // this.$("#share_error").text("No found user with this email.");
                result = new Models.UserModel({
                    email:email,
                    id:-1
                });
                this.send_mail(result);
            }
        }
    },
    send_mail:function(user){
        this.$("#share_email_address").val("");
        this.$("#share_invite_button").val("Sending...");
        var self = this;
        user.send_invitation_email(this.model, this.current_user, function(){
            self.add_to_pending_collection(user, function(){
                self.$("#share_invite_button").val("Invite");
                self.$("#share_item_" + user.get("id")).addClass("added_to_list");
                self.$("#share_item_" + user.get("id") + " .pending_indicator").text("Invitation Sent!");
                $('#editor_list_wrapper').animate({
                    scrollTop : self.$("#share_item_" + user.get("id")).position().top,
                }, 100);
                setTimeout(function(){
                    $("#share_item_" + user.get("id")).animate({"background-color" : "transparent"}, 500);
                    $("#share_item_" + user.get("id") + " .pending_indicator").text("Pending...");
                    $("#share_item_" + user.get("id")).removeClass("added_to_list");
                }, 2500);
           });
        });
    },
    add_to_pending_collection:function(user, callback){
        var self = this;
        this.pending_collection.forEach(function(editor){
            self.$("#share_item_" + editor.get("id")).data("data").remove();
        })
        this.pending_collection.add(user);
        this.load_collection(this.pending_collection, true);
        this.save_permissions(false);
        callback();
    },
    remove_editor:function(editor){
        this.collection.remove(editor);
        this.pending_collection.remove(editor);
        this.save_permissions(false);
    },
    save_content:function(){
        this.save_permissions(true);
    },
    save_permissions:function(show_indicator){
        var self = this;
        this.model.save({
            "editors": this.collection.pluck("id"),
            "pending_editors": this.pending_collection.pluck("id"),
            "public": this.$("#share_public_channel").is(':checked')
        }, {
            async:false,
            success:function(){
                if(show_indicator){
                    self.$("#share_change_indicator").css("display", "inline");
                    setTimeout(function(){
                        self.$("#share_change_indicator").fadeOut(200);
                    }, 2000)
                }
            }
        });
        this.container.originalData = this.model.toJSON();
    }
});

var ShareItem = BaseViews.BaseListItemView.extend({
    template: require("./hbtemplates/share_editor_item.handlebars"),
    tagName: "li",
    className: "share_list_item",
    'id': function() {
        return "share_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, 'remove_editor', 'reinvite_editor');
        this.pending = options.pending;
        this.containing_list_view = options.containing_list_view;
        this.render();
    },
    events: {
        'click .remove_editor' : 'remove_editor',
        'click .reinvite_editor' : 'reinvite_editor'
    },
    render: function() {
        this.$el.html(this.template({
            editor:this.model.toJSON(),
            pending:this.pending
        }));
        this.$el.data("data", this);
    },
    remove_editor:function(){
        if(confirm("Are you sure you want to remove " + this.model.get("first_name") + " " + this.model.get("last_name") + " from the list?")){
            this.containing_list_view.remove_editor(this.model);
            this.remove();
        }
    },
    reinvite_editor:function(){
        if(confirm("Send invitation to edit to " + this.model.get("first_name") + " " + this.model.get("last_name") + " again?")){
            var el = this.$(".pending_indicator");
            this.model.send_invitation_email(this.containing_list_view.model, this.containing_list_view.current_user,  function(){
                el.text("Invitation Sent!");
                setTimeout(function(){
                   el.text("Pending...");
                }, 2000);
            });
        }
    }
});

module.exports = {
    ShareModalView: ShareModalView,
    ShareView:ShareView
}