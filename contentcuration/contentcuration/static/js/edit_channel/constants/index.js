const { sortBy } = require('underscore');
const ContentKinds = require('./ContentKinds');
const FormatPresets = require('./FormatPresets');
const Languages = require('./Languages');
const Licenses = require('./Licenses');
const MasteryModels = require('./MasteryModels');
const Roles = require('./Roles');
const Statuses = require('./Statuses');

const kindToIconMap = {
  audio: 'headset',
  channel: 'apps',
  document: 'description',
  exercise: 'star',
  html5: 'widgets',
  image: 'image',
  slideshow: 'photo_library',
  topic: 'folder',
  video: 'theaters',
};

// Given a ContentNode kind enum, returns the associated MD icon code
function kindToIcon(kind) {
  const icon = kindToIconMap[kind];
  if (!icon) {
    return Error(`kind ${kind} does not have an associated icon`);
  }
  return icon;
}

module.exports = {
  ContentKinds,
  FormatPresets,
  Languages: sortBy(Languages, 'native_name'),
  Licenses,
  MasteryModels,
  Roles,
  Statuses,
  kindToIconMap,
  kindToIcon,
};
