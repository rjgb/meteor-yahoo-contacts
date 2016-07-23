Meteor Yahoo Contacts

Based on mrt:google-contacts (can't find repo, search mrt:google-contacts on atmosphere.com)

# Install

    meteor add rjgb:yahoo-contacts

# Usage
  
```javascript
opts =
  email: userEmail
  consumerKey: yahooId
  consumerSecret: yahooSecret
  token: yahooAccessToken
  refreshToken: yahooRefreshToken

ycontacts = new YahooContacts opts

ycontacts.refreshAccessToken opts.refreshToken, (err, accessToken) ->
  if err
    console.log 'ycontact.refreshToken, ', err
    return false
  else
    console.log 'ycontact.access token success!'
    ycontacts.token = accessToken
    ycontacts.getContacts (err, contacts) ->
      // Do what you want to do with contacts
      // console.log(contacts);

    ycontacts.getPhoto contact.photoUrl, (err, binaryData) ->
      // Save binaryData to you DB or file.
```