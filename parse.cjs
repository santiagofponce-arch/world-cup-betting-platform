const fs = require('fs');

const rawText = `GROUP A
1. Mexico
2. South Africa
3. Korea Republic
4. Czechia

Thursday, June 11, 3 p.m. (Fox): Mexico vs. South Africa, Estadio Azteca (Mexico City)
Thursday, June 11, 10 p.m. (FS1): Korea Republic vs. Czechia, Estadio Akron (Guadalajara, Mexico)
Thursday, June 18, 12 p.m. (Fox): Czechia vs. South Africa, Mercedes-Benz Stadium (Atlanta)
Thursday, June 18, 9 p.m. (Fox): Mexico vs. Korea Republic, Estadio Akron (Guadalajara, Mexico)
Wednesday, June 24, 9 p.m. (Fox): Czechia vs. Mexico, Estadio Azteca (Mexico City)
Wednesday, June 24, 9 p.m. (FS1): South Africa vs. Korea Republic, Estadio BBVA (Monterrey, Mexico)

GROUP B
1. Canada
2. Bosnia and Herzegovina
3. Qatar
4. Switzerland

Friday, June 12, 3 p.m. (Fox): Canada vs. Bosnia and Herzegovina BMO Field (Toronto)
Saturday, June 13, 3 p.m. (Fox): Qatar vs. Switzerland, Levi's Stadium (Santa Clara, California)
Thursday, June 18, 3 p.m. (Fox): Switzerland vs. Bosnia and Herzegovina, SoFi Stadium (Inglewood, California)
Thursday, June 18, 6 p.m. (FS1): Canada vs. Qatar, BC Place (Vancouver)
Wednesday, June 24, 3 p.m. (Fox): Switzerland vs. Canada, BC Place (Vancouver)
Wednesday, June 24, 3 p.m. (FS1): Bosnia and Herzegovina vs. Qatar, Lumen Field (Seattle)

GROUP C
1. Brazil
2. Morocco
3. Haiti
4. Scotland

Saturday, June 13, 6 p.m. (FS1): Brazil vs. Morocco, MetLife Stadium (East Rutherford, New Jersey)
Saturday, June 13, 9 p.m. (FS1): Haiti vs. Scotland, Gillette Stadium (Foxboro, Massachusetts)
Friday, June 19, 6 p.m. (Fox): Scotland vs. Morocco, Gillette Stadium (Foxboro, Massachusetts)
Friday, June 19, 8:30 p.m. (Fox): Brazil vs. Haiti, Lincoln Financial Field (Philadelphia)
Wednesday, June 24, 6 p.m. (Fox): Scotland vs. Brazil, Hard Rock Stadium (Miami)
Wednesday, June 24, 6 p.m. (FS1): Morocco vs. Haiti, Mercedes-Benz Stadium (Atlanta)

GROUP D
1. United States
2. Paraguay
3. Australia
4. Türkiye

Friday, June 12, 9 p.m. (Fox): United States vs. Paraguay, SoFi Stadium (Inglewood, California)
Saturday, June 13, 12 a.m. (FS1): Australia vs. Türkiye, BC Place (Vancouver)
Friday, June 19, 3 p.m. (Fox): United States vs. Australia, Lumen Field (Seattle)
Friday, June 19, 11 p.m. (FS1): Türkiye vs. Paraguay, Levi's Stadium (Santa Clara, California)
Thursday, June 25, 10 p.m. (Fox): Türkiye vs. United States, SoFi Stadium (Inglewood, California)
Thursday, June 25, 10 p.m. (FS1): Paraguay vs. Australia, Levi's Stadium (Santa Clara, California)

GROUP E
1. Germany
2. Curaçao
3. Ivory Coast
4. Ecuador

Sunday, June 14, 1 p.m. (Fox): Germany vs. Curaçao, NRG Stadium (Houston)
Sunday, June 14, 7 p.m. (FS1): Ivory Coast vs. Ecuador, Lincoln Financial Field (Philadelphia)
Saturday, June 20, 4 p.m. (Fox): Germany vs. Ivory Coast, BMO Field (Toronto)
Saturday, June 20, 8 p.m. (FS1): Ecuador vs. Curaçao, Arrowhead Stadium (Kansas City, Missouri)
Thursday, June 25, 4 p.m. (FS1): Curaçao vs. Ivory Coast, Lincoln Financial Field (Philadelphia)
Thursday, June 25, 4 p.m. (Fox): Ecuador vs. Germany, MetLife Stadium (East Rutherford, New Jersey)

GROUP F
1. Netherlands
2. Japan
3. Sweden
4. Tunisia

Sunday, June 14, 4 p.m. (Fox): Netherlands vs. Japan, AT&T Stadium (Arlington, Texas)
Sunday, June 14, 10 p.m. (FS1): Sweden vs. Tunisia, Estadio BBVA (Monterrey, Mexico)
Saturday, June 20, 1 p.m. (Fox): Netherlands vs. Sweden, NRG Stadium (Houston)
Saturday, June 20, 12 a.m. (FS1): Tunisia vs. Japan, Estadio BBVA (Monterrey, Mexico)
Thursday, June 25, 7 p.m. (FS1): Japan vs. Sweden, AT&T Stadium (Arlington, Texas)
Thursday, June 25, 7 p.m. (Fox): Tunisia vs. Netherlands, Arrowhead Stadium (Kansas City, Missouri)

GROUP G
1. Belgium
2. Egypt
3. Iran
4. New Zealand

Monday, June 15, 3 p.m. (Fox): Belgium vs. Egypt, Lumen Field (Seattle)
Monday, June 15, 9 p.m. (FS1): Iran vs. New Zealand, SoFi Stadium (Inglewood, California)
Sunday, June 21, 3 p.m. (FS1): Belgium vs. Iran, SoFi Stadium (Inglewood, California)
Sunday, June 21, 9 p.m. (FS1): New Zealand vs. Egypt, BC Place (Vancouver)
Friday, June 26, 11 p.m. (FS1): Egypt vs. Iran, Lumen Field (Seattle)
Friday, June 26, 11 p.m. (Fox): New Zealand vs. Belgium, BC Place (Vancouver)

GROUP H
1. Spain
2. Cape Verde
3. Saudi Arabia
4. Uruguay

Monday, June 15, 12 p.m. (Fox): Spain vs. Cape Verde, Mercedes-Benz Stadium (Atlanta)
Monday, June 15, 6 p.m. (FS1): Saudi Arabia vs. Uruguay, Hard Rock Stadium (Miami)
Sunday, June 21, 12 p.m. (Fox): Spain vs. Saudi Arabia, Mercedes-Benz Stadium (Atlanta)
Sunday, June 21, 6 p.m. (FS1): Uruguay vs. Cape Verde, Hard Rock Stadium (Miami)
Friday, June 26, 8 p.m. (FS1): Cape Verde vs. Saudi Arabia, NRG Stadium (Houston)
Friday, June 26, 8 p.m. (Fox): Uruguay vs. Spain, Estadio Akron (Guadalajara, Mexico)

GROUP I
1. France
2. Senegal
3. Iraq
4. Norway

Tuesday, June 16, 3 p.m. (Fox): France vs. Senegal, MetLife Stadium (East Rutherford, New Jersey)
Tuesday, June 16, 6 p.m. (Fox): Iraq vs. Norway, Gillette Stadium (Foxborough, Massachusetts)
Monday, June 22, 5 p.m. (Fox): France vs. Iraq, Lincoln Financial Field (Philadelphia)
Monday, June 22, 8 p.m. (Fox): Norway vs. Senegal, MetLife Stadium (East Rutherford, New Jersey)
Friday, June 26, 3 p.m. (Fox): Norway vs. France, Gillette Stadium (Foxborough, Massachusetts)
Friday, June 26, 3 p.m. (FS1): Senegal vs. Iraq, BMO Field (Toronto)

GROUP J
1. Argentina
2. Algeria
3. Austria
4. Jordan

Tuesday, June 16, 9 p.m. (Fox): Argentina vs. Algeria, Arrowhead Stadium (Kansas City, Missouri)
Tuesday, June 16, 12 a.m. (FS1): Austria vs. Jordan, Levi's Stadium (Santa Clara, California)
Monday, June 22, 1 p.m. (Fox): Argentina vs. Austria, AT&T Stadium (Arlington, Texas)
Monday, June 22, 11 p.m. (FS1): Jordan vs. Algeria, Levi's Stadium (Santa Clara, California)
Saturday, June 27, 10 p.m. (Fox): Jordan vs. Argentina, AT&T Stadium (Arlington, Texas)
Saturday, June 27, 10 p.m. (FS1): Algeria vs. Austria, Arrowhead Stadium (Kansas City, Missouri)

GROUP K
1. Portugal
2. DR Congo
3. Uzbekistan
4. Colombia

Friday, June 17, 1 p.m. (Fox): Portugal vs. DR Congo, NRG Stadium (Houston)
Friday, June 17, 10 p.m. (FS1): Uzbekistan vs. Colombia, Estadio Azteca (Mexico City)
Tuesday, June 23, 1 p.m. (Fox): Portugal vs. Uzbekistan, NRG Stadium (Houston)
Tuesday, June 23, 10 p.m. (FS1): Colombia vs. DR Congo, Estadio Akron (Guadalajara, Mexico)
Saturday, June 27, 7:30 p.m. (Fox): Colombia vs. Portugal, Hard Rock Stadium (Miami)
Saturday, June 27, 7:30 p.m. (FS1): DR Congo vs. Uzbekistan, Mercedes-Benz Stadium (Atlanta)

GROUP L
1. England
2. Croatia
3. Ghana
4. Panama

Friday, June 17, 4 p.m. (Fox): England vs. Croatia, AT&T Stadium (Arlington, Texas)
Friday, June 17, 7 p.m. (FS1): Ghana vs. Panama, BMO Field (Toronto)
Tuesday, June 23, 4 p.m. (Fox): England vs. Ghana, Gillette Stadium (Foxborough, Massachusetts)
Tuesday, June 23, 7 p.m. (Fox): Panama vs. Croatia, BMO Field (Toronto)
Saturday, June 27, 5 p.m. (Fox): Panama vs. England, MetLife Stadium (East Rutherford, New Jersey)
Saturday, June 27, 5 p.m. (FS1): Croatia vs. Ghana, Lincoln Financial Field (Philadelphia)

Round of 32
Sunday, June 28, 3 p.m. (Fox): Group A second place vs. Group B second place, SoFi Stadium (Inglewood, California)
Monday, June 29, 1 p.m. (Fox): Group C winner vs. Group F second place, NRG Stadium (Houston)
Monday, June 29, 4:30 p.m. (Fox): Group E winner vs. Group A/B/C/D/F third place, Gillette Stadium (Boston)
Monday, June 29, 9 p.m. (Fox): Group F winner vs. Group C second place, Estadio BBVA (Monterrey, Mexico)
Tuesday, June 30, 1 p.m (Fox): Group E second place vs. Group I second place, AT&T Stadium (Dallas)
Tuesday, June 30, 5 p.m. (Fox): Group I winner vs. Group C/D/F/G/H third place, MetLife Stadium (East Rutherford, New Jersey)
Tuesday, June 30, 9 p.m. (Fox): Group A winner vs. Group C/E/F/H/I third place, Estadio Azteca (Mexico City)
Wednesday, July 1, 12 p.m. (Fox): Group L winner vs. Group E/H/I/J/K third place, Mercedes-Benz Stadium (Atlanta)
Wednesday, July 1, 4 p.m. (FS1): Group G winner vs. Group A/E/H/I/J third place, Lumen Field (Seattle)
Wednesday, July 1, 8 p.m. (Fox): Group D winner vs. Group B/E/F/I/J third place, Levi's Stadium (San Francisco Bay)
Thursday, July 2, 3 p.m. (Fox): Group H winner vs. Group J second place, SoFI Stadium (Inglewood, California)
Thursday, July 2, 7 p.m. (Fox): Group K second place vs. Group L second place, BMO Field (Toronto)
Thursday, July 2, 11 p.m. (FS1): Group B winner vs. Group E/F/G/I/J third place, BC Place (Vancouver)
Friday, July 3, 2 p.m. (Fox): Group D second place vs. Group G second place, AT&T Stadium (Dallas)
Friday, July 3, 6 p.m. (Fox): Group J winner vs. Group H second place, Hard Rock Stadium (Miami)
Friday, July 3, 9:30 p.m. (Fox): Group K winner vs. Group D/E/I/J/L third place, Arrowhead Stadium (Kansas City)

Round of 16
Saturday, July 4, 1 p.m. (Fox): NRG Stadium (Houston)
Saturday, July 4, 5 p.m. (Fox): Lincoln Financial Field (Philadelphia)
Sunday, July 5, 4 p.m. (Fox): MetLife Stadium (New Jersey)
Sunday, July 5, 8 p.m. (Fox): Estadio Azteca (Mexico City)
Monday, July 6, 3 p.m. (Fox): AT&T Stadium (Dallas)
Monday, July 6, 8 p.m. (Fox): Lumen Field (Seattle)
Tuesday, July 7, 12 p.m. (Fox): Mercedes-Benz Stadium (Atlanta)
Tuesday, July 7, 4 p.m. (Fox): BC Place (Vancouver)

Quarterfinals
Thursday, July 9, 4 p.m. (Fox): Gillette Stadium (Boston)
Friday, July 10, 3 p.m. (Fox): SoFi Stadium (Inglewood, California)
Saturday, July 11, 5 p.m. (Fox): Hard Rock Stadium (Miami)
Saturday, July 11, 9 p.m. (Fox): Arrowhead Stadium (Kansas City)

Semifinals
Tuesday, July 14, 3 p.m. (Fox): AT&T Stadium (Dallas)
Wednesday, July 15, 3 p.m. (Fox): Mercedes-Benz Stadium (Atlanta)

Third-place game
Saturday, July 18, 5 p.m. (Fox): Hard Rock Stadium (Miami)

Final
Sunday, July 19, 3 p.m. (Fox): MetLife Stadium (New Jersey)`;

