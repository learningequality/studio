/*
 * Vendored and modified from the excellent:
 * https://github.com/pubkey/broadcast-channel/blob/master/src/leader-election.js
 * So that we can add functionality:
 * 1) The ability to report back when a leader has been elected
 * 2) The ability for a tab to report itself has a dictator, which will depose
      any previously elected leader and will only relinquish power when it dies.
 */

import { add } from 'unload';
import uuidv4 from 'uuid/v4';
import isFunction from 'lodash/isFunction';

function sleep(time) {
  if (!time) time = 0;
  return new Promise(res => setTimeout(res, time));
}

const MESSAGES = {
  APPLY: 'APPLY',
  DEATH: 'DEATH',
  TELL: 'TELL',
};

const LEADER_CONTEXT = 'LEADER_ELECTION_CONTEXT';

// This is defined in the broadcast channel source
// for the postInternal method and should not be changed.
const INTERNAL_CHANNEL = 'internal';

const LeaderElection = function(channel, options) {
  this._channel = channel;
  this._options = options;

  this.isLeader = false;
  this.isDead = false;
  this.token = uuidv4();

  // Track whether any leader has been elected
  this._leaderExists = false;
  // A place to track a waiting for leader promise
  this._waitingForLeaderPromise = null;
  // A place to track a resolve callback for a waiting
  // for leader promise
  this._waitingForLeaderFn = null;

  this._isApl = false; // _isApplying
  this._reApply = false;

  // things to clean up
  this._unl = []; // _unloads
  this._lstns = []; // _listeners
  this._invs = []; // _intervals
};

LeaderElection.prototype = {
  applyOnce() {
    if (this.isLeader) return Promise.resolve(false);
    if (this.isDead) return Promise.resolve(false);

    // do nothing if already running
    if (this._isApl) {
      this._reApply = true;
      return Promise.resolve(false);
    }
    this._isApl = true;

    let stopCriteria = false;

    const isDictator = this._options.dictator;

    const handleMessage = msg => {
      if (msg.context === LEADER_CONTEXT && msg.token != this.token) {
        const submit = !isDictator && msg.dictator;
        const ignore = isDictator && !msg.dictator;
        if (!ignore) {
          // Ignore any messages from other non-dictatorial leaders if
          // this is a dictatorial context.
          if (msg.action === MESSAGES.APPLY) {
            // other is applying
            if (submit || msg.token > this.token) {
              // other has higher token, or is a dictator and we are not
              // stop applying
              stopCriteria = true;
            }
          }

          if (msg.action === MESSAGES.TELL) {
            // other is already leader
            stopCriteria = true;
          }
        }
      }
    };
    this._channel.addEventListener(INTERNAL_CHANNEL, handleMessage);

    const ret = _sendMessage(this, MESSAGES.APPLY) // send out that this one is applying
      .then(() => sleep(this._options.responseTime)) // let others time to respond
      .then(() => {
        if (stopCriteria) return Promise.reject(new Error());
        else return _sendMessage(this, MESSAGES.APPLY);
      })
      .then(() => sleep(this._options.responseTime)) // let others time to respond
      .then(() => {
        if (stopCriteria) return Promise.reject(new Error());
        else return _sendMessage(this);
      })
      .then(() => _beLeader(this)) // no one disagreed -> this one is now leader
      .then(() => true)
      .catch(() => false) // apply not successfull
      .then(success => {
        this._channel.removeEventListener(INTERNAL_CHANNEL, handleMessage);
        this._isApl = false;
        if (!success && this._reApply) {
          this._reApply = false;
          return this.applyOnce();
        } else return success;
      });
    return ret;
  },

  awaitLeadership({ success = null, cleanup = null } = {}) {
    this.electedCallback = success;
    this.deposedCallback = cleanup;
    if (
      /* _awaitLeadershipPromise */
      !this._aLP
    ) {
      this._aLP = _awaitLeadershipOnce(this);
    }
    return this._aLP;
  },

  get leaderExists() {
    return this._leaderExists;
  },

  set leaderExists(exists) {
    if (this._waitingForLeaderFn && exists) {
      this._waitingForLeaderFn(true);
      this._waitingForLeaderFn = null;
    } else if (this._leaderExists && !exists) {
      this._waitingForLeaderPromise = null;
      this._waitingForLeaderFn = null;
    }
    this._leaderExists = exists;
  },

  /*
   * A function to wait until anything has been elected leader.
   */
  waitForLeader() {
    if (!this._waitingForLeaderPromise) {
      this._waitingForLeaderPromise = new Promise(resolve => {
        if (this._leaderExists) {
          resolve(true);
        } else {
          this._waitingForLeaderFn = resolve;
        }
      });
    }
    return this._waitingForLeaderPromise;
  },

  depose() {
    this.isLeader = false;
    if (isFunction(this.deposedCallback)) {
      this.deposedCallback();
    }
    this._lstns.forEach(listener => this._channel.removeEventListener(INTERNAL_CHANNEL, listener));
    this._invs.forEach(interval => clearInterval(interval));
    this._unl.forEach(uFn => {
      uFn.remove();
    });
  },

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.depose();

    return _sendMessage(this, MESSAGES.DEATH);
  },
};

