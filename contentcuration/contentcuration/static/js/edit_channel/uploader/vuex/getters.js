import _ from 'underscore';

export function nodes(state) {
  return state.nodes;
}

export function getNode(state) {
  return function(index) {
    return state.nodes[index];
  };
}

export function selected(state) {
  return _.map(state.selectedIndices, index => {
    return state.nodes[index];
  });
}

// TODO: Remove this once hooked up to actual state
export function authors() {
  return ['Alakazam', 'Arbok', 'Articuno', 'Aerodactyl'];
}

export function providers() {
  return ['Pikachu', 'Pidgey', 'Pinsir'];
}

export function aggregators() {
  return [];
}

export function copyrightHolders() {
  return ['Charizard', 'Clefairy', 'Cloyster', 'Caterpie'];
}

export function tags() {
  return ['Tauros', 'Tentacool', 'Tangela'];
}
