const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync(__dirname + '/data.html', 'utf8');

const dom = new JSDOM(html);
const document = dom.window.document;

function getTableData() {
    const rows = document.querySelectorAll('tbody tr');
    const data = [];

    for (const row of rows) {
        try {
            const instrument = row.querySelector('td.js-stockScreener-check input').getAttribute('data-instrument')
            const companyName = row.querySelector('td:nth-child(2) a').textContent.trim();
            const companyLink = row.querySelector('td:nth-child(2) a').getAttribute('href');
            const price = row.querySelector('td:nth-child(3) span').textContent.trim();
            const currency = row.querySelector('td:nth-child(3) span + span').textContent.trim();
            const marketStatus = row.querySelector('td:nth-child(3) i').getAttribute('title');
            const marketCap = row.querySelector('td:nth-child(4)').textContent.trim();
            const changePercentage = row.querySelector('td:nth-child(5) span').textContent.trim();
            const sector = row.querySelector('td:nth-child(6) div').textContent.trim();

            data.push({
                instrument,
                companyName,
                companyLink,
                price,
                currency,
                marketStatus,
                marketCap,
                changePercentage,
                sector
            });

        } catch (error) {
            console.error('Error parsing row', error);
            continue;
        }
    };

    return data;
}

const tableData = getTableData();
fs.writeFileSync(__dirname + '/data.json', JSON.stringify(tableData, null, 2));
