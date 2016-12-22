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
        this.share_view = new ShareView({
            el: this.$(".modal-body"),
            container: this,
            model: this.model,
            current_user: options.current_user
        });
    }
});

var ShareView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/share_dialog.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "send_invite");
        this.container = options.container;
        this.current_user = options.current_user;
        this.originalData = this.model.toJSON();
        this.render();
        var self = this;
        Promise.all([this.fetch_model(this.model), this.fetch_model(this.current_user)]).then(function(data){
            self.load_lists();
        });
    },
    events:{
        'keypress #share_email_address' : 'send_invite',
         "click #share_invite_button" : "send_invite"
    },

    render: function() {
        this.$el.html(this.template({
            channel:this.model.toJSON(),
            user: this.current_user.toJSON()
        }));
    },
    load_lists:function(){
        this.editor_list = this.model.get("editors").concat(this.model.get("viewers"));
        this.editor_list.splice(this.editor_list.indexOf(this.current_user.id), 1);
        this.collection = new Models.UserCollection();
        this.pending_collection = new Models.InvitationCollection();
        var current_promise = this.collection.get_all_fetch(this.editor_list);
        var pending_promise = this.pending_collection.get_all_fetch(this.model.get("pending_editors"));
        var self = this;
        Promise.all([current_promise, pending_promise]).then(function(collections){
            self.current_view = new ShareCurrentList({
                collection: collections[0],
                el: self.$("#current_list_wrapper"),
                model: self.model,
                current_user: this.current_user
            });
            collections[1].reject({email:null})
            self.pending_view = new SharePendingList({
                collection: collections[1],
                el: self.$("#pending_list_wrapper"),
                model: self.model
            });
        });
    },
    send_invite:function(event){
        var code = (!event)? 1 : event.keyCode ? event.keyCode : event.which;
        if((code == 1 || code == 13) && this.$el.find("#share_email_address").val().trim() != ""){
            var email = this.$("#share_email_address").val().trim();
            this.$(".share_list_item").removeClass("error_share_list_item");
            this.$("#share_error").text("");

            if(this.validate(email)){
                this.send_mail(email);
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
        if(this.current_user.get("email")===email){
            this.$("#share_error").text("You already have editing permission for this channel.");
            this.$("#share_item_" + this.current_user.id).addClass("error_share_list_item");
            return false;
        }
        return true;
    },
    check_current_editors:function(email){
        var result = this.collection.findWhere({"email": email});
        if(result){
            this.$("#share_error").text("This person already has access to this channel.");
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
    send_mail:function(email){
        this.$("#share_email_address").val("");
        var user = new Models.UserModel();
        var self = this;
        user.send_invitation_email(email, this.model, this.$("#share_mode").val()).then(function(invite){
            self.$("#share_invite_button").val("Invite");
            self.pending_view.add_to_pending_collection(invite);
        });
    }
});

var ShareCurrentList = BaseViews.BaseEditableListView.extend({
    template: require("./hbtemplates/share_current_list.handlebars"),
    list_selector:"#current-list",
    default_item:"#current-default",

    initialize: function(options) {
        this.bind_edit_functions();
        _.bindAll(this, 'remove_editor');
        this.collection = options.collection;
        this.current_user = options.current_user;
        this.render();
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content(this.collection, " ");
    },
    create_new_view: function(model){
        var share_item = new ShareCurrentItem({
            model:model,
            containing_list_view:this,
        });
        this.views.push(share_item);
        return share_item;
    },
    remove_editor:function(editor){
        this.collection.remove(editor);
        var editor_list = this.collection.pluck("id");
        editor_list.push(this.current_user.id);
        this.model.save({
            "editors": editor_list,
            // "public": this.$("#share_public_channel").is(':checked')
        });
    }
});

var SharePendingList = BaseViews.BaseEditableListView.extend({
    template: require("./hbtemplates/share_pending_list.handlebars"),
    list_selector:"#pending-list",
    default_item:"#pending-default",

    initialize: function(options) {
        this.bind_edit_functions();
        _.bindAll(this, 'add_to_pending_collection');
        this.collection = options.collection;
        this.render();
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content(this.collection, " ");
    },
    create_new_view: function(model){
        var share_item = new SharePendingItem({
            model:model,
            containing_list_view:this,
        });
        this.views.push(share_item);
        return share_item;
    },
    add_to_pending_collection:function(user){
        this.collection.add(user);
        this.render();
        this.views.forEach(function(view){
            if(view.model === user){
                view.show_invitation_sent();
            }
        })
    }
});

var ShareItem = BaseViews.BaseListEditableItemView.extend({
    template: require("./hbtemplates/share_editor_item.handlebars"),
    tagName: "li",
    className: "share_list_item",
    share_mode: "edit",
    'id': function() {
        return "share_item_" + this.model.get("id");
    },
    render: function() {
        this.$el.html(this.template({
            editor:this.model.toJSON(),
            isviewonly:this.share_mode=="view"
        }));
    },
});

var SharePendingItem = ShareItem.extend({
    initialize: function(options) {
        _.bindAll(this, 'remove_editor', 'reinvite_editor');
        this.bind_edit_functions();
        this.containing_list_view = options.containing_list_view;
        this.share_mode = this.model.get("share_mode");
        this.render();
    },
    events: {
        'click .remove_editor' : 'remove_editor',
        'click .reinvite_editor' : 'reinvite_editor'
    },
    remove_editor:function(){
       if(confirm("Are you sure you want to uninvite " + this.model.get("email") + "?")){
            this.model.destroy();
            this.remove();
        }
    },
    reinvite_editor:function(){
        if(confirm("Send invitation to edit to " + this.model.get("first_name") + " " + this.model.get("last_name") + " again?")){
            var self = this;
            this.model.resend_invitation_email(this.containing_list_view.model).then(function(){
                self.show_invitation_sent();
            });
        }
    },
    show_invitation_sent:function(){
        this.$el.addClass("adding_to_list");
        this.$el.find(".pending_indicator").text("Invitation Sent!");
        var self = this;
        setTimeout(function(){
            self.$el.removeClass("adding_to_list").addClass("added_to_list");
            setTimeout(function(){
               self.$el.removeClass("added_to_list");
            }, 800);
        }, 2500);
    }
});

var ShareCurrentItem = ShareItem.extend({
    initialize: function(options) {
        _.bindAll(this, 'remove_editor');
        this.bind_edit_functions();
        this.containing_list_view = options.containing_list_view;
        if(window.current_channel.get("viewers").indexOf(this.model.get("id")) >= 0){
            this.share_mode = "view";
        }
        this.render();
    },
    events: {
        'click .remove_editor' : 'remove_editor',
    },
    remove_editor:function(){
        if(confirm("Are you sure you want to remove " + this.model.get("first_name")
            + " " + this.model.get("last_name") + " from the list?")){
            this.containing_list_view.remove_editor(this.model);
            this.remove();
        }
    }
});

module.exports = {
    ShareModalView: ShareModalView,
    ShareView:ShareView
}
