'use strict';
const semver = require('semver')
const colors = require('colors')
const log = require('@msfe/usu-log')
const LOWEST_NODE_VERSION = '12.0.0'

class Command {
    constructor(argv) {
        // console.log(Object.prototype.toString.call(argv));
        if(!argv) throw new Error('Command 参数不能为空')
        if(!Array.isArray(argv)) throw new Error('参数必须为数组') 
        if(argv.length < 1) {
            throw new Error('参数列表不能空')
        }
        
        // console.log('command',argv[2]._name);
        this._argv = argv
        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve()
            chain = chain.then(() => this.checkNodeVersion())
            chain = chain.then(() => this.initArgs())
            chain = chain.then(() => this.init())
            chain = chain.then(() => this.exec())
            chain.catch(err => {
                log.error(err.message)
            })
        })
    }

    initArgs() {
        this._cmd = this._argv[this._argv.length - 1]
        this._argv = this._argv.slice(0, this._argv.length - 1)
        // console.log(this.cmd, this._argv);
    }

    checkNodeVersion() {
        const currenVersion = process.version
        const lowestVersion = LOWEST_NODE_VERSION
        if(!semver.gte(currenVersion, lowestVersion)){
            throw new Error(
                colors.red(`usu 需要安装 v${LOWEST_NODE_VERSION} 以上版本 nodejs`)
            )
        }
    }

    init() {
        throw new Error('init 必须实现')
    }

    exec() {
        throw new Error('exec 必须实现')
    }

}

module.exports = Command;

