const ExerciseView = require('../views').ExerciseView;
const Backbone = require('backbone');
// Register handlebars helpers to ensure templates are rendered properly.
require('handlebars/helpers');

const exampleAssessment = {
  type: 'multiplechoice',
  question: 'Ceci n\'est pas un question?',
  hints: '["Maybe it is, maybe not?"]',
  answers: '[{ "correct": true, "answer": "First" }, { "correct": false, "answer": "Second" }, { "correct": false, "answer": "Fish" } ]',
  order: 1,
  assessment_id: 'test',
  raw_data: '',
  source_url: '',
  randomize: true,
  deleted: false,
};

describe('ExerciseView', () => {
  let model;
  beforeEach(() => {
    model = new Backbone.Model({
      title: 'test',
      changed: false,
      id: 'test',
      description: 'test',
      sort_order: 1.5,
      author: 'test',
      copyright_holder: 'test',
      license: 'test',
      language: 'test',
      license_description: 'test',
      assessment_items: [],
      files: [],
      parent_title: 'test',
      ancestors: [],
      modified: 'test',
      original_channel: 'test',
      kind: 'test',
      parent: 'test',
      children: 'test',
      published: 'test',
      associated_presets: [],
      valid: 'test',
      metadata: 'test',
      original_source_node_id: 'test',
      tags: 'test',
      extra_fields: {
        randomize: false,
      },
      prerequisite: [],
      is_prerequisite_of: 'test',
      node_id: 'test',
      tree_id: 'test',
      publishing: false,
      freeze_authoring_data: false,
      role_visibility: 'test',
      provider: 'test',
      aggregator: 'test',
      thumbnail_src: 'test',
    });
  });
  describe('render method', () => {
    it('should render with a valid content node with no assessment_items', () => {
      const view = new ExerciseView({
        model,
      });
      view.render();
      const html = view.$el[0].outerHTML
      expect(html).toMatchSnapshot();
    });
    it('should render with a valid content node with 1 assessment_items', () => {
      model.set('assessment_items', [
        exampleAssessment,
      ]);
      const view = new ExerciseView({
        model,
      });
      view.render();
      const html = view.$el[0].outerHTML
      expect(html).toMatchSnapshot();
    });
    it('should render with a valid content node with 3 different assessment_items', () => {
      const exampleAssessment1 = exampleAssessment;
      const exampleAssessment2 = Object.assign({}, exampleAssessment);
      exampleAssessment2.type = 'single_selection';
      const exampleAssessment3 = Object.assign({}, exampleAssessment);
      exampleAssessment3.type = 'single_selection';
      exampleAssessment3.answers = "[]";
      model.set('assessment_items', [
        exampleAssessment1,
        exampleAssessment2,
        exampleAssessment3,
      ]);
      const view = new ExerciseView({
        model,
      });
      view.render();
      const html = view.$el[0].outerHTML
      expect(html).toMatchSnapshot();
    });
  });
});
