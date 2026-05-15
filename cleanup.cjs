const fs = require('fs');
let matches = JSON.parse(fs.readFileSync('./src/data/matches.json', 'utf8'));

for (let m of matches) {
  if (m.away && m.away.includes(',')) {
    const parts = m.away.split(',');
    m.away = parts[0].trim();
    m.stadium = parts.slice(1).join(',').trim();
    if (m.stadium.endsWith(')')) {
      // it is a stadium
    }
  }
  
  if (m.home && m.home.includes(',')) {
    const parts = m.home.split(',');
    m.home = parts[0].trim();
  }
}

fs.writeFileSync('./src/data/matches.json', JSON.stringify(matches, null, 2));
