const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');

const countryInfo = require('./downloaded/countryInfo.json');

class GlobalCrawler {
    constructor() {
        this.client = axios.create({
            headers: {
                'User-Agent' :
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
            }
        });

        this.countryMapping = _.chain(countryInfo)
            .keyBy('worldometer_title')
            .mapValues('cc')
            .value();

        // console.log("countryMapping ==> ", this.countryMapping)
    }

    crawlStat = async () => {
        const url = 'https://yjiq150.github.io/coronaboard-crawling-sample/clone/worldometer/';

        const resp = await this.client.get(url);
        const $ = cheerio.load(resp.data);

        return this._extractStatByCountry($);
    }

    _extractStatByCountry = ($) => {
        const colNames = $('#main_table_countries_today thead tr th')
            .map((i, th) => {
                return $(th).text().trim();
            })
            .toArray();

        // 테이블의 모든 행 추출
        const rows = [];
        $('#main_table_countries_today tbody tr').each((i, tr) => {
            const row = $(tr)
                .find('td')
                .map((j, td) => {
                    return $(td).text().trim();
                })
                .toArray();

            rows.push(row);
        });

        if(rows.length === 0) {
            throw new Error(
                'Country rows not found. Site layout may have been changed.'
            )
        }

        const colNameToFileMapping = {
            'Country,Other': 'title',
            TotalCases: 'confirmed',
            TotalDeaths: 'death',
            TotalRecovered: 'released',
            TotalTests: 'tested'
        };

        const normalizedData = rows
            .map((row) => {
                const countryStat = [];
                for(let i = 0; i < colNames.length; i++) {
                    const colName = colNames[i];
                    const fieldName = colNameToFileMapping[colName];

                    if(!fieldName) {
                        continue;
                    }
                    const numberFields = ['confirmed', 'death', 'released', 'tested'];

                    if(numberFields.includes(fieldName)) {
                        countryStat[fieldName] = this._normalize(row[i]);
                    } else {
                        countryStat[fieldName] = row[i];
                    }
                }
                return countryStat;
            })
            .filter((countryStat) => this.countryMapping[countryStat.title])
            .map((countryStat) => ({
                ...countryStat,
                cc: this.countryMapping[countryStat.title]
            }))

        // console.log('normalizedData ==> ', normalizedData);
        return _.keyBy(normalizedData, 'cc');
    }

    _normalize = (numberText) => {
        // 문자열 형태의 숫자에서 공백, 쉼표를 제거한 후 숫자 형태로 변환
        return parseInt(numberText.replace(/[\s,]*/g, '')) || 0;
    }
}

module.exports = GlobalCrawler;