import { observable, computed, action } from 'mobx';
import 'babel-polyfill';

import ConnModel from './models/connection';
import CONST from './constants';
import SafeApi from './safe_comm';

export default class AppStore {
  @observable loading = false;
  @observable loaded = false;
  @observable loaderDesc = CONST.UI.DEFAULT_LOADING_DESC;
  @observable publicNames = [];
  @observable invites = [];
  @observable selectedPubName = '';
  @observable connectionState = CONST.CONN_STATE.INIT;
  @observable connInfo = {};
  @observable isNwConnected = true;
  @observable isNwConnecting = false;

  constructor() {
    this.timer = null;
    this.api = null;
  }

  setLoader(state, desc) {
    this.loaded = false;
    this.loading = state;
    this.loaderDesc = desc || CONST.UI.DEFAULT_LOADING_DESC;
  }

  checkInviteAccepted() {
    this.timer = setInterval(() => {
      if (true) {
        this.connInfo.setRemoteOffer('remote offer');
        this.connInfo.setRemoteAnswer('remote answer');
        this.connectionState = CONST.CONN_STATE.CALLING;
        clearInterval(this.timer);
      }
    }, CONST.UI.CONN_TIMER_INTERVAL);
  }

  checkCallAccepted() {
    this.timer = setInterval(() => {
      if (true) {
        this.connectionState = CONST.CONN_STATE.CONNECTED;
        clearInterval(this.timer);
      }
    }, CONST.UI.CONN_TIMER_INTERVAL);
  }


  checkForCalling() {
    this.timer = setInterval(() => {
      if (true) {
        this.connectionState = CONST.CONN_STATE.CONNECTED;
        clearInterval(this.timer);
      }
    }, CONST.UI.CONN_TIMER_INTERVAL);
  }

  @action
  nwStateCb(newState) {
    if (newState === CONST.NET_STATE.CONNECTED) {
      this.isNwConnected = true;
      return;
    }
    this.isNwConnected = false;
  }

  @action
  authorisation() {
    return new Promise(async (resolve, reject) => {
      try {
        this.setLoader(true, 'Authorising application');
        this.api = new SafeApi(this.nwStateCb);
        await this.api.authorise();
        this.setLoader(false);
        console.log('authorised');
        resolve();
      } catch(err) {
        console.error(`Authorisation error :: ${err}`);
      }
    });
  }

  @action
  fetchPublicNames() {
    return new Promise(async (resolve, reject) => {
      try {
        this.setLoader(true, 'Fetching public names');
        this.publicNames = await this.api.getPublicNames();
        console.log('this.publicNames', this.publicNames);
        if (this.publicNames.length !== 0 && !this.selectedPubName) {
          console.log('setting up')
          this.setLoader(true, 'Initializing');
          this.selectedPubName = this.publicNames[0];
          await this.api.setupPublicName(this.selectedPubName);
        }
        this.setLoader(false);
      } catch(err) {
        console.error(`Fetch publicNames error :: ${err}`);
      }
    });
  }

  @action
  fetchInvites() {
    return new Promise((resolve) => {
      this.setLoader(true, 'Fetching invites');
      this.invites = ['Invite1', 'Invite2', 'Invite3'];
      setTimeout(() => {
        this.setLoader(false);
        resolve();
      }, 2000);
    });
  }

  @action
  activatePubName(pubName) {
    if (!pubName || !this.publicNames.includes(pubName)) {
      return;
    }
    this.selectedPubName = pubName;
    this.loaded = true;
  }

  @action
  reset() {
    this.loaded = false;
  }

  @action
  initialiseConnInfo(isCaller) {
    return new Promise((resolve) => {
      const userPosition = isCaller ? CONST.USER_POSITION.CALLER : CONST.USER_POSITION.CALLEE;
      // get caller offer if invited
      this.connInfo = new ConnModel(this.selectedPubName, userPosition);
    });
  }

  @action
  setOffer(offer, isCaller) {
    this.connInfo.setOffer(offer);
  }

  @action
  setAnswer(answer) {
    this.connInfo.setAnswer(answer);
  }

  @action
  setOfferCandidates(candidates) {
    this.connInfo.setOfferCandidates(candidates);
  }

  @action
  setAnswerCandidates(candidates) {
    this.connInfo.setAnswerCandidates(candidates);
  }

  @action
  sendInvite() {
    return new Promise((resolve) => {
      if (!this.connInfo) {
        return;
      }
      this.connectionState = CONST.CONN_STATE.SEND_INVITE;
      // update data
      this.checkInviteAccepted();
      resolve();
    });
  }

  @action
  acceptInvite() {
    return new Promise((resolve) => {
      if (!this.connInfo) {
        return;
      }
      this.connectionState = CONST.CONN_STATE.INVITE_ACCEPTED;
      // update data
      this.checkForCalling();
      resolve();
    });
  }

  @action
  calling() {
    return new Promise((resolve) => {
      if (!this.connInfo) {
        return;
      }
      this.connectionState = CONST.CONN_STATE.CALLING;
      // update data
      this.checkCallAccepted();
      resolve();
    });
  }
}
