export default {
  UI: {
    DEFAULT_LOADING_DESC: 'Please wait...',
    CONN_MSGS: {
      PREPARING_INVITE: 'Preparing invite',
      SEND_INVITE: 'Invite sent. Wait to remote to accept it',
      INVITE_ACCEPTED: 'Invite accepted. Establishing connection with remote',
      CALLING: 'Remote accepted the invite. Establishing connection with remote',
    },
    CONN_TIMER_INTERVAL: 2000
  },
  CONFIG: {
    SERVER: {
      iceServers: [
        { url: 'stun:stun1.l.google.com:19302' },
        {
          url: 'turn:numb.viagenie.ca',
          credential: 'string21',
          username: 'shankar21mail@gmail.com'
        },
      ]
    },
    OFFER: {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    },
    MEDIA_OFFER: {
      audio: false,
      video: true
    },
  },
  USER_POSITION: {
    CALLER: 'CALLER',
    CALLEE: 'CALLEE',
  },
  CONN_STATE: {
    INIT: 'INIT',
    SEND_INVITE: 'SEND_INVITE',
    INVITE_ACCEPTED: 'INVITE_ACCEPTED',
    CALLING: 'CALLING',
    CONNECTED: 'CONNECTED',
  },
};
