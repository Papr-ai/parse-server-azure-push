var azurePushAdapter = require('../src/AzurePushAdapter');
var sinon = require('sinon');
var https = require('https');
var PassThrough = require('stream').PassThrough;
var expect = require('chai').expect;
var streams;
var requestStub;

describe('integration', function () {
    this.timeout(5000);
    
    beforeEach(function () {
        streams = [];
        requestStub = sinon.stub(https, 'request').callsFake(function(options, responseHandler) {
            // Create a new PassThrough stream for each request
            const req = new PassThrough();
            req.writeData = '';
            req.write = function(data) {
                this.writeData += data;
                return this;
            };
            req.end = function() {
                // Trigger the response handler immediately when end is called
                process.nextTick(() => {
                    responseHandler({
                        statusCode: 201,
                        statusMessage: 'Created'
                    });
                });
            };
            streams.push(req);
            return req;
        });
    });

    afterEach(function () {
        if (requestStub && typeof requestStub.restore === 'function') {
            requestStub.restore();
        }
        streams = [];
    });

    it('sends notifications', function(done) {
        var adapter = azurePushAdapter({
            ConnectionString: "Endpoint=sb://endpoint.servicebus.windows.net/;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=keyVal",
            HubName: 'hub'
        });
        
        var notification = {
            data: {
                alert: 'text'
            }
        };
        
        var installations = [];
        installations.push({
            deviceType: 'ios',
            deviceToken: 1
        });
        installations.push({
            deviceType: 'unsupported',
            deviceToken: 1
        });
        for(var i = 0; i < 1001; i++) {
            installations.push({
                deviceType: 'winrt',
                deviceUris: {
                    _Default: 1
                }
            });
        }

        adapter.send(notification, installations)
            .then(() => {
                try {
                    // Verify the requests
                    var apsArgs = requestStub.getCall(0).args[0];
                    expect(apsArgs.host).to.equal('endpoint.servicebus.windows.net');
                    expect(apsArgs.path).to.equal('/hub/messages/$batch?direct&api-version=2015-08');
                    expect(apsArgs.headers['Content-Type']).to.equal('multipart/mixed; boundary="simple-boundary"');
                    expect(apsArgs.headers['ServiceBusNotification-Format']).to.equal('apple');
                    
                    if (streams[0] && streams[0].writeData) {
                        validateStreamData(streams[0].writeData, true, {
                            aps: {
                                alert: "text"
                            }
                        });
                    }

                    var toast = '<toast><visual><binding template="ToastText01"><text id="1">text</text></binding></visual></toast>';

                    if (requestStub.getCall(1)) {
                        var wnsArgs = requestStub.getCall(1).args[0];
                        expect(wnsArgs.headers['ServiceBusNotification-Format']).to.equal('windows');
                        
                        if (streams[1] && streams[1].writeData) {
                            validateStreamData(streams[1].writeData, false, toast, 1000);
                        }
                        
                        if (streams[2] && streams[2].writeData) {
                            validateStreamData(streams[2].writeData, false, toast);
                        }
                    }
                    done();
                } catch (err) {
                    done(err);
                }
            })
            .catch(done);
    });

    function validateStreamData(streamData, isJson, payload, deviceCount) {
        var contentType = isJson ? "application/json;charset=utf-8" : "text/xml";
        payload = isJson ? JSON.stringify(payload) : payload;
        var boundary = "--simple-boundary";
        deviceCount = deviceCount || 1;
        var devices = [];
        for (var i = 0; i < deviceCount; i++) {
            devices.push(1);
        }
        devices = JSON.stringify(devices);
        var data = boundary + "\r\n" +
            "Content-Disposition: inline; name=notification\r\n" +
            "Content-Type: " + contentType + "\r\n\r\n" +
            payload + "\r\n" +
            boundary + "\r\n" + 
            "Content-Disposition: inline; name=devices\r\n" +
            "Content-Type: application/json;charset=utf-8\r\n\r\n" +
            devices + "\r\n" +
            boundary + "--\r\n";

        expect(streamData).to.equal(data);
    }
});