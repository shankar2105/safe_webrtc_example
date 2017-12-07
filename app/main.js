import React from 'react';
import {render} from 'react-dom';
import createBrowserHistory from 'history/createBrowserHistory';
import { Provider } from 'mobx-react';
import { RouterStore, syncHistoryWithStore } from 'mobx-react-router';
import { Router } from 'react-router';
import AppRouter from './router';
import AppStore from './appStore';

const browserHistory = createBrowserHistory();
const routingStore = new RouterStore();
const appStore = new AppStore();


const stores = {
  routing: routingStore,
  store: appStore,
};

const history = syncHistoryWithStore(browserHistory, routingStore);

render(
  <Provider {...stores}>
    <Router history={history}>
      <AppRouter />
    </Router>
  </Provider>,
  document.getElementById('__WEBRTC_APP__')
);
