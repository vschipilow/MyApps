//
//  dictionary.js
//  MyApps
//
//  Created by Victor Schipilow on 11/4/2025.
//

"use strict";

function submitSql () {
    const word = window.document.getElementById("word").value;
    const sql = createSql(word);
    const body = JSON.stringify({ sql });
    if (window.navigator.userAgent.includes('(Macintosh;')) {
        fetch('Words', { method: "POST", body } )
        .then(x => x.text())
        .then(y => receiveFromNative(y));
    } else {
        window.webkit.messageHandlers.Words.postMessage({ sql });
    }
}

function receiveFromNative(output) {
    const j = JSON.parse(output);
    const results = [];
    for (let row of j.rows) {
        results.push(row.word);
    }
    const start = '<tr><td>';
    const end = '</td></tr>\n';
    window.document.getElementById("table").innerHTML = start +
        results.join(end + start) + end;
}

function createSql(word) {
    return ('SELECT word FROM Words\nWHERE ' + whereClause(word));
}

function whereClause(word) {
    let i = 0;
    let start = 0;
    let len = 0;
    let subString = '';
    let where = 'LENGTH(word) = ' + word.length;

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
            where = where + ' AND\nSUBSTR(word, ' + start + ', ' + len + ") = '" + subString + "'";
            start = 0;
        }
    }
}

