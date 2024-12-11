import Mediator from './mediator';
import { events, nameSpace, DataTypes } from './hashiBase';
import Kolibri from './kolibri';

/*
 * This is the main entry point for interacting with the Hashi library.
 * Import this client in order to wrap an iframe that has an instance of
 * the 'SandboxEnvironment' class (found inside iframeClient.js) inside of it.
 * When an iframe has been wrapped, then this class can be initialized to set initial
 * data, and allow the iframe to setup its own environment and start running
 * a contained HTML5 app.
 */
export default class MainClient {
  constructor({ iframe, now } = {}) {
    this.events = events;
    this.iframe = iframe;
    this.mediator = new Mediator(this.iframe.contentWindow);
    this.storage = {};
    this.kolibri = new Kolibri(this.mediator);
    this.now = now;
    this.ready = false;
    this.contentNamespace = null;
    this.startUrl = null;
  }
  initialize(contentState, userData, startUrl, contentNamespace) {
    /*
     * userData should be an object with the following keys, all optional:
     * userId: <user ID>,
     * userFullName: <user's full name>,
     * progress: <current progress between 0 and 1>,
     * complete: <boolean of whether complete or not>,
     * timeSpent: <time spent in seconds>,
     * language: <language code>,
     */
    this.__setListeners();

    this.contentNamespace = contentNamespace;
    this.startUrl = startUrl;

    this.iframe.style.width = '100%';

    // Bugfix for Chrome: Force update of iframe width. If this is not done the
    // document size may not be updated before the content resizes.
    this.iframe.getBoundingClientRect();

    // Set this here so that any time the inner frame declares it is ready
    // it can reinitialize its SandboxEnvironment.
    this.on(this.events.IFRAMEREADY, () => {
      this.ready = true;
      this.mediator.sendMessage({
        nameSpace,
        event: events.MAINREADY,
        data: {
          contentNamespace,
          startUrl,
        },
      });
    });
    this.mediator.sendMessage({ nameSpace, event: events.READYCHECK, data: true });

    // This group of functions and events is for the custom channels work
    // They each fetch data from the kolibri database and return it to
    // the iframe
    this.on(this.events.DATAREQUESTED, message => {
      let event;
      if (message.dataType === DataTypes.COLLECTION) {
        event = events.COLLECTIONREQUESTED;
      } else if (message.dataType === DataTypes.COLLECTIONPAGE) {
        event = events.COLLECTIONPAGEREQUESTED;
      } else if (message.dataType === DataTypes.MODEL) {
        event = events.MODELREQUESTED;
      } else if (message.dataType === DataTypes.SEARCHRESULT) {
        event = events.SEARCHRESULTREQUESTED;
      } else if (message.dataType === DataTypes.KOLIBRIVERSION) {
        event = events.KOLIBRIVERSIONREQUESTED;
      } else if (message.dataType === DataTypes.CHANNELMETADATA) {
        event = events.CHANNELMETADATAREQUESTED;
      } else if (message.dataType === DataTypes.CHANNELFILTEROPTIONS) {
        event = events.CHANNELFILTEROPTIONSREQUESTED;
      } else if (message.dataType === DataTypes.RANDOMCOLLECTION) {
        event = events.RANDOMCOLLECTIONREQUESTED;
      }

      if (event) {
        this.mediator.sendLocalMessage({
          nameSpace,
          event,
          data: message,
        });
      }
    });

    this.on(this.events.DATARETURNED, message => {
      this.mediator.sendMessage({ nameSpace, event: events.DATARETURNED, data: message });
    });

    this.on(this.events.NAVIGATETO, message => {
      this.mediator.sendMessage({ nameSpace, event: events.NAVIGATETO, data: message });
    });

    this.on(this.events.CONTEXT, message => {
      this.mediator.sendMessage({ nameSpace, event: events.CONTEXT, data: message });
    });
  }
  __setListeners() {
    Object.keys(this.storage).forEach(key => {
      const storage = this.storage[key];
      storage.on(events.STATEUPDATE, () => {
        this.mediator.sendLocalMessage({ nameSpace, event: events.STATEUPDATE, data: this.data });
      });
    });
  }

  on(event, callback) {
    if (!Object.values(events).includes(event)) {
      throw ReferenceError(`${event} is not a valid event name for ${nameSpace}`);
    }
    this.mediator.registerMessageHandler({ nameSpace, event, callback });
  }

  onStateUpdate(callback) {
    this.on(events.STATEUPDATE, callback);
  }
}
