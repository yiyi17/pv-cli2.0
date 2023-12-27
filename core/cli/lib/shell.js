const commander = require('commander');
const shell = require('shelljs');
const { generateColumns, generatePackageDocs } = require('./utils');
const getNaReport = require('./na-report');

function shellCommand(program) {
  // 注册shell的子命令
  const Shell = new commander.Command('shell');
  Shell.description('常用的shell命令');
  program.addCommand(Shell);
  // ls命令,可实现：pv ls -a或pv ls -al或pv ls -a -l等
  Shell.command('ls')
    .description('查看文件列表')
    .option('-a', '列举该目录全部文件')
    .option('-d', '只列出目录')
    .option(
      '-l',
      '以长格式显示文件和目录信息，包括权限、所有者、大小、创建时间',
    )
    .option('-r', '倒序显示文件和目录')
    .option('-t', '将按照修改时间排序，最新的文件在最前面')
    .option('-A', '同 -a ，但不列出 "." (目前目录) 及 ".." (父目录)')
    .option(
      '-F',
      '在列出的文件名称后加一符号；例如可执行档则加 "*", 目录则加 "/"',
    )
    .option('-R', '递归显示目录中的所有文件和子目录')
    .action((options) => {
      let command = 'ls';
      if (Object.keys(options).length) {
        const optionKeys = Object.keys(options);
        command = optionKeys.reduce((prev, curr) => {
          return prev + ` -${curr}`;
        }, 'ls');
      }
      try {
        shell.exec(command);
      } catch (e) {
        console.log(e);
      }
    });

  // ps命令
  Shell.command('ps [port]')
    .description('查看进程使用')
    .option('-a', '与任何用户标识和终端相关的进程')
    .option('-e', '所有进程（包括守护进程）')
    .option('-p', '与指定PID相关的进程')
    .option('-ef', '显示所有用户进程，完整输出')
    .action((port, options) => {
      let command = 'ps';
      if (Object.keys(options).length) {
        const optionKeys = Object.keys(options);
        command = optionKeys.reduce((prev, curr) => {
          return prev + ` -${curr}`;
        }, 'ps');
      }
      if (port) {
        command += port;
      }
      try {
        shell.exec(command);
      } catch (e) {
        console.log(e);
      }
    });

  // kill命令
  Shell.command('kill [port]')
    .description('终止进程')
    .option('-l', '列出所有信号名称')
    .option('-9', '无条件终止进程')
    .action((port, options) => {
      let command = 'kill';
      if (Object.keys(options).length) {
        const optionKeys = Object.keys(options);
        command = optionKeys.reduce((prev, curr) => {
          return prev + ` -${curr} `;
        }, 'kill');
      }
      if (port) {
        command += port;
      }
      try {
        shell.exec(command);
      } catch (e) {
        console.log(e);
      }
    });

  // lsof命令
  Shell.command('lsof')
    .description('获取网络信息')
    .option('-p [pid]', '列出指定进程号所打开的文件')
    .option('-i <condition>', '列出符合条件的进程（协议、:端口、 @ip ）')
    .option('-h', '获取帮助')
    .action((options) => {
      let command = 'lsof';
      if (Object.keys(options).length) {
        const optionKeys = Object.entries(options);
        command = optionKeys.reduce((prev, curr) => {
          return prev + ` -${curr[0]}` + ` ${curr[1]} `;
        }, 'lsof');
      }
      try {
        shell.exec(command);
      } catch (e) {
        console.log(e);
      }
    });

  // pnpm命令
  program
    .command('run <cmd>')
    .description('pnpm的执行命令')
    .option('--filter <appName>', '指定哪一个应用执行该命令')
    .action((cmd, options) => {
      let command = 'pnpm run ' + cmd;
      if (options.filter) {
        const appName = options.filter;
        command += ' --filter=' + appName;
      }
      try {
        shell.exec(command);
      } catch (e) {
        console.log(e);
      }
    });

  // 快速清除node_modules命令
  program
    .command('clear')
    .description('快速清除node_modules')
    .action(async () => {
      try {
        import('npkill');
      } catch (e) {
        console.log(e);
      }
    });

  // 快速创建columns命令
  program
    .command('col [dataIndex]')
    .description('快速创建columns,默认生成文件的形式，可选复制到剪贴板')
    .option('-n,-N,<number>', '生成长度为number的columns数组')
    .option('-C,-c', '生成的columns复制到剪贴板')
    .action(async (cmd, options) => {
      try {
        await generateColumns({ cmd, options });
      } catch (e) {
        console.log(e);
      }
    });

  // 快速搭建package文档环境
  program
    .command('g docs')
    .description('快速搭建package文档环境')
    .action(async () => {
      try {
        await generatePackageDocs(process.cwd());
      } catch (e) {
        console.log(e);
      }
    });

  // 检查项目中的自定义render
  program
    .command('na-report')
    .description('检查项目中的自定义render, 需要在项目根目录下执行')
    .action(async () => {
      try {
        // 传入绝对路径
        await getNaReport(process.cwd());
      } catch (e) {
        console.log(e);
      }
    });
}

module.exports = shellCommand;
