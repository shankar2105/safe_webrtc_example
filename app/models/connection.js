import CONST from '../constants';

export default class Connection {
  constructor(id, persona) {
    this.callerID = id;
    this.persona = persona;
    this.state = null;
    this.callerOffer = null;
    this.callerAnswer = null;
    this.callerOfferCandidates = [];
    this.callerAnswerCandidates = [];
    this.calleeOffer = null;
    this.calleeAnswer = null;
    this.calleeOfferCandidates = [];
    this.calleeAnswerCandidates = [];
  }

  stringify() {
    return JSON.stringify({
      state: this.state,
      caller: {
        offer: this.callerOffer,
        answer: this.callerAnswer
      },
      callee: {
        offer: this.calleeOffer,
        answer: this.calleeAnswer
      }
    });
  }

  setOffer(offer) {
    if (this.persona === CONST.USER_POSITION.CALLER) {
      this.callerOffer = offer;
      return;
    }
    this.calleeOffer = offer;
  }

  setAnswer(answer) {
    if (this.persona === CONST.USER_POSITION.CALLER) {
      this.callerAnswer = answer;
      return;
    }
    this.calleeAnswer = answer;
  }

  setOfferCandidates(candidates) {
    if (this.persona === CONST.USER_POSITION.CALLER) {
      this.callerOfferCandidates = candidates;
      return;
    }
    this.calleeOfferCandidates = candidates;
  }

  setAnswerCandidates(candidates) {
    if (this.persona === CONST.USER_POSITION.CALLER) {
      this.callerAnswerCandidates = candidates;
      return;
    }
    this.calleeAnswerCandidates = candidates;
  }

  setRemoteOffer(offer) {
    if (this.persona === CONST.USER_POSITION.CALLER) {
      this.calleeOffer = offer;
      return;
    }
    this.callerOffer = offer;
  }

  setRemoteAnswer(answer) {
    if (this.persona === CONST.USER_POSITION.CALLER) {
      this.calleeAnswer = answer;
      return;
    }
    this.callerAnswer = answer;
  }

  setRemoteOfferCandidates(candidates) {
    if (this.persona === CONST.USER_POSITION.CALLEE) {
      this.calleeOfferCandidates = candidates;
      return;
    }
    this.callerOfferCandidates = candidates;
  }

  setRemoteAnswerCandidates(candidates) {
    if (this.persona === CONST.USER_POSITION.CALLEE) {
      this.calleeAnswerCandidates = candidates;
      return;
    }
    this.callerAnswerCandidates = candidates;
  }
}