function _awaitLeadershipOnce(leaderElector) {
  if (leaderElector.isLeader) return Promise.resolve();

  return new Promise(res => {
    let resolved = false;

    const finish = () => {
      // applyOnce has resolved, hence there is
      // now a leader.
      leaderElector.leaderExists = true;
      if (resolved) return;
      if (leaderElector.isLeader) {
        resolved = true;
        clearInterval(interval);
        leaderElector._channel.removeEventListener(INTERNAL_CHANNEL, whenDeathListener);
        res(true);
      }
    };

    // try once now
    leaderElector.applyOnce().then(finish);

    // try on fallbackInterval
    const interval = setInterval(() => {
      leaderElector.applyOnce().then(finish);
    }, leaderElector._options.fallbackInterval);
    leaderElector._invs.push(interval);

    // try when other leader dies
    const whenDeathListener = msg => {
      if (msg.context === LEADER_CONTEXT && msg.action === MESSAGES.DEATH) {
        // Leader has died, so there is now no leader.
        leaderElector.leaderExists = false;
        leaderElector.applyOnce().then(finish);
      }
    };
    leaderElector._channel.addEventListener(INTERNAL_CHANNEL, whenDeathListener);
    leaderElector._lstns.push(whenDeathListener);
  });
}

/**
 * sends an internal message over the broadcast-channel
 */
function _sendMessage(leaderElector, action) {
  const msgJson = {
    context: LEADER_CONTEXT,
    action,
    token: leaderElector.token,
    dictator: leaderElector._options.dictator,
  };
  return leaderElector._channel.postInternal(msgJson);
}

function _beLeader(leaderElector) {
  if (!leaderElector.isLeader) {
    leaderElector.isLeader = true;
    if (isFunction(leaderElector.electedCallback)) {
      leaderElector.electedCallback();
    }
    const unloadFn = add(() => leaderElector.die());
    leaderElector._unl.push(unloadFn);

    const isLeaderListener = msg => {
      if (msg.context === LEADER_CONTEXT && msg.action === MESSAGES.APPLY) {
        _sendMessage(leaderElector, MESSAGES.TELL);
      }
    };
    const isDictator = this._options.dictator;
    if (!isDictator) {
      const coupListener = msg => {
        if (
          msg.context === LEADER_CONTEXT &&
          msg.action === MESSAGES.APPLY &&
          !isDictator &&
          msg.dictator
        ) {
          leaderElector.depose();
        }
      };
      leaderElector._channel.addEventListener(INTERNAL_CHANNEL, coupListener);
      leaderElector._lstns.push(coupListener);
    }
    leaderElector._channel.addEventListener(INTERNAL_CHANNEL, isLeaderListener);
    leaderElector._lstns.push(isLeaderListener);
    return _sendMessage(leaderElector, MESSAGES.TELL);
  }
  return Promise.resolve();
}

function fillOptionsWithDefaults(options, channel) {
  if (!options) options = {};
  options = JSON.parse(JSON.stringify(options));

  if (!options.fallbackInterval) {
    options.fallbackInterval = 3000;
  }

  if (!options.responseTime) {
    options.responseTime = channel.method.averageResponseTime(channel.options);
  }

  if (!options.dictator) {
    options.dictator = false;
  }

  return options;
}

export function createLeaderElection(channel, options) {
  if (channel._leaderElector) {
    throw new Error('BroadcastChannel already has a leader-elector');
  }

  options = fillOptionsWithDefaults(options, channel);
  const elector = new LeaderElection(channel, options);
  channel._befC.push(() => elector.die());

  channel._leaderElector = elector;
  return elector;
}
