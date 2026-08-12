const BigQuery = require('BigQuery');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const generateRandom = require('generateRandom');
const getContainerVersion = require('getContainerVersion');
const getRequestBody = require('getRequestBody');
const getRequestHeader = require('getRequestHeader');
const getRequestPath = require('getRequestPath');
const getRequestQueryString = require('getRequestQueryString');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeString = require('makeString');
const makeTableMap = require('makeTableMap');
const sendHttpRequest = require('sendHttpRequest');

/*==============================================================================
==============================================================================*/

const isLoggingEnabled = determinateIsLoggingEnabled(data);
if (!isLoggingEnabled) {
  return data.gtmOnSuccess();
}

// To accomodate a breaking change. A previous version only had 'console' as a possible destination.
const logDestination = data.logDestination || 'console';
const logDestinationsHandlers = {
  console: log,
  bigQuery: logToBigQuery,
  stapeStore: logToStapeStore
};
const keyMappings = {
  bigQuery: {
    Name: 'tag_name',
    Type: 'type',
    TraceId: 'trace_id',
    EventName: 'event_name',
    CustomData: 'custom_data',
    EventData: 'event_data',
    RequestUrl: 'request_url',
    RequestBody: 'request_body'
  }
};
const rawData = {
  Name: 'Logger',
  Type: 'Message',
  TraceId: getRequestHeader('trace-id'),
  EventName: data.eventName ? data.eventName : 'Logger'
};

if (data.custom && data.custom.length > 0) {
  rawData.CustomData = makeTableMap(data.custom, 'name', 'value');
}

if (data.eventData) rawData.EventData = getAllEventData();

if (data.requestUrl) {
  rawData.RequestUrl = getRequestPath();
  const queryString = getRequestQueryString();
  if (queryString !== '') rawData.RequestUrl += '?' + queryString;
}

if (data.requestBody) {
  const body = getRequestBody();
  rawData.RequestBody = data.requestBodyJson && body ? safeJsonParse(body) : body;
}

const mapping = keyMappings[logDestination];
const dataToLog = mapping ? {} : rawData;

if (mapping) {
  for (const key in rawData) {
    const mappedKey = mapping[key] || key;
    dataToLog[mappedKey] = rawData[key];
  }
}

const handler = logDestinationsHandlers[logDestination];
if (handler) handler(data, dataToLog);

if (data.useOptimisticScenario) {
  return data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function determinateIsLoggingEnabled(data) {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function log(data, dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
  return data.gtmOnSuccess();
}

function logToBigQuery(data, dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  dataToLog.timestamp = getTimestampMillis();
  ['custom_data', 'event_data', 'request_body'].forEach(
    (p) => (dataToLog[p] = JSON.stringify(dataToLog[p]))
  );
  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });

  return data.gtmOnSuccess();
}

function generateDocumentId() {
  const rnd = makeString(generateRandom(1000000000, 2147483647));
  const customDocumentIdentifier =
    data.insertCustomDocumentIdentifier && data.customDocumentIdentifier
      ? data.customDocumentIdentifier + '_'
      : '';
  return 'logger_' + customDocumentIdentifier + makeString(getTimestampMillis()) + rnd;
}

function getStapeStoreBaseUrl(data) {
  let containerIdentifier;
  let defaultDomain;
  let containerApiKey;
  const collectionPath =
    'collections/' + enc(data.stapeStoreCollectionName || 'logger') + '/documents';

  const shouldUseDifferentStore =
    isUIFieldTrue(data.useDifferentStapeStore) &&
    getType(data.stapeStoreContainerApiKey) === 'string';
  if (shouldUseDifferentStore) {
    const containerApiKeyParts = data.stapeStoreContainerApiKey.split(':');
    const containerLocation = containerApiKeyParts[0];
    const containerRegion = containerApiKeyParts[3] || 'io';
    containerIdentifier = containerApiKeyParts[1];
    defaultDomain = containerLocation + '.stape.' + containerRegion;
    containerApiKey = containerApiKeyParts[2];
  } else {
    containerIdentifier = getRequestHeader('x-gtm-identifier');
    defaultDomain = getRequestHeader('x-gtm-default-domain');
    containerApiKey = getRequestHeader('x-gtm-api-key');
  }

  return (
    'https://' +
    enc(containerIdentifier) +
    '.' +
    enc(defaultDomain) +
    '/stape-api/' +
    enc(containerApiKey) +
    '/v2/store/' +
    collectionPath
  );
}

function getStapeStoreDocumentUrl(data, documentId) {
  const storeBaseUrl = getStapeStoreBaseUrl(data);
  return storeBaseUrl + '/' + enc(documentId);
}

function logToStapeStore(data, dataToLog) {
  const documentId = generateDocumentId();
  const documentUrl = getStapeStoreDocumentUrl(data, documentId);
  const requestMethod = 'PUT';

  sendHttpRequest(
    documentUrl,
    { method: requestMethod, headers: { 'Content-Type': 'application/json' } },
    JSON.stringify(dataToLog)
  )
    .then((response) => {
      if (!data.useOptimisticScenario) {
        if (response.statusCode === 200) return data.gtmOnSuccess();
        return data.gtmOnFailure();
      }
    })
    .catch(() => {
      if (!data.useOptimisticScenario) return data.gtmOnFailure();
    });
}

/*==============================================================================
  Helpers
==============================================================================*/

function isUIFieldTrue(field) {
  return [true, 'true', 1, '1'].indexOf(field) !== -1;
}

function safeJsonParse(body) {
  const firstChar = body.charAt(0);
  const lastChar = body.charAt(body.length - 1);
  const looksLikeJson =
    (firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']');
  if (!looksLikeJson) return body;
  return JSON.parse(body);
}

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}
