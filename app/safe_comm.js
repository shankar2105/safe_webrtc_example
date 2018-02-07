import CONST from './constants';

const DOT = '.';

let hostName = window.location.hostname;
if (hostName.split(DOT).length === 1) {
  hostName = `www.${hostName}`;
}

// Authorisation model
const APP = {
  info: {
    id: 'net.maidsafe.example.webrtc',
    name: 'WebRTC example',
    vendor: 'MaidSafe.net Ltd',
  },
  opts: {},
  containers: {
    _publicNames: [
      CONST.PERMISSIONS.READ,
      CONST.PERMISSIONS.INSERT,
    ],
  },
};

const keySeparator = '-';

export default class SafeApi {
  constructor(nwStateCb) {
    this.app = null;
    this.keys = {};
    this.remoteKeys = {};
    this.pubNameCntr = null;
    this.serviceCntr = null;
    this.channelMD = null;
    this.remoteChannelMD = null;
    this.selectedPubName = null;
    this.nwStateCb = (newState) => {
      nwStateCb(newState);
    };
  }

  stringify(connInfo) {
    return JSON.stringify(connInfo);
  }

  _setKeys(keys) {
    console.log('set keys', keys);
    if (keys) {
      this.keys = keys;
      return Promise.resolve(true);
    }
    return new Promise(async (resolve, reject) => {
      if (!this.channelMD) {
        return reject(new Error('Channel MD not set'));
      }
      try {
        const pubSignKeyStr = await window.safeMutableData.get(this.channelMD, CONST.CRYPTO_KEYS.PUB_SIGN_KEY);
        const secSignKeyStr = await window.safeMutableData.get(this.channelMD, CONST.CRYPTO_KEYS.SEC_SIGN_KEY);
        const pubEncKeyStr = await window.safeMutableData.get(this.channelMD, CONST.CRYPTO_KEYS.PUB_ENC_KEY);
        const secEncKeyStr = await window.safeMutableData.get(this.channelMD, CONST.CRYPTO_KEYS.SEC_ENC_KEY);

        this.keys[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = await window.safeCrypto.pubSignKeyFromRaw(this.app, pubSignKeyStr.buf);
        this.keys[CONST.CRYPTO_KEYS.SEC_SIGN_KEY] = await window.safeCrypto.secSignKeyFromRaw(this.app, secSignKeyStr.buf);
        this.keys[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = await window.safeCrypto.pubEncKeyFromRaw(this.app, pubEncKeyStr.buf);
        this.keys[CONST.CRYPTO_KEYS.SEC_ENC_KEY] = await window.safeCrypto.secEncKeyFromRaw(this.app, secEncKeyStr.buf);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  _setRemoteKeys(keys) {
    return new Promise(async (resolve, reject) => {
      if (!this.remoteChannelMD) {
        return reject(new Error('Channel MD not set'));
      }
      try {
        const pubSignKeyStr = await window.safeMutableData.get(this.remoteChannelMD, CONST.CRYPTO_KEYS.PUB_SIGN_KEY);
        const pubEncKeyStr = await window.safeMutableData.get(this.remoteChannelMD, CONST.CRYPTO_KEYS.PUB_ENC_KEY);

        console.log('got remote keys');

        this.remoteKeys[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = await window.safeCrypto.pubSignKeyFromRaw(this.app, pubSignKeyStr.buf);
        this.remoteKeys[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = await window.safeCrypto.pubEncKeyFromRaw(this.app, pubEncKeyStr.buf);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  _createChannel() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.serviceCntr) {
          return reject(new Error('service container handle is empty'));
        }

        this.channelMD = await window.safeMutableData.newRandomPrivate(this.app, CONST.TYPE_TAG.CHANNEL);
        const keysHandle = {};
        // insert keys
        const signKeyPairHandle = await window.safeCrypto.generateSignKeyPair(this.app);

        const pubSignKey = await window.safeCryptoSignKeyPair.getPubSignKey(signKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = pubSignKey;
        const pubSignKeyRaw = await window.safeCryptoPubSignKey.getRaw(pubSignKey);
        const pubSignKeyStr = pubSignKeyRaw.buffer.toString('hex');

        const secSignKey = await window.safeCryptoSignKeyPair.getSecSignKey(signKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.SEC_SIGN_KEY] = secSignKey;
        const secSignKeyRaw = await window.safeCryptoSecSignKey.getRaw(secSignKey);
        const secSignKeyStr = secSignKeyRaw.buffer.toString('hex');

        const encKeyPairHandle = await window.safeCrypto.generateEncKeyPair(this.app);
        const pubEncKey = await window.safeCryptoEncKeyPair.getPubEncKey(encKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = pubEncKey;
        const pubEncKeyRaw = await window.safeCryptoPubEncKey.getRaw(pubEncKey);
        const pubEncKeyStr = pubEncKeyRaw.buffer.toString('hex');

        const secEncKey = await window.safeCryptoEncKeyPair.getSecEncKey(encKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.SEC_ENC_KEY] = secEncKey;
        const secEncKeyRaw = await window.safeCryptoSecEncKey.getRaw(secEncKey);
        const secEncKeyStr = secEncKeyRaw.buffer.toString('hex');

        const entries = {};
        entries[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = pubSignKeyStr;
        entries[CONST.CRYPTO_KEYS.SEC_SIGN_KEY] = secSignKeyStr;
        entries[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = pubEncKeyStr;
        entries[CONST.CRYPTO_KEYS.SEC_ENC_KEY] = secEncKeyStr;
        await window.safeMutableData.quickSetup(this.channelMD, entries, 'WebRTC Channel', `WebRTC channel for ${hostName}`);

        // create a new permission set
        const permSet = [CONST.PERMISSIONS.READ, CONST.PERMISSIONS.INSERT];
        await window.safeMutableData.setUserPermissions(this.channelMD, null, permSet, 1);

        const channelSerialData = await window.safeMutableData.serialise(this.channelMD);
        const entriesHandle = await window.safeMutableData.getEntries(this.serviceCntr);
        const mutationHandle = await window.safeMutableDataEntries.mutate(entriesHandle);
        const encryptedKey = await window.safeMutableData.encryptKey(this.serviceCntr, CONST.MD_KEY);
        await window.safeMutableDataMutation.insert(mutationHandle, encryptedKey, channelSerialData);
        await window.safeMutableData.applyEntriesMutation(this.serviceCntr, mutationHandle);
        window.safeMutableDataMutation.free(mutationHandle);
        window.safeMutableDataEntries.free(entriesHandle);
        this._setKeys(keysHandle);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  _getPublicNamesCntr() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.app) {
          return reject(new Error('Unauthorised'));
        }
        const hasAccess = await window.safeApp.canAccessContainer(this.app, '_publicNames', APP.containers._publicNames);
        if (!hasAccess) {
          return reject(new Error('No publicNames container access found'));
        }
        this.pubNameCntr = await window.safeApp.getContainer(this.app, '_publicNames');
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  _getSelectedPublicName() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.app) {
          return reject(new Error('Unauthorised'));
        }
        const ownCntr = await window.safeApp.getOwnContainer(this.app);
        this.selectedPubName = await window.safeMutableData.get(ownCntr, CONST.SELECTED_PUB_NAME_KEY);
        resolve(true);
      } catch (err) {
        if (err.code !== CONST.ERR_CODE.NO_SUCH_ENTRY) {
          reject(err);
        }
        resolve(true);
      }
    });
  }

  _checkServiceContainerAccess() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.serviceCntr) {
          return reject(new Error('service container handle is empty'));
        }

        const perms = await window.safeMutableData.getPermissions(this.serviceCntr);
        const appSignKey = await window.safeCrypto.getAppPubSignKey(this.app);
        const result = await window.safeMutableDataPermissions.getPermissionsSet(perms, appSignKey);

        resolve(true);
      } catch (err) {
        if (err.code !== -1011) {
          return reject(err);
        }
        const serviceCntrInfo = await window.safeMutableData.getNameAndTag(this.serviceCntr);
        await window.safeApp.authoriseShareMd(this.app, [
          {
            type_tag: serviceCntrInfo.type_tag,
            name: serviceCntrInfo.name.buffer,
            perms: [CONST.PERMISSIONS.INSERT]
          }
        ]);
        resolve();
      }
    });
  }

  authorise() {
    return new Promise(async (resolve, reject) => {
      try {
        this.app = await window.safeApp.initialise(APP.info, this.nwStateCb);
        const uri = await window.safeApp.authorise(this.app, APP.containers, APP.opts);
        await window.safeApp.connectAuthorised(this.app, uri);
        await this._getPublicNamesCntr();
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  getPublicNames(publicName) {
    const decryptKey = (key) => {
      return new Promise(async (resolve, reject) => {
        try {
          const deckey = await window.safeMutableData.decrypt(this.pubNameCntr, key);
          resolve(String.fromCharCode.apply(null, new Uint8Array(deckey)));
        } catch (err) {
          reject(err);
        }
      });
    };

    return new Promise(async (resolve, reject) => {
      try {
        if (!this.pubNameCntr) {
          return reject(new Error('_publicnames container handle not set'));
        }
        const publicNames = [];
        const entriesHandle = await window.safeMutableData.getEntries(this.pubNameCntr);
        await window.safeMutableDataEntries.forEach(entriesHandle, (k, v) => {
          publicNames.push(k);
        });
        const encPubNamesQ = [];
        for (const i in publicNames) {
          encPubNamesQ.push(decryptKey(publicNames[i]));
        }
        const decPubNames = await Promise.all(encPubNamesQ);
        resolve(decPubNames);
      } catch (err) {
        reject(err);
      }
    });
  }

  setupPublicName(pubName) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.app) {
          return reject(new Error('Unauthorised'));
        }

        if (!this.pubNameCntr) {
          return reject(new Error('_publicNames container handle is empty'));
        }

        // get service container
        const encPublicName = await window.safeMutableData.encryptKey(this.pubNameCntr, pubName);
        const encServiceCntr = await window.safeMutableData.get(this.pubNameCntr, encPublicName);
        const decServiceCntr = await window.safeMutableData.decrypt(this.pubNameCntr, encServiceCntr.buf);
        this.serviceCntr = await window.safeMutableData.newPublic(this.app, decServiceCntr, CONST.TYPE_TAG.DNS);

        // check for access
        await this._checkServiceContainerAccess();

        try {
          // search for webrtc mdata
          const encChannelKey = await window.safeMutableData.encryptKey(this.serviceCntr, CONST.MD_KEY);
          const channelSerial = await window.safeMutableData.get(this.serviceCntr, encChannelKey);
          this.channelMD = await window.safeMutableData.fromSerial(this.app, channelSerial.buf);
          await this._setKeys(null);
        } catch (e) {
          if (e.code !== CONST.ERR_CODE.NO_SUCH_ENTRY) {
            throw e;
          }
          await this._createChannel();
        }
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  fetchInvites() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.channelMD) {
          return reject(new Error('channel handle is empty'));
        }
        const whiteListKeys = [
          CONST.CRYPTO_KEYS.PUB_ENC_KEY,
          CONST.CRYPTO_KEYS.SEC_ENC_KEY,
          CONST.CRYPTO_KEYS.PUB_SIGN_KEY,
          CONST.CRYPTO_KEYS.SEC_SIGN_KEY,
          CONST.MD_META_KEY
        ];
        const invites = [];
        const entriesHandle = await window.safeMutableData.getEntries(this.channelMD);
        await window.safeMutableDataEntries.forEach(entriesHandle, (k, v) => {
          const keyStr = k.toString();
          if (!whiteListKeys.includes(keyStr)) {
            const dataArr = keyStr.split(keySeparator);
            if (dataArr.length == 2 && dataArr[1] === CONST.CONN_STATE.SEND_INVITE) {
              invites.push(dataArr[0]);
            }
          }
        });
        resolve(invites);
      } catch (err) {
        reject(err);
      }
    });
  }

  connect(friendID) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!friendID) {
          return reject(new Error('Friend ID was empty'));
        }
        const pubNameSha = await window.safeCrypto.sha3Hash(this.app, friendID);
        const fdPubNameCntr = await window.safeMutableData.newPublic(this.app, pubNameSha, CONST.TYPE_TAG.DNS);

        const encChannelKey = await window.safeMutableData.encryptKey(fdPubNameCntr, CONST.MD_KEY);
        const fdChannelSerial = await window.safeMutableData.get(fdPubNameCntr, encChannelKey);
        this.remoteChannelMD = await window.safeMutableData.fromSerial(this.app, fdChannelSerial.buf);
        await this._setRemoteKeys();
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  _getDataKey(initiater, state) {
    let dataKey = null;
    if (!state) {
      dataKey = `${initiater}${keySeparator}${CONST.CONN_STATE.SEND_INVITE}`;
    } else if (state === CONST.CONN_STATE.SEND_INVITE || state === CONST.CONN_STATE.CALLING) {
      dataKey = `${initiater}${keySeparator}${state}`;
    } else {
      let dataKey = `${initiater}${keySeparator}${CONST.CONN_STATE.SEND_INVITE}`;
      if (state === CONST.CONN_STATE.CONNECTED) {
        dataKey = `${initiater}${keySeparator}${CONST.CONN_STATE.CALLING}`;
      }
    }
    return dataKey;
  }

  putConnInfo(connInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        const isCaller = (connInfo.data.persona === CONST.USER_POSITION.CALLER);
        const channelMD = isCaller ? this.remoteChannelMD : this.channelMD;

        if (!channelMD) {
          return reject(new Error('channel not set'));
        }

        const entriesHandle = await window.safeMutableData.getEntries(channelMD);
        const mutationHandle = await window.safeMutableDataEntries.mutate(entriesHandle);

        const data = this.stringify(connInfo.data);

        console.log('put data', data);
        // // sign the data
        const signedData = await window.safeCryptoSecSignKey.sign(this.keys[CONST.CRYPTO_KEYS.SEC_SIGN_KEY], data);
        console.log('put signed', signedData);

        // // encrypt the signed data
        // const encryptedData = await window.safeCryptoPubEncKey.encrypt(
        //   this.remoteKeys[CONST.CRYPTO_KEYS.PUB_ENC_KEY],
        //   data,
        //   this.keys[CONST.CRYPTO_KEYS.SEC_ENC_KEY]
        // );

        const encryptedData = await window.safeCryptoPubEncKey.encryptSealed(this.remoteKeys[CONST.CRYPTO_KEYS.PUB_ENC_KEY], data);
        const encDataStr = String.fromCharCode.apply(null, new Uint8Array(encryptedData))
        console.log('put enc data', encDataStr);

        const dataKey = this._getDataKey(connInfo.data.initiater, connInfo.state);
        console.log('put data key', dataKey);

        const connInfoStr = this.stringify({
          state: connInfo.state,
          data: encDataStr
        });

        // insert if it is caller
        if (connInfo.state === CONST.CONN_STATE.SEND_INVITE || connInfo.state === CONST.CONN_STATE.CALLING) {
          console.log('insert data', dataKey);
          await window.safeMutableDataMutation.insert(mutationHandle, dataKey, connInfoStr);
        } else {
          console.log('update data', dataKey)
          const connStr = await window.safeMutableData.get(channelMD, dataKey);
          await window.safeMutableDataMutation.update(mutationHandle, dataKey, connInfoStr, connStr.version + 1);
        }

        await window.safeMutableData.applyEntriesMutation(channelMD, mutationHandle);
        window.safeMutableDataMutation.free(mutationHandle);
        window.safeMutableDataEntries.free(entriesHandle);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  fetchConnInfo(connInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('fetch conn info :: ', connInfo);
        const isCaller = (connInfo.data.persona === CONST.USER_POSITION.CALLER);
        const channelMD = isCaller ? this.remoteChannelMD : this.channelMD;
        if (!channelMD) {
          return reject(new Error('channel not set'));
        }

        const dataKey = this._getDataKey(connInfo.data.initiater, connInfo.state);
        console.log('fetch conn info data key :: ', connInfo, dataKey);
        const connStr = await window.safeMutableData.get(channelMD, dataKey);

        const parsedConnInfo = JSON.parse(connStr.buf.toString());
        console.log('connStr fetch', parsedConnInfo);

        if (isCaller && parsedConnInfo.state && (parsedConnInfo.state === CONST.CONN_STATE.SEND_INVITE || parsedConnInfo.state === CONST.CONN_STATE.CALLING)) {
          return resolve(JSON.stringify(connInfo));
        }

        if (!isCaller && parsedConnInfo.state && (parsedConnInfo.state === CONST.CONN_STATE.INVITE_ACCEPTED || parsedConnInfo.state === CONST.CONN_STATE.CONNECTED)) {
          return resolve(JSON.stringify(connInfo));
        }
        console.log('enc datas', this.keys[CONST.CRYPTO_KEYS.SEC_ENC_KEY], this.remoteKeys[CONST.CRYPTO_KEYS.PUB_ENC_KEY], parsedConnInfo.data.length);
        const decryptedData = await window.safeCryptoSecEncKey.decrypt(
          this.keys[CONST.CRYPTO_KEYS.SEC_ENC_KEY],
          parsedConnInfo.data,
          this.keys[CONST.CRYPTO_KEYS.PUB_ENC_KEY]);
        console.log('decryptedData', decryptedData);

        const verifiedData = await window.safeCryptoPubSignKey.verify(
          this.remoteKeys[CONST.CRYPTO_KEYS.PUB_SIGN_KEY],
          signedData);
        console.log('verifiedData', verifiedData);

        resolve(JSON.stringify({
          state: parsedConnInfo.state,
          data: verifiedData.toString()
        }));
      } catch (err) {
        reject(err);
      }
    });
  }

  sendInvite(connInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.remoteChannelMD) {
          return reject(new Error('remote channel not set'));
        }
        await this.putConnInfo(connInfo);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  acceptInvite(connInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.channelMD) {
          return reject(new Error('channel handle is empty'));
        }
        await this.putConnInfo(connInfo);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  calling(connInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.remoteChannelMD) {
          return reject(new Error('channel handle is empty'));
        }
        await this.putConnInfo(connInfo);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  connected(connInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.channelMD) {
          return reject(new Error('channel handle is empty'));
        }
        await this.putConnInfo(connInfo);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }
}
