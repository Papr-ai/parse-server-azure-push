'use strict';

const Parse = require('parse/node').Parse;
const nhClientFactory = require('./NHClient');
const classifyInstallations = require('./classifyInstallations');
const nhConfig = require('./NHConfig');

// Constants
const CHUNK_SIZE = 1000;

/**
 * Chunks array into smaller arrays of specified size
 * @param {Array} array - Array to chunk
 * @returns {Array[]} Array of chunks
 */
const chunk = (array) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += CHUNK_SIZE) {
    chunks.push(array.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

// Provider map with lazy loading
const providerMap = {
  android: () => require('./GCM'),
  ios: () => require('./APNS'),
  winrt: () => require('./WNS')
};

/**
 * Creates an Azure Push Adapter for Parse Server
 * @param {Object} pushConfig - Push configuration options
 * @returns {Object} Push adapter interface
 */
function AzurePushAdapter(pushConfig = {}) {
  // Initialize notification hub client
  const nhClient = pushConfig.NHClient || nhClientFactory(nhConfig.get(pushConfig));

  const api = {
    /**
     * Returns array of supported push types
     * @returns {string[]} Array of supported push types
     */
    getValidPushTypes: () => Object.keys(providerMap),

    /**
     * Sends push notifications to installations
     * @param {Object} data - Push notification data
     * @param {Array} installations - Array of installations to send to
     * @returns {Promise<Array>} Promise resolving to array of send results
     */
    send: async (data, installations) => {
      try {
        // Classify installations by device type
        const deviceMap = classifyInstallations(installations, api.getValidPushTypes());
        const sendPromises = [];

        // Process each device type
        for (const [pushType, devices] of Object.entries(deviceMap)) {
          if (!devices.length) continue;

          // Get provider for push type
          const getProvider = providerMap[pushType];
          if (!getProvider) {
            console.warn(`No provider found for push type: ${pushType}`, { data });
            continue;
          }

          const provider = getProvider();
          const headers = provider.generateHeaders(data);
          const payload = provider.generatePayload(data);

          console.log(`Sending notification to ${devices.length} ${pushType} devices:`, payload);

          // Split devices into chunks and send
          const chunkedDevices = chunk(devices);
          const chunkPromises = chunkedDevices.map(deviceChunk => 
            nhClient.bulkSend(deviceChunk, headers, payload)
              .catch(error => {
                console.error(`Error sending to ${pushType} devices:`, error);
                return { error, failed: deviceChunk };
              })
          );

          sendPromises.push(Promise.all(chunkPromises));
        }

        const results = await Promise.all(sendPromises);
        return results.flat();
      } catch (error) {
        console.error('Push notification error:', error);
        throw error;
      }
    }
  };

  return api;
}

module.exports = AzurePushAdapter;