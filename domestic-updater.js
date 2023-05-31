const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const {format, utcToZonedTime} = require('date-fns-tz');
const DomesticCrawler = require('./domestic-crawler');

crawlAndUpdateDomestic = async (outputPath, apiClient) => {
    let preData = {};
    const domesticStatPath = path.join(outputPath, 'domestic-stat.json'); // join(login,test) => login/test
    try {
        // 기존 크롤링한 값이 있으면 불러오기
        preData = JSON.parse(fs.readFileSync(domesticStatPath, 'uft-8'));
    } catch (e) {
        console.log('previous domesticStat not found');
    }

    const domesticCrawler = new DomesticCrawler();

    // 한국 시간대 기줒ㄴ으로 혀내 시점의 날짜 생성
    const now = new Date();
    const timeZone = 'Asia/Seoul';
    const crawledDate = format(utcToZonedTime(now, timeZone), 'yyyy-MM-dd');

    const newData = {
        crawledDate,
        domesticStat: await domesticCrawler.crawlStat()
    }

    // 변경된 값이 없으면 아무것도 핮지 않음
    if (_.isEqual(newData, preData)) {
        console.log('domesticStat has not been changed');
        return;
    }

    fs.writeFileSync(domesticStatPath, JSON.stringify(newData));

    const newDomesticStat = newData.domesticStat;
    const {
        confirmed, released, death, tested,
        testing, negative
    } = newDomesticStat.basicStat;

    await apiClient.upsertGlobalStat({
        cc: 'KR',
        date: crawledDate,
        confirmed,
        released,
        death,
        tested,
        testing,
        negative
    });

    // 성별, 나이별 데이터는 현재 날자에 대한 데이터만 수집하기 때문에
    // 간단하게 키값을 저장하는 API를 사용해 저장
    const { byAge, bySex } = newDomesticStat;
    const value = JSON.stringify({ byAge, bySex});
    await apiClient.upsertKeyValue('byAgeAndSex', value);

    console.log('domesticStat Update successfully');
}

module.exports = { crawlAndUpdateDomestic };