import { observable, action } from 'mobx';
import CONST from '../constants';

export default class Connection {
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
  constructor(id, persona) {
    this.callerID = id;
    this.persona = persona;
  }

  toJson() {
    const isCaller = (this.persona === CONST.USER_POSITION.CALLER);
    const obj = {};
    obj['initiater'] = this.callerID;
    obj['state'] = this.state;
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
    return obj;
  }

  stringify() {
    const jsonObj = this.toJson();
    return JSON.stringify(jsonObj);
  }

  @action
  setState(state) {
    this.state = state;
  }

  @action
  setID(id) {
    this.callerID = id;
  }

  @action
  setOffer(offer) {
    this.offer = offer;
  }

  @action
  setAnswer(answer) {
    this.answer = answer;
  }

  @action
  setOfferCandidates(candidates) {
    this.offerCandidates = candidates;
  }

  @action
  setAnswerCandidates(candidates) {
    this.answerCandidates = candidates;
  }

  @action
  setRemoteOffer(offer) {
    this.remoteOffer = offer;
  }

  @action
  setRemoteAnswer(answer) {
    this.remoteAnswer = answer;
  }

  @action
  setRemoteOfferCandidates(candidates) {
    this.remoteOfferCandidates = candidates;
  }

  @action
  setRemoteAnswerCandidates(candidates) {
    this.remoteAnswerCandidates = candidates;
  }

  static parseJson(jsonStr) {
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
}
