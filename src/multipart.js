'use strict'

const FormData = require('form-data');

module.exports = function(boundary) {
    return function(devices, payload, contentType) {
        const form = new FormData();
        boundary = boundary || 'simple-boundary';
        
        // Manually construct the multipart form data
        let data = '';
        
        // Add notification part
        data += `--${boundary}\r\n`;
        data += `Content-Disposition: inline; name=notification\r\n`;
        data += `Content-Type: ${contentType}\r\n\r\n`;
        data += `${payload}\r\n`;
        
        // Add devices part
        data += `--${boundary}\r\n`;
        data += `Content-Disposition: inline; name=devices\r\n`;
        data += `Content-Type: application/json;charset=utf-8\r\n\r\n`;
        data += `${JSON.stringify(devices)}\r\n`;
        
        // Add final boundary
        data += `--${boundary}--\r\n`;
        
        return {
            getBuffer: () => Buffer.from(data),
            toString: () => data
        };
    }
}
