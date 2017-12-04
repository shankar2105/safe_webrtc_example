import React from 'react';
import { Switch, Route } from 'react-router';
import App from './components/app';
import Home from './components/home';

export default () => (
  <App>
    <Switch>
      <Route path="/" component={Home} />
    </Switch>
  </App>
);
