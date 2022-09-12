'use strict';

function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]'
}

function spinnerStart(str, spinerString ='\/-\\') {
    const Spinner = require('cli-spinner').Spinner
    const spinner = new Spinner(`${str} %s`)
    spinner.setSpinnerString(spinerString)
    spinner.start()
    return spinner
}

const sleep = (time=1000) => new Promise((resolve) => setTimeout(resolve, time))

function exec(command, args, options) {
    const win32 = process.platform === 'win32'
    const cmd = win32 ? 'cmd' : command
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args

    return require('child_process').spawn(cmd, cmdArgs, options || {})
}

function execSync(command, args, options) {
    return new Promise((resolve, reject) => {
        const p = exec(command, args, options)
        p.on('error', e => {
            reject(e)
        })
        p.on('exit', c => {
            resolve(c)
        })
    })
}

module.exports = {
    isObject,
    spinnerStart,
    sleep,
    exec,
    execSync
};