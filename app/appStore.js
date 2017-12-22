import { observable, transaction, isObservable, extendObservable, action, autorun, ObservableMap } from 'mobx';
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
  @observable connInfo = observable.map();
  @observable isNwConnected = true;
  @observable isNwConnecting = false;

  constructor() {
    this.api = null;
  }

  @action
  timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @action
  setLoader(state, desc, isloaded) {
    this.loaded = !!isloaded;
    this.loading = state;
    this.loaderDesc = desc || CONST.UI.DEFAULT_LOADING_DESC;
  }

  @action
  createConnInfo(id, persona) {
    this.connInfo.set('callerID', id);
    this.connInfo.set('persona', persona);
  }

  @action
  setCallerID(id) {
    this.connInfo.set('callerID', id);
  }

  @action
  setConnState(state) {
    this.connInfo.set('state', state);
  }

  @action
  setRemoteOffer(offer) {
    this.connInfo.set('remoteOffer', offer);
  }

  @action
  setRemoteOfferCandidates(candidates) {
    this.connInfo.set('remoteOfferCandidates', candidates);
  }

  @action
  setRemoteAnswer(answer) {
    this.connInfo.set('remoteAnswer', answer);
  }

  @action
  setRemoteAnswerCandidates(candidates) {
    this.connInfo.set('remoteAnswerCandidates', candidates);
  }

  @action
  setOffer(offer) {
    this.connInfo.set('offer', offer);
  }

  @action
  setAnswer(answer) {
    this.connInfo.set('answer', answer);
  }

  @action
  setOfferCandidates(candidates) {
    this.connInfo.set('offerCandidates', candidates);
  }

  @action
  setAnswerCandidates(candidates) {
    this.connInfo.set('answerCandidates', candidates);
  }

  parseConnStr(jsonStr) {
    const obj = {};
    const parsedObj = JSON.parse(jsonStr);
    obj['initiater'] = parsedObj.initiater;
    obj['state'] = parsedObj.state;
    obj['caller'] = {};
    obj['callee'] = {};
    obj.caller['offer'] = parsedObj.caller.offer;
    obj.caller['offerCandidates'] = parsedObj.caller.offerCandidates;
    obj.caller['answer'] = parsedObj.caller.answer;
    obj.caller['answerCandidates'] = parsedObj.caller.answerCandidates;
    obj.callee['offer'] = parsedObj.callee.offer;
    obj.callee['offerCandidates'] = parsedObj.callee.offerCandidates;
    obj.callee['answer'] = parsedObj.callee.answer;
    obj.callee['answerCandidates'] = parsedObj.callee.answerCandidates;
    return obj;
  }

  @action
  checkInviteAccepted() {
    return new Promise(async (resolve, reject) => {
      try {
        const connStr = await this.api.fetchConnInfo(this.connInfo);
        console.log('check invted accpedyed', connStr);
        const parsedConnInfo = this.parseConnStr(connStr);
        if (parsedConnInfo.state === CONST.CONN_STATE.INVITE_ACCEPTED) {
          transaction(() => {
            this.setRemoteOffer(parsedConnInfo.callee.offer);
            this.setRemoteOfferCandidates(parsedConnInfo.callee.offerCandidates);
            this.setRemoteAnswer(parsedConnInfo.callee.answer);
            this.setRemoteAnswerCandidates(parsedConnInfo.callee.answerCandidates);
          });
          console.log('conn info on chekc', isObservable(this.connInfo), this.connInfo);
          return resolve(true);
        }
        await this.timeout(CONST.UI.CONN_TIMER_INTERVAL);
        this.checkInviteAccepted();
      } catch (err) {
        reject(err);
      }
    });
  }

  @action.bound
  checkCallAccepted() {
    return new Promise(async (resolve, reject) => {
      try {
        const connStr = await this.api.fetchConnInfo(this.connInfo);
        const parsedConnInfo = this.parseConnStr(connStr);
        if (parsedConnInfo.state === CONST.CONN_STATE.CONNECTED) {
          this.connectionState = CONST.CONN_STATE.CONNECTED;
          return resolve(true);
        }
        await this.timeout(CONST.UI.CONN_TIMER_INTERVAL);
        this.checkCallAccepted();
      } catch (err) {
        reject(err);
      }
    });
  }

  @action.bound
  checkForCalling() {
    return new Promise(async (resolve, reject) => {
      try {
        const connStr = await this.api.fetchConnInfo(this.connInfo);
        const parsedConnInfo = this.parseConnStr(connStr);
        if (parsedConnInfo.state === CONST.CONN_STATE.CALLING) {
          this.setRemoteAnswer(parsedConnInfo.caller.answer);
          this.setRemoteAnswerCandidates(parsedConnInfo.caller.answerCanditates);
          return resolve(true);
        }
        await this.timeout(CONST.UI.CONN_TIMER_INTERVAL);
        this.checkForCalling();
      } catch (err) {
        reject(err);
      }
    });
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
        resolve(true);
      } catch (err) {
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
      } catch (err) {
        console.error(`Fetch publicNames error :: ${err}`);
      }
    });
  }

  @action
  fetchInvites() {
    return new Promise(async (resolve, reject) => {
      try {
        this.setLoader(true, 'Fetching invites');
        this.invites = await this.api.fetchInvites();
        this.setLoader(false);
        resolve(true);
      } catch (err) {
        console.error('Fetch invites :: ', err);
      }
    });
  }

  @action
  activatePubName(pubName) {
    if (!pubName || !this.publicNames.includes(pubName)) {
      return;
    }
    return new Promise(async (resolve, reject) => {
      this.setLoader(true, `Activating selected ${pubName}`);
      this.selectedPubName = pubName;
      await this.api.setupPublicName(this.selectedPubName);
      this.setLoader(false, null, true);
    });
  }

  @action
  reset() {
    this.loaded = false;
  }

  @action
  initialiseConnInfo(friendID) {
    return new Promise(async(resolve, reject) => {
      try {
        const isCallee = !!friendID;
        const userPosition = isCallee ? CONST.USER_POSITION.CALLEE : CONST.USER_POSITION.CALLER;

        this.createConnInfo(this.selectedPubName, userPosition);
        // this.connInfo = new ConnModel(this.selectedPubName, userPosition);
        // extendObservable(this.connInfo, connInfoObj)
        if (isCallee) {
          this.setCallerID(friendID);
          const connInfoStr = await this.api.fetchConnInfo(this.connInfo);
          const parsedJson = this.parseConnStr(connInfoStr);
          this.setRemoteOffer(parsedJson.caller.offer);
          this.setRemoteOfferCandidates(parsedJson.caller.offerCandidates);
          console.log('conn init :: ', this.connInfo);
        }
        resolve(true);
      } catch (err) {
        console.error('Initialise connInfo error :: ', err);
      }
    });
  }

  // connInfo with caller offer and offer candidates
  @action
  sendInvite() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.connInfo) {
          throw new Error('Connection info not set');
        }
        // FIXME remove this.connectionState and handle with connInfo.state
        this.connectionState = CONST.CONN_STATE.SEND_INVITE;
        this.setConnState(this.connectionState);
        await this.api.sendInvite(this.connInfo);
        console.log('isObservale 1', isObservable(this.connInfo));
        // update data
        // await this.checkInviteAccepted();
        action(this.checkInviteAccepted());
        resolve(true);
      } catch (err) {
        console.error('Send invite error :: ', err);
      }
    });
  }

  // connInfo with caller offer and offer candidates
  // and callee offer and offer candidates with answer and answer candidates
  @action
  acceptInvite() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.connInfo) {
          return;
        }
        this.connectionState = CONST.CONN_STATE.INVITE_ACCEPTED;
        this.setConnState(this.connectionState);
        await this.api.acceptInvite(this.connInfo);
        // update data
        this.checkForCalling();
        resolve(true);
      } catch (err) {
        console.error('Accept invite error :: ', err);
      }
    });
  }

  // connInfo with callee answer and candidates
  @action
  calling() {
    return new Promise(async (resolve) => {
      try {
        if (!this.connInfo) {
          return resolve();
        }
        this.connectionState = CONST.CONN_STATE.CALLING;
        this.setConnState(this.connectionState);
        await this.api.calling(this.connInfo);
        // update data
        this.checkCallAccepted();
        resolve(true);
      } catch (err) {
        console.error('Calling error :: ', err);
      }
    });
  }

  @action
  connect(friendID) {
    return new Promise(async (resolve, reject) => {
      try {
        this.setLoader(true, `Connecting to ${friendID}`);
        await this.api.connect(friendID);
        this.setLoader(false, null, true);
        resolve(true);
      } catch (err) {
        console.log('Connect error :: ', err);
      }
    });
  }

  connected() {
    return new Promise(async (resolve) => {
      try {
        if (!this.connInfo) {
          return resolve();
        }
        this.connectionState = CONST.CONN_STATE.CONNECTED;
        this.connInfo.setState(this.connectionState);
        await this.api.connected(this.connInfo);
        // update data
        this.checkCallAccepted();
        resolve(true);
      } catch (err) {
        console.log('Connected error :: ', err);
      }
    });
  }
}
