const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // If needed, but no public folder

// Conversion Handler Class (Exact FCC Logic)
function ConvertHandler() {
  this.getNum = function(input) {
    if (!input || input.match(/^\s*$/)) return 'invalid number';
    
    // Extract number part (before letters)
    let numPart = input.replace(/[^0-9\s\/.]/g, '').trim(); // Remove letters, keep num/fraction/spaces/decimals
    
    if (numPart === '') return 'invalid number';
    
    // Handle fractions: Split by space for mixed (e.g., "3 1/2" -> 3 + 1/2)
    let parts = numPart.split(/\s+/);
    let total = 0;
    for (let part of parts) {
      if (part.includes('/')) {
        // Split fraction: numerator/denominator
        let fracParts = part.split('/');
        if (fracParts.length === 2 && fracParts.every(p => !isNaN(p))) {
          let num = parseFloat(fracParts[0]);
          let den = parseFloat(fracParts[1]);
          if (den !== 0) {
            total += num / den;
          } else {
            return 'invalid number';
          }
        } else {
          return 'invalid number';
        }
      } else {
        let num = parseFloat(part);
        if (!isNaN(num)) {
          total += num;
        } else {
          return 'invalid number';
        }
      }
    }
    
    if (isNaN(total) || total === '') return 'invalid number';
    
    // Check for symbols/equations like "a=5"
    if (input.match(/[^0-9\s\/.=a-zA-Z]/) || (input.includes('=') && !input.match(/^\d+(\s*\d+\/\d+)?\s*[a-zA-Z]+$/i))) {
      return 'invalid number';
    }
    
    return total;
  };

  this.getUnit = function(input) {
    if (!input) return null;
    let unitPart = input.match(/[a-z]+$/i);
    if (!unitPart) return 'invalid unit';
    let unit = unitPart[0].toLowerCase();
    let validUnits = ['gal', 'l', 'lbs', 'kg', 'l', 'lb', 'liters', 'gallons', 'pounds', 'kilograms']; // Include full names? But FCC uses short
    validUnits = ['gal','l','mi','km','lbs','kg','lb']; // Core + aliases
    if (['gal', 'l', 'lbs', 'kg', 'lb'].includes(unit)) return unit;
    return 'invalid unit';
  };

  this.getReturnUnit = function(initUnit) {
    let returnUnit = {
      'gal': 'L',
      'l': 'gal',
      'lbs': 'kg',
      'kg': 'lbs',
      'lb': 'kg'
    };
    let unit = initUnit.toLowerCase();
    return returnUnit[unit] || unit;
  };

  this.spellOutUnit = function(unit) {
    let spellOut = {
      'gal': 'gallons',
      'l': 'liters',
      'lbs': 'pounds',
      'kg': 'kilograms',
      'lb': 'pounds'
    };
    let u = unit.toLowerCase();
    return spellOut[u] || unit;
  };

  this.convert = function(initNum, initUnit) {
    let returnNum;
    const factor = this.getFactor(initUnit);
    if (factor) {
      returnNum = parseFloat((initNum * factor).toPrecision(6)); // No fixed, use toPrecision for exact
    } else {
      returnNum = initNum;
    }
    let returnUnit = this.getReturnUnit(initUnit);
    let toUnit = this.spellOutUnit(returnUnit);
    let initSpell = this.spellOutUnit(initUnit);
    let result = {
      initNum,
      initUnit,
      returnNum,
      returnUnit: returnUnit.toLowerCase(),
      string: `${initNum} ${this.singularOrPlural(initSpell, initNum)} = ${returnNum} ${this.singularOrPlural(toUnit, returnNum)}`,
      unit: initUnit
    };
    return result;
  };

  this.getFactor = function(initUnit) {
    let factors = {
      'gal': 3.78541,
      'L': 3.78541,
      'l': 3.78541,
      'lbs': 0.453592,
      'kg': 2.20462,
      'lb': 0.453592
    };
    let unit = initUnit.toLowerCase();
    return factors[unit] || null;
  };

  // Helper for plural/singular
  this.singularOrPlural = function(unitStr, num) {
    if (num === 1) {
      return unitStr.replace(/s$/, ''); // gallons -> gallon, etc.
    }
    return unitStr;
  };

  // Main parse and convert
  this.parseInput = function(input) {
    let initNum = this.getNum(input);
    if (initNum === 'invalid number' || input.match(/[=]/)) return { error: 'invalid number' }; // Symbols catch
    let initUnit = this.getUnit(input);
    if (initUnit === 'invalid unit') return { error: 'invalid unit' };
    if (!initUnit) return { error: 'invalid unit' };
    if (typeof initNum === 'string') return { error: initNum };
    let result = this.convert(initNum, initUnit);
    result.string = result.string.replace('liter', 'liters').replace('gallon', 'gallons').replace('pound', 'pounds').replace('kilogram', 'kilograms'); // Post-process plural if needed
    if (initNum === 1) result.string = result.string.replace(/s\b/g, ''); // Singular fix
    return result;
  };
}

