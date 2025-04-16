"use strict";

import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import sqlite3 from '/opt/homebrew/Cellar/node/23.5.0/lib/node_modules/sqlite3/lib/sqlite3.js';

createServer((req, res) => {
    const filename = req.url.substring(1);
    switch (req.method) {
        case 'GET':
            console.log('loading ' + filename);
            readFile(filename, (err, data) => {
                if (err) return console.log(err);
                res.end(data);
            });
            break;
        case 'POST':
            let body = '';
            req.on('data', (data) => {
                body += data;
            }).on('end', () => {
                const j = JSON.parse(body);
                switch (filename) {
                    case 'dictionary':
                        const db = new sqlite3.Database('V9Lib.sqlite');
                        const rows = [];
                        db.each(j.sql, (err, row) => {
                            if (err) return console.log(err);
                            const cols = [];
                            for (let x of j.columns) {
                                cols.push('"' + x.name + '": "' + row[x.name] + '"');
                            }
                            rows.push(cols.join(', '));
                        });
                        db.close((err) => {
                            if (err) return console.log(err);
                            res.end('{ "rows" : [ { ' + rows.join(' }, { ') + ' } ] }');
                        });
                        break;
                    default:
                        console.log('unknown "POST" = ' + filename);
                }
            });
            break;
    }
}).listen(8081);

console.log('http://localhost:8081/Dictionary.html');