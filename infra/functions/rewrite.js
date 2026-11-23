// Runs on every request before CloudFront looks at its cache (infra/site.tf). A private S3 origin
// only serves index.html at the root, so directory paths (/about/) get it added here. Paths without
// a trailing slash or a file extension redirect to have one, as the site's links do
// (trailingSlash: 'always'), and www redirects to the bare domain. CloudFront Functions run
// cloudfront-js-2.0, a restricted ES5.1-plus runtime: no modules, no fetch.
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var uri = request.uri;

  if (host.indexOf('www.') === 0) {
    return redirect('https://' + host.slice(4) + uri + queryString(request.querystring));
  }

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  var lastSegment = uri.slice(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    return redirect(uri + '/' + queryString(request.querystring));
  }

  return request;
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}

// CloudFront hands the query string over parsed; this puts it back together
function queryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var param = querystring[key];
    var values = param.multiValue ? param.multiValue : [param];
    for (var i = 0; i < values.length; i++) {
      parts.push(values[i].value === '' ? key : key + '=' + values[i].value);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}
