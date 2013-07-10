(function () {

    // Utils and references
    var root = this,
        slice = Array.prototype.slice,
        isFunc = function (obj) {
            return Object.prototype.toString.call(obj) == '[object Function]';
        },
        extend = function (obj1, obj2) {
            for (var i in obj2) obj1[i] = obj2[i];
        };

    // Conditionally import socket.io-client or just use global if present
    root.io || (root.io = require('socket.io-client'));

{{{emitter}}}

    // Main export
    var Shippy = function (config) {
        var self = this,
            opts = this.config = {
                url: 'https://api.andbang.com:443',
                transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'],
                reconnectAttempts: 20,
                autoConnect: true,
                autoSubscribe: true
            };

        // use our config settings
        extend(opts, config);

        // extend with emitter
        WildEmitter.call(this);

        // if tokens are passed in, connect right away
        if (opts.token && opts.autoConnect) this.validateToken(opts.token);
    };

    // inherit from emitter
    Shippy.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: Shippy,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });

    // validate a token
    Shippy.prototype.validateToken = function (token, optionalCallback) {
        var self = this,
            currentArgs = arguments,
            cb = optionalCallback || function () {};
        if (this.connected) {
            this.socket.emit('validateSession', token, function (err, user) {
                if (user) {
                    // autosubscribe
                    if (self.config.autoSubscribe) self.socket.emit('subscribeTeams');
                    self.emit('ready', user);
                    cb(null, true);
                } else {
                    self.emit('loginFailed');
                    cb('Could not log in with token');
                }
            });
        } else {
            // if not connected, connect first, then validate
            this.connect(function () {
                self.validateToken.apply(self, currentArgs);
            });
        }
    };

    // connect function
    Shippy.prototype.connect = function (cb) {
        var self = this,
            apiEvents = [
                {{{events}}}
            ],
            i = 0,
            l = apiEvents.length;

        // set up our socket.io connection
        this.socket = root.io.connect(this.config.url, {
            'max reconnection attempts': this.config.reconnectAttempts,
            'transports': this.config.transports,
            'force new connection': true
        });

        // emit connect event and call callback if passed in
        this.socket.on('connect', function () {
            self.connected = true;
            self.emit('connected');
            if (cb) cb();
        });

        // emit disconnected set flag
        this.socket.on('disconnect', function () {
            self.connected = false;
            self.emit('disconnected');
        });

        // gracefully, seamlessly handle reconnects
        this.socket.on('reconnect', function () {
            if (self.lastEvent) {
                // we have to to this 'next tick' because otherwise the server doesn't know
                // who we are yet, it's weird.
                setTimeout(function () {
                    self.socket.emit('getEventsSinceId', self.lastEvent, function (err, res) {
                        var parsed;

                        // if it's been too long and we don't have any events
                        // emit a staleReconnect and then disconnect from the api.
                        if (err) {
                            self.emit('staleReconnect');
                            self.disconnect();
                        } else {
                            res.forEach(function (event) {
                                self.emit(event.channel, event);
                            });
                        }
                    });
                }, 0);
            }
        });

        // emit connection error if it's auth failure.
        // and emit other errors too.
        this.socket.on('error', function (reason) {
            if (reason === 'handshake unauthorized') self.emit('connectFail');
            self.emit('error', reason);
        });

        // passthrough of our events so that the API will emit them directly.
        for (; i < l; i++) {
            this.socket.on(apiEvents[i], function (event) {
                return function (payload) {
                    // tack on last received event for tracking
                    if (payload.eventNumber) self.lastEvent = payload.eventNumber;
                    self.emit(event, payload);
                };
            }(apiEvents[i]));
        }
    };

    // Handles translating multiple arguments into an array of args
    // since socket.io limits us to sending a single object as a payload.
    Shippy.prototype._callApi = function (method, incomingArgs, numArgs, hasOptionalParam) {
        var myArray = slice.call(incomingArgs),
            last = myArray[myArray.length - 1],
            cb = isFunc(last) ? last : null,
            args = cb ? slice.call(myArray, 0, myArray.length - 1) : myArray;

        if (hasOptionalParam && args.length != numArgs) {
            args.push({});
        }

        var wrappedCallback = function (err, data, code) {
            if (!cb) return;
            if (typeof data === 'string') {
                cb(err, JSON.parse(data), code);
            } else {
                cb(err, data, code);
            }
        };

        if (args.length) {
            this.socket.emit(method, args, wrappedCallback);
        } else {
            this.socket.emit(method, wrappedCallback);
        }
    };

    Shippy.prototype.disconnect = function () {
        this.socket.disconnect();
    };

    {{#methods}}
    // {{description}}
    Shippy.prototype.{{methodName}} = function ({{params}}) {
        this._callApi('{{methodName}}', arguments, {{numParams}}, {{hasOptionalParam}});
    };

    {{/methods}}

    // attach to windor or export with commonJS
    if (typeof exports !== 'undefined') {
        module.exports = Shippy;
    } else {
        root.Shippy = Shippy;
    }

}).call(this);
