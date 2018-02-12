import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { inject, observer } from "mobx-react";

export default class SelectedPubID extends Component {
  render() {
    return (
      <div className="selected-pub-id">
        <div className="selected-pub-id-b">
          <h3>Your Public ID</h3>
          <h4>{this.props.pubId}</h4>
          <div className="switch-btn">
            <button
              className="btn flat primary"
              onClick={(e) => {
                e.preventDefault();
                this.props.history.push('switch-id');
              }}
            >Switch ID</button>
          </div>
        </div>
      </div>
    );
  }
}

SelectedPubID.propTypes = {
};
