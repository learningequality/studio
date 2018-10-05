var Models = require("./models");

const State = {
  current_channel: window.channel && new Models.ChannelModel(window.channel),
  current_user: new Models.UserModel(window.user),
  nodeCollection: new Models.ContentNodeCollection(),
  formatpresets: new Models.FormatPresetCollection(window.presets),
  contentkinds: new Models.ContentKindCollection(window.kinds),
  languages: new Models.LanguageCollection(window.langs),
  licenses: new Models.LicenseCollection(window.license_list),
  openChannel(data) {
    this.staging = data.is_staging || false;
    this.contenttags = new Models.TagCollection(this.current_channel.get('tags'));
    this.preferences = (typeof window.preferences === "string")? JSON.parse(window.preferences) : window.preferences;
    this.current_page = data.page;
  },
  updateUrl(topic, node, title) {
    this.topic = topic || this.topic;
    this.node = node;
    if(title) {
      document.title = title;
    }
  },
};

module.exports = State;
