//
//  Lookup.js
//  MyApps
//
//  Created by Victor Schipilow on 18/4/2025.
//
"use strict";

let p;

function onload() {
    p = { viewState: 1, prevViewState: 0, spinnerHTML: extractHTML('table'),
          searchDiv: { html: "", fields: { surname: "", firstName: "", middleName: "", spouse: "", flatNo: "", 
                                           streetNo: "", streetName: "", town: "", state: "" } },
          resultDiv: { html: "", fields: { orderBy: "Address" } },
          addressDiv: { html: "", fields: {} } 
    };
    extractValues('resultDiv');
    extractValues('addressDiv');
    clearHTML('resultDiv');
    clearHTML('addressDiv');
}

function clearHTML (id) {
    window.document.getElementById(id).innerHTML = '';
}

function clearValue (id) {
    window.document.getElementById(id).value = '';
}

function extractValues(id) {
    for (let x in p[id].fields) {
        p[id].fields[x] = extractValue(x);
    }
    p[id].html = extractHTML(id);
}

function extractValue (id) {
    const x = window.document.getElementById(id);
    if (x) {
        const y = x.value;
        if (y) return y.trim();
    }
    return "";
}

function extractHTML (id) {
    const x = window.document.getElementById(id);
    if (x) return x.innerHTML;
    return "";
}

function resetValues (id) {
    setHTML(id, p[id].html);
    for (let x in p[id].fields) {
        setValue(x, p[id].fields[x]);
    }
}

function setValue (id, value) {
    const x = window.document.getElementById(id);
    if (x) {
        x.value = value;
    }
}

function setHTML (id, html) {
    const x = window.document.getElementById(id);
    if (x) {
        x.innerHTML = html;
    }
}

function lookup(viewState) {
    p.prevViewState = p.viewState;
    p.viewState = viewState;
    switch (viewState) {
        case 1:
            extractValues('searchDiv');
            clearHTML('searchDiv');
            resetValues('resultDiv');
            setHTML('table', p.spinnerHTML);
            p.viewState++;
            break;
        case 2:
            extractValues('resultDiv');
            if (p.prevViewState == 3) {
                clearHTML('addressDiv');
                return;
            }
            setHTML('table', p.spinnerHTML);
            break;
        case 3:
            if (p.prevViewState == 2) {
                extractValues('resultDiv');
                resetValues('addressDiv');
                setHTML('addresses2', extractHTML('addresses'));
                setValue('addresses2', extractValue('addresses'));
                clearHTML('resultDiv');
            }
            setHTML('table2', p.spinnerHTML);
            break;
    }
    const sql = createSql();
    if (window.navigator.userAgent.includes('(Macintosh;')) {
        const body = JSON.stringify({ sql });
        fetch('V9Lib', { method: "POST", body } )
        .then(x => x.text())
        .then(y => receiveFromNative(y));
    } else {
        window.webkit.messageHandlers.V9Lib.postMessage({ sql });
    }
}

function back () {
    p.prevViewState = p.viewState;
    switch(p.viewState) {
        case 2:
            resetValues('searchDiv');
            extractValues('resultDiv');
            clearHTML('resultDiv');
            p.viewState = 1;
            break;
        case 3:
            resetValues('resultDiv');
            clearHTML('addressDiv');
            p.viewState = 2;
            break;
    }
}

function receiveFromNative(output) {
    const j = JSON.parse(output);
    const table = [];
    const addresses = [];
    const start = ['<tr><td class="swiftUIodd">',
                   '<tr><td class="swiftUIeven">',
                   '<tr><td class="swiftUIheader">'];
    const end = '</td></tr>\n';
    let i = 2;
    let rowCount = 0;
    for (let row of j.rows) {
        rowCount++;
        switch (rowCount) {
            case 1:
            case 2:
                break;
            case 3:
                if (p.viewState == 2 && p.prevViewState == 1) {
                    addresses.push({ id: row.AddressId, address: row.Address, sortKey: row.AddressSort });
                }
                i = 0;
                break;
            default:
                if (p.viewState == 2 && p.prevViewState == 1) {
                    const item = addresses.find((value) => {
                        return value.id == row.AddressId;
                    });
                    if (item == undefined) {
                        addresses.push({ id: row.AddressId, address: row.Address, sortKey: row.AddressSort });
                    };
                }
                i = 1 - i;
                break;
        }
        table.push(start[i] + row.Lookup.replace(/ /g, '&nbsp;') + end);
    }
    switch (p.viewState) {
        case 2:
            if (p.prevViewState == 1) {
                const addressOptions = ['<option value=" ">-- select address --</option>'];
                addresses.sort((a, b) => {
                    if (a.sortKey < b.sortKey) return -1;
                    if (a.sortKey > b.sortKey) return +1;
                    return 0;
                });
                for (let x of addresses) {
                    addressOptions.push('<option value="' + x.id + '">' + x.address + '</option>')
                }
                setHTML('addresses', addressOptions.join(''));
            }
            setHTML('table', table.join(''));
            break;
        case 3:
            setHTML('table2', table.join(''));
            break;
    }
}

