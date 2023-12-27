#!/usr/bin/env node
const commander = require('commander');
const log = require('@pvjs/pv-log');
const pkg = require('../package.json');
const exec = require('@pvjs/pv-exec');
const fse = require('fs-extra');
const path = require('path');
const shellCommand = require('./shell');

function command() {
  const program = new commander.Command();

  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command>[options]')
    .description('一站式命令行工具')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')
    .option('-e, --env <envName>', '获取环境变量名称');

  program.on('option:debug', function () {
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
    log.verbose('option:debug', process.env.LOG_LEVEL);
  });

  // 注册命令
  // <>必传 []非必传
  // const clone = program.command("clone <source> [destination]");
  // clone
  //   .description("clone a registry")
  //   .option("-f, --force", "是否强制克隆")
  //   .action((source, destination, cmdObj) => {
  //     console.log("do clone", source, destination, cmdObj);
  //   });

  // 注册初始化项目命令
  program.on('option:targetPath', (args) => {
    process.env.CLI_TAREGT_PATH = args;
  });
  const init = program.command('init [componentName]');
  init
    .description('初始化项目')
    .option('--force, -f', '如果项目存在是否强制初始化')
    .option('--dir, -d <dirName>', '目录名称')
    .action(exec);

  // 清除项目模版缓存
  const cleanCache = program.command('clean');
  cleanCache
    .description('清除缓存')
    .option('--force, -f', '是否强制清楚缓存')
    .action(async (arg) => {
      // console.log(arg);
      if (arg.F) {
        // 缓存目录
        const { default: userHome } = await import('user-home');
        const storeDir = path.resolve(userHome, '.pv-cli-dev');
        // 执行删除命令
        fse.emptyDirSync(storeDir);
        log.success('清除缓存成功' + storeDir);
      }
    });

  // 创建组件
  const create = program.command('create <componentName> [type]');
  create.description('创建组件').action((name, type) => {
    if (type) {
      // 创建 usc 组件
      log.info('创建组件:', name, '类型:', type);
      return;
    }
    log.info('创建组件:', name);
  });

  // 注册子命令 addCommand
  const service = new commander.Command('service');
  service.description('服务管理');
  program.addCommand(service);
  service
    .command('start [port]')
    .description('start service at some port')
    .action((port) => {
      console.log('do service start', port);
    });
  service
    .command('stop')
    .description('stop service')
    .action(() => {
      console.log('stop service');
    });

  // console.log(
  //   program.debug,
  //   program.envName,
  //   program.opts(),
  //   program.outputHelp()
  // );

  program
    .command('install [name]', 'install package', {
      executableFile: 'node', // 可以调用其他脚手架命令
      isDefault: false, // 默认执行
      hidden: true, // 是否在 -h 中隐藏
    })
    .alias('i');

  // 强制传入参数 cmd
  // program
  //   .arguments('<cmd> [options]')
  //   .description('cmd commanmd', {
  //     cmd: 'command to run',
  //     options: 'options for command'
  //   })
  //   .action((cmd, options) => {
  //     console.log('cmd',cmd, options);
  //   })

  // 定制 help 信息
  // program.helpInformation = () => {
  //     return 'help infomation\n'
  //   }

  // program.on('--help', () => {
  //   console.log('help infomation');
  // })

  // console.log(program._optionValues);
  // if(program.args && process.argv.length < 1) {
  //   program.outputHelp()
  //   console.Log('111');
  // }else{
  // }

  shellCommand(program);

  // 对未知命令监听
  program.on('command:*', (obj) => {
    log.error('未知命令：' + obj[0]);
    const availableCommands = program.commands.map((cmd) => cmd.name());
    log.error('未知命令：' + availableCommands);
    log.notice('可用命令：', availableCommands.join(','));
    program.outputHelp();
  });

  program.parse(process.argv);
}

module.exports = command;
