const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const parser = require('@babel/parser');
const { default: traverse } = require('@babel/traverse');
const crypto = require('crypto');
const request = require('request');
const progress = require('cli-progress');
const { SERVER_URL } = require('./const');

// 进度条配置
const bar = new progress.SingleBar({
  format:
    '正在从文件中采集自定义render: {bar} {percentage}% | {value}/{total} | {duration_formatted}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
});
// 需要检查的文件类型
const checkFileType = ['.js', '.jsx', '.ts', '.tsx'];
// 需要排除的文件夹
const expectDir = ['.umi', 'assets', 'service', 'node_modules', 'scripts'];

// 判断是否为自定义render
const isCustomRender = (properties) => {
  const dataIndex = properties.findIndex((p) => p.name === 'dataIndex');
  const renderIndex = properties.findIndex((p) => p.name === 'title');
  return dataIndex !== -1 || renderIndex !== -1;
};

// 获取render代码
const getRenderCodeList = async (file, gitUrlInfo, originPath) => {
  const { data: code, path: filePath, name } = file;
  const { ext: type } = path.parse(filePath);
  const renderList = [];
  // 根据文件类型选择解析插件
  const plugins = type.includes('js')
    ? ['jsx', 'decorators']
    : ['typescript', 'jsx', 'decorators-legacy'];
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins,
  });
  // 遍历ast，找到所有的对象
  traverse(ast, {
    ObjectExpression(codePath) {
      const {
        node: { properties },
      } = codePath;
      const propertyList = properties.map((p) => ({
        name: p.key?.name,
        content: code.slice(p.start, p.end),
        startLine: p.loc.start.line,
        path: filePath,
        filename: name,
      }));
      const renderProperty = propertyList.find((p) => p.name === 'render');
      // 如果找到render属性，且该render属性为自定义render，则将其加入renderList
      if (renderProperty && isCustomRender(propertyList)) {
        renderList.push(renderProperty);
      }
    },
  });
  // 如果没有找到render属性，直接返回空数组
  return await Promise.all(
    renderList.length === 0
      ? []
      : renderList.map(async (renderItem) => {
          const gitInfo = await getGitInfo(renderItem, gitUrlInfo, originPath);
          return {
            ...renderItem,
            path: path.relative(originPath, renderItem.path),
            gitInfo,
          };
        }),
  );
};

// 获取src文件夹
const initSrc = (dir) => {
  const srcPathList = [];
  const getSrcPath = (dir) => {
    if (isExpect(dir)) return;
    const stat = fs.statSync(dir);
    // 排除以.开头的文件夹
    if (stat.isDirectory()) {
      const dirs = fs.readdirSync(dir);
      dirs.forEach((value) => {
        // 如果是src文件夹，判断其父级目录是否有package.json
        if (value === 'src') {
          const srcPath = path.join(dir, value);
          const srcPathFather = path.resolve(srcPath, '..');
          const packagePath = path.join(srcPathFather, 'package.json');
          // 如果有package.json，说明该src为项目src，将其加入srcPathList
          if (fs.existsSync(packagePath)) {
            srcPathList.push(srcPath);
          }
        }
        getSrcPath(path.join(dir, value));
      });
    }
  };
  getSrcPath(dir);
  return srcPathList;
};

// 提取package信息
const getPackageInfo = (filePath) => {
  const packageInfo = require(filePath);
  return {
    name: packageInfo.name,
    path: filePath,
    ...packageInfo,
  };
};
const filterFile = (filePath) => {
  const fileType = path.parse(filePath).ext;
  return checkFileType.includes(fileType);
};

// 判断是否为需要排除的文件夹
const isExpect = (dir) => {
  let isExpectDir = false;
  expectDir.forEach((value) => {
    if (dir.includes(value)) isExpectDir = true;
  });
  return isExpectDir;
};

