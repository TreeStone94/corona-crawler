const axios = require('axios');
const cheerio = require('cheerio');

const vm = require('vm');

const main = async () => {
    const resp = await axios.get('https://yjiq150.github.io/coronaboard-crawling-sample/dom-with-script');

    const $ = cheerio.load(resp.data);

    const extractedCode = $('script').first().html();

    const context = {};
    vm.createContext(context);
    vm.runInContext(extractedCode, context);

    console.log(context.dataExample.content);
}

main();
