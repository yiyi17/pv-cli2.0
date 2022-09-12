"use strict";
const Command = require("@msfe/usu-command");
const log = require("@msfe/usu-log");
const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const Package = require("@msfe/usu-package");
const path = require("path");
const glob = require("glob");
const ejs = require("ejs");
const { spinnerStart, sleep, execSync } = require("@msfe/usu-utils");

const TYPE_PROEJCT = "project";
const TYPE_COMPONENT = "component";
const getProjectTemplate = require("./getProjectTemplate");

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_COMMAND = ["npm", "yarn"];

class InitCommand extends Command {
  // constructor(argv) {
  //     super(argv)
  //     this.template = []
  // }
  /**
   * @description 初始化
   */
  init() {
    // console.log(this._cmd);
    this.projectName = this._argv[0] || "";
    this.force = !!this._argv[1].F;
    log.verbose("_argv", this.projectName, this._argv);
    log.verbose("force", this.force);
  }
  /**
   * 
   * @returns 
   * @description 准备阶段
   */
  async prepare() {
    // TODO: 可以 usc 先静态配置
    const template = await getProjectTemplate();
    if (!template || !template.length) {
      throw new Error("项目模版不存在");
    }
    this.template = template;
    const localPath = process.cwd();
    // 1、断目录是否为空
    const isEmpty = this.isDirEmpty(localPath);
    // console.log('isEmpty',isEmpty);
    if (!isEmpty) {
      let ifContinue = false;
      // console.log(this.force);
      if (this.force) {
        const prom = await inquirer.prompt({
          type: "confirm",
          name: "ifContinue",
          default: false,
          message: "当前文件夹不为空，是否继续创建项目",
        });

        ifContinue = prom.ifContinue;
      }
      // console.log(1111,ifContinue);
      if (!ifContinue) return;

      // 2、是否强制更新
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录",
        });
        if (confirmDelete) {
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }

  /**
   * 
   * @returns 
   * @description 获取项目信息
   */
  async getProjectInfo() {
    function isValidateName(v) {
      // 1、首字符必须为英文
      // 2、尾字符必须为英文
      // 3、字 符仅允许 "-_"
      const reg =
        /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;
      return reg.test(v);
    }
    // console.log(inquirer.prompt);
    let projectInfo = {};
    const isProjectNameValidate = isValidateName(this.projectName);
    if (isProjectNameValidate) {
      projectInfo.projectName = this.projectName;
    }

    // console.log(this.projectName, isProjectNameValidate);
    // 1、选择模版
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROEJCT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROEJCT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    log.verbose("选择模版", type);
    
    this.template = this.template.filter(template => template.tag.includes(type))
    
    const title = type === TYPE_PROEJCT ? '项目' : '组件'
    // 项目信息
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
      validate: function (v) {
        const done = this.async();
        setTimeout(() => {
          if (!isValidateName(v)) {
            done(
              "首字符必须为英文，尾字符必须为英文，字符仅允许-_字母和数字"
            );
          }
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };
    const projectPrompt = [
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!semver.valid(v)) {
              done(`请输出合法的${title}版本号`);
            }
            done(null, true);
          }, 0);
        },
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模版`,
        choices: this.createTemplateChoice(),
      },
    ];
    if (!isProjectNameValidate) {
      projectPrompt.unshift(projectNamePrompt);
    }

    if (type === TYPE_PROEJCT) {
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
      const descPrompt =   {
        type: "input",
        name: "componentDes",
        message: "请输入组件描述信息",
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(() => {
            if (!v) {
              done("请输入组件描述信息");
            }
            done(null, true);
          }, 0);
        }
      }

      projectPrompt.push(descPrompt)

      const component = await inquirer.prompt(projectPrompt);

      console.log(component);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }
    projectInfo.name = require("kebab-case")(projectInfo.projectName);
    projectInfo.version = projectInfo.projectVersion;

    if(projectInfo.componentDes) {
      projectInfo.description = projectInfo.componentDes
    }
    // 2、获取项目基本信息
    return projectInfo;
  }

  /**
   * 
   * @param {*} template 
   * @returns 
   * @description 选择项目模版
   */
  createTemplateChoice(template) {
    return this.template.map((item) => {
      return {
        name: item.name,
        value: item.npmName,
      };
    });
  }

  /**
   * @description 执行过程
   */
  async exec() {
    try {
      // 1、准备
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose("projectInfo", projectInfo);
        // 2、下载
        await this.donwloadTemplate(projectInfo);
        // 3、安装
        await this.installTemplate(projectInfo);
      }
    } catch (error) {
      log.error(error);
      if(process.env.LOG_LEVEL === 'verbose') {
          console.log(error)
      }
    }
  }

  /**
   * 
   * @param {*} projectInfo 
   * @description 安装项目模版
   */
  async installTemplate(projectInfo) {
    // console.log(this.templateInfo);
    if (this.templateInfo) {
      // type 是从服务端配置的
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate(projectInfo);
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate(projectInfo);
      } else {
        throw new Error("项目模版类型无法识别");
      }
    } else {
      throw new Error("项目模版不存在");
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   * @description 检查命令是否合法
   */
  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  /**
   * 
   * @param {*} command 
   * @param {*} errMsg 
   * @returns 
   * @description 执行命令
   */
  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(" ");
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error("命令不合法", command);
      }
      const args = cmdArray.slice(1);
      // console.log(cmd, args);
      ret = await execSync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
    if (ret !== 0) {
      throw new Error(errMsg);
    }

    return ret;
  }

  /**
   * 
   * @param {*} projectInfo 
   * @description 普通模版项目创建，初始化
   */
  async installNormalTemplate(projectInfo) {
    const spiner = spinnerStart("正在安装模版...");
    await sleep();
    const targetPath = process.cwd();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      // console.log(this.templateNpm.cacheFilePath);
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (error) {
      throw error;
    } finally {
      spiner.stop(true);
      log.success("模版安装成功");
    }

    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ["node_modules/**", ...templateIgnore];
    await this.ejsRender({ ignore }, projectInfo);

    // 判断 git 是否存在
    if (!fse.existsSync(path.resolve(process.cwd(), ".git"))) {
      execSync("git", ["init"]);
    }

    const { installCommand, startCommand } = this.templateInfo;
    // 安装依赖
    await this.execCommand(installCommand, "依赖安装过程失败！");
    // 项目启动
    await this.execCommand(startCommand, "启动过程过程失败！");
  }

  async installCustomTemplate(projectInfo) {}

  /**
   *
   * @param {*} option
   * @param {*} projectInfo
   * @description ejs 渲染模版，设置项目名称
   */
  async ejsRender(option, projectInfo) {
    const dir = process.cwd();   
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: dir,
          ignore: option.ignore || "",
          nodir: true,
        },
        (err, files) => {
          if (err) {
            throw new Error(err);
          }
          // console.log(files);
          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              // console.log(filePath);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                  // console.log(result);
                  if (err) {
                    reject1(err);
                  }
                  fse.writeFileSync(filePath, result);
                  resolve1(result);
                });
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      );
    });
    // const pkgPath = path.resolve(process.cwd(), 'package.json')
    // // 读内容
    // const pkgContent = fse.readFileSync(pkgPath)
    // const {version} = this.templateInfo
    // let {projectName, projectVersion} = projectInfo
    // log.verbose(projectInfo);
    // const setPkgInfo =  pkgContent.toString()
    //     .replace(`"name": "@msfe/react-umi4-temp"`, `"name": "${require('kebab-case')(projectName)}"`)
    //     .replace(`"version": "${version}"`, `"version": "${projectVersion}"`)
    // fse.writeFileSync(pkgPath, setPkgInfo)
    // 写内容
  }

  /**
   * 
   * @param {*} projectInfo 
   * @description 缓存模版下载与更新
   */
  async donwloadTemplate(projectInfo) {
    // 1、获取项目模版信息
    const { default: userHome } = await import("user-home");
    // console.log(userHome);
    const { projectTemplate } = projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );

    const targetPath = path.resolve(userHome, ".usu-cli-dev", "template");
    const storeDir = path.resolve(userHome, ".usu-cli-dev", "template");

    const { npmName, version } = templateInfo;

    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    // console.log(await templateNpm.exists());
    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载模版...");
      await sleep();
      try {
        await templateNpm.install();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模版成功");
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新模版...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模版成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  /**
   * 
   * @param {*} localPath 
   * @returns 
   * @description 判断是否是空文件夹,除了 .文件和 node_modules
   */
  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter((file) => {
      return !file.startsWith(".") && ["node_modules"].indexOf(file) < 0;
    });
    return !fileList || fileList.length <= 0;
  }
}

/**
 * 
 * @param {*} argv 
 * @returns 
 * @description 初始化 InitCommand，单例模式
 */
function usuInit(argv) {
  // 初始化
  return new InitCommand(argv);
}

module.exports = usuInit;
module.exports.InitCommand = InitCommand;
