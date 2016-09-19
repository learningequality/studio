var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Dropzone = require("dropzone");
require("exercises.less");

var ExerciseModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/exercise_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "close_exercise_uploader");
        this.render(this.close_exercise_uploader, {});
        this.exercise_view = new ExerciseView({
            el: this.$(".modal-body"),
            container: this,
            model:this.model,
            onsave: options.onsave,
            onnew: options.onnew
        });
    },
    close_exercise_uploader:function(event){
        if(this.exercise_view.collection.length === 0){
            this.close();
        }else if(confirm("Unsaved Metadata Detected! Exiting now will"
            + " undo any new changes. \n\nAre you sure you want to exit?")){
            // this.exercise_view.reset();
            this.close();
        }else{
            event.stopPropagation();
            event.preventDefault();
        }
    }
});

var ExerciseView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/exercise_view.handlebars"),
    initialize: function(options) {
        // _.bindAll(this);
        this.container = options.container;
        this.collection = new Models.AssessmentItemCollection();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.render();
    },

    render: function() {
        this.$el.html(this.template({}));
        this.exercise_list = new ExerciseList({
            el:this.$("#exercise_list_wrapper"),
            collection:this.collection,
            container:this,
            model:this.model
        })
    },
});

var ExerciseList = BaseViews.BaseEditableListView.extend({
    template: require("./hbtemplates/exercise_list.handlebars"),
    list_selector:"#exercise_list",
    default_item:"#exercise_list .default-item",

    initialize: function(options) {
        _.bindAll(this, "add_exercise");
        this.collection = options.collection;
        this.bind_edit_functions();
        // this.onsave = options.onsave;
        // this.onnew = options.onnew;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            total_questions:this.collection.length
        }));
        this.load_content();
    },
    events:{
      "click #add_exercise_button" : "add_exercise",
    },
    create_new_view:function(model){
        var new_exercise_item = new ExerciseItem({
            model: model,
            containing_list_view : this
        });
        this.views.push(new_exercise_item);
        return new_exercise_item;
    },
    add_exercise:function(){
        this.create_new_item({
            'contentnode': this.model.get("id"),
            'title': "New Question"
        }, true, "").then(function(assessment_item){
            console.log("Assessment:", assessment_item);
        });
    },
    // remove_view: function(view){
    //     this.views.splice(this.views.indexOf(this), 1);
    //     this.collection.remove(view.model);
    //     view.remove();
    //     this.handle_if_empty();
    //     if(this.views.length ===0){
    //         this.container.switch_view(1);
    //     }else{
    //         this.handle_completed();
    //     }
    // },
    // check_completed:function(){
    //     var is_completed = this.views.length > 0;
    //     this.views.forEach(function(view){
    //         is_completed = is_completed && view.check_for_completion();
    //     });
    //     return is_completed;
    // }
    // handle_completed:function(){
    //     if(this.check_completed() && !this.upload_in_progress){
    //         this.enable_next();
    //     }
    // }
});

var ExerciseItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/exercise_item.handlebars"),
    className: "format_item row table table-striped files file-row",

    'id': function() {
        return "format_item_" + this.model.filename;
    },

    initialize: function(options) {
        // _.bindAll(this, 'remove_item');
        this.containing_list_view = options.containing_list_view;
        this.originalData = this.model.toJSON();
        this.render();
    },
    // events: {
    //     'click .remove_from_dz ' : 'remove_item',
    // },
    render: function() {
        // var total_file_size = 0;
        // this.initial = this.files.findWhere({preset:null});
        // this.files.forEach(function(file){
        //     total_file_size += file.get("file_size");
        // })
        this.$el.html(this.template({
            question: this.model.toJSON()
        }));
    },
    // remove_item:function(){
    //     this.files.forEach(function(file){
    //         file.destroy();
    //     });
    //     this.containing_list_view.remove_view(this);
    //     this.model.destroy();
    // }
});

module.exports = {
    ExerciseView:ExerciseView,
    ExerciseModalView:ExerciseModalView,
    ExerciseItem:ExerciseItem
}