const matches = [];
let currentGroup = null;
let currentStage = 'group';
let matchId = 1;

const lines = rawText.split('\n');
for (let line of lines) {
  line = line.trim();
  if (!line) continue;
  
  if (line.startsWith('GROUP')) {
    currentGroup = line.replace('GROUP ', '').trim();
    currentStage = 'group';
    continue;
  }
  
  if (line.startsWith('Round of 32')) { currentStage = 'Round of 32'; currentGroup = null; continue; }
  if (line.startsWith('Round of 16')) { currentStage = 'Round of 16'; currentGroup = null; continue; }
  if (line.startsWith('Quarterfinals')) { currentStage = 'Quarterfinals'; currentGroup = null; continue; }
  if (line.startsWith('Semifinals')) { currentStage = 'Semifinals'; currentGroup = null; continue; }
  if (line.startsWith('Third-place game')) { currentStage = 'Third-place'; currentGroup = null; continue; }
  if (line.startsWith('Final')) { currentStage = 'Final'; currentGroup = null; continue; }
  
  try {
    const colonSplit = line.split('): ');
    
    // Some lines in Round of 16 onwards don't have teams, just Stadiums
    if (colonSplit.length < 2) continue;
    
    const datePart = colonSplit[0] + ')'; // e.g. Thursday, June 11, 3 p.m. (Fox)
    const rest = colonSplit[1]; // Canada vs. Bosnia and Herzegovina BMO Field (Toronto) or just a stadium
    
    const vsSplit = rest.split(' vs. ');
    let home = 'TBD';
    let away = 'TBD';
    let stadium = rest;
    
    if (vsSplit.length > 1) {
      home = vsSplit[0].trim();
      
      const firstCommaIdx = vsSplit[1].indexOf(', ');
      
      if (firstCommaIdx !== -1) {
        away = vsSplit[1].substring(0, firstCommaIdx).trim();
        stadium = vsSplit[1].substring(firstCommaIdx + 2).trim();
      } else {
        // Find stadium heuristically
        const matchStadiums = ['BMO Field', 'Gillette Stadium', 'SoFi Stadium', 'Lumen Field', 'Mercedes-Benz Stadium'];
        let matchedStadium = '';
        for (const s of matchStadiums) {
          if (vsSplit[1].includes(s)) {
            matchedStadium = s + vsSplit[1].substring(vsSplit[1].indexOf(s) + s.length);
            break;
          }
        }
        if (matchedStadium) {
          away = vsSplit[1].replace(matchedStadium, '').trim();
          stadium = matchedStadium;
        } else {
          away = vsSplit[1].trim();
          stadium = 'TBD';
        }
      }
    }
    
    const dateMatch = datePart.match(/^[a-zA-Z]+,\s+([a-zA-Z]+ \d+),\s+(.*? [a.p]\.?m\.?)/i);
    let dateStr = '';
    let timeStr = '';
    
    if (dateMatch) {
      dateStr = dateMatch[1];
      timeStr = dateMatch[2];
    } else {
      continue;
    }
    
    const tm = timeStr.replace(/\\./g, '').toLowerCase().match(/(\d+)(?::(\d+))?\s*([ap])m/);
    let dateOb = new Date(dateStr + ', 2026 00:00:00');
    
    if (tm) {
      let hour = parseInt(tm[1]);
      const min = parseInt(tm[2] || '0');
      const pm = tm[3] === 'p';
      
      if (pm && hour !== 12) hour += 12;
      if (!pm && hour === 12) hour = 0;
      
      const hourStr = hour.toString().padStart(2, '0');
      const minStr = min.toString().padStart(2, '0');
      dateOb = new Date(dateStr + ', 2026 ' + hourStr + ':' + minStr + ':00-04:00');
    }
    
    matches.push({
      id: matchId++,
      stage: currentStage,
      group: currentGroup,
      date_string: dateStr + ', 2026',
      time_string: timeStr + ' EST',
      kickoff_time: dateOb.toISOString(),
      home: home,
      away: away,
      stadium: stadium
    });
  } catch (e) {
    console.log("Error parsing line: " + line);
  }
}

const fsNative = require('fs');
fsNative.mkdirSync('/Users/santiagoponce/Desktop/Rocky/World Cup Friendly Bets/src/data', { recursive: true });
fsNative.writeFileSync('/Users/santiagoponce/Desktop/Rocky/World Cup Friendly Bets/src/data/matches.json', JSON.stringify(matches, null, 2));
console.log('Done mapping ' + matches.length + ' matches!');
