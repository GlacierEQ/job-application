'use strict';

module.exports = function failClosed(_request, response) {
  response.statusCode = 503;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({
    status: 'FAIL_CLOSED',
    reason: 'canonical V25 build-time transport did not materialize',
  }));
};
