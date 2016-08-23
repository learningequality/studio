var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("share.less");
var stringHelper = require("edit_channel/utils/string_helper");

var ShareModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/share_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close");
        this.render(this.close, {
            channel: this.model.toJSON()
        });
        this.save_changes = false;
        this.originalData = this.model.toJSON();
        this.share_view = new ShareView({
            el: this.$(".modal-body"),
            container: this,
            model: this.model,
            current_user: options.current_user
        });
    }
});

var ShareView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/share_dialog.handlebars"),
    list_selector:"#share_list",
    default_item:"#editor-default-item",
    selectedClass: "editor-selected",

    initialize: function(options) {
        _.bindAll(this, "send_invite", "save_content");
        this.bind_list_functions();
        this.container = options.container;
        this.current_user = options.current_user;
        this.originalData = this.model.toJSON();
        this.render();

        // var self = this;
        // this.model.fetch({
        //     success:function(user){

        //     },
        //     error:function(error){
        //         console.log("Error message:", error);
        //     }
        // });

    },
    events:{
        'keypress #share_email_address' : 'send_invite',
         "click #share_invite_button" : "send_invite",
         "click #share_content_submit" : "save_content"
    },

    render: function() {
        this.$el.html(this.template({
            channel:this.model.toJSON()
        }));
        var share_item = this.create_new_view(new Models.UserModel(this.current_user));
        this.$("#share_list").append(share_item.el);

        this.editor_list = user.get("editors");
        this.editor_list.splice(this.editor_list.indexOf(this.current_user.id), 1);
        this.collection = new Models.UserCollection();
        this.pending_collection = new Models.InvitationCollection();
        var current_promise = this.collection.get_all_fetch(this.editor_list);
        var pending_promise = this.pending_collection.get_all_fetch(this.model.get("pending_editors"));
        var self = this;
        Promise.all([current_promise, pending_promise]).then(function(collections){
            self.load_content(collections[0]);
            self.load_content(collections[1]);
        });
    },
    create_new_view: function(model){
        var share_item = new ShareItem({
            model:model,
            containing_list_view:this,
        });
        this.views.push(share_item);
        return share_item;
    },
    send_invite:function(event){
        if((!event || (!event.keyCode || event.keyCode ==13)) && this.$el.find("#share_email_address").val().trim() != ""){
            var email = this.$("#share_email_address").val().trim();
            this.$(".share_list_item").removeClass("error_share_list_item");
            this.$("#share_error").text("");

            if(this.validate(email)){
                result = new Models.UserModel().fetch_by_email(email);
                this.send_mail(result, email);
            }
        }
    },
    validate:function(email){
        return this.check_email(email) && this.check_current_user(email)
            && this.check_current_editors(email) && this.check_pending_editors(email);
    },
    check_email:function(email){
        var emailtest = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!emailtest.test(email)){
            this.$("#share_error").text("Invalid email address.");
            return false;
        }
        return true;
    },
    check_current_user:function(email){
        if(this.current_user.email===email){
            this.$("#share_error").text("You already have editing permission for this channel.");
            this.$("#share_item_" + this.current_user.id).addClass("error_share_list_item");
            return false;
        }
        return true;
    },
    check_current_editors:function(email){
        var result = this.collection.findWhere({"email": email});
        if(result){
            this.$("#share_error").text("This person already has editing permission.");
            this.$("#share_item_" + result.get("id")).addClass("error_share_list_item");
            $('#editor_list_wrapper').animate({
                scrollTop : this.$("#share_item_" + result.get("id")).position().top,
            }, 100);
            return false;
        }
        return true;
    },
    check_pending_editors:function(email){
        var result = this.pending_collection.findWhere({"email": email});
        if(result){
           this.$("#share_error").text("This person has already been invited.");
           this.$("#share_item_" + result.get("id")).addClass("error_share_list_item");
           $('#editor_list_wrapper').animate({
                scrollTop : this.$("#share_item_" + result.get("id")).position().top,
            }, 100);
           return false;
        }
        return true;
    },
    send_mail:function(user, email){
        this.$("#share_email_address").val("");
        if(!user){
            user = new Models.UserModel();
        }
        var self = this;
        user.send_invitation_email(email, this.model).then(function(invite){
            self.add_to_pending_collection(invite, function(){
                self.$("#share_invite_button").val("Invite");
                self.$("#share_item_" + invite.get("id")).addClass("added_to_list");
                self.$("#share_item_" + invite.get("id") + " .pending_indicator").text("Invitation Sent!");
                $('#editor_list_wrapper').animate({
                    scrollTop : self.$("#share_item_" + invite.get("id")).position().top,
                }, 100);
                setTimeout(function(){
                    $("#share_item_" + invite.get("id")).animate({"background-color" : "transparent"}, 500);
                    $("#share_item_" + invite.get("id")).removeClass("added_to_list");
                }, 2500);
           });
        });
    },
    add_to_pending_collection:function(user, callback){
        var self = this;
        this.model.fetch({
            success:function(){
                self.pending_collection.forEach(function(editor){
                    self.$("#share_item_" + editor.get("id")).data("data").remove();
                });
                self.pending_collection = self.pending_collection.get_all_fetch(self.model.get("pending_editors"));
                self.load_collection(self.pending_collection, true);
                callback();
            },
            error:function(obj, error){
                console.log("Error adding user", obj);
                console.log("Error message:", error);
                console.trace();
            }
        });

    },
    remove_editor:function(editor){
        this.collection.remove(editor);
        this.save_permissions(false);
    },
    save_content:function(){
        this.save_permissions(true);
    },
    save_permissions:function(show_indicator){
        var self = this;
        this.model.save({
            "editors": [this.current_user.id, this.collection.pluck("id")],
            "public": this.$("#share_public_channel").is(':checked')
        }, {
            success:function(){
                self.$("#share_change_indicator").text("Changes Saved");
                if(show_indicator){
                    self.$("#share_change_indicator").css("display", "inline");
                    setTimeout(function(){
                        self.$("#share_change_indicator").fadeOut(200);
                    }, 2000)
                }
            },
            error:function(){
                self.$("#share_change_indicator").text("Error saving changes...");
                self.$("#share_change_indicator").css("display", "inline");
                setTimeout(function(){
                    self.$("#share_change_indicator").fadeOut(200);
                }, 2000)
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
            is_self: this.containing_list_view.current_user.id === this.model.get("id")
        }));
        this.$el.data("data", this);
    },
    remove_editor:function(){
        /* Person has not accepted the invite yet */
        if(this.model.get("invited")){
            if(confirm("Are you sure you want to uninvite " + this.model.get("email") + "?")){
                this.model.destroy();
                this.remove();
            }
        }else{
            if(confirm("Are you sure you want to remove " + this.model.get("first_name") + " " + this.model.get("last_name") + " from the list?")){
                this.containing_list_view.remove_editor(this.model);
                this.remove();
            }
        }
    },
    reinvite_editor:function(){
        if(confirm("Send invitation to edit to " + this.model.get("first_name") + " " + this.model.get("last_name") + " again?")){
            var el = this.$(".pending_indicator");
            this.model.resend_invitation_email(this.containing_list_view.model, function(){
                el.text("Invitation Sent!");
            });
        }
    }
});

module.exports = {
    ShareModalView: ShareModalView,
    ShareView:ShareView
}