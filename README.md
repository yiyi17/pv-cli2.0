# pv-cli2.0
前端脚手架

## 安装

```bash
sudo npm i @msfe/usu-core -g
```

## 私有化部署

1、clone 到本地

2、使用 lerna 进行发布`npx lerna publish`

3、然后安装即可使用

4、如果想要增加项目模版，在这个项目模版下面参考数据格式添加`https://github.com/yiyi17/cdn-assets/blob/main/templates/config.json`

## 本地调试
1、调试 pv [command]

方法1：安装之后，在根目录下面直接执行命令，例如`pv version`

方法2：进入 `core/cli` ,执行 `npm link`，即可得到全局的 `pv` 命令

2、调试 pv init

```bash
pv init --targetPath 项目本地路径/pv-cli2.0/commands/init -f
```

## 贡献

1、命令行，在本仓库添加 MR

2、项目模版，自行维护，但是请确保已发布 npm