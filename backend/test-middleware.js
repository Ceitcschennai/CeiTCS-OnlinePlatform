const {protect} = require('./middleware/authMiddleware.js');
const res = {status: function() { console.log('status() called'); return {json: function(x) { console.log('json() called with:', x); return this; }}; }};
const next = function() { console.log('next() called'); };

protect({headers: {}}, res, next).then(function(r) { console.log('Promise resolved:', r); }).catch(function(e) { console.log('Error:', e.message); });