const DUMIRC_TEMPLATE = `import { defineConfig } from 'dumi';
import fs from 'fs';
import path from 'path';

// 获取指定目录下所有文件夹的第一个字符(字典序)
function getFirstChars(dir: string) {
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((dirent: any) => dirent.isDirectory())
    .map((dirent: any) => dirent.name);
  folders.sort();
  return folders[0];
}

// 使用示例
const firstAppName = getFirstChars('./apps');
const firstPackageName = getFirstChars('./packages');

function getPackageAlias(packagesDirectory: string): Record<string, string> {
  const result = {}
  // 读取packages目录中的子目录
  const files = fs
    .readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((dirent: any) => dirent.isDirectory())
    .map((dirent: any) => dirent.name);
  const noReadmeList: any = []
  // 遍历子目录
  files.forEach((file) => {
    const packageJsonPath = path.join(packagesDirectory, file, 'package.json');
    const readmePath = path.join(packagesDirectory, file, 'README.md');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('存在有包未写 package.json', file);
      return
    };
    if (!fs.existsSync(readmePath)) {
      noReadmeList.push(file)
    };
    const packageJson = fs.readFileSync(packageJsonPath).toString()
    const packageName = JSON.parse(packageJson).name;
    const packagePath = path.join(packagesDirectory, file);
    result[packageName] = '/' + packagePath
  })
  console.log('下列包未写 README.md 文档，请补充', noReadmeList);
  return result
}
const packageRecordsAlias = getPackageAlias('./packages');

export default defineConfig({
  outputPath: 'docs-dist',
  themeConfig: {
    name: 'packages',
    nav: [
      { title: '项目简介', link: \`/apps/\${firstAppName}\` },
      { title: '组件', link: \`/components/\${firstPackageName}\` },
    ],
    prefersColor: {
      default: 'auto',
      switch: true,
    },
    siteToken: {
      headerHeight: 64,
      footerHeight: 300,
      sidebarWidth: 240,
      tocWidth: 176,
      contentMaxWidth: 1474,
      demoInheritSiteTheme: false, // 默认的 demo 主题不会跟随网站主题变化
    },
    apiHeader: false,
    footer: false,
  },
  resolve: {
    atomDirs: [
      { type: 'component', dir: 'packages' },
    ],
    docDirs: ['./']
  },
  autoAlias: true,
  alias: {
    ...packageRecordsAlias,
  },
});
`;
const FATHERRC_TEMPLATE = `import { defineConfig } from 'father';

export default defineConfig({
  // more father config: https://github.com/umijs/father/blob/master/docs/config.md
  esm: { output: 'docs-dist', input: 'packages' },
});
    `;

const README_TEMPLATE = `# _Monorepo Project Name_

这是一个 monorepo 项目，用于管理多个相关子项目。

## 项目结构

在这个 monorepo 项目中，我们使用了以下常见的结构：

- \`apps/\`: 子项目的目录，每个子项目都可以是独立的代码库。你可以根据你的实际需求在这个目录下创建子目录。

- \`apps/subproject-1/\`: 子项目 1 的目录，包含子项目 1 的代码和配置文件。

- \`apps/subproject-2/\`: 子项目 2 的目录，包含子项目 2 的代码和配置文件。

## 项目启动

\`\`\`
pnpm -F app1-webapp dev
\`\`\`

ps: app1-webapp 是 apps/app1-webapp1/package.json 中 name 值

## 添加依赖

\`\`\`bash
# 全局安装
pnpm install typescript -w

# app 项目依赖
pnpm add express -F app1-webapp

# 安装 pacakges 包
pnpm add base-theme@workspace:latest -S  -F app1-webapp

# 查看依赖
pnpm list
\`\`\`

## packages 文档能力

- 本地开发,查看文档

\`\`\`
pnpm run docs
\`\`\`

- 打包

\`\`\`
pnpm run docs:build
\`\`\`

## CI/CD

TODO: 待支持

### 分支

- 线上分支：master
- 测试分支： release

注：relase 永远不要合并 master

### 分支管理：

功能分支：feat-xxx-xx

### MR 管理：

功能开发完成，提测：功能分支「feat-xxx-xx」提交 MR 到 release 功能开发完成，上线：功能分支「feat-xxx-xx」提交 MR 到 master

## 部署

测试环境部署：release 分支构建线上环境构建：master 分支构建`;

const DOCS_FOO_PATH_TEMPLATE = `---
title: Foo（组件名称）
group:
  title: 业务组件
toc: content
---
  
## Foo（组件名称）

这是封装好的按钮组件(这里写组件描述～～～～～～～～～～)

### 引入方式

\`\`\`ts
import { Foo } from '@common/components';
\`\`\`

### 示例

\`\`\`jsx
import { Foo } from '@common/components';
export default () => <Foo title="fooTitle" />;
\`\`\`

`;

const PACKAGE_FOO_PATH_TEMPLATE = `{
"name": "@common/components",
"version": "0.0.1",
"private": true,
"type": "module",
"main": "index.ts"
}
`;
const PACKAGE_FOO_MAIN_TEMPLATE = `
export { default as Foo } from './index.tsx';
`;
const PACKAGE_FOO_CONTENT_TEMPLATE = `
import React, { type FC } from 'react';
const Foo: FC<{ title: string }> = (props) => {
  return <h4>{props.title}</h4>;
};
export default Foo;
`;

const GIT_IGNORE_TEMPLATE = `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
**/node_modules
# roadhog-api-doc ignore
_roadhog-api-doc

# production
/dist
/.vscode

# misc
.DS_Store
npm-debug.log*
yarn-error.log

/coverage
../../.idea
*bak
.vscode

# visual studio code
.history
*.log
functions/*
.temp/**

# umi
.umi
.umi-production

# screenshot
screenshot
.firebase
.eslintcache

# https://github.com/whitecolor/yalc
.yalc
yalc.lock

.idea
.dumi
`;

module.exports = {
  DUMIRC_TEMPLATE,
  FATHERRC_TEMPLATE,
  README_TEMPLATE,
  DOCS_FOO_PATH_TEMPLATE,
  PACKAGE_FOO_PATH_TEMPLATE,
  PACKAGE_FOO_MAIN_TEMPLATE,
  PACKAGE_FOO_CONTENT_TEMPLATE,
  GIT_IGNORE_TEMPLATE,
};
