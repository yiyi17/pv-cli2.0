'use strict';
const utils = require('@msfe/usu-utils');

const log = require('@msfe/usu-log');
const semver = require('semver')
const colors = require('colors/safe')
const path = require('path')

const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./const');
const pkg = require('../package.json');
const command = require('./commander')

let config

async function core(argv) {
    try {
        await prepare()
    } catch (error) {
        log.error(error.message)
        if(process.env.LOG_LEVEL === 'verbose') {
            console.log(e)
        }
    }

    command()
   
}

async function prepare() {
    // 准备阶段
    checkPkgVersion() // 检查版本
    await checkRoot() // 检查root
    checkNodeVersion()// 检查 node
    await checkUserHome() //检查 home
    // checkInputArgs(argv) // 检查参数
    // log.verbose('debug', 'test debug log')
   await checkEnv()// 检查环境变量
   await checkGlobalUpdate()
}

async function checkGlobalUpdate() {
    // 当前版本
    const currenVersion = pkg.version
    const npmName = pkg.name
    // 获取所有版本
    const {getNpmSemverVersion} = require('@msfe/usu-get-npm-info')
    try {
        const lastVersion = await getNpmSemverVersion(npmName,currenVersion,'https://npm.in.zhihu.com')
        if(lastVersion && semver.gt(lastVersion, currenVersion)) {
            log.warn(colors.yellow(`请手动更新 ${npmName}, 当前版本是: ${currenVersion}, 最新版本: ${lastVersion}
            更新命令：npm install -g ${npmName}@${lastVersion}
            `))
        }
    } catch (error) {
        log.warn('usu 版本检查失败');
    }
}

async function checkEnv() {
    const dotenv = require('dotenv')
    const {default:userHome} = await import('user-home')
    const { pathExistsSync } = await import('path-exists');

    const dotEnvPath = path.resolve(userHome, '.env')

    if(pathExistsSync(dotEnvPath)) {
        config = dotenv.config({
            path: dotEnvPath
        })
    }
   await createDefaultConfig()
    log.verbose('环境变量', process.env.CLI_HOME_PATH )
}

async function createDefaultConfig() {
    const {default:userHome} = await import('user-home')
    const cliConfig = {
        home: userHome,
    }
    if(process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
    } else {
        cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome
    return cliConfig
}

function checkPkgVersion() {
    log.notice('cli', pkg.version)
}

function checkNodeVersion() {
    const currenVersion = process.version
    const lowestVersion = LOWEST_NODE_VERSION
    if(!semver.gte(currenVersion, lowestVersion)){
        throw new Error(
            colors.red(`usu 需要安装 v${LOWEST_NODE_VERSION} 以上版本 nodejs`)
        )
    }
}

async function checkRoot() {
    const {default: rootCheck} = await import('root-check')
    rootCheck()
}

async function checkUserHome() {
    const {default:userHome} = await import('user-home')
    const {pathExistsSync} = await import('path-exists')
    if(!userHome || !pathExistsSync(userHome)) {
        throw new Error(colors.red('当前用户主目录不存在'))
    }
}

// function checkInputArgs(argv) {
//     const minimist = require('minimist')
//     const args = minimist(argv)
//     checkArgs(args)
// }
// function checkArgs(args) {
//     if(args.debug) {
//         process.env.LOG_LEVEL = 'verbose'
//     }else{
//         process.env.LOG_LEVEL = 'info'
//     }
//     log.level = process.env.LOG_LEVEL
// }

module.exports = core;
