import Dexie from 'dexie';
import 'dexie-observable';
import uuidv4 from 'uuid/v4';
import { APP_ID } from './constants';

if (process.env.NODE_ENV !== 'production') {
  // If not in production mode, turn Dexie's debug mode on.
  Dexie.debug = true;
}

// A UUID to distinguish this JS client from others in the same browser.
export const CLIENTID = uuidv4();

// This can get set in order to update that this client is working in the scope of
// a specific channel, so we can scope changes.
let _channelScope = null;

export const channelScope = {
  get id() {
    return _channelScope;
  },
  set id(value) {
    _channelScope = value;
  },
};

const db = new Dexie(APP_ID);

export default db;
export const { Collection } = db;
