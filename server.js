
'use strict';

let express = require('express');
let app = express();
app.use(express.static('public'));

// uncomment to enable post/put body parsing
//let bodyParser = require('body-parser');
//app.use(bodyParser.json());


let cows = ['Bessie', 'Belma', 'Bovie', 'Bella', 'Beatrice', 'Max'];

app.get('/cows', (req, res) => {
    res.send(cows);
});

app.post('/cows/:name', (req, res) => {
    let name = req.params.name;
    cows.push(name);
    res.send();
});

app.delete('/cows/:name', (req, res) => {
    let name = req.params.name;
    cows = cows.filter(cow => cow != name);
    res.send();
});


let port = 8000;
app.listen(port, () => console.log('listening on ' + port));
