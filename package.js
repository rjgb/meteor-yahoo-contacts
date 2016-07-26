Package.describe({
  name: 'rjgb:yahoo-contacts',
  version: '1.0.2',
  summary: 'Yahoo Contacts package',
  git: '',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.versionsFrom('0.9.0');
  api.addFiles('index.js', 'server');
  api.export('YahooContacts');
});

Npm.depends({
  'underscore': '1.5.2'
});
