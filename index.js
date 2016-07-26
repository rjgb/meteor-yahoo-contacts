/**
 * @todo: recursively send requests until all contacts are fetched
 *
 * @todo: check paging and photos
 *
 * @see https://developer.yahoo.com/social/rest_api_guide/contacts-resource.html
 *
 * To API test requests:
 *
 * @see https://developer.yahoo.com/yql/console/
 *
 * To format JSON nicely:
 *
 * @see http://jsonviewer.stack.hu/
 *
 */
var EventEmitter = Npm.require('events').EventEmitter,
  _ = Npm.require('underscore'),
  qs = Npm.require('querystring'),
  util = Npm.require('util'),
  url = Npm.require('url'),
  https = Npm.require('https'),
  querystring = Npm.require('querystring');

YahooContacts = function (opts) {
  if (typeof opts === 'string') {
    opts = { token: opts };
  }
  if (!opts) {
    opts = {};
  }

  this.contacts = [];
  this.consumerKey = opts.consumerKey ? opts.consumerKey : null;
  this.consumerSecret = opts.consumerSecret ? opts.consumerSecret : null;
  this.token = opts.token ? opts.token : null;
  this.refreshToken = opts.refreshToken ? opts.refreshToken : null;
};

YahooContacts.prototype = {};

util.inherits(YahooContacts, EventEmitter);

YahooContacts.prototype._get = function (params, cb) {
  if (typeof params === 'function') {
    cb = params;
    params = {};
  }

  var req = {
    host: 'social.yahooapis.com',
    port: 443,
    path: this._buildPath(params),
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + this.token
    }
  };

  https.request(req, function (res) {
    var data = '';

    res.on('end', function () {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        var error = new Error('Bad client request status: ' + res.statusCode);
        return cb(error);
      }
      try {
        console.log(data);

        data = JSON.parse(data);
        cb(null, data);
      }
      catch (err) {
        cb(err);
      }
    });

    res.on('data', function (chunk) {
      //console.log(chunk.toString());
      data += chunk;
    });

    res.on('error', function (err) {
      cb(err);
    });

    //res.on('close', onFinish);
  }).on('error', function (err) {
    cb(err);
  }).end();
};

YahooContacts.prototype._getPhotoData = function (params, cb) {
  if (typeof params === 'function') {
    cb = params;
    params = {};
  }

  var indexFirst = params.path.indexOf('//');
  var indexLast = params.path.indexOf('/', indexFirst + 1);

  var req = {
    host: params.path.substr(indexFirst + 1, indexLast),
    port: 443,
    path: this._buildPath(params),
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + this.token
    }
  };

  // console.log(req);

  https.request(req, function (res) {
    var data;
    var dataType = false;
    // var data = new Buffer();

    res.on('end', function () {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        var error = new Error('Bad client request status: ' + res.statusCode);
        return cb(error);
      }
      try {
        // console.log('end: ', data.length);
        cb(null, data);
      }
      catch (err) {
        cb(err);
      }
    });

    res.on('data', function (chunk) {
      // console.log(req.path, " : ", chunk.toString().length, ": ", chunk.length);
      if (dataType) {
        var chunk_buffer = new Buffer(chunk, 'binary');
        // data += chunk;
        data = Buffer.concat([data, chunk_buffer]);
      } else {
        data = new Buffer(chunk, 'binary');
        dataType = true;
        // console.log('start: ');
      }
      // console.log('chunk: ', chunk.length);
    });

    res.on('error', function (err) {
      cb(err);
    });

    //res.on('close', onFinish);
  }).on('error', function (err) {
    cb(err);
  }).end();
};

YahooContacts.prototype.getPhoto = function (path, cb) {
  this._getPhotoData({path: path}, receivedPhotoData);
  function receivedPhotoData(err, data) {
    cb(err, data);
  }
};

YahooContacts.prototype.getContacts = function (cb, contacts) {
  var self = this;

  this._get({ type: 'contacts' }, receivedContacts);
  function receivedContacts(err, data) {
    if (err) return cb(err);

    self._saveContactsFromFeed(data.contacts);

    var next = false;
    /*data.feed.link.forEach(function (link) {
      if (link.rel === 'next') {
        next = true;
        var path = url.parse(link.href).path;
        self._get({ path: path }, receivedContacts);
      }
    });*/
    if (!next) {
      cb(null, self.contacts);
    }
  }
};

YahooContacts.prototype._saveContactsFromFeed = function (contacts) {
  var self = this;
  //console.log(contacts);
  contacts.contact.forEach(function (entry) {
    try {
      var name, email, photoUrl, mimeType;

      entry.fields.forEach(function (field) {
        if (field.type == 'name' && !name) name = field.value.givenName + ' ' + field.value.familyName;
        if (field.type == 'email' && !email) email = field.value;

        if (field.type == 'Image' && !photoUrl) {
          if (field.value.imageUrl) {
            photoUrl = field.value.imageUrl;
            mimeType = 'image/*';
            if (field.value.imageSource == 'google') {
              photoUrl += 'https://us-mg5.mail.yahoo.com/yab-fe/smartcontacts-fe/contact/1/photo?imgUrl=' + photoUrl;
            }
          }
        }
      });

      self.contacts.push({name: name, email: email, photoUrl: photoUrl, mime_type: mimeType});
    }
    catch (e) {
      // property not available...
    }
  });
  // console.log(self.contacts);
  //console.log(self.contacts.length);
};

YahooContacts.prototype._buildPath = function (params) {
  if (params.path) return params.path;

  params = params || {};
  params.type = params.type || 'contacts';
  params.alt = params.alt || 'json';
  params.contact_id = params.contact_id || 'me';
  params['start-at'] = params['start-at'] || 0;
  params['max-results'] = params['max-results'] || 'max';
  params['view'] = params['view'] || 'tinyusercard';

  var query = {
    'format' : params.alt,
    'count': params['max-results'],
    'start': params['start-at'],
    'view': params['view']
  };

  var path = '/v1/user/';
  path += params.contact_id + '/';
  path += params.type;
  path += '?' + qs.stringify(query);

  return path;
};

YahooContacts.prototype.refreshAccessToken = function (refreshToken, cb) {
  if (typeof params === 'function') {
    cb = params;
    params = {};
  }

  var data = {
    client_id: this.consumerKey,
    client_secret: this.consumerSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  };

  var body = qs.stringify(data);

  var opts = {
    host: 'api.login.yahoo.com',
    port: 443,
    path: '/oauth2/get_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length
    }
  };

  var req = https.request(opts, function (res) {
    var data = '';
    res.on('end', function () {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        var error = new Error('Bad client request status: ' + res.statusCode);
        return cb(error);
      }
      try {
        data = JSON.parse(data);
        //console.log(data);
        cb(null, data.access_token);
      }
      catch (err) {
        cb(err);
      }
    });

    res.on('data', function (chunk) {
      //console.log(chunk.toString());
      data += chunk;
    });

    res.on('error', function (err) {
      cb(err);
    });

    //res.on('close', onFinish);
  }).on('error', function (err) {
    cb(err);
  });

  req.write(body);
  req.end();
};
