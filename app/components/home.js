import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { inject, observer } from "mobx-react";

import SelectedPubID from './selected_pub_id';
import Loader from './loader';

@inject("store")
@observer
export default class Home extends Component {
  componentWillUnmount() {
    this.props.store.reset();
  }

  noPublicNameContainer() {
    return (
      <div className="base">
        <h3 className="no-pub-name">No Public Name found. Please create one to start using this application.</h3>
      </div>
    )
  }

  render() {
    const { store, history } = this.props;

    if (store.loading) {
      return <Loader desc={store.loaderDesc} />;
    }

    // if no public name found
    if (store.publicNames.length === 0) {
      return this.noPublicNameContainer();
    }

    return (
      <div className="base">
        <SelectedPubID pubId={store.selectedPubName} history={history} />
        <div className="choose-chat">
          <div className="choose-chat-b">
            <div className="choose-chat-i invites">
              <button
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  history.push('invites');
                }}
              >
                <span className="icn"></span>
                <span className="desc">View Invites</span>
              </button>
            </div>
            <div className="choose-chat-i new-chat">
              <button
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  history.push('new-chat');
                }}
              >
                <span className="icn"></span>
                <span className="desc">Create new chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Home.propTypes = {
};