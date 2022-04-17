const JSON = require('JSON');
const getAllEventData = require('getAllEventData');
const makeTableMap = require('makeTableMap');
const getRequestHeader = require('getRequestHeader');
const getRequestBody = require('getRequestBody');
const getRequestPath = require('getRequestPath');
const getRequestQueryString = require('getRequestQueryString');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');

if (isLoggingEnabled) {
    let dataToLog = {
        'Name': 'Logger',
        'Type': 'Message',
        'TraceId': traceId,
        'EventName': data.eventName ? data.eventName : 'Logger',
    };

    if (data.custom && data.custom.length > 0) {
        dataToLog.CustomData = makeTableMap(data.custom, 'name', 'value');
    }

    if (data.eventData) {
        dataToLog.EventData = getAllEventData();
    }

    if (data.requestUrl) {
        dataToLog.RequestUrl = getRequestPath();

        const queryString = getRequestQueryString();
        if (queryString !== '') {
            dataToLog.RequestUrl += '?' + queryString;
        }
    }

    if (data.requestBody) {
        const body = getRequestBody();

        dataToLog.RequestBody = data.requestBodyJson && body ? JSON.parse(body) : body;
    }

    logToConsole(JSON.stringify(dataToLog));
}

data.gtmOnSuccess();

function determinateIsLoggingEnabled() {
    if (!data.logType) {
        return isDebug;
    }

    if (data.logType === 'debug') {
        return isDebug;
    }

    return data.logType === 'always';
}
