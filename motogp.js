//
//  motogp.js
//  MyApps
//
//  Created by Victor Schipilow on 16/4/2025.
//

"use strict";

function onLoad() {
    const sql = createSql();
    if (window.navigator.userAgent.includes('(Macintosh;')) {
        const body = JSON.stringify({ sql });
        fetch('MotoGP', { method: "POST", body } )
        .then(x => x.text())
        .then(y => receiveFromNative(y));
    } else {
        window.webkit.messageHandlers.MotoGP.postMessage({ sql });
        localMessage('message sent');
    }
}

function localMessage (message) {
    const start = '<tr><td>';
    const end = '</td></tr>\n';
    window.document.getElementById("table").innerHTML = start + message + end;
}

function receiveFromNative(output) {
    const j = JSON.parse(output);
    const results = [];
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
        results.push(start[i] + row.MotoGP.replace(/ /g, '&nbsp;') + end);
    }
    window.document.getElementById("table").innerHTML = results.join('');
}

function createSql() {
    const comp = window.document.getElementById("comp").value.split('-');
    window.document.getElementById('heading').innerHTML = comp[0] + ' ' + comp[1];
    const orderBy = window.document.getElementById("orderBy").value;
    return `
        with    
        Moto as 
        (       select  '3' as Sort1,
                        [Number],
                        [First Name],
                        Surname,
                        Country,
                        Constructor,
                        Team,
                        substr(timediff('now', Birthdate), 4, 2) as Age,
                        [Test Rider],
                        '                                                  ' as Space
                from    MotoGP
                where   Comp = '${comp[1]}' AND
                        [Year] = '${comp[0]}'
                union
                select  '1' as Sort1,
                        'No' as [Number],
                        'First Name' as [First Name],
                        'Surname' as Surname,
                        'Country' as Country,
                        'Bike' as Constructor,
                        'Team' as Team,
                        'Age' as Age,
                        'Test Rider' as [Test Rider],
                        '                                                  ' as Space
        ),
        MaxLens as 
        (       select  max(length([First Name])) as MaxFirstNameLen,
                        max(length(Surname)) as MaxSurnameLen,
                        max(length(Country)) as MaxCountryLen,
                        max(length(Constructor)) as MaxConstructorLen,
                        max(length(Team)) as MaxTeamLen
                from    Moto
        ),
        ULine as
        (       select  '2' as Sort1,
                        '--' as [Number],
                        substr(a.Hyphens, 1, b.MaxFirstNameLen) as [First Name],
                        substr(a.Hyphens, 1, b.MaxSurnameLen) as Surname,
                        substr(a.Hyphens, 1, b.MaxCountryLen) as Country,
                        substr(a.Hyphens, 1, b.MaxConstructorLen) as Constructor,
                        substr(a.Hyphens, 1, b.MaxTeamLen) as Team,
                        '---' as Age,
                        '----------' as [Test Rider],
                        '                                                  ' as Space
                from    (       select  '--------------------------------------------------' as Hyphens
                        ) as a  join
                        MaxLens as b
                union
                select  Sort1,
                        [Number],
                        [First Name],
                        Surname,
                        Country,
                        Constructor,
                        Team,
                        Age,
                        [Test Rider],
                        Space
                from    Moto
        )
        
        select  case length(a.[Number]) when 1 then ' ' || a.[Number] else a.[Number] end || ' ' ||
                a.[First Name] ||
                substr(a.Space, 1, b.MaxFirstNameLen + 1 - length(a.[First Name])) ||
                a.Surname ||
                substr(a.Space, 1, b.MaxSurnameLen + 1 - length(a.Surname)) ||
                a.Country ||
                substr(a.Space, 1, b.MaxCountryLen + 1 - length(a.Country)) ||
                a.Constructor ||
                substr(a.Space, 1, b.MaxConstructorLen + 1 - length(a.Constructor)) ||
                a.Team ||
                substr(a.Space, 1, b.MaxTeamLen + 1 - length(a.Team)) ||
                a.Age || substr(a.Space, 1, 4 - length(a.Age)) ||
                a.[Test Rider] || substr(a.Space, 1, 10 - length(a.[Test Rider])) as MotoGP
           from ULine as a join
                MaxLens as b
        order   by Sort1, ${orderBy};
    `;
}
