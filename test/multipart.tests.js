var multipart = require('../src/multipart')('boundary');
var expect = require('chai').expect;

describe('multipart', function () {
    it('creates', function () {
        var form = multipart([1,2,3], JSON.stringify({ alert: 'push' }), 'text/xml');
        
        var expectedData = '--boundary\r\n' + 
            'Content-Disposition: inline; name=notification\r\n' +
            'Content-Type: text/xml\r\n\r\n' +
            '{"alert":"push"}\r\n' +
            '--boundary\r\n' + 
            'Content-Disposition: inline; name=devices\r\n' +
            'Content-Type: application/json;charset=utf-8\r\n\r\n' +
            '[1,2,3]\r\n' +
            '--boundary--\r\n';

        expect(form.toString()).to.equal(expectedData);
    });
});