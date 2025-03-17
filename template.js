const BigQuery = require('BigQuery');
const JSON = require('JSON');
const getAllEventData = require('getAllEventData');
const makeTableMap = require('makeTableMap');
const getRequestHeader = require('getRequestHeader');
const getRequestBody = require('getRequestBody');
const getRequestPath = require('getRequestPath');
const getRequestQueryString = require('getRequestQueryString');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');

const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');

/**********************************************************************************************/

// To accomodate a breaking change.
// The previous version before it only had 'console' as a possible destination.
const logDestination = data.logDestination || 'console';

const logDestinationsHandlers = {
  console: log,
  bigQuery: logToBigQuery
};

// Key mappings for each log destination
const keyMappings = {
  console: {
    Name: 'Name',
    Type: 'Type',
    TraceId: 'TraceId',
    EventName: 'EventName',
    CustomData: 'CustomData',
    EventData: 'EventData',
    RequestUrl: 'RequestUrl',
    RequestBody: 'RequestBody'
  },
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

if (isLoggingEnabled) {
  const rawData = {
    Name: 'Logger',
    Type: 'Message',
    TraceId: traceId,
    EventName: data.eventName ? data.eventName : 'Logger'
  };

  if (data.custom && data.custom.length > 0) {
    rawData.CustomData = makeTableMap(data.custom, 'name', 'value');
  }

  if (data.eventData) {
    rawData.EventData = getAllEventData();
  }

  if (data.requestUrl) {
    rawData.RequestUrl = getRequestPath();

    const queryString = getRequestQueryString();
    if (queryString !== '') {
      rawData.RequestUrl += '?' + queryString;
    }
  }

  if (data.requestBody) {
    const body = getRequestBody();
    rawData.RequestBody =
      data.requestBodyJson && body ? JSON.parse(body) : body;
  }

  // Map keys based on the log destination
  const dataToLog = {};
  const mapping = keyMappings[logDestination];
  for (const key in rawData) {
    const mappedKey = mapping[key] || key; // Fallback to original key if no mapping exists
    dataToLog[mappedKey] = rawData[key];
  }

  const handler = logDestinationsHandlers[logDestination];
  if (handler) handler(dataToLog);
}

data.gtmOnSuccess();

/**********************************************************************************************/

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = containerVersion.debugMode;

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function log(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  // timestamp is required.
  dataToLog.timestamp = getTimestampMillis();

  // Columns with type JSON need in BQ double quotes to be escaped.
  ['custom_data', 'event_data', 'request_body'].forEach(
    (p) => (dataToLog[p] = JSON.stringify(dataToLog[p]))
  );

  // assertApi doesn't work for 'BigQuery.insert()'. It's needed to convert BigQuery into a function when testing.
  // Ref: https://gtm-gear.com/posts/gtm-templates-testing/
  const bigquery =
    getType(BigQuery) === 'function'
      ? BigQuery() /* Only during Unit Tests */
      : BigQuery;
  bigquery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}
