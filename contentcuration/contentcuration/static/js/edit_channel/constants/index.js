const { sortBy } = require('underscore');
const ContentKinds = require('./ContentKinds');
const FormatPresets = require('./FormatPresets');
const Languages = require('./Languages');
const Licenses = require('./Licenses');
const MasteryModels = require('./MasteryModels');
const Roles = require('./Roles');
const Statuses = require('./Statuses');

module.exports = {
  ContentKinds,
  FormatPresets,
  Languages: sortBy(Languages, 'native_name'),
  Licenses,
  MasteryModels,
  Roles,
  Statuses,
};
