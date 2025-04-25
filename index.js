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
                // switch(filename) {
                //     case 'stylesheet.css':
                //         res.end(`${data}`.replace(/0.625/, '1'));
                //         break;
                //     default:
                        res.end(data);
                //         break;
                // }
            });
            break;
        case 'POST':
            let body = '';
            req.on('data', (data) => {
                body += data;
            }).on('end', () => {
                const j = JSON.parse(body);
                const db = new sqlite3.Database(filename + '.sqlite');
                const rows = [];
                let rowCount = 0;
                // console.log(j.sql);
                db.each(j.sql, (err, row) => {
                    if (err) return console.log(err);
                    rowCount++;
                    if (rowCount < 1000) {
                        const cols = [];
                        for (let x in row) {
                            cols.push('"' + x + '": "' + row[x] + '"');
                        }
                        rows.push(cols.join(', '));
                    }
                });
                db.close((err) => {
                    if (err) return console.log(err);
                    const rowsString = (rows.length == 0) ? '' : '{ ' + rows.join(' }, { ') + ' }';
                    res.end('{ "rows" : [ ' + rowsString + ' ], "rowsFound" : ' + rowCount +
                            ', "rowsReturned" : ' + rows.length + ' }');
                });
            });
            break;
    }
}).listen(8081);

console.log('http://localhost:8081/Home.html');
