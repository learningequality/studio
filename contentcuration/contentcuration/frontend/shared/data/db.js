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

const db = new Dexie(APP_ID);

export default db;
export const { Collection } = db;
