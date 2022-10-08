const request = require("@msfe/usu-request");

module.exports = async function () {
  const result = await request({
    url: 'https://cdn.jsdelivr.net/gh/yiyi17/cdn-assets/templates/config.json',
    // url: 'https://raw.githubusercontent.com/yiyi17/cdn-assets/v1.0.0/templates/config.json',
    timeout: 50000
  })

  // console.log(result);
  return result?.data
  // return [
  //   {
  //     name: "react-umi4",
  //     npmName: "@msfe/react-umi4-temp",
  //     version: "0.0.6",
  //     type: "normal",
  //     installCommand: "yarn install",
  //     startCommand: "yarn start",
  //     ignore: ["**/public/*", "**.png"],
  //     tag: ["project"],
  //   },
  //   {
  //     name: "react-vite",
  //     npmName: "@msfe/react-vite-temp",
  //     version: "0.0.6",
  //     installCommand: "yarn install",
  //     startCommand: "yarn start",
  //     ignore: ["**/public/*", "**.png"],
  //     tag: ["project"],
  //   },
  //   {
  //     name: "react-component",
  //     npmName: "@msfe/react-component-temp",
  //     version: "0.0.6",
  //     installCommand: "yarn install",
  //     startCommand: "yarn start",
  //     ignore: ["**.png"],
  //     tag: ["component"],
  //   },
  // ];
};
