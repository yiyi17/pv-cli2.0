'use strict';
const Pakage = require('@msfe/usu-package')
const log = require('@msfe/usu-log')
const path = require('path')
const {exec: spawn} = require('@msfe/usu-utils')

module.exports = exec;

const SETTINGS = {
    // init: '@msfe/usu-init'
    init: '@msfe/usu-init'
}
const CACHE_DIR = 'dependencies'

/**
 * @descriptin 动态加载 npm 包
 */
async function exec() {
    let targetPath = process.env.CLI_TAREGT_PATH
    const homePath = process.env.CLI_HOME_PATH
    log.verbose('usuExec homePath targetPath',homePath,targetPath);
    const cmdObj = arguments[arguments.length - 1]
    const cmdName = cmdObj.name( )
    log.verbose('cmdName',cmdName);
    const packageName = SETTINGS[cmdName]
    const packageVersion = 'latest'
    let storeDir = ''
    let pkg = null

    // 支持本地路径和线上路径
    if(!targetPath) {
        // npm 包
        targetPath = path.resolve(homePath, CACHE_DIR)
        storeDir = path.resolve(targetPath, 'node_modules')
        console.log('!targetPath',targetPath,storeDir);
         pkg = new Pakage({
            targetPath,
            packageName,
            packageVersion,
            storeDir
        })
        if(await pkg.exists()) {
           console.log('更新xx');
           await pkg.update()
        }else{
         await pkg.install()
        }
    }else{
        // 本地包
         pkg = new Pakage({
            targetPath,
            packageName,
            packageVersion,
        })
    }
    const rootFile = await pkg.getRootFilePath()
    log.verbose('rootFile',rootFile)
    if(rootFile) {
        try {
            const args = Array.from(arguments)
            const cmd = args[args.length - 1]
            const o = Object.create(null)
            Object.keys(cmd).forEach(key => {
                if(cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
                    o[key] = cmd[key]
                }
            })
            args[args.length - 1] = o
            const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
            // require(rootFile).call(null, Array.from(arguments))
            const child = spawn('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit'
            })
            child.on('error', e=> {
                log.error(e,e.message)
                process.exit(1)
            })
            child.on('exit', e => {
                log.verbose('执行完成：' + e)
            })

        } catch (error) {
            log.error(error)
        }
        // node 子进程执行
    }
   
    // TODO
}


