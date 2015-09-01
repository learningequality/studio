var Backbone = require("backbone");
var _ = require("underscore");
var ExerciseModels = require("./models");
var $ = require("jquery");
var Quill = require("quilljs");

require("../../less/exercises.less");
require("quilljs/dist/quill.snow.css");

var ExerciseListView = Backbone.View.extend({

    initialize: function() {
        this.render();
    },

    template: require("./hbtemplates/exercise_list.handlebars"),

    render: function (){
        this.$el.html(this.template({exercise_list: this.collection.toJSON()}))
    }
});

var EditorView = Backbone.View.extend({

    tagName: "div",

    initialize: function(options) {
        _.bindAll(this, "return_markdown");
        this.edit_el = options.edit_el;
        this.render();
    },

    template: require("./hbtemplates/editor.handlebars"),

    render: function() {
        this.$el.html(this.template());
        var html = $(this.edit_el).html();
        this.edit_el.html(this.el);
        this.editor = new Quill(this.$(".editor")[0], {
            modules: {
                'toolbar': { container: this.$('#toolbar')[0] }
            },
            theme: 'snow'
        });
        this.editor.setHTML(html);
        window.editor = this;
    },

    return_html: function() {
        return this.editor.getHTML();
    },

    return_markdown: function() {
        var contents = this.editor.getContents();
        var outputs = [];
        for (var i = 0; i < contents.ops.length; i++) {
            var insert = contents.ops[i].insert;
            var attributes = contents.ops[i].attributes;
            if (typeof attributes !== "undefined") {
                _.each(attributes, function(value, key) {
                    switch (key) {
                        case "bold":
                            if (value) {
                                insert = "**" + insert + "**";
                            }
                            break;
                        case "italic":
                            if (value) {
                                insert = "*" + insert + "*";
                            }
                            break;
                        case "bullet":
                            if (value) {
                                outputs[i-1] = "* " + outputs[i-1];
                            }
                            break;
                    }
                })
            }
            outputs.push(insert);
        }
        return outputs.join("");
    }
});


var ExerciseView = Backbone.View.extend({
    
    initialize: function() {
        _.bindAll(this, "add_all_assessment_items");
        this.collection = new ExerciseModels.AssessmentItemCollection(this.model.get("all_assessment_items"));
        this.listenToOnce(this.collection, "sync", this.add_all_assessment_items);
        this.collection.fetch();
        this.render();
    },

    events: {
        "click .multiplechoice": "multiplechoice",
        "click .truefalse": "truefalse",
        "click .freeresponse": "freeresponse"
    },

    template: require("./hbtemplates/exercise_edit.handlebars"),

    render: function() {
        this.$el.html(this.template(this.model.attributes));
    },

    add_all_assessment_items: function() {
        for (var i = 0; i < this.collection.length; i++){
            this.add_assessment_item_view(this.collection.at(i), i);
        }
    },

    add_assessment_item_view: function(model, i) {
        var view = new AssessmentItemView({model: model, number: i + 1});
        this.$("#accordion").append(view.el);
    },

    add_assessment_item: function(type) {
        var self = this;
        this.collection.create({
            type: type
        },{
            success: function (model){
                var items = self.model.get("all_assessment_items");
                items.push(model.get("id"));
                self.model.set("all_assessment_items", items);
                self.add_assessment_item_view(model);
            }
        });

    },

    multiplechoice: function() {
        this.add_assessment_item("multiplechoice");
    },

    truefalse: function() {
        this.add_assessment_item("truefalse");
    },

    freeresponse: function() {
        this.add_assessment_item("freeresponse");
    }
});

var AssessmentItemView = Backbone.View.extend({
    
    initialize: function(options) {
        _.bindAll(this, "add_editor", "remove_editor");
        this.number = options.number;
        this.render();
    },

    template: require("./hbtemplates/assessment_item_edit.handlebars"),

    render: function() {
        this.$el.html(this.template({model: this.model.attributes, number: this.number}));
        this.$(".collapse").on("show.bs.collapse", this.add_editor);
        this.$(".collapse").on("hidden.bs.collapse", this.remove_editor);
    },

    add_editor: function() {
        this.editor_view = new EditorView({edit_el: this.$(".question")});
    },

    remove_editor: function() {

    }
});

module.exports = {
    ExerciseListView: ExerciseListView,
    ExerciseView: ExerciseView,
    AssessmentItemView: AssessmentItemView
};