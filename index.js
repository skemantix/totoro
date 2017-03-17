var express = require('express');
var router = express.Router();
var winston = require('winston');
var consts = require('./consts.js');
var Endpoint = require('./objects/Endpoint.js');
var clone = require('clone');

winston.level = 'debug';

var rainWithLogging = function(apiConfig, logging) {
    if (logging) {
        winston.add(winston.transports.Console);
    } else {
        winston.remove(winston.transports.Console);
    }

    rain(apiConfig);
}

var rain = function(apiConfig) {
    var versions = {};
    var previousApiVersion = null;

    for (var apiVersion in apiConfig) {
        if (apiConfig.hasOwnProperty(apiVersion)) {
            var apiVersionConfig = apiConfig[apiVersion];
            if (apiVersionConfig.active) {
                delete apiVersionConfig.active;
                versions[apiVersion] = [];

                // copy over endpoints from previous version if needed
                inheritEndpoints(versions, previousApiVersion, apiVersion);

                // set previous api version number
                previousApiVersion = apiVersion;

                for (var endpoint in apiVersionConfig) {
                    if (apiVersionConfig.hasOwnProperty(endpoint)) {
                        if (apiVersionConfig[endpoint].active) {
                            var endpoint = new Endpoint(apiVersion, endpoint, apiVersionConfig[endpoint]);
                            // add new endpoint to the list or replace if it exists already
                            pushOrReplaceEndpoint(versions[apiVersion], endpoint);
                        }
                    }
                }
            }
        }
    }

    return populateRouter(versions);
}

function inheritEndpoints(versions, previousApiVersion, apiVersion) {
    if (previousApiVersion == null) {
        return;
    }

    for (var i = 0; i < versions[previousApiVersion].length; i++) {
        if (!versions[previousApiVersion][i].deprecated) {
            var endpointCopy = clone(versions[previousApiVersion][i]);
            endpointCopy.apiVersion = apiVersion;
            versions[apiVersion].push(endpointCopy);
        }
    }
}

function pushOrReplaceEndpoint(endpoints, endpoint) {
    var replaced = false;
    for (var i = 0; i < endpoints.length; i++) {
        if (endpoints[i].endpoint == endpoint.endpoint
            && endpoints[i].endpointConfig.method == endpoint.endpointConfig.method) {
            endpoints[i] = endpoint;
            replaced = true;
        }
    }

    if (!replaced) {
        endpoints.push(endpoint);
    }
}

function populateRouter(versions) {
    for (var apiVersion in versions) {
        if (versions.hasOwnProperty(apiVersion)) {
            for (var endpoint in versions[apiVersion]) {
                if (versions[apiVersion].hasOwnProperty(endpoint)) {
                    constructRoute(versions[apiVersion][endpoint]);
                }
            }
        }
    }

    return router;
}

function constructRoute(endpoint) {
    switch (endpoint.endpointConfig.method) {
        case 'GET':
            router.get('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        case 'POST':
            router.post('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        case 'DELETE':
            router.delete('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        case 'PUT':
            router.put('/' + endpoint.apiVersion + endpoint.endpoint, function(req, res) {
                endpoint.endpointConfig.endpointImplementation(endpoint.apiVersion, req, res);
            });
            break;
        default:
            // report error
    }
}

module.exports = {
    rain: rain,
    rainWithLogging: rainWithLogging
};