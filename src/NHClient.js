'use strict'

const https = require('https');
const multipartFactory = require('./multipart');
const sasToken = require('./NHSasToken');

module.exports = function NHClient(config) {
    let api = {
        bulkSend: (devices, headers, payload) => {
            return new Promise((resolve, reject) => {
                let multipart = multipartFactory('simple-boundary')(devices, payload, headers['Content-Type']);
                let sasHeader = sasToken.generate(config);
                let options = {
                    host: config.Endpoint,
                    path: '/' + config.HubName + '/messages/$batch?direct&api-version=2015-08',
                    method: 'POST',
                    headers: {
                        'Authorization': sasHeader,
                        'Content-Type': 'multipart/mixed; boundary="simple-boundary"'
                    }
                };

                for (let key in headers) {
                    if (key !== 'Content-Type') {
                        options.headers[key] = headers[key];
                    }
                }

                let req = https.request(options, res => {
                    if (res.statusCode !== 201) {
                        reject(new Error('Notification failed with status ' + res.statusCode));
                    } else {
                        resolve();
                    }
                });

                req.on('error', err => reject(err));
                
                const buffer = multipart.getBuffer();
                req.write(buffer);
                req.end();
            });
        }
    };
    return api;
};