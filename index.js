/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async () => {
  /* data-only background updates; tap handled via onNotificationOpenedApp */
});

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
