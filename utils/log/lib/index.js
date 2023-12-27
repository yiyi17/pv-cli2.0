'use strict';
const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
log.heading = 'pv';
log.addLevel('success', 2000, { fg: 'green', bold: true });

module.exports = log;
