import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import CONST from '../constants';

@inject("store")
@observer
export default class ChatRoom extends Component {
  @observable originConn = null;
  @observable destConn = null;

  constructor() {
    super();
    this.friendID = null;
    this.offerOptions = CONST.CONFIG.OFFER;
    this.mediaOffer = CONST.CONFIG.MEDIA_OFFER;
    this.originStream = null;
    this.originCandidates = [];
    this.destCandidates = [];
    this.onCreateOfferSuccess = this.onCreateOfferSuccess.bind(this);
    this.onClickCancel = this.onClickCancel.bind(this);
  }

  componentDidMount() {
    this.friendID = this.props.match.params.friendId;
    this.props.store.initialiseConnInfo(this.friendID);
    console.log('init')
    this.startStream()
      .then(() => this.setupOrigin())
      .then(() => this.setupRemote())
      .then(() => {
        this.originConn.createOffer(this.offerOptions)
          .then(this.onCreateOfferSuccess, (err) => {
            console.error('create offer error :: ', err);
          });
      });
  }

  componentDidUpdate() {
    const { connInfo } = this.props.store;
    console.log('update', connInfo);
    if (connInfo.remoteOffer) {
      this.call();
    }

    if(connInfo.answer) {
      this.finishConnection();
    }
  }

  startStream() {
    console.log('origin streaming yet to started')
    return window.navigator.mediaDevices.getUserMedia(this.mediaOffer)
      .then((stream) => {
        this.originStream = stream;
        this.origin.srcObject = stream;
        console.log('origin streaming started')
      });
  }

  setupOrigin() {
    return new Promise((resolve) => {
      this.originConn = new window.RTCPeerConnection(CONST.CONFIG.SERVER);
      this.originConn.onicecandidate = (e) => {
        if (!e.candidate) {
          this.props.store.setOfferCandidates(this.originCandidates);
          console.log('offer candidates over')
          if (!this.friendID) {
            this.props.store.sendInvite();
          } else {
            this.call();
          }
          return;
        }
        if (!this.originCandidates) {
          this.originCandidates = [];
        }
        this.originCandidates.push(e.candidate);
        console.log('offer candidates len', this.originCandidates.length)
      };

      // this.originConn.oniceconnectionstatechange = function (e) {
      //   console.log('ice change');
      // };

      this.originConn.addStream(this.originStream);
      resolve();
    });
  }

  setupRemote() {
    return new Promise((resolve) => {
      this.destConn = new window.RTCPeerConnection(CONST.CONFIG.SERVER);

      this.destConn.onicecandidate = (e) => {
        if (!e.candidate) {
          this.props.store.setAnswerCandidates(this.destCandidates);
          if (!this.friendID) {
            this.props.store.calling();
          } else {
            // FIXME check this.friendID exists
            this.props.store.acceptInvite();
          }
          return;
        }
        if (!this.destCandidates) {
          this.destCandidates = [];
        }
        this.destCandidates.push(e.candidate);
      };

      // this.destConn.oniceconnectionstatechange = function (e) {
      //   // this.onIceStateChange(pc1, e);
      // };

      this.destConn.onaddstream = (e) => {
        this.destinaton.srcObject = e.stream;
      }
      resolve();
    });
  }

  call() {
    const { connInfo } = this.props.store;
    this.destConn.setRemoteDescription(connInfo.remoteOffer)
      .then(() => {
        console.log('set destination remote session success');
        console.log('chat room :: ', connInfo);
        return Promise.all(connInfo.remoteOfferCandidates.map((can) => {
          return this.destConn.addIceCandidate(new RTCIceCandidate(can))
            .then(() => {
              console.log('set ICE candidate success');
            }, (err) => {
              console.error('set ICE candidate failed ::', err);
            });
        }));
      }, (err) => {
        console.error('set destination remote session failed ::', err);
      }).then(() => {
        this.destConn.createAnswer().then((ansDesc) => {
          this.onCreateAnswerSuccess(ansDesc);
        }, (err) => {
          console.error('create answer error :: ', err);
        });
      });
  }

  onCreateOfferSuccess(offer) {
    this.originConn.setLocalDescription(offer)
      .then(() => {
        console.log('set origin local session success');
        return this.props.store.setOffer(offer);
      }, (err) => {
        console.error('set origin local session failed ::', err);
      });
  }

  onCreateAnswerSuccess(answer) {
    this.destConn.setLocalDescription(answer)
      .then(() => {
        return this.props.store.setAnswer(answer);
        console.log('set destination local session success');
      }, (err) => {
        console.error('set destination local session failed ::', err);
      });
  }

  endCall(e) {
    e.preventDefault();
    this.originConn.close();
    this.destConn.close();
    this.originConn = null;
    this.destConn = null;
    this.props.history.push('/');
  }

  onClickCancel(e) {
    e.preventDefault();
    this.props.history.push('/');
  }

  getConnectionStatus() {
    let connectionMsg = null;
    const { connectionState } = this.props.store;
    const { CONN_STATE, UI } = CONST;
    const { CONN_MSGS } = UI;

    if (connectionState === CONN_STATE.CONNECTED) {
      this.finishConnection();
      return;
    }

    switch (connectionState) {
      case CONN_STATE.INIT:
        connectionMsg = CONN_MSGS.INIT;
        break;
      case CONN_STATE.SEND_INVITE:
        connectionMsg = CONN_MSGS.SEND_INVITE;
        break;
      case CONN_STATE.INVITE_ACCEPTED:
        connectionMsg = CONN_MSGS.INVITE_ACCEPTED;
        break;
      case CONN_STATE.CALLING:
        connectionMsg = CONN_MSGS.CALLING;
        break;
      default:
        connectionMsg = UI.DEFAULT_LOADING_DESC
    }
    return (
      <div className="chat-room-conn-status">
        <div className="chat-room-conn-status-b">
          <h3 className="status">{connectionMsg}</h3>
          <div className="cancel-btn">
            <button
              type="button"
              className="btn primary"
              onClick={this.onClickCancel}
            >Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  finishConnection() {
    const { connInfo, connected } = this.props.store;
    this.originConn.setRemoteDescription(connInfo.remoteAnswer)
    .then(() => {
        console.log('set origin remote session success');
        Promise.all(connInfo.remoteAnswerCandidates.map((can) => {
          return this.originConn.addIceCandidate(new RTCIceCandidate(can))
            .then(() => {
              console.log('set ICE candidate success');
            }, (err) => {
              console.error('set ICE candidate failed ::', err);
            });
        })).then(() => {
          connected();
        });
      }, (err) => {
        console.error('set origin remote session failed ::', err);
      });
  }

  render() {
    const { match } = this.props;

    // const friendId = match.params.friendId;

    return (
      <div className="chat-room">
        <div className="chat-room-b">
          <div className="chat-room-remote">
            <video ref={(c) => { this.destinaton = c; }} autoPlay></video>
          </div>
          <div className="chat-room-origin">
            <video ref={(c) => { this.origin = c; }} autoPlay></video>
          </div>
        </div>
        {this.getConnectionStatus()}
        <div className="chat-room-opts">
          <button type="button" onClick={this.endCall.bind(this)}>END</button>
        </div>
      </div>
    );
  }
}
