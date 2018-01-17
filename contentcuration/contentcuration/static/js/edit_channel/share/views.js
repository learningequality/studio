var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("share.less");
var stringHelper = require("edit_channel/utils/string_helper");
var dialog = require("edit_channel/utils/dialog");

var VIEWER_SHARE_MODES = [{'share_mode': 'view', 'text': 'Can view'}]
var EDITOR_SHARE_MODES = [{'share_mode': 'edit', 'text': 'Can edit'}].concat(VIEWER_SHARE_MODES);

var NAMESPACE = "share";
var MESSAGES = {
    "invite_people": "Invite people to this channel",
    "email_placeholder": "Enter email address...",
    "access_list": "People who can access this channel",
    "you": "You",
    "loading_editors": "Loading editor list...",
    "changes_saved": "Changes Saved",
    "invite": "INVITE",
    "sharing_channel": "Sharing channel with others",
    "view_only": "view only",
    "pending": "Pending...",
    "resend": "Resend Invitation",
    "cancel_invite": "Cancel Invitation",
    "has_permission_already": "This person already has access to this channel.",
    "grant_edit_prompt": "This person already has viewing access. Would you like to grant editing permissions?",
    "granting_permissions": "Granting Permissions",
    "no": "NO",
    "yes": "YES",
    "user_has_access": "You already have editing permission for this channel.",
    "user_already_invited": "User Already Invited",
    "resend_prompt": "This user has already been invited. Resend invitation to {data}?",
    "already_invited": "This person has already been invited.",
    "sending_invitation": "Sending invitation...",
    "invite_failed": "Failed to send invitation",
    "invite_sent": "Invitation Sent!",
    "uninviting_editor": "Uninviting Editor",
    "send_invite_prompt": "Send invitation to {data} again?",
    "invite_sent_to": "Invitation sent to {data}",
    "invalid_email": "Invalid email address.",
    "uninviting_prompt": "Are you sure you want to uninvite {data}?",
    "uninvite": "UNINVITE",
    "send": "SEND",
    "removing_editor": "Removing Editor",
    "removing_prompt": "Are you sure you want to remove {data} from the list?",
    "joining_channel": "Joining Channel",
    "join_prompt": "By joining this channel, you will be listed as an editor and have access to it in your channel list. Continue?",
    "failed_join": "Failed to join editors",
    "join": "Join Channel",
    "leaving_channel": "Leaving Channel",
    "leave_prompt": "Leaving this channel will remove it from your channel list. Continue?",
    "failed_leave": "Failed to leave editors",
    "leave": "Leave Channel"
}

var ShareModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/share_modal.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
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
            current_user: options.current_user,
            allow_leave: options.allow_leave,
            onjoin: options.onjoin,
            onleave: options.onleave
        });
        this.$(".modal").on("shown.bs.modal", this.share_view.set_initial_focus);
    }
});

