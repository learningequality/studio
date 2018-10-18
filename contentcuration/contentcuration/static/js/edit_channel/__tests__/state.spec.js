window.channel = {
  id: 'test',
};
const State = require('../state');
const Models = require('../models');

describe('The State object', () => {
  describe('properties', () => {
    it('should set State.current_channel to a ChannelModel', () => {
      expect(State.current_channel).toBeInstanceOf(Models.ChannelModel);
    });
    it('should set State.current_user to a UserModel', () => {
      expect(State.current_user).toBeInstanceOf(Models.UserModel);
    });
  });
  describe('openChannel method', () => {
    it('should set State.staging to the value of data.is_staging if defined', () => {
      State.openChannel({ is_staging: true });
      expect(State.staging).toEqual(true);
    });
    it('should set State.staging to false if data.is_staging is undefined', () => {
      State.openChannel({});
      expect(State.staging).toEqual(false);
    });
    it('should set State.Store.getters.contentTags to an empty Array', () => {
      State.openChannel({});
      expect(State.Store.getters.contentTags).toEqual([]);
    });
    it('should set State.preferences to window.preferences if it is not a string', () => {
      window.preferences = 1;
      State.openChannel({});
      expect(State.preferences).toEqual(1);
    });
    it('should set State.preferences to JSON.parse of window.preferences if it is a string', () => {
      const test = { test: 'test' };
      window.preferences = JSON.stringify(test);
      State.openChannel({});
      expect(State.preferences).toEqual(test);
    });
    it('should set State.current_page to data.page', () => {
      State.openChannel({ page: 'test' });
      expect(State.current_page).toEqual('test');
    });
  });
  describe('updateUrl method', () => {
    it('should set State.topic to the passed in topic if defined', () => {
      const topic = { topic: 'this is a topic' };
      State.updateUrl(topic);
      expect(State.topic).toBe(topic);
    });
    it('should set State.topic to itself if the passed in topic is not defined', () => {
      const topic = { topic: 'this is a topic' };
      State.topic = topic;
      State.updateUrl();
      expect(State.topic).toBe(topic);
    });
    it('should set State.node to the passed in node', () => {
      const node = { node: 'this is a node' };
      State.updateUrl(undefined, node);
      expect(State.node).toBe(node);
    });
    it('should set document.title to the passed in title if defined', () => {
      const title = 'lord titleton';
      State.updateUrl(undefined, undefined, title);
      expect(window.document.title).toBe(title);
    });
    it('should not change document.title if the passed in title is not defined', () => {
      const title = 'lord titleton';
      window.document.title = title;
      State.updateUrl();
      expect(window.document.title).toBe(title);
    });
  });
});
