const yargs = require('yargs');
// const { hideBin } = require('yargs/helpers')
const dedent = require('dedent') // 去掉缩进

 function command(argv) {
  // const argv = hideBin(process.argv)
    // const argv = process.argv.slice(2)
    const cli = yargs(argv)
    const context = {
        usuVersion: pkg.version
    }

    cli
        .usage("Usage: $0 [command] <options>") // $0===usu
        .strict() // 不被认识的命令被提示
        .recommendCommands() // 推荐
        .fail((err, msg) => {
            console.log('fail', err);
        })
        .alias('h', 'help') // 别名
        .alias('v', 'version')
        .wrap(cli.terminalWidth()) // 宽度
        .epilogue(dedent`usu 是中台前端的脚手架`)
        .options({
            debug: {
                type: 'boolean',
                describe: 'Bootstrap debug mode',
                alias: 'd'
            }
        })
        .option('registry', {
            type: 'string',
            hidden: false,
            describe: 'Define global registry',
            alias: 'r'
        })
        .group(['debug'], 'Dev Options:')
        .group(['registry'], 'Extra Options:')
        .command('init [name]', 'do init a project', (yargs) => {
            yargs
                .option('name', {
                    type: 'string',
                    describe: 'Name of a project',
                    alias: 'n'
                })
        }, (argv) => {
            console.log('init---',argv);
            //TODO: 下载项目 并且创建项目
            
        })
        .command({
            command: 'list',
            aliases: ['ls', 'la', 'll'],
            describe: 'List local packages',
            builder: (yargs) => { },
            handler: (arg) => {
                console.log(arg);
            }
        })
        .check((argv) => {
            // console.log('check',argv);
            if (!argv._.length) {
                console.log('usu 的参数不能为空');
            }
            return true
        })
        .parse(argv, context);
 }

 module.exports = command
 