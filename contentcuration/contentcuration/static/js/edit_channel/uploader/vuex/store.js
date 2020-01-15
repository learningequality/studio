import { modes } from './../constants';

var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

const editModalModule = {
  namespaced: true,
  state: {
    // Temporary root node
    currentNode: {
      id: window.root_id,
      title: 'Sandbox Topic',
      metadata: {
        max_sort_order: 0,
      },
    },
    nodes: [],
    selectedIndices: [],
    changes: {},
    mode: modes.VIEW_ONLY,
    /* Nodes validation errors in form of an array consisting
       of objects with the following interface:
       {
          // index of a node in state.nodes
          // (TODO - switch to node and assessment items IDs when possible
          // will require migration to a new data structure since everything
          // is currently built on indexes)
          nodeIdx: <Number>,
          errors: {
            // errors related to node details like title, licence, etc.
            details: [],
            assessment_items: [
              [], // first assessment item errors
              []  // second assessment item errors
            ]
          }
        }
    */
    validation: [],
    dialog: {
      open: false,
      title: '',
      message: '',
      submitLabel: '',
      onSubmit: () => {},
      onCancel: () => {},
    },
  },
  getters: getters,
  mutations: mutations,
  actions: actions,
};

module.exports = editModalModule;