function whereStatement() {
    const whereClause = [];
    if (p.viewState == 3) {
        return "AddressId = '" + extractValue('addresses2') + "'";
    }
    const spouse = getInput('spouse');
    addToWhere('surname', 'Surname', whereClause);
    addNamesToWhere(whereClause);
    addToWhere('flatNo', 'FlatNo', whereClause);
    addToWhere('streetNo', 'StreetNo', whereClause);
    const streetName = getInput('streetName');
    if (streetName != '') {
        addToWhere('streetName', 'StreetName', whereClause);
    } else if (spouse != '') {
        whereClause.push("StreetName <> 'Silent in or near:'");
    }
    const town = getInput('town');
    if (town != '') {
        addToWhere('town', 'Locality', whereClause);
    } else if (spouse != '') {
        whereClause.push("Locality <> 'NORFOLK ISLAND'");
    }
    addToWhere('state', 'State', whereClause);
    return whereClause.join(' AND ');
}

function addToWhere(htmlName, dbName, whereClause) {
    const value = getInput(htmlName);
    if (value == '') return;
    const comparator = (value.includes('%')) ? 'LIKE' : '=';
    whereClause.push(dbName + ' ' + comparator + " '" + value + "'");
}

function addNamesToWhere(whereClause) {
    const firstName = getInput('firstName');
    const middleName = getInput('middleName');
    if (firstName == '') {
        if (middleName == '') {
            return;
        } else {
            whereClause.push("GivenNames || ' ' LIKE '% " + middleName + " %'");
        }
    } else {
        if (middleName == '') {
            whereClause.push("GivenNames || ' ' LIKE '" + firstName + " %'");
        } else {
            whereClause.push("GivenNames || ' ' LIKE '" + firstName + ' ' + middleName + " %'");
        }
    }
}

function getInput (name) {
    return p.searchDiv.fields[name].toUpperCase().replace(/\*/g, '%');
}

