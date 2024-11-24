'use strict'

const Parse = require('parse/node').Parse;
const nhClientFactory = require('./NHClient');
const classifyInstallations = require('./classifyInstallations');
const nhConfig = require('./NHConfig');
const chunkSize = 1000;
const chunk = require('./chunkArray')(chunkSize);
const providerMap = {
  android: require('./GCM'),
  ios: require('./APNS'),
  winrt: require('./WNS')
}

module.exports = function AzurePushAdapter(pushConfig) {
  pushConfig = pushConfig || {};
  let nhClient = pushConfig.NHClient || nhClientFactory(nhConfig.get(pushConfig));

  let api = {
    getValidPushTypes: () => ['ios', 'android', 'winrt'],
    send: async (data, installations) => {
      let deviceMap = classifyInstallations(installations, api.getValidPushTypes());
      let sendPromises = [];
      
      for (let pushType in deviceMap) {
        let devices = deviceMap[pushType];
        if (!devices.length) continue;
        
        let sender = providerMap[pushType];
        if (!sender) {
          console.log('Can not find sender for push type %s, %j', pushType, data);
          continue;
        }
        
        let headers = sender.generateHeaders(data);
        let payload = sender.generatePayload(data);
        console.log('Sending notification "' + payload + '" to ' + devices.length + ' ' + pushType + ' devices');

        const chunkedDevices = chunk(devices);
        const promises = chunkedDevices.map(chunkOfDevices => 
          nhClient.bulkSend(chunkOfDevices, headers, payload)
        );
        
        sendPromises.push(Promise.all(promises));
      }
      
      return Promise.all(sendPromises);
    }
  }
  return api;
}