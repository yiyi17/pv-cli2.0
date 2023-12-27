# pv 命令行工具

命令行工具 pv，支持快速初始化项目、组件库，支持环境监测、node 版本监测

## 安装

```js
sudo npm i @pvjs/pv-cli -g

```

## 使用

```bash
# 初始化项目，如果强制更新本地的代码需要加上 -f
pv init -f

# 清除缓存
pv clean -f
```

## 检测项目中 table 的 columns 的自定义 render

## 安装开发依赖

```bash
npm install @pvjs/pv-cli --save-dev
```

## 接入

1、在 `jocker.yml` 中增加如下配置

```bash
post_build:
  scripts:
    - git config --global --add safe.directory '*' && git config --system --add safe.directory '*' && pnpm run na-report
```

2、app 下 的 scripts

```js
 "na-report": "pv na-report",
```

3、如果是 monorepo 项目，根目录 package.json 下面

```json
"na-report": "turbo run na-report",
```

4、在 turbo.json增加

```json
 "pipeline": {
    "na-report": {
      "cache": false
    },
 }
```
