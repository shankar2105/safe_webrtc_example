import {observable, computed, action} from 'mobx';
import ConnModel from './models/connection';
import CONST from './constants';
import { setInterval, clearInterval } from 'timers';

export default class AppStore {
  @observable loading = false;
  @observable loaded = false;
  @observable loaderDesc = CONST.UI.DEFAULT_LOADING_DESC;
  @observable publicNames = [];
  @observable invites = [];
  @observable selectedPubName = 'PublicID1';
  @observable connectionState = CONST.CONN_STATE.INIT;
  @observable connInfo = {};

  constructor() {
    this.timer = null;
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

  @action
  fetchPublicNames() {
    return new Promise((resolve) => {
      this.setLoader(true, 'Fetching public names');
      this.publicNames = ['PublicID1', 'PublicID2', 'PublicID3'];

      setTimeout(() => {
        this.setLoader(false);
        resolve();
      }, 2000);
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
  initialise() {
    return this.fetchPublicNames()
      .then(() => this.fetchInvites());
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
  setOffer(offer, isCaller) {
    const userPosition = isCaller ? CONST.USER_POSITION.CALLER : CONST.USER_POSITION.CALLEE;
    this.connInfo = new ConnModel(this.selectedPubName, userPosition);
    this.connInfo.setOffer(offer);
  }

  @action
  setAnswer(answer) {
    this.connInfo.setAnswer(answer);
  }

  @action
  sendInvite(candidates) {
    return new Promise((resolve) => {
      if (!this.connInfo) {
        return;
      }
      this.connInfo.setOfferCandidates(candidates);
      this.connectionState = CONST.CONN_STATE.SEND_INVITE;
      this.checkInviteAccepted();
      resolve();
    });
  }

  @action
  calling(candidates) {
    return new Promise((resolve) => {
      if (!this.connInfo) {
        return;
      }
      this.connInfo.setAnswerCandidates(candidates);
      this.connectionState = CONST.CONN_STATE.CALLING;
      this.checkCallAccepted();
      resolve();
    });
  }

  @action
  getRemoteInvite(candidates) {
    return new Promise((resolve) => {
      if (!this.connInfo) {
        return;
      }
      this.connInfo.setOfferCandidates(candidates);
      this.connectionState = CONST.CONN_STATE.SEND_INVITE;
      this.checkInviteAccepted();
      resolve();
    });
  }
}
