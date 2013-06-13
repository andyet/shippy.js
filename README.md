#Shippy API Client
### Makes it dead simple to build web apps on the Shippy API. 

- All API functionality becomes a function call.
- Couldn't be any simpler

Just include the script in your HTML
```html
<script src="shippy.js"></script>
```

Then write some JS

```js
// init an instance of the API connection
var api = new Shippy();

// then log in
api.validateToken('your access token', function (err, yourUser) {
    window.me = yourUser;
});

// 'ready' is triggered when you're successfully logged in
api.on('ready', function () {
    // once 'ready' has been triggered 
    // all your normal API functions are available
    // as function calls.

    // for example, we can just fetch our teams
    // and pass it a callback.
    api.getTeams(function (err, myTeams) {
        window.teams = myTeams;
    });
});
```

It uses socket.io under the covers so you get realtime, seemless API access that's as easy as AJAX.

Have fun!

### Docs
You can see all available API methods on the developer docs: https://developer.shippy.io

### shippy.template.js
shippy.js is generated from the provided API specification, spec.json. This
allows automation allows for rapid expansion of the API across many platforms.

To generate shippy.js, run the provided build script, which depends on spec.json
and shippy.template.js.

`node build.js`