const convertHandler = new ConvertHandler();

// HTML Template (Base) - FCC Style
function getHTML(galOutput = '', lbsOutput = '') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Metric/Imperial Converter</title>
  <meta name="description" content="">
  <meta name="viewport" content="width=device-width, initial-scale=1">

</head>
<body>
  <div class="container">
    <h1>Convert a Number to a Unit</h1>
    <div class="converter">
      <h3>Convert Gallons to Liters</h3>
      <p class="blk">
         <label for="num1">Enter measurement to convert in gallons: </label>
         <input id="num1" name="inputNum" type="text">
         <button class="button" type="submit" value="submit">Convert</button>
         <p id="output1">${galOutput}</p>
      </p>
    </div>
    <div class="converter">
      <h3>Convert Pounds to Kilograms</h3>
      <p class="blk">
         <label for="num2">Enter measurement to convert in pounds: </label>
         <input id="num2" name="inputNum" type="text">
         <button class="button" type="submit" value="submit">Convert</button>
         <p id="output2">${lbsOutput}</p>
      </p>
    </div>
  </div>
  <form action="/" method="POST" id="galForm">
    <input type="hidden" name="unit" value="gal">
  </form>
  <script>
    document.getElementById('num1').addEventListener('keypress', function(e) { if (e.key === 'Enter') { submitForm('gal'); } });
    document.querySelector('button[for=gal]').addEventListener('click', function() { submitForm('gal'); });
    function submitForm(unit) {
      const input = document.getElementById(unit === 'gal' ? 'num1' : 'num2').value;
      const form = document.createElement('form');
      form.method = 'POST';
      form.innerHTML = '<input type="hidden" name="input" value="' + input + '">' + '<input type="hidden" name="unit" value="' + unit + '">';
      document.body.appendChild(form);
      form.submit();
    }
  </script>
</body>
</html>`;
}

// Routes
app.get('/', (req, res) => {
  res.send(getHTML());
});

app.post('/', (req, res) => {
  let { input, unit } = req.body || {};
  if (!input) input = '';
  const fullInput = input + (input ? ' ' + unit : unit); // Combine e.g., "3" + "gal"
  let result = convertHandler.parseInput(fullInput);
  let output = '';
  if (result.error) {
    output = `<strong>${result.error}</strong>`;
  } else {
    output = `<strong>${result.string}</strong>`;
  }
  
  // Determine which output to insert (gal or lbs)
  let galOut = unit === 'gal' ? output : '';
  let lbsOut = unit === 'lbs' ? output : '';
  res.send(getHTML(galOut, lbsOut));
});

// API Route
app.get('/api/convert', (req, res) => {
  const { input } = req.query;
  if (!input) return res.json({ error: 'input required' });
  const result = convertHandler.parseInput(input);
  res.json(result);
});

// Error for invalid paths (FCC might test)
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

module.exports = app; // For Vercel