var ShareView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/share_dialog.handlebars"),
    current_user_template: require("./hbtemplates/share_current_user.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,

    initialize: function(options) {
        _.bindAll(this, "send_invite", 'loop_focus', 'set_initial_focus', 'set_indices', 'render_user');
        this.container = options.container;
        this.current_user = options.current_user;
        this.originalData = this.model.toJSON();
        this.show_list = this.show_list();
        this.can_edit = options.allow_leave && _.find(this.model.get("editors"), function(u){
            return u === window.current_user.id || u.id === window.current_user.id;
        });
        this.onjoin = options.onjoin;
        this.onleave = options.onleave;
        this.render();
        var self = this;
        Promise.all([this.fetch_model(this.model), this.fetch_model(this.current_user)]).then(function(data){
            self.load_lists();
        });
    },
    events:{
        'keypress #share_email_address' : 'send_invite',
        "click #share_invite_button" : "send_invite",
        'focus .input-tab-control': "loop_focus",
        'click .leave_editors': 'leave_editors',
        'click .join_editors': 'join_editors'
    },
    render: function() {
        var share_modes = this.get_share_modes();
        this.$el.html(this.template({
            channel:this.model.toJSON(),
            user: this.current_user.toJSON(),
            share_modes: share_modes,
            single_share_option: share_modes.length === 1,
            show_list: this.show_list
        }, {
            data: this.get_intl_data()
        }));
        this.render_user();
    },
    render_user:function(){
        if(this.$("#share_current_user_actions")){
            this.$("#share_current_user_actions").html(this.current_user_template({
                user: this.current_user.toJSON(),
                can_edit: this.can_edit
            }, {
                data: this.get_intl_data()
            }));
        }
    },
    show_list: function(){
        return window.current_user.get('is_admin') || _.find(this.model.get("editors"), function(u){
            return u === window.current_user.id
        });
    },
    get_share_modes: function(){
        if (!this.share_modes){
            var user_is_editor = _.find(this.model.get("editors"), function(u){return u === window.current_user.id});
            if(window.current_user.get('is_admin') || user_is_editor){
                this.share_modes = EDITOR_SHARE_MODES;
            }else{
                this.share_modes = VIEWER_SHARE_MODES;
            }
        }
        return this.share_modes;
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
                current_user: window.current_user
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
            var share_mode = this.$("#share_mode").val();
            this.$(".share_list_item").removeClass("error_share_list_item");
            this.$("#share_error").text("");
            this.$("#share_success").text("");

            var self = this;
            if(this.check_email(email) && this.check_current_user(email) && this.check_pending_editors(email, share_mode)){
                var result = this.pending_collection.findWhere({"email": email});
                if(result && share_mode == result.get('share_mode')){
                    dialog.dialog(this.get_translation("user_already_invited"), this.get_translation("resend_prompt", email),{
                        [self.get_translation("no")]:function(){},
                        [self.get_translation("yes")]: function(){
                            self.check_current_editors(email, share_mode, function(){
                                self.send_mail(email, share_mode);
                            });
                        }
                    }, function(){self.$("#share_email_address").val("");});
                } else {
                    this.check_current_editors(email, share_mode, function(){
                        self.send_mail(email, share_mode);
                    });
                }
            }
        }
    },
    check_email:function(email){
        var emailtest = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!emailtest.test(email)){
            this.$("#share_error").text(this.get_translation("invalid_email"));
            return false;
        }
        return true;
    },
    check_current_user:function(email){
        if(this.current_user.get("email")===email){
            this.$("#share_error").text(this.get_translation("user_has_access"));
            if(this.show_list){
                var item_selector = "#share_item_" + this.current_user.id;
                this.$(item_selector).addClass("error_share_list_item");
            }
            return false;
        }
        return true;
    },
    check_current_editors:function(email, share_mode, callback){
        var result = this.collection.findWhere({"email": email});
        var self = this;
        if(result){
            if (share_mode === "edit" && this.model.get("viewers").indexOf(result.id) >= 0){
                dialog.dialog(this.get_translation("granting_permissions"), this.get_translation("grant_edit_prompt"),{
                    [self.get_translation("no")]:function(){},
                    [self.get_translation("yes")]: function(){
                        callback();
                    }
                }, function(){});
            }else{
                this.$("#share_error").text(this.get_translation("has_permission_already"));
                if(this.show_list){
                    this.$("#share_item_" + result.get("id")).addClass("error_share_list_item");
                    $('#editor_list_wrapper').animate({
                        scrollTop : this.$("#share_item_" + result.get("id")).position().top,
                    }, 100);
                }
            }
            return false;
        }else{
            callback();
        }
    },
    check_pending_editors:function(email, share_mode){
        var result = this.pending_collection.findWhere({"email": email});
        if(result){
            if (share_mode == result.get('share_mode')){
                return true;
            }
            this.$("#share_error").text(this.get_translation("already_invited"));
            if(this.show_list){
                var item_selector = "#share_item_" + result.get("id");
                this.$(item_selector).addClass("error_share_list_item");
                $('#editor_list_wrapper').animate({
                    scrollTop : this.$("#share_item_" + result.get("id")).position().top,
                }, 100);
            }
            return false;
        }
        return true;
    },
    display_invalid_invitation:function(message, user){
        this.$("#share_error").text(message);
        this.$("#share_item_" + user.get("id")).addClass("error_share_list_item");
        $('#editor_list_wrapper').animate({
            scrollTop : this.$("#share_item_" + user.get("id")).position().top,
        }, 100);
    },
    send_mail:function(email, share_mode){
        this.$("#share_success").text(this.get_translation("sending_invitation"));
        var user = new Models.UserModel();
        var self = this;
        user.send_invitation_email(email, this.model, share_mode).then(function(invite){
            self.$("#share_success").text(self.get_translation("invite_sent_to", email));
            self.$("#share_invite_button").val(self.get_translation("invite"));
            self.$("#share_email_address").val("");
            self.pending_view.add_to_pending_collection(invite);
        }).catch(function(error){
            self.$("#share_success").text("");
            self.$("#share_error").text(self.get_translation("invite_failed"));
        });
    },
    join_editors: function(){
        var self = this;
        dialog.dialog(this.get_translation("joining_channel"), this.get_translation("join_prompt"), {
          [this.get_translation("cancel")]:function(){},
          [this.get_translation("join")]: function(){
                self.$(".join_button").attr("disabled", "disabled").addClass("disabled");
                self.model.add_editor(window.current_user.id).then(function(){
                    self.can_edit = true;
                    self.onjoin && self.onjoin(window.current_user);
                    self.render_user();
                }).catch(function(error){
                    dialog.alert(self.get_translation("failed_join"), error.responseText);
                });
          }
        }, null);
    },
    leave_editors: function(){
        var self = this;
        dialog.dialog(this.get_translation("leaving_channel"), this.get_translation("leave_prompt"), {
          [this.get_translation("cancel")]:function(){},
          [this.get_translation("leave")]: function(){
                self.$(".leave_button").attr("disabled", "disabled").addClass("disabled");
                self.model.remove_editor(window.current_user.id).then(function(){
                    self.can_edit = false;
                    self.onleave && self.onleave(window.current_user);
                    self.render_user();
                }).catch(function(error){
                    dialog.alert(self.get_translation("leaving_channel"), error.responseText);
                });
          }
        }, null);
    }
});

