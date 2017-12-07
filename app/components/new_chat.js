import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { inject, observer } from "mobx-react";

import SelectedPubID from './selected_pub_id';
import Loader from './loader';

@inject("store")
@observer
export default class NewChat extends Component {
  onNewChatSubmit(e) {
    e.preventDefault();
    console.log('Friend ID', this.friendID.value)
  }

  render() {
    const { store, history } = this.props;

    if (store.loading) {
      return <Loader desc={store.loaderDesc} />;
    }

    return (
      <div className="base">
        <SelectedPubID pubId={store.selectedPubName} history={history} />
        <div className="card">
          <div className="card-b new-chat">
            <h3 className="title">Enter the PublicID you want to chat with</h3>
            <div className="new-chat-form">
              <form onSubmit={this.onNewChatSubmit.bind(this)}>
                <div className="inpt">
                  <input
                    type="text"
                    placeholder="FriendID"
                    required="required"
                    ref={(c) => {this.friendID = c;}} />
                </div>
                <div className="inpt-btn">
                  <button type="submit" className="btn primary">Connect</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

NewChat.propTypes = {
};
