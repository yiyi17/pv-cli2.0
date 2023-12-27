'use strict';
const { default: axios } = require('axios');
const semver = require('semver');
const log = require('@pvjs/pv-log');

module.exports = {
  getNpmVersions,
  getNpmInfo,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};

/**
 *
 * @param {*} npmName
 * @param {*} registry
 * @returns
 */
async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  // console.log(versions);
  if (versions) {
    versions = versions.sort((a, b) => {
      return semver.gt(b, a) ? 1 : -1;
    });

    return versions[0];
  }
  return null;
}

async function getNpmInfo(npmName, registry) {
  const { default: urlJoin } = await import('url-join');
  if (!npmName) return null;
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (res.status) {
        return res.data;
      } else {
        return null;
      }
    })
    .catch((err) => {
      log.warn('npm 服务请求接口失败');
      return Promise.reject(err);
    });
  // TODO
}

async function getNpmVersions(npmName, registry) {
  try {
    const data = await getNpmInfo(npmName, registry);
    if (data) {
      return Object.keys(data.versions);
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

//TODO: 这个函数可以支持配置私有源
function getDefaultRegistry(isOriginal = true) {
  return isOriginal ?  'https://registry.npmjs.org' : '';
}

function getSemverVersions(baseVersion, versions) {
  // console.log(baseVersion, versions);
  // console.log(
  // semver.gt('0.0.3', `0.0.1`),
  // semver.satisfies('1.0.3', `^1.0.1`),
  // semver.lt('1.2.3', '9.8.7') // true

  // );
  // 需要版本大于 1.0.0
  // console.log(111,versions,baseVersion);
  versions = versions
    .filter((version) => semver.gt(version, baseVersion))
    .sort((a, b) => {
      return semver.gt(b, a) ? 1 : -1;
    });
  // console.log(11111,versions, semver.gt('0.0.3', '0.0.4'))
  if (versions && versions.length > 0) {
    return versions[0];
  }
}

async function getNpmSemverVersion(npmName, baseVersion, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersion = getSemverVersions(baseVersion, versions);
  return newVersion;
}
