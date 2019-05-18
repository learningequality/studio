// import State from 'edit_channel/state';

// import Models from 'edit_channel/models';

export function saveNodes(context) {
  return new Promise(resolve => {
    // ADD SAVE LOGIC HERE
    _.each(context.state.nodes, node => (node.changesStaged = false));
    setTimeout(resolve, 1000);
  });
}

export function loadNodes(context, nodeIDs) {
  $.ajax({
    method: 'GET',
    url: window.Urls.get_nodes_by_ids_complete(),
    data: { nodes: JSON.stringify(nodeIDs) },
    success: data => {
      context.commit('SET_LOADED_NODES', data);
    },
  });
}

// fetch_nodes_by_ids_complete: function(ids, force_fetch) {
//     return this.get_fetch_nodes(ids, , force_fetch);
//   },
//   get_fetch_nodes: function(ids, url, force_fetch) {
//     force_fetch = force_fetch ? true : false;
//     var self = this;
//     return new Promise(function(resolve) {
//       var idlists = _.partition(ids, function(id) {
//         return force_fetch || !self.get({ id: id });
//       });
//       var returnCollection = new ContentNodeCollection(
//         self.filter(function(n) {
//           return idlists[1].indexOf(n.id) >= 0;
//         })
//       );
//       fetch_nodes(idlists[0], url).then(function(fetched) {
//         returnCollection.add(fetched.toJSON());
//         self.add(fetched.toJSON());
//         self.sort();
//         resolve(returnCollection);
//       });
//     });
//   },

//   function fetch_nodes(ids, url) {
//   return new Promise(function(resolve) {
//     // Getting "Request Line is too large" error on some channels, so chunk the requests
//     var promises = _.chain(ids)
//       .chunk(50)
//       .map(function(id_list) {
//         return new Promise(function(promise_resolve, promise_reject) {
//           if (id_list.length === 0) {
//             promise_resolve([]); // No need to make a call to the server
//           }
//           $.ajax({
//             method: 'GET',
//             url: url(id_list.join(',')),
//             error: promise_reject,
//             success: promise_resolve,
//           });
//         });
//       })
//       .value();
//     Promise.all(promises).then(function(values) {
//       resolve(new ContentNodeCollection(_.flatten(values)));
//     });
//   });
// }
// function fetch_nodes_by_ids(ids) {
//   return fetch_nodes(ids, window.Urls.get_nodes_by_ids);
// }
