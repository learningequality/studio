const Backbone = require('backbone');

const ContentNodeCollection = require('../models').ContentNodeCollection;

function exampleContentNode() {
  const id = String(Math.floor(Math.random()*Math.pow(10, 32)));
  return {
    title: id,
    changed: false,
    id: id,
    description: id,
    sort_order: 1.5,
    author: id,
    copyright_holder: id,
    license: id,
    language: id,
    license_description: id,
    assessment_items: [],
    files: [],
    parent_title: id,
    ancestors: [],
    modified: id,
    original_channel: id,
    kind: id,
    parent: id,
    children: id,
    published: id,
    associated_presets: [],
    valid: id,
    metadata: id,
    original_source_node_id: id,
    tags: id,
    extra_fields: {
      randomize: false,
    },
    prerequisite: [],
    is_prerequisite_of: id,
    node_id: id,
    tree_id: id,
    publishing: false,
    freeze_authoring_data: false,
    role_visibility: id,
    provider: id,
    aggregator: id,
    thumbnail_src: id,
  }
}

function exampleFile() {
  const id = String(Math.floor(Math.random()*Math.pow(10, 32)));
  return {
    id: id,
    preset: {
      name: id,
      id: id,
    },
  };
}

function exampleAssessment() {
  const id = String(Math.floor(Math.random()*Math.pow(10, 32)));
  return {
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
    id,
  };
}

describe('ContentNodeCollection', () => {
  let collection;
  beforeEach(() => {
    collection = new ContentNodeCollection([])
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('save method', () => {
    it('should call Backbone.sync three times', () => {
      const node = exampleContentNode();
      node.files = [exampleFile()];
      node.assessment_items = [exampleAssessment()];
      collection.add(node);
      return collection.save().then(() => {
        expect(Backbone.sync).toHaveBeenCalledTimes(3);
      });
    });
    it('should save each assessment item to its own content node', () => {
      const node1 = exampleContentNode();
      node1.assessment_items = [exampleAssessment()];
      const node2 = exampleContentNode();
      node2.assessment_items = [exampleAssessment()];
      collection.add([node1, node2]);
      return collection.save().then(() => {
        expect(Backbone.sync.mock.calls[1][1].where({ contentnode: node1.id }).length).toBe(1);
        expect(Backbone.sync.mock.calls[1][1].where({ contentnode: node2.id }).length).toBe(1);
      });
    });
  });
});
