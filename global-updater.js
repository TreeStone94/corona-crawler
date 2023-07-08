const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const {format, utcToZonedTime} = require('date-fns-tz');
const GlobalCrawler = require('./global-crawler');

crawlAndUpdateGlobal = async (outputPath, apiClient) => {
    let preData = {};
    const domesticStatPath = path.join(outputPath, 'global-stat.json'); // join(login,test) => login/test
    try {
        // 기존 크롤링한 값이 있으면 불러오기
        preData = JSON.parse(fs.readFileSync(domesticStatPath, 'uft-8'));
    } catch (e) {
        console.log('previous domesticStat not found');
    }

    const globalCrawler = new GlobalCrawler();

    // 한국 시간대 기줒ㄴ으로 혀내 시점의 날짜 생성
    const now = new Date();
    const timeZone = 'Asia/Seoul';
    const crawledDate = format(utcToZonedTime(now, timeZone), 'yyyy-MM-dd');

    const newGlobalStat = {
        ...await globalCrawler.crawlStat()
    }

    // console.log("newGlobalStat ==> ", newGlobalStat);
    // 변경된 값이 없으면 아무것도 핮지 않음
    if (_.isEqual(newGlobalStat, preData)) {
        console.log('domesticStat has not been changed');
        return;
    }

    fs.writeFileSync(domesticStatPath, JSON.stringify(newGlobalStat));

    const resp = await apiClient.findAllGlobalStat();
    const oldRows = resp.result.filter((x) => x.date === crawledDate);
    const oldGlobalStat = _.keyBy(oldRows, 'cc');

    const updateRows = findUpdateRows(newGlobalStat, oldGlobalStat);
    if(_.isEmpty(updateRows)) {
        console.log('No updated globalStat rows');
        return;
    }

    for(const row of updateRows) {
        await apiClient.upsertGlobalStat({
            date: crawledDate,
            ...row
        })
    }


    console.log('globalStat updated successfully');
}

findUpdateRows = (newRowsByCc, oldRowsByCc) => {
    const updateRows = [];
    for(const cc of Object.keys(newRowsByCc)) {
        const newRow = newRowsByCc[cc];
        const oldRow = oldRowsByCc[cc];

        if(cc === 'KR' && oldRow) {
            continue;
        }

        if(isRowEqual(newRow, oldRow)) {
            continue;
        }

        updateRows.push(newRow);
    }

    return updateRows;
}

isRowEqual = (newRow, preRow) => {
    const colsToCompare = [
        'confirmed', 'death', 'released', 'critical',
        'tested'
    ]

    if(!preRow) {
        return false;
    }

    return colsToCompare.every((col) => newRow[col] === preRow[col]);
}

module.exports = {crawlAndUpdateGlobal};