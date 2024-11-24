'use strict';

/**
 * Gets the device URI from an installation
 * @param {Object} installation - Installation object
 * @returns {string|undefined} Device URI if available
 * @private
 */
const getDeviceUri = (installation) => {
  return installation.deviceUris?._Default;
};

/**
 * Classifies installations by device type and extracts device tokens/URIs
 * @param {Array<Object>} installations - Array of installation objects
 * @param {Array<string>} validPushTypes - Array of valid push types
 * @returns {Object.<string, Array<string>>} Map of device type to array of device tokens/URIs
 */
module.exports = (installations, validPushTypes) => {
  // Initialize device map with empty arrays for each valid push type
  const deviceMap = Object.fromEntries(
    validPushTypes.map(type => [type, []])
  );

  // Process each installation
  installations.forEach(installation => {
    // Get device handle (token or URI)
    const deviceHandle = installation.deviceToken || getDeviceUri(installation);
    if (!deviceHandle) {
      return; // Skip if no device handle found
    }

    const pushType = installation.deviceType;
    if (deviceMap[pushType]) {
      deviceMap[pushType].push(deviceHandle);
    } else {
      console.warn('Unknown push type:', {
        pushType,
        installationId: installation.installationId,
        validTypes: validPushTypes
      });
    }
  });

  return deviceMap;
};