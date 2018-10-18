const Models = require("./models");
const Constants = require("./constants/index");

const State = {
  current_channel: window.channel && new Models.ChannelModel(window.channel),
  current_user: new Models.UserModel(window.user),
  nodeCollection: new Models.ContentNodeCollection(),
  currentLanguage: Constants.Languages.find(l => l.id && l.id.toLowerCase() === window.languageCode ),
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
