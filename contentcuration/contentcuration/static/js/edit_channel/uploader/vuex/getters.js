import { getSelected } from './utils';

export function getNode(state) {
  return function(index) {
    return state.nodes[index];
  };
}

export function selected(state) {
  return getSelected(state);
}

export function allExercises(state) {
  let selected = getSelected(state);
  return _.every(selected, { kind: 'exercise' });
}

export function allResources(state) {
  let selected = getSelected(state);
  return !_.some(selected, { kind: 'topic' });
}

export function changed(state) {
  return _.some(state.nodes, { changesStaged: true });
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
