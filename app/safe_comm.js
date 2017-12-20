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

export default class SafeApi {
  constructor(nwStateCb) {
    this.app = null;
    this.pubNameCntr = null;
    this.serviceCntr = null;
    this.channelMD = null;
    this.selectedPubName = null;
    this.nwStateCb = (newState) => {
      nwStateCb(newState);
    };
  }

  _createChannel() {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.serviceCntr) {
          return reject(new Error('service container handle is empty'));
        }

        this.channelMD = await window.safeMutableData.newRandomPrivate(this.app, CONST.TYPE_TAG.CHANNEL);

        // insert keys
        const signKeyPairHandle = await window.safeCrypto.generateSignKeyPair(this.app);
        const pubSignKey = await window.safeCryptoSignKeyPair.getPubSignKey(signKeyPairHandle);
        const pubSignKeyRaw = await window.safeCryptoPubSignKey.getRaw(pubSignKey);
        const pubSignKeyStr = pubSignKeyRaw.buffer.toString('hex');
        const secSignKey = await window.safeCryptoSignKeyPair.getSecSignKey(signKeyPairHandle);
        const secSignKeyRaw = await window.safeCryptoSecSignKey.getRaw(secSignKey);
        const secSignKeyStr = secSignKeyRaw.buffer.toString('hex');
        const encKeyPairHandle = await window.safeCrypto.generateEncKeyPair(this.app);
        const pubEncKey = await window.safeCryptoEncKeyPair.getPubEncKey(encKeyPairHandle);
        const pubEncKeyRaw = await window.safeCryptoPubEncKey.getRaw(pubEncKey);
        const pubEncKeyStr = pubEncKeyRaw.buffer.toString('hex');
        const secEncKey = await window.safeCryptoEncKeyPair.getSecEncKey(encKeyPairHandle);
        const secEncKeyRaw = await window.safeCryptoSecEncKey.getRaw(secEncKey);
        const secEncKeyStr = secEncKeyRaw.buffer.toString('hex');
        const entries = {};
        entries[CONST.CRYPTO_KEYS.PUB_SIGN_KEY] = pubSignKeyStr;
        entries[CONST.CRYPTO_KEYS.SEC_SIGN_KEY] = secSignKeyStr;
        entries[CONST.CRYPTO_KEYS.PUB_ENC_KEY] = pubEncKeyStr;
        entries[CONST.CRYPTO_KEYS.SEC_ENC_KEY] = secEncKeyStr;
        await window.safeMutableData.quickSetup(this.channelMD, entries, 'WebRTC Channel', `WebRTC channel for ${hostName}`);

        // create a new permission set
        const permSet = [CONST.PERMISSIONS.READ, CONST.PERMISSIONS.INSERT, CONST.PERMISSIONS.UPDATE];
        await window.safeMutableData.setUserPermissions(this.channelMD, null, permSet, 1);

        const channelSerialData = await window.safeMutableData.serialise(this.channelMD);
        const entriesHandle = await window.safeMutableData.getEntries(this.serviceCntr);
        const mutationHandle = await window.safeMutableDataEntries.mutate(entriesHandle);
        const encryptedKey = await window.safeMutableData.encryptKey(this.serviceCntr, CONST.MD_KEY);
        await window.safeMutableDataMutation.insert(mutationHandle, encryptedKey, channelSerialData);
        await window.safeMutableData.applyEntriesMutation(this.serviceCntr, mutationHandle);
        window.safeMutableDataMutation.free(mutationHandle);
        window.safeMutableDataEntries.free(entriesHandle);
        console.log('created channel');
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
        console.log('this.selectedPubName', this.selectedPubName);
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
      } catch(err) {
        console.log('service container permission', err);
        if (err.code !== -1011) {
          return reject(err);
        }
        const serviceCntrInfo = await window.safeMutableData.getNameAndTag(this.serviceCntr);
        console.log('serviceCntrInfo', serviceCntrInfo);
        await window.safeApp.authoriseShareMd(this.app, [
          {
            type_tag: serviceCntrInfo.type_tag,
            name: serviceCntrInfo.name.buffer,
            perms: [CONST.PERMISSIONS.INSERT]
          }
        ]);
        console.log('md authorised');
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
        // await this._getSelectedPublicName();
        // await this._setup();
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
          // const decKey = await window.safeMutableData.decrypt(this.pubNameCntr, k);
          // console.log('Entries :: ', decKey.toString(), v.buf.toString());
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
          console.log('channelSerial', channelSerial)
          this.channelMD = await window.safeMutableData.fromSerial(this.app, channelSerial.buf);

          const entriesHandle = await window.safeMutableData.getEntries(this.channelMD);
          await window.safeMutableDataEntries.forEach(entriesHandle, (k, v) => {
            console.log('Entries :: ', k, k.toString(), v.buf.toString());
          });
          console.log('channel already exists');
        } catch (e) {
          console.log('channel not found', e.code);
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
}
