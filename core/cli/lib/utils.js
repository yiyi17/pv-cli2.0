const copyPaste = require('copy-paste');
const colors = require('colors/safe');
const shell = require('shelljs');
const {
  DUMIRC_TEMPLATE,
  FATHERRC_TEMPLATE,
  README_TEMPLATE,
  DOCS_FOO_PATH_TEMPLATE,
  PACKAGE_FOO_PATH_TEMPLATE,
  PACKAGE_FOO_MAIN_TEMPLATE,
  PACKAGE_FOO_CONTENT_TEMPLATE,
  GIT_IGNORE_TEMPLATE,
} = require('./template');
const { existsSync, readFileSync, mkdirSync, writeFileSync } = require('fs');

function generateColumns(columnConfig) {
  const { cmd, options } = columnConfig;
  const { N = '0', C = false } = options;
  // 正则匹配出数字
  const regex = /=?(\d+)/;
  const match = N.match(regex);
  let columns = [];
  // 如果有cmd,也就是说传入了对应的key值,优先级大于number
  if (cmd) {
    const dataIndexList = cmd.split(',');
    columns = dataIndexList.map((item) => ({
      title: '',
      dataIndex: item,
      valueType: '',
    }));
  } else if (match && match[1]) {
    const number = match[1];
    for (let i = 0; i < number; i++) {
      const column = { title: '', dataIndex: '', valueType: '' }; // 创建一个新的对象
      columns.push(column); // 将对象添加到数组中
    }
  } else {
    throw new Error(colors.red('number不合法'));
  }
  // 将数组转换为JSON字符串
  const json = JSON.stringify(columns, null, 2);
  // 定义要创建的TS文件名
  const filename = `columns.ts`;
  // 定义要写入TS文件的内容
  const content = `
    import { ZHProColumns } from '@fe/usc-pro';
    const columns: ZHProColumns<string, any>[] = ${json};
  `;

  if (C) {
    copyPaste.copy(content, (err) => {
      if (err) {
        console.error('复制文本到剪贴板时出错：', err);
        return;
      }
      console.log(`columns已成功复制到剪贴板`);
    });
  } else {
    // 创建TS文件并写入内容
    writeFileSync(filename, content, (error) => {
      if (error) {
        console.error('发生错误：', error);
      } else {
        console.log(`已成功创建文件：${filename}`);
      }
    });
  }
}

function generatePackageDocs(cwd) {
  const packageJsonPath = `${cwd}/package.json`;
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const needInstall = checkStatus(packageJson);
  if (needInstall) {
    addDevDeps(packageJson, packageJsonPath, {
      dumi: '^2.2.5',
      'dumi-theme-antd-style': '^0.29.4',
      father: '^4.3.1',
    });
  }
  addScripts(packageJson, packageJsonPath, {
    docs: 'PORT=5050 dumi dev',
    'docs:build': 'father build',
  });
  setFatherrc(cwd);
  setDumirc(cwd);
  addExamplePackages(cwd);
  generateReadme(cwd);
  generateGitIgnore(cwd);
  // 执行pnpm i
  shell.exec('pnpm i', { cwd });
}

// -------------------------------生成器的一系列工具函数-----------------------------------------------
// 设置dumirc
function setDumirc(cwd) {
  const dumircPath = `${cwd}/.dumirc.ts`;
  const dumircTemplate = DUMIRC_TEMPLATE;
  writeFileSync(dumircPath, dumircTemplate, 'utf-8');
  console.log('Write .dumirc.ts');
}
// 设置打包
function setFatherrc(cwd) {
  const fatherrcPath = `${cwd}/.fatherrc.ts`;
  const fatherrcTemplate = FATHERRC_TEMPLATE;
  writeFileSync(fatherrcPath, fatherrcTemplate, 'utf-8');
  console.log('Write fatherrc.ts');
}
// 添加package.json依赖
function addDevDeps(pkg, packageJsonPath, needInstallPkg) {
  pkg.devDependencies = { ...pkg.devDependencies, ...needInstallPkg };
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log('Update package.json');
}
// 判断当前是否存在这个依赖
function hasDeps({ pkg, name }) {
  return pkg.dependencies?.[name] || pkg.devDependencies?.[name];
}
// 判断是否需要下载包
function checkStatus(pkg) {
  let needInstall = true;
  // 有以下依赖时不需要安装 dumi相关配置
  if (
    hasDeps({ pkg, name: 'dumi' }) ||
    hasDeps({ pkg, name: 'dumi-theme-antd-style' }) ||
    hasDeps({ pkg, name: 'father' })
  ) {
    needInstall = false;
  }
  return needInstall;
}
// 修改monorepo项目的README.md
function generateReadme(cwd) {
  const readmePath = `${cwd}/README.md`;
  const readmeTemplate = README_TEMPLATE;

  writeFileSync(readmePath, readmeTemplate, 'utf-8');
  console.log('update README.md');
}
// 增加packages
function addExamplePackages(cwd) {
  const fooExampleDir = `${cwd}/packages/Foo`;
  if (!existsSync(fooExampleDir)) {
    mkdirSync(fooExampleDir);
    console.log('已创建示例包：Foo目录');
  }
  const docsFooPath = `${cwd}/packages/Foo/README.md`;
  const packageFooPath = `${cwd}/packages/Foo/package.json`;
  const packageFooMainPath = `${cwd}/packages/Foo/index.ts`;
  const packageFooContentPath = `${cwd}/packages/Foo/index.tsx`;

  writeFileSync(docsFooPath, DOCS_FOO_PATH_TEMPLATE, 'utf-8');
  writeFileSync(packageFooPath, PACKAGE_FOO_PATH_TEMPLATE, 'utf-8');
  writeFileSync(packageFooMainPath, PACKAGE_FOO_MAIN_TEMPLATE, 'utf-8');
  writeFileSync(packageFooContentPath, PACKAGE_FOO_CONTENT_TEMPLATE, 'utf-8');
}

// 增加脚本命令
function addScripts(pkg, packageJsonPath, needScripts) {
  pkg.scripts = { ...pkg.scripts, ...needScripts };
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log('Update package.json,-----add scripts');
}
// 修改.gitignore
function generateGitIgnore(cwd) {
  const gitIgnorePath = `${cwd}/.gitignore`;

  if (existsSync(gitIgnorePath)) {
    const gitIgnore = readFileSync(gitIgnorePath, 'utf-8');
    const toAppend = '.dumi';
    writeFileSync(gitIgnorePath, `${gitIgnore}\n${toAppend}`);
    console.log('Update .gitignore-----新增了.dumi忽略项');
  } else {
    writeFileSync(gitIgnorePath, GIT_IGNORE_TEMPLATE, 'utf-8');
    console.log('add .gitignore----新增了.gitignore文件');
  }
}
module.exports = {
  generateColumns,
  generatePackageDocs,
};
