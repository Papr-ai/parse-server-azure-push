'use strict'

module.exports = {
    get: () => process.env['CUSTOMCONNSTR_MS_NotificationHubConnectionString'],
    parse: (connectionString, pushConfig) => {
        if (!connectionString) {
            throw new Error('Connection string is required');
        }
        
        connectionString.split(';').forEach((keyValuePair) => {
            const splitIndex = keyValuePair.indexOf('=');
            if (splitIndex > 0) {
                pushConfig[keyValuePair.slice(0, splitIndex)] = keyValuePair.slice(splitIndex + 1);
            }
        });

        if (pushConfig.Endpoint) {
            pushConfig.Endpoint = pushConfig.Endpoint.replace('sb://', '').replace('/', '');
        }
        
        return pushConfig;
    }
}