function createSql() {
    const space = ''.padStart(100, ' ');
    const where = whereStatement();
    const spouse = getInput('spouse');
    const orderBy = (p.viewState == 3) ? 'Age' : p.resultDiv.fields.orderBy;
    const sql = [
    // 0 - All
    `WITH
    `,
    // 1 - Spouse
    `Lookup1 AS
     ( SELECT rowid AS Rowid2,
              AddressId
         FROM Lookup2
        WHERE ${where}
     ),
     Lookup3 AS
     ( SELECT rowid AS Rowid2,
              AddressId
         FROM Lookup2
        WHERE GivenNames || ' ' LIKE '${spouse} %' AND
              AddressId IN (SELECT AddressId FROM Lookup1)
     ),
    `,
    // 2 - All
    `Lookup AS
     ( SELECT '3' AS Sort1,
              CASE WHEN '${spouse}' <> '' OR '${orderBy}' = 'Address' THEN
                        [State] || ' ' || Locality || ' ' || StreetName ||
                        SUBSTR(' 000000', 1, 7 - LENGTH(StreetNo)) || StreetNo || ' ' || Property ||
                        SUBSTR(' 000000', 1, 7 - LENGTH(FlatNo)) || FlatNo ||
                        CASE WHEN '${spouse}' <> ''
                                  THEN GivenNames ELSE BirthDate
                        END 
                   WHEN '${orderBy}' = 'Surname' THEN
                        Surname || ' ' || GivenNames
                   WHEN '${orderBy}' = 'GivenNames' THEN
                        GivenNames || ' ' || Surname
                   WHEN '${orderBy}' = 'Age' THEN
                        BirthDate
              END AS Sort2,
              GivenNames,
              Surname,
              Gender,
              FORMAT('%3d', ROUND(SUBSTR(TIMEDIFF('now',
                  CASE SUBSTR(BirthDate, 1, 4)
                       WHEN '----' THEN '1950' ELSE SUBSTR(BirthDate, 1, 4)
                  END || '-' ||
                  CASE SUBSTR(BirthDate, 5, 2)
                       WHEN '--' THEN '01' ELSE SUBSTR(BirthDate, 5, 2)
                  END || '-' ||
                  CASE SUBSTR(BirthDate, 7, 2)
                       WHEN '--' THEN '01' ELSE SUBSTR(BirthDate, 7, 2)
                  END), 3, 3))) AS Age,
              BirthDate,
              CASE FlatNo || Property || StreetNo || StreetName || StreetType
                   WHEN '' THEN ''
                   WHEN 'Silent in or near:' THEN StreetName || ' '
                   ELSE CASE WHEN FlatNo <> '' AND Property <> '' AND StreetNo <> '' 
                                  THEN FlatNo || ' ' || Property || ' ' || StreetNo
                             WHEN FlatNo <> '' AND Property <> '' AND StreetNo =  '' 
                                  THEN FlatNo || ' ' || Property
                             WHEN FlatNo <> '' AND Property =  '' AND StreetNo <> '' 
                                  THEN FlatNo || '/' || StreetNo
                             WHEN FlatNo <> '' AND Property =  '' AND StreetNo =  '' 
                                  THEN FlatNo
                             WHEN FlatNo =  '' AND Property <> '' AND StreetNo <> '' 
                                  THEN Property || ' ' || StreetNo
                             WHEN FlatNo =  '' AND Property <> '' AND StreetNo =  '' 
                                  THEN Property
                             WHEN FlatNo =  '' AND Property =  '' AND StreetNo <> '' 
                                  THEN StreetNo
                             ELSE ''
                        END
                        || ' ' || StreetName ||
                        CASE WHEN StreetType <> '' THEN ' ' || StreetType ELSE ''
                        END || ', '
              END ||
              Locality || ' ' || [State] || ' ' || Postcode AS [Address],
              AddressId,
              [State] || ' ' || Locality || ' ' || StreetName ||
              SUBSTR(' 000000', 1, 7 - LENGTH(StreetNo)) || StreetNo || ' ' || Property ||
              SUBSTR(' 000000', 1, 7 - LENGTH(FlatNo)) || FlatNo AS AddressSort,
              '${space}' AS Space
         FROM Lookup2
    `,
    // 3 - Spouse
    `   WHERE rowid IN 
              ( SELECT Rowid2 
                  FROM Lookup3 
              ) OR
              rowid IN 
              ( SELECT Rowid2 
                  FROM Lookup1    
                 WHERE AddressId IN 
                       ( SELECT AddressId             
                           FROM Lookup3
                       )
              )
    `,
    // 4 - NOT Spouse
    `   WHERE ${where}
    `,
    // 5 - All
    `  UNION
       SELECT '1' AS Sort1,
              ' ' AS Sort2,
              'Given Names' AS GivenNames,
              'Surname' AS Surname,
              'G' AS Gender,
              'Age' AS Age,
              'BirhtDay' AS BirthDate,
              'Address' AS [Address],
              'AddressId' as AddressId,
              'AddressSort' as AddressSort,
              '${space}' AS Space
     ),
     MaxLens AS
     ( SELECT MAX(LENGTH(GivenNames)) AS MaxGivenNamesLen,
              MAX(LENGTH(Surname)) AS MaxSurnameLen,
              MAX(LENGTH([Address])) AS MaxAddressLen,
              '${''.padStart(100, '-')}' AS Hyphens
         FROM Lookup
     ),
     ULine AS
     ( SELECT '2' AS Sort1,
              ' ' AS Sort2,
              SUBSTR(Hyphens, 1, MaxGivenNamesLen) AS GivenNames,
              SUBSTR(Hyphens, 1, MaxSurnameLen) AS Surname,
              '-' AS Gender,
              '---' AS Age,
              '--------' AS BirthDate,
              SUBSTR(Hyphens, 1, MaxAddressLen) AS [Address],
              '' AS AddressId,
              '' AS AddressSort,
              '${space}' AS Space
         FROM MaxLens
       UNION
       SELECT Sort1,
              Sort2,
              GivenNames,
              Surname,
              Gender,
              Age,
              BirthDate,
              [Address],
              AddressId,
              AddressSort,
              Space
         FROM Lookup
     )
     SELECT a.GivenNames ||
            SUBSTR(a.Space, 1, b.MaxGivenNamesLen + 1 - LENGTH(a.GivenNames)) ||
            a.Surname ||
            SUBSTR(a.Space, 1, b.MaxSurnameLen + 1 - LENGTH(a.Surname)) ||
            a.Gender || ' ' ||
            a.Age || ' ' ||
            a.BirthDate || SUBSTR(a.Space, 1, 10 - LENGTH(a.BirthDate)) ||
            a.[Address] ||
            SUBSTR(a.Space, 1, b.MaxAddressLen + 1 - LENGTH(a.[Address])) AS 'Lookup',
            a.[Address],
            a.AddressId,
            a.AddressSort
       FROM Uline AS a
       JOIN MaxLens AS b
      ORDER BY a.Sort1, a.Sort2
    `];
    if (spouse == '') {
        return [sql[0], sql[2], sql[4], sql[5]].join(' ');
    }
    return [sql[0], sql[1], sql[2], sql[3], sql[5]].join(' ');
}