// 获取文件列表
const initFiles = (dir, srcPath) => {
  const fileList = [];
  const getFiles = (dir, srcPath) => {
    const stat = fs.statSync(dir);
    const relativePath = path.relative(srcPath, dir);
    // 如果是需要排除的文件夹，直接返回
    if (isExpect(relativePath)) return;
    // 如果是文件夹，递归遍历
    if (stat.isDirectory()) {
      const dirs = fs.readdirSync(dir);
      dirs.forEach((value) => {
        getFiles(path.join(dir, value), srcPath);
      });
      // 如果是文件，判断是否为需要的文件类型
    } else if (stat.isFile() && filterFile(dir)) {
      const data = fs.readFileSync(dir, 'utf8');
      const dirInfo = path.parse(dir);
      fileList.push({ name: dirInfo.base, path: dir, data });
    }
  };
  getFiles(dir, srcPath);
  return fileList;
};

// 获取git仓库地址
const getGitUrlInfo = () => {
  return new Promise((resolve) => {
    exec(`git remote -v`, (err, stdout) => {
      if (err) {
        console.log('获取git信息失败', err);
        resolve('');
        return;
      }
      const gitUrlInfo = stdout?.split('\n')[0]?.split('\t')[1]?.split(' ')[0];
      // 使用正则表达式提取@git之后，.git之前的内容，用以拼接
      const gitUrl = gitUrlInfo
        .match(/@git[\s\S]*.git/)[0]
        .slice(1, -4)
        .replace(':', '/');
      resolve(gitUrl);
    });
  });
};

// 获取fileList中的自定义render代码
const getRenderList = async (fileList, gitUrlInfo, originPath) => {
  bar.start(fileList.length, 0);
  const res = [];
  for (let i = 0; i < fileList.length; i++) {
    const renderCode = await getRenderCodeList(
      fileList[i],
      gitUrlInfo,
      originPath,
    );
    res.push(renderCode);
    bar.update(i + 1);
  }
  bar.stop();
  return res.filter((item) => item.length > 0).flat();
};

// 获取git信息
const getGitInfo = async (fileItem, gitUrlInfo, originPath) => {
  const { path: filePath, startLine, filename } = fileItem;
  const relativePath = path.relative(originPath, filePath);
  let gitInfo = {};

  // 获取文件所在目录
  const fileDir = path.resolve(filePath, '..');

  // 封装一个异步执行 shell 命令的函数
  const executeShellCommand = (command) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  try {
    // 获取commitID
    const cmdStr = `cd ${fileDir} && git blame -L ${startLine},${startLine} ./${filename}`;
    const stdout = await executeShellCommand(cmdStr);
    const gitInfoArr = stdout.split(' ');

    if (Number(gitInfoArr[0]) === 0) {
      console.log(`该文件未提交，路径为: ${filePath}`);
      return {};
    }

    // 解析commitHash
    const stdout2 = await executeShellCommand(
      `cd ${fileDir} && git rev-parse ${gitInfoArr[0]}`,
    );
    const commitHash = stdout2.replace('\n', '');

    // 获取commit信息
    const stdout3 = await executeShellCommand(
      `cd ${fileDir} && git log --pretty=format:%an#%cd ${commitHash.replace(
        '\n',
        '',
      )} -1`,
    );
    const [gitName, gitTime] = stdout3.split('#');
    // 计算文件路径的hash值
    const filePathHash = crypto
      .createHash('sha1')
      .update(relativePath, 'utf-8')
      .digest('hex');
    gitInfo = {
      commitHash,
      gitName,
      gitTime,
      url: `https://${gitUrlInfo}/commit/${commitHash}#${filePathHash}`,
    };
  } catch (error) {
    console.log(error);
  }

  return gitInfo;
};

// 保存报告
const saveReport = async (res) => {
  await request(
    `${SERVER_URL}/api/save_report`,
    {
      method: 'POST',
      json: true,
      body: { data: res },
    },
    (err, _res, { success = false, msg = 'save failed', data = -1 }) => {
      if (err) {
        console.log(msg);
        return;
      }
      if (success) {
        console.log(`${res.app_name} 数据保存成功`);
      } else {
        console.log(msg);
      }
    },
  );
};

// 如果是则返回该mono repo项目的根目录，否则返回dir
const getPathIfMonorepo = (dir) => {
  // 判断为monorepo项目的依据为：上两级目录下存在package.json，且package.json中存在workspaces字段
  try {
    const sourcePath = path.resolve(dir, '../..');
    const packagePath = path.join(sourcePath, 'package.json');
    const packageInfo = getPackageInfo(packagePath);
    if (packageInfo.workspaces) {
      console.log('当前为monorepo项目，路径为: ', sourcePath);
      return sourcePath;
    } else {
      return dir;
    }
  } catch (e) {
    return dir;
  }
};

// 主程序入口
const getNaReport = async (dir) => {
  console.log(
    "'   __  __                         ____                                        __      \n" +
      "'  /\\ \\/\\ \\                       /\\  _`\\                                     /\\ \\__   \n" +
      "'  \\ \\ `\\\\ \\      __              \\ \\ \\L\\ \\      __    _____     ___    _ __  \\ \\ ,_\\  \n" +
      "'   \\ \\ , ` \\   /'__`\\    _______  \\ \\ ,  /    /'__`\\ /\\ '__`\\  / __`\\ /\\`'__\\ \\ \\ \\/  \n" +
      "'    \\ \\ \\`\\ \\ /\\ \\L\\.\\_ /\\______\\  \\ \\ \\\\ \\  /\\  __/ \\ \\ \\L\\ \\/\\ \\L\\ \\\\ \\ \\/   \\ \\ \\_ \n" +
      "'     \\ \\_\\ \\_\\\\ \\__/.\\_\\\\/______/   \\ \\_\\ \\_\\\\ \\____\\ \\ \\ ,__/\\ \\____/ \\ \\_\\    \\ \\__\\\n" +
      "'      \\/_/\\/_/ \\/__/\\/_/             \\/_/\\/ / \\/____/  \\ \\ \\/  \\/___/   \\/_/     \\/__/\n" +
      "'                                                        \\ \\_\\                         \n" +
      "'                                                         \\/_/                         ",
  );
  console.log('正在搜索文件夹，路径为: ', dir);
  // 使用turbo运行脚本，如果该项目为monorepo项目则需要将当前目录往上找到package.json所在目录
  const turboDir = getPathIfMonorepo(dir);
  // 切换工作路径
  process.chdir(turboDir);

  // 搜索src文件夹，路径依然为dir，因为turbo在修改了的app目录下执行
  const srcPathList = initSrc(dir);
  if (srcPathList.length === 0) {
    console.log('未找到src文件夹，请在项目根目录下运行');
    return;
  }

  // 解析gitUrl
  const gitUrlInfo = (await getGitUrlInfo(srcPathList[0])) || '';

  // 根据src文件夹获取package.json内容
  const projectList = srcPathList
    .map((srcPath) => {
      const srcPathFather = path.resolve(srcPath, '..');
      const packagePath = path.join(srcPathFather, 'package.json');
      const packageInfo = getPackageInfo(packagePath);
      return { packageInfo, srcPath };
    })
    .filter((item) => item);

  if (projectList.length === 0) {
    console.log('未找到package.json');
    return;
  }

  // 从src文件夹中获取文件
  const fileList = projectList.map((project) => ({
    app_name: project.packageInfo.name,
    fileList: initFiles(project.srcPath, project.srcPath),
  }));

  // 获取项目名称
  const dirInfo = path.parse(turboDir);

  const res = [];

  // 从每个app中获取自定义render，使用for而不是map是为了getRenderList的执行顺序，使用map则必须使用Promise.all则会导致进度条显示问题
  for (let i = 0; i < fileList.length; i++) {
    const { fileList: fileItem, app_name } = fileList[i];
    console.log(`=======================${app_name}=========================`);
    // 从各个文件中检测自定义render
    const renderList = await getRenderList(fileItem, gitUrlInfo, turboDir);
    res.push({
      app_name,
      project_name: dirInfo.name,
      total_file: fileItem.length,
      total_render: renderList.length,
      render_list: renderList,
    });
  }

  for (const item of res) {
    console.log(`App名称：${item.app_name}
总文件数: ${item.total_file}
使用自定义render个数: ${item.total_render}`);
    // 保存报告(筛选出自定义render个数大于0的项目，防止检测了bff项目也上报了)
    if (item.total_render > 0) {
      await saveReport(item);
    }
  }
};

module.exports = getNaReport;
