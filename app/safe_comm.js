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

  bufToArr(buf) {
    if (!(buf instanceof Uint8Array)) {
      throw new Error('buf is not instance of Uint8Array');
    }
    return Array.from(buf);
  }

  arrToBuf(arr) {
    if (!(arr instanceof Array)) {
      throw new Error('arr is not instance of Array');
    }
    return new Uint8Array(arr);
  }

  _setKeys(keys) {
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

        // Application keys
        const signKeyPairHandle = await window.safeCrypto.generateSignKeyPair(this.app);

        // public sign key
        const pubSignKey = await window.safeCryptoSignKeyPair.getPubSignKey(signKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = pubSignKey;
        const pubSignKeyRaw = await window.safeCryptoPubSignKey.getRaw(pubSignKey);
        const pubSignKeyArr = this.bufToArr(pubSignKeyRaw.buffer);
        // const pubSignKeyStr = pubSignKeyRaw.buffer.toString('hex');

        // secret sign key
        const secSignKey = await window.safeCryptoSignKeyPair.getSecSignKey(signKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.SEC_SIGN_KEY] = secSignKey;
        const secSignKeyRaw = await window.safeCryptoSecSignKey.getRaw(secSignKey);
        const secSignKeyArr = this.bufToArr(secSignKeyRaw.buffer);
        // const secSignKeyStr = secSignKeyRaw.buffer.toString('hex');

        const encKeyPairHandle = await window.safeCrypto.generateEncKeyPair(this.app);

        // public encryption key
        const pubEncKey = await window.safeCryptoEncKeyPair.getPubEncKey(encKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = pubEncKey;
        const pubEncKeyRaw = await window.safeCryptoPubEncKey.getRaw(pubEncKey);
        const pubEncKeyArr = this.bufToArr(pubEncKeyRaw.buffer);
        // const pubEncKeyStr = pubEncKeyRaw.buffer.toString('hex');

        // secret encryption key
        const secEncKey = await window.safeCryptoEncKeyPair.getSecEncKey(encKeyPairHandle);
        keysHandle[CONST.CRYPTO_KEYS.SEC_ENC_KEY] = secEncKey;
        const secEncKeyRaw = await window.safeCryptoSecEncKey.getRaw(secEncKey);
        const secEncKeyArr = this.bufToArr(secEncKeyRaw.buffer);
        // const secEncKeyStr = secEncKeyRaw.buffer.toString('hex');

        const entries = {};
        entries[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = pubSignKeyArr;
        entries[CONST.CRYPTO_KEYS.SEC_SIGN_KEY] = secSignKeyArr;
        entries[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = pubEncKeyArr;
        entries[CONST.CRYPTO_KEYS.SEC_ENC_KEY] = secEncKeyArr;
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

  _checkServiceContainerAccess(mdHandle) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.serviceCntr) {
          return reject(new Error('service container handle is empty'));
        }

        // const perms = await window.safeMutableData.getPermissions(this.serviceCntr);
        const appSignKey = await window.safeCrypto.getAppPubSignKey(this.app);
        const result = await window.safeMutableData.getUserPermissions(mdHandle, appSignKey);
        // const result = await window.safeMutableDataPermissions.getPermissionsSet(perms, appSignKey);

        resolve(true);
      } catch (err) {
        // if (err.code !== -1011) {
        if (err.message !== 'Core error: Routing client error -> Key does not exists') {
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
        await this._checkServiceContainerAccess(this.serviceCntr);

        try {
          // search for webrtc mdata
          const encChannelKey = await window.safeMutableData.encryptKey(this.serviceCntr, CONST.MD_KEY);
          const channelSerial = await window.safeMutableData.get(this.serviceCntr, encChannelKey);
          this.channelMD = await window.safeMutableData.fromSerial(this.app, channelSerial.buf);
          await this._setKeys(null);
        } catch (e) {
          // if (e.code !== CONST.ERR_CODE.NO_SUCH_ENTRY) {
          if (e.message !== 'Core error: Routing client error -> Requested entry not found') {
            throw e;
          }
          await this._createChannel();
        }
        this.checkSign();
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
          console.log('keyStr', keyStr);
          if (!whiteListKeys.includes(keyStr)) {
            const dataArr = keyStr.split(keySeparator);
            if (dataArr.length == 3 && dataArr[1] === CONST.CONN_STATE.SEND_INVITE) {
              invites.push({
                publicId: dataArr[0],
                uid: dataArr[2]
              });
            }
          }
        });
        console.log('invites', invites);
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

  _getDataKey(initiater, state, id) {
    console.log('_getDataKey', initiater, state);
    let dataKey = null;
    if (!state) {
      dataKey = `${initiater}${keySeparator}${CONST.CONN_STATE.SEND_INVITE}${keySeparator}${id}`;
    } else if (state === CONST.CONN_STATE.SEND_INVITE || state === CONST.CONN_STATE.CALLING) {
      dataKey = `${initiater}${keySeparator}${state}${keySeparator}${id}`;
    } else {
      dataKey = `${initiater}${keySeparator}${CONST.CONN_STATE.SEND_INVITE}${keySeparator}${id}`;
      if (state === CONST.CONN_STATE.CONNECTED) {
        dataKey = `${initiater}${keySeparator}${CONST.CONN_STATE.CALLING}${keySeparator}${id}`;
      }
    }
    console.log('dataKey', dataKey);
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

        const encryptedData = await window.safeCryptoPubEncKey.encryptSealed(this.remoteKeys[CONST.CRYPTO_KEYS.PUB_ENC_KEY], data);
        console.log('encryptedData', encryptedData)

        const encDataArr = Array.from(encryptedData);

        // const signedData = await window.safeCryptoSecSignKey.sign(this.keys[CONST.CRYPTO_KEYS.SEC_SIGN_KEY], JSON.stringify(encDataArr));
        // console.log('signedData', signedData);

        // const dataArr = Array.from(signedData);
        // console.log('put sign data', dataArr);

        const dataKey = this._getDataKey(connInfo.data.initiater, connInfo.state, connInfo.uid);
        console.log('put data key', dataKey);

        const connInfoStr = this.stringify({
          state: connInfo.state,
          uid: connInfo.uid,
          data: encDataArr
        });

        // insert if it is caller
        if (isCaller) {
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

  fetchConnInfo(connInfo, state) {
    const isCaller = (connInfo.data.persona === CONST.USER_POSITION.CALLER);
    return new Promise(async (resolve, reject) => {
      try {
        console.log('fetch conn info :: ', connInfo);
        const channelMD = isCaller ? this.remoteChannelMD : this.channelMD;
        if (!channelMD) {
          return reject(new Error('channel not set'));
        }

        const dataKey = this._getDataKey(connInfo.data.initiater, state || connInfo.state, connInfo.uid);
        console.log('fetch conn info data key :: ', connInfo, dataKey);

        const connStr = await window.safeMutableData.get(channelMD, dataKey);
        console.log('connStr :: ', connStr);

        const parsedConnInfo = JSON.parse(connStr.buf.toString());
        // const parsedConnInfo = connStr.buf.toString();
        console.log('connStr fetch', parsedConnInfo);

        if (isCaller && parsedConnInfo.state && (parsedConnInfo.state === CONST.CONN_STATE.SEND_INVITE || parsedConnInfo.state === CONST.CONN_STATE.CALLING)) {
          return resolve(JSON.stringify(connInfo));
        }

        if (!isCaller && parsedConnInfo.state && (parsedConnInfo.state === CONST.CONN_STATE.INVITE_ACCEPTED || parsedConnInfo.state === CONST.CONN_STATE.CONNECTED)) {
          return resolve(JSON.stringify(connInfo));
        }

        // console.log('enc datas', this.keys[CONST.CRYPTO_KEYS.SEC_ENC_KEY], this.remoteKeys[CONST.CRYPTO_KEYS.PUB_ENC_KEY], parsedConnInfo.data.length);
        console.log('parsedConnInfo.data', parsedConnInfo.data);
        // const verifiedData = await window.safeCryptoPubSignKey.verify(
        //   this.remoteKeys[CONST.CRYPTO_KEYS.PUB_SIGN_KEY],
        //   new Uint8Array(parsedConnInfo.data));
        // console.log('verifiedData', verifiedData);

        const rawPubEncKey = await window.safeCryptoPubEncKey.getRaw(this.keys[CONST.CRYPTO_KEYS.PUB_ENC_KEY]);
        console.log('rawPubEncKey', rawPubEncKey);
        const rawSecEncKey = await window.safeCryptoSecEncKey.getRaw(this.keys[CONST.CRYPTO_KEYS.SEC_ENC_KEY]);
        console.log('rawSecEncKey', rawSecEncKey);

        const encKeyPairHandle = await window.safeCrypto.generateEncKeyPairFromRaw(this.app, rawPubEncKey.buffer, rawSecEncKey.buffer);
        console.log('encKeyPairHandle', encKeyPairHandle);

        console.log('parsedConnInfo', parsedConnInfo);

        const decryptedData = await window.safeCryptoEncKeyPair.decryptSealed(
          encKeyPairHandle,
          new Uint8Array(parsedConnInfo.data));
        console.log('decryptedData', decryptedData.toString());


        resolve(JSON.stringify({
          state: parsedConnInfo.state,
          uid: parsedConnInfo.uid,
          data: JSON.parse(decryptedData.toString())
        }));
      } catch (err) {
        if (err.message !== 'Core error: Routing client error -> Requested entry not found') {
          return reject(err);
        }

        if (!isCaller && connInfo.state && (connInfo.state === CONST.CONN_STATE.INVITE_ACCEPTED)) {
          return resolve(JSON.stringify(connInfo));
        }

        return reject(err);
      }
    });
  }

  sendInvite(connInfo) {
    console.log('sendInvite', connInfo);
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
    console.log('acceptInvite', connInfo);
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
    console.log('calling', connInfo);
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
    console.log('connected', connInfo);
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

  checkSign() {
    return new Promise(async (resolve, reject) => {
      try {
        const signKeyPairHandle = await window.safeCrypto.generateSignKeyPair(this.app);

        const secSignKeyHandle = await window.safeCryptoSignKeyPair.getSecSignKey(signKeyPairHandle);

        const data = 'plain text data to be signed';
        const signedData = await window.safeCryptoSecSignKey.sign(secSignKeyHandle, data);

        console.log('signedData', signedData);

        const pubSignKeyHandle = await window.safeCryptoSignKeyPair.getPubSignKey(signKeyPairHandle);
        const verifiedData = await window.safeCryptoPubSignKey.verify(pubSignKeyHandle, signedData);

        console.log('verifiedData', verifiedData);

        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }
}
