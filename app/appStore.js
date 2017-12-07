import {observable, computed, action} from 'mobx';
import CONST from './constants';

export default class AppStore {
  @observable loading = false;
  @observable loaded = false;
  @observable loaderDesc = CONST.UI.DEFAULT_LOADING_DESC;
  @observable publicNames = [];
  @observable invites = [];
  @observable selectedPubName = 'PublicID1';


  setLoader(state, desc) {
    this.loaded = false;
    this.loading = state;
    this.loaderDesc = desc || CONST.UI.DEFAULT_LOADING_DESC;
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
}
