var log = require('winston');
log.configure({
  transports: [
    new (log.transports.Console)({
      level: 'info',
      timestamp: function() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
      },
      formatter: function(options) {
        // Return string will be passed to logger.
        return options.timestamp() + ' [' + options.level.toUpperCase() + '] ' + (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
      }
    }),
    new (log.transports.File)({
      filename: 'fitjunction.log',
      maxsize: 5242880, //5MB
      maxFiles: 5,
      json: false,
      level: 'debug',
      timestamp: function() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
      },
      formatter: function(options) {
        // Return string will be passed to logger.
        return options.timestamp() + ' [' + options.level.toUpperCase() + '] ' + (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
      }
    })
  ],
  exitOnError: false
});
var fs = require('fs');
var moment = require('moment');
var cron = require('node-cron');
var config = require('./config.js');
var fitbitConnector = require('./fitbitconnector.js');
var dataProcessor = require('./dataprocessor.js');
var mysql = require('./mysql.js');
var completeness;

log.verbose('fitjunction initialized');

fitbitConnector.connect();

var stdin = process.stdin;
// without this, we would only get streams once enter is pressed
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function(key) {
  // "q", "Q", "ctrl-c"
  if (key === '\u0071' || key === '\u0051' || key === '\u0003') {
    dataProcessor.setQuitFlag();
    setTimeout(dataProcessor.retrieveData, 100);  
  }
  // "r", "R"
  else if (key === '\u0072' || key === '\u0052') {
    dataProcessor.retrieveData();
  }
});

// run once at start and then every x minutes
setTimeout(dataProcessor.retrieveData,100); // waiting a bit for the initial tokenRefresh to finish
cron.schedule('*/' + config.REQUEST_FREQUENCY + ' * * * *', function(){
  dataProcessor.retrieveData();
});
