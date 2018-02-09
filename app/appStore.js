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
  @observable isNwConnected = true;
  @observable isNwConnecting = false;

  @observable callerID = null;
  @observable persona = null;
  @observable state = null;
  @observable offer = null;
  @observable answer = null;
  @observable offerCandidates = [];
  @observable answerCandidates = [];
  @observable remoteOffer = null;
  @observable remoteAnswer = null;
  @observable remoteOfferCandidates = [];
  @observable remoteAnswerCandidates = [];

  constructor() {
    this.api = null;
    this.connInfo = null;
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
  createConn(id, persona) {
    this.callerID = id;
    this.persona = persona;
  }

  @action
  setCallerID(id) {
    this.callerID = id;
  }

  @action
  setConnState(state) {
    this.state = state;
  }

  @action
  setRemoteOffer(offer) {
    this.remoteOffer = offer;
  }

  @action
  setRemoteOfferCandidates(candidates) {
    this.remoteOfferCandidates = candidates;
  }

  @action
  setRemoteAnswer(answer) {
    this.remoteAnswer = answer;
  }

  @action
  setRemoteAnswerCandidates(candidates) {
    this.remoteAnswerCandidates = candidates;
  }

  transformConnInfo() {
    const isCaller = (this.persona === CONST.USER_POSITION.CALLER);
    const res = {
      state: this.state
    };
    const obj = {};
    obj['persona'] = this.persona;
    obj['initiater'] = this.callerID;
    // obj['state'] = this.state;
    obj['caller'] = {};
    obj['callee'] = {};
    obj.caller['offer'] = isCaller ? this.offer : this.remoteOffer;
    obj.caller['offerCandidates'] = isCaller ? this.offerCandidates : this.remoteOfferCandidates;
    obj.caller['answer'] = isCaller ? this.answer : this.remoteAnswer;
    obj.caller['answerCandidates'] = isCaller ? this.answerCandidates : this.remoteAnswerCandidates;
    obj.callee['offer'] = isCaller ? this.remoteOffer : this.offer;
    obj.callee['offerCandidates'] = isCaller ? this.remoteOfferCandidates : this.offerCandidates;
    obj.callee['answer'] = isCaller ? this.remoteAnswer : this.answer;
    obj.callee['answerCandidates'] = isCaller ? this.remoteAnswerCandidates : this.answerCandidates;

    res.data = obj;
    return res;
  }

  parseConnStr(connStr) {
    const obj = {};
    const parsedObj = JSON.parse(connStr);
    obj['state'] = parsedObj.state;

    const data = parsedObj.data;
    obj['initiater'] = data.initiater;
    obj['caller'] = {};
    obj['callee'] = {};
    obj.caller['offer'] = data.caller.offer;
    obj.caller['offerCandidates'] = data.caller.offerCandidates;
    obj.caller['answer'] = data.caller.answer;
    obj.caller['answerCandidates'] = data.caller.answerCandidates;
    obj.callee['offer'] = data.callee.offer;
    obj.callee['offerCandidates'] = data.callee.offerCandidates;
    obj.callee['answer'] = data.callee.answer;
    obj.callee['answerCandidates'] = data.callee.answerCandidates;
    return obj;
  }

  @action
  checkInviteAccepted() {
    return new Promise(async (resolve, reject) => {
      try {
        const connInfo = this.transformConnInfo();
        const connStr = await this.api.fetchConnInfo(connInfo);
        console.log('check invted accpedyed', connStr);
        const parsedConnInfo = this.parseConnStr(connStr);
        if (parsedConnInfo.state === CONST.CONN_STATE.INVITE_ACCEPTED) {
          this.setRemoteOffer(parsedConnInfo.callee.offer);
          this.setRemoteOfferCandidates(parsedConnInfo.callee.offerCandidates);
          this.setRemoteAnswer(parsedConnInfo.callee.answer);
          this.setRemoteAnswerCandidates(parsedConnInfo.callee.answerCandidates);
          const connInfo1 = this.transformConnInfo();
          console.log('conn info on chekc', connInfo1);
          return resolve(true);
        }
        resolve(false);
        // await this.timeout(CONST.UI.CONN_TIMER_INTERVAL);
        // this.checkInviteAccepted();
      } catch (err) {
        reject(err);
      }
    });
  }

  @action
  checkCallAccepted() {
    return new Promise(async (resolve, reject) => {
      try {
        const connInfo = this.transformConnInfo();
        const connStr = await this.api.fetchConnInfo(connInfo);
        const parsedConnInfo = this.parseConnStr(connStr);
        if (parsedConnInfo.state === CONST.CONN_STATE.CONNECTED) {
          this.connectionState = CONST.CONN_STATE.CONNECTED;
          return resolve(true);
        }
        resolve(false);
        // await this.timeout(CONST.UI.CONN_TIMER_INTERVAL);
        // this.checkCallAccepted();
      } catch (err) {
        reject(err);
      }
    });
  }

  @action
  checkForCalling() {
    return new Promise(async (resolve, reject) => {
      try {
        const connInfo = this.transformConnInfo();
        const connStr = await this.api.fetchConnInfo(connInfo);
        const parsedConnInfo = this.parseConnStr(connStr);
        console.log('checkForCalling', parsedConnInfo);
        if (parsedConnInfo.state === CONST.CONN_STATE.CALLING) {
          this.setRemoteAnswer(parsedConnInfo.caller.answer);
          this.setRemoteAnswerCandidates(parsedConnInfo.caller.answerCandidates);
          return resolve(true);
        }
        resolve(false);
        // await this.timeout(CONST.UI.CONN_TIMER_INTERVAL);
        // this.checkForCalling();
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
  setOffer(offer) {
    this.offer = offer;
    // this.connInfo.setOffer(offer);
  }

  @action
  setAnswer(answer) {
    this.answer = answer;
    // this.connInfo.setAnswer(answer);
  }

  @action
  setOfferCandidates(candidates) {
    this.offerCandidates = candidates;
    // this.connInfo.setOfferCandidates(candidates);
  }

  @action
  setAnswerCandidates(candidates) {
    this.answerCandidates = candidates;
    // this.connInfo.setAnswerCandidates(candidates);
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
        if (friendID) {
          await this.api.connect(friendID);
        }
        const isCallee = !!friendID;
        const userPosition = isCallee ? CONST.USER_POSITION.CALLEE : CONST.USER_POSITION.CALLER;
        this.createConn(this.selectedPubName, userPosition);
        if (isCallee) {
          this.setCallerID(friendID);
          const connInfo = this.transformConnInfo();
          const connInfoStr = await this.api.fetchConnInfo(connInfo);
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
        // FIXME remove this.connectionState and handle with connInfo.state
        this.connectionState = CONST.CONN_STATE.SEND_INVITE;
        this.setConnState(this.connectionState);
        const connInfo = this.transformConnInfo();
        await this.api.sendInvite(connInfo);
        // update data
        // await this.checkInviteAccepted();
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
        this.connectionState = CONST.CONN_STATE.INVITE_ACCEPTED;
        this.setConnState(this.connectionState);
        const connInfo = this.transformConnInfo();
        await this.api.acceptInvite(connInfo);
        // update data
        // this.checkForCalling();
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
        this.connectionState = CONST.CONN_STATE.CALLING;
        this.setConnState(this.connectionState);
        const connInfo = this.transformConnInfo();
        await this.api.calling(connInfo);
        // update data
        // this.checkCallAccepted();
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
        this.connectionState = CONST.CONN_STATE.CONNECTED;
        this.setConnState(this.connectionState);
        const connInfo = this.transformConnInfo();
        await this.api.connected(connInfo);
        // update data
        this.checkCallAccepted();
        resolve(true);
      } catch (err) {
        console.log('Connected error :: ', err);
      }
    });
  }

  testEnc() {
    this.api.testEnc();
  }
}
