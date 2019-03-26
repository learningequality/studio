const dragDropModule = {
  namespaced: true,
  state: {
    movedNodes: {},
  },
  getters: {
    movedNodes(state) {
      return state.movedNodes;
    },
  },
  mutations: {
    UPDATE_NODES(state, parentID, nodes) {
      state.movedNodes[parentID] = nodes;
    },
    RESET_NODES(state) {
      state.movedNodes = {};
    }
  },
  actions: {
    submitMove: function(context) {
      // MOVE
      console.log("MOVING...", context.get('dragDrop/movedNodes'));
      var data = {
          "nodes": self.toJSON(),
          "target_parent": target_parent.get("id"),
          "channel_id": State.current_channel.id,
          "max_order": max_order,
          "min_order": min_order
      };
      $.ajax({
          method: "POST",
          url: window.Urls.move_nodes(),
          data: JSON.stringify(data),
          error: reject,
          success: function (moved) {
              resolve(new ContentNodeCollection(JSON.parse(moved)));
          }
      });
      context.commit('RESET_NODES');
    }
  }
};

module.exports = dragDropModule;