var BaseShareList = BaseViews.BaseEditableListView.extend({
    name: NAMESPACE,
    $trs: MESSAGES,
    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        this.load_content(this.collection, " ");
    }
});

var ShareCurrentList = BaseShareList.extend({
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

var SharePendingList = BaseShareList.extend({
    template: require("./hbtemplates/share_pending_list.handlebars"),
    list_selector:"#pending-list",
    default_item:"#pending-default",

    initialize: function(options) {
        this.bind_edit_functions();
        _.bindAll(this, 'add_to_pending_collection');
        this.collection = options.collection;
        this.render();
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
    name: NAMESPACE,
    $trs: MESSAGES,
    'id': function() {
        return "share_item_" + this.model.get("id");
    },
    render: function() {
        this.$el.html(this.template({
            editor:this.model.toJSON(),
            isviewonly:this.share_mode=="view"
        }, {
            data: this.get_intl_data()
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
    remove_editor:function(event){
        this.cancel_actions(event);
        var self = this;
        dialog.dialog(this.get_translation("uninviting_editor"), this.get_translation("uninviting_prompt", this.model.get("email")), {
            [self.get_translation("cancel")]:function(){},
            [self.get_translation("uninvite")]: function(){
                self.model.destroy();
                self.remove();
            },
        }, null);
    },
    reinvite_editor:function(){
        var self = this;
        dialog.dialog(this.get_translation("sending_invitation"), this.get_translation("send_invite_prompt", this.model.get_full_name()), {
            [self.get_translation("cancel")]:function(){},
            [self.get_translation("send")]: function(){
                self.model.resend_invitation_email(self.containing_list_view.model).then(function(){
                    self.show_invitation_sent();
                });
            },
        }, null);
    },
    show_invitation_sent:function(){
        this.$el.addClass("adding_to_list");
        this.$el.find(".pending_indicator").text(this.get_translation("invite_sent"));
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
        if(this.model.get("viewers") && this.model.get("viewers").indexOf(this.model.get("id")) >= 0){
            this.share_mode = "view";
        }
        this.render();
    },
    events: {
        'click .remove_editor' : 'remove_editor',
    },
    remove_editor:function(){
        var self = this;
        dialog.dialog(this.get_translation("removing_editor"), this.get_translation("removing_prompt", this.model.get_full_name()), {
            [self.get_translation("cancel")]:function(){},
            [self.get_translation("remove")]: function(){
                self.containing_list_view.remove_editor(self.model);
                self.remove();
            },
        }, function(){});
    }
});

module.exports = {
    ShareModalView: ShareModalView,
    ShareView:ShareView
}
