'use strict';
const axios = require('axios');

const BASE_URL = process.env.BASE_URL ? ess.env.BASE_URL : '';

const request = axios.create({
  baseUrl: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  (response) => {
    // console.log(response.data.version);
    if (response.status === 200) {
      return response.data;
    }
  },
  (error) => Promise.reject(error),
);
module.exports = request;
