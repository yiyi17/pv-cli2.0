'use strict';
const { isObject } = require('@pvjs/pv-utils');
const path = require('path');
const formatPath = require('@pvjs/pv-format-path');
const npmInstall = require('npminstall');
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require('@pvjs/pv-get-npm-info');
const log = require('@pvjs/pv-log');
class Pakage {
  constructor(options) {
    if (!options) throw new Error('Package 类的 options 参数不能为空');
    if (!isObject(options)) throw new Error('Package 类的 options 必须是对象');
    log.verbose('Pakage', options);
    // 目标路径
    this.targetPath = options.targetPath;
    // 缓存路径
    this.storeDir = options.storeDir;
    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;
    this.cacheFilePathPrefix = this.packageName.replace(/\//g, '_');
  }

  /**
   * @description 更新
   */
  async update() {
    const { pathExistsSync } = await import('path-exists');

    await this.prepare();
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    if (!pathExistsSync(latestFilePath)) {
      await npmInstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(true),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion,
          },
        ],
      });
    }
    this.packageVersion = latestPackageVersion;
  }

  /**
   * @description 准备
   */
  async prepare() {
    const { pathExistsSync } = await import('path-exists');
    const fse = require('fs-extra');

    if (this.storeDir && !pathExistsSync(this.storeDir)) {
      fse.mkdirsSync(this.storeDir);
    }

    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
    // console.log(this.packageVersion);
  }

  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`,
    );
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`,
    );
  }

  /**
   *
   * @returns
   * @description 判断当前 Package 是否存在
   */
  async exists() {
    const { pathExistsSync } = await import('path-exists');
    // console.log(this.cacheFilePath);
    if (this.storeDir) {
      await this.prepare();
      return pathExistsSync(this.cacheFilePath);
    } else {
      return pathExistsSync(this.targetPath);
    }
  }

  /**
   *
   * @returns
   * @description 下载 npm 包
   */
  async install() {
    await this.prepare();
    return npmInstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(true),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }

  /**
   * @description 获取入口文件路径
   */
  async getRootFilePath() {
    async function _getRootFile(targetPath) {
      const pkgDir = await import('pkg-dir');
      const dir = pkgDir.packageDirectorySync({ cwd: targetPath });
      // console.log('getRootFilePath', this.targetPath, dir);
      if (dir) {
        // 读取package.json
        const pkgFile = require(path.resolve(dir, 'package.json'));
        if (pkgFile && pkgFile.main) {
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return await _getRootFile(this.cacheFilePath);
    } else {
      return await _getRootFile(this.targetPath);
    }
  }
}

module.exports = Pakage;
