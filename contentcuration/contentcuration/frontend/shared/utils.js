import chunk from 'lodash/chunk';

/**
 * Insert an item into an array before another item.
 * @param {Array} arr
 * @param {Number} idx An index of an item before which
 *                     a new item will be inserted.
 * @param {*} item A new item to be inserted into an array.
 */
export function insertBefore(arr, idx, item) {
  const newArr = JSON.parse(JSON.stringify(arr));
  const insertAt = Math.max(0, idx);
  newArr.splice(insertAt, 0, item);

  return newArr;
}

/**
 * Insert an item into an array after another item.
 * @param {Array} arr
 * @param {Number} idx An index of an item after which
 *                     a new item will be inserted.
 * @param {*} item A new item to be inserted into an array.
 */
export function insertAfter(arr, idx, item) {
  const newArr = JSON.parse(JSON.stringify(arr));
  const insertAt = Math.min(arr.length, idx + 1);
  newArr.splice(insertAt, 0, item);

  return newArr;
}

/**
 * Swap two elements of an array
 * @param {Array} arr
 * @param {Number} idx1
 * @param {Number} idx2
 */
export function swapElements(arr, idx1, idx2) {
  const newArr = JSON.parse(JSON.stringify(arr));
  [newArr[idx1], newArr[idx2]] = [newArr[idx2], newArr[idx1]];

  return newArr;
}

/**
 * Remove identical pairs from an array.
 *
 * @param {Array} arr Example: [
 *                      ['food', 'chocolate'],
 *                      ['drink', 'juice'],
 *                      ['food', 'chocolate'],
 *                      ['chocolate', 'food']
 *                    ]
 * @returns A new array without identical pairs
 *          (only exact matches will be removed)
 *          E.g. for the array above this function
 *          returns [
 *            ['food', 'chocolate'],
 *            ['drink', 'juice'],
 *            ['chocolate', 'food']
 *          ]
 */
export function removeDuplicatePairs(arr) {
  if (!arr) {
    throw ReferenceError('an array of pairs must be defined');
  }

  const resultArr = [];

  for (let idx = 0; idx < arr.length; idx++) {
    const currentItem = arr[idx];
    const identicalItem = arr.slice(idx + 1).findIndex(step => {
      return step[0] === currentItem[0] && step[1] === currentItem[1];
    });
    const isDuplicate = identicalItem !== -1;

    if (!isDuplicate) {
      resultArr.push(arr[idx]);
    }
  }

  return resultArr;
}

/**
 * Check if a vertex is a successor of another vertex
 * in a directed graph.
 *
 * Based on depth-first search (DFS) algorithm with
 * focus on traversing only path starting at the given
 * root vertex.
 *
 * It is assumed that graph contains no cycles because
 * this function is being used in context of preventing
 * from such situations. If needed it can adjusted
 * to detect cycles in a graph by traversing
 * all paths instead of only a path starting at a root
 * vertex.
 *
 * See https://www.cs.cornell.edu/courses/cs2112/2019fa/lectures/lecture.html?id=traversals
 * to get some background about DFS.
 *
 * @param {String} rootVertex A root vertex.
 * @param {String} vertexToCheck Check if this vertex is a successor of a root vertex.
 * @param {Array} graph    A directed graph as an array of edges, e.g.
 *                         [
 *                           ['A', 'B'],
 *                           ['B', 'C']
 *                         ]
 * @param {Array} immediate Check only immediate relationship.
 * @returns {Boolean}
 */
export function isSuccessor({ rootVertex, vertexToCheck, graph, immediateOnly = false }) {
  if (!rootVertex || !vertexToCheck || !graph) {
    throw `[isSuccessor] All required parameters need to be specified`;
  }

  if (!graph.length) {
    return false;
  }

  if (immediateOnly) {
    return (
      graph.findIndex(edge => {
        return edge[0] === rootVertex && edge[1] === vertexToCheck;
      }) !== -1
    );
  }

  const WHITE = 'w';
  const GRAY = 'g';
  const BLACK = 'b';

  const dfs = ({ grayVertex, coloredVertices, graph }) => {
    // immediate successors of the gray vertex
    const immediateSuccessors = coloredVertices.filter(v => {
      return (
        graph.findIndex(edge => {
          return edge[0] === grayVertex.name && edge[1] === v.name;
        }) !== -1
      );
    });

    for (const s of immediateSuccessors) {
      if (s.color === WHITE) {
        s.color = GRAY;

        dfs({
          grayVertex: s,
          coloredVertices,
          graph,
        });
      }
    }

    grayVertex.color = BLACK;
  };

  // Unique array of vertices
  let vertices = graph.reduce((accumulator, edge) => accumulator.concat(edge), []);
  vertices = [...new Set(vertices)];

  const coloredVertices = vertices
    .filter(v => v !== rootVertex)
    .map(v => {
      return { name: v, color: WHITE };
    });

  dfs({
    grayVertex: {
      name: rootVertex,
      color: GRAY,
    },
    coloredVertices,
    graph,
  });

  // Black vertices contain all vertices reachable from the root vertex
  const blackVertices = coloredVertices.filter(v => v.color === BLACK);
  return blackVertices.map(v => v.name).includes(vertexToCheck);
}

/**
 * Chunks an array of `things`, calling `callback` with `chunkSize` amount of items,
 * expecting callback to return `Promise` that when resolved will allow next chunk to be processed.
 * This then returns a promise that resolves when all promises returned from `callback(chunk)`
 * are resolved.
 *
 * @param {mixed[]} things -- `things` => `chunk`
 * @param {number} chunkSize
 * @param {Function<Promise>} callback
 * @return {Promise<mixed[]>}
 */
export function promiseChunk(things, chunkSize, callback) {
  if (!things.length) {
    return Promise.resolve([]);
  }

  return chunk(things, chunkSize).reduce((promise, thingChunk) => {
    return promise.then(results =>
      callback(thingChunk).then(chunkResults => results.concat(chunkResults))
    );
  }, Promise.resolve([]));
}
