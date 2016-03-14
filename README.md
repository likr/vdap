vdap
=====

An OPeNDAP client for JavaScript.


Insall
------

```
npm install vdap
```

Usage
-----

```
var vdap = require('vdap');

vdap.loadData(url)
	.then(function(data) {
		// process data
    });

vdap.loadDataset(url)
	.then(function(dataset) {
		// process dataset
	});
```
