//
//  dictionary.js
//  MyApps
//
//  Created by Victor Schipilow on 11/4/2025.
//

"use strict";

const columns = [ { name : "Word", subscript : 0 } ];

function submitSql () {
    const word = window.document.getElementById("word").value;
    const sql = createSql(word);
    const body = JSON.stringify({ sql, columns });
    if (window.navigator.userAgent.includes('(Macintosh;')) {
        fetch('dictionary', { method: "POST", body } )
        .then(x => x.text())
        .then(y => receiveFromNative(y));
    } else {
        window.webkit.messageHandlers.Dictionary.postMessage({ sql, columns });
        receiveFromNative('message sent');
    }
}

function receiveFromNative(output) {
    const j = JSON.parse(output);
    const results = [];
    for (let row of j.rows) {
        results.push(row.Word); 
    }
    const start = '<tr><td>';
    const end = '</td></tr>\n';
    window.document.getElementById("table").innerHTML = start +
        results.join(end + start) + end;
}

function createSql(word) {
    return ('SELECT Word FROM Words\nWHERE ' + whereClause(word));
}

function whereClause(word) {
    let i = 0;
    let start = 0;
    let len = 0;
    let subString = '';
    let where = 'LENGTH(Word) = ' + word.length;

    for (let x of word.toLowerCase().split('')) {
        i++;
        if ('a' <= x && x <= 'z') {
            if (start == 0) {
                start = i;
                len = 1;
                subString = x;
            } else {
                len++;
                subString = subString + x;
            }
        } else {
            finishSubString();
        }
    }
    finishSubString();
    return where;

    function finishSubString () {
        if (start > 0) {
            where = where + ' AND\nSUBSTR(Word, ' + start + ', ' + len + ") = '" + subString + "'";
            start = 0;
        }
    }
}

