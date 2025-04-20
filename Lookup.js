//
//  Lookup.js
//  MyApps
//
//  Created by Victor Schipilow on 18/4/2025.
//
"use strict";

let inputFields;

function onload() {
    inputFields = { surname: '', firstName: '', middleName: '', spouse: '',
        flatNo: '', streetNo: '', streetName: '', town: '', state: '' };
    window.document.getElementById('inputDiv').innerHTML = generateInput();
}

function generateInput() {
    return `
    <input type="text" id="surname" placeholder="Surname" value="${inputFields.surname}"><br><br>
    <input type="text" id="firstName" placeholder="First Name" value="${inputFields.firstName}"><br><br>
    <input type="text" id="middleName" placeholder="Middle Name" value="${inputFields.middleName}"><br><br>
    <input type="text" id="spouse" placeholder="Spouse" value="${inputFields.spouse}"><br><br>
    <input type="text" id="flatNo" placeholder="Flat" value="${inputFields.flatNo}"><br><br>
    <input type="text" id="streetNo" placeholder="House Number" value="${inputFields.streetNo}"><br><br>
    <input type="text" id="streetName" placeholder="Street" value="${inputFields.streetName}"><br><br>
    <input type="text" id="town" placeholder="Town" value="${inputFields.town}"><br><br>
    <select id="state">
        <option value=""${ inputFields.state == '' ? ' selected' : ''}>All States</option>
        <option value="NSW"${ inputFields.state == 'NSW' ? ' selected' : ''}>N.S.W.</option>
        <option value="VIC"${ inputFields.state == 'VIC' ? ' selected' : ''}>VIC</option>
        <option value="QLD"${ inputFields.state == 'QLD' ? ' selected' : ''}>QLD</option>
        <option value="WA"${ inputFields.state == 'WA' ? ' selected' : ''}>W.A.</option>
        <option value="SA"${ inputFields.state == 'SA' ? ' selected' : ''}>S.A.</option>
        <option value="TAS"${ inputFields.state == 'TAS' ? ' selected' : ''}>TAS</option>
        <option value="ACT"${ inputFields.state == 'ACT' ? ' selected' : ''}>A.C.T.</option>
        <option value="NT"${ inputFields.state == 'NT' ? ' selected' : ''}>N.T.</option>
    </select>
    `;
}

function lookup() {
    for (let x in inputFields) {
        const y = window.document.getElementById(x).value;
        inputFields[x] = (y) ? y.trim() : '';
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
    window.document.getElementById('inputDiv').innerHTML = generateInput();
    window.document.getElementById('outputDiv').innerHTML = '';
}

function receiveFromNative(output) {
    window.document.getElementById('inputDiv').innerHTML = '';
    const j = JSON.parse(output);
    const results = ['<a href="javascript:back();">^</a>','<table>'];
    const start = (window.navigator.userAgent.includes('(Macintosh;'))
    ? ['<tr><td class="swiftUIodd" style="font-size: 1em;">',
       '<tr><td class="swiftUIeven" style="font-size: 1em;">',
       '<tr><td class="swiftUIheader" style="font-size: 1em;">']
    : ['<tr><td class="swiftUIodd" style="">',
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
                i = 0;
                break;
            default:
                i = 1 - i;
                break;
        }
        results.push(start[i] + row.Lookup.replace(/ /g, '&nbsp;') + end);
    }
    results.push('</table>');
    window.document.getElementById("outputDiv").innerHTML = results.join('');
}

function whereStatement() {
    const whereClause = [];
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
    return inputFields[name].toUpperCase().replace(/\*/g, '%');
}

function createSql() {
    const space = ''.padStart(100, ' ');
    const where = whereStatement();
    const spouse = getInput('spouse');
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
              [State] || ' ' || Locality || ' ' || StreetName ||
              SUBSTR(' 000000', 1, 7 - LENGTH(StreetNo)) || StreetNo || ' ' || Property ||
              SUBSTR(' 000000', 1, 7 - LENGTH(FlatNo)) || FlatNo AS Sort2,
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
            SUBSTR(a.Space, 1, b.MaxAddressLen + 1 - LENGTH(a.[Address])) AS 'Lookup'
       FROM Uline AS a
       JOIN MaxLens AS b
      ORDER BY a.Sort1, a.Sort2
    `];
    if (spouse == '') {
        return [sql[0], sql[2], sql[4], sql[5]].join(' ');
    }
    return [sql[0], sql[1], sql[2], sql[3], sql[5]].join(' ');
}
