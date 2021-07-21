const async = require('async');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const moment = require('moment');

const _RESERVOIRGOVURL = 'http://fhy.wra.gov.tw/ReservoirPage_2011/StorageCapacity.aspx';

module.exports = function (dateObj, callback) {

  async.waterfall([

    /*
     * 解析第一次網頁資料，取得 form data 後 POST
     */
    async function (cb) {

      const spDate = dateObj.year && dateObj.month && dateObj.day;
      const now = spDate && moment(`${dateObj.year}-${dateObj.month}-${dateObj.day}T00:00:00.000`);
      const dateVals = now ? { year: now.year(), month: now.month() + 1, day: now.date() } : {};

      let browser
      try {
        browser = await puppeteer.launch();
      } catch (e) {
        browser = await puppeteer.launch({
          headless: false,
          args: ["--no-sandbox", "--disabled-setupid-sandbox"],
        });
      }
      const page = await browser.newPage();
      await page.goto(_RESERVOIRGOVURL);

      await page.evaluate(({ year, month, day, spDate }) => {
        if (spDate) {
          document.querySelector('#aspnetForm select#ctl00_cphMain_ucDate_cboYear').value = year;
          document.querySelector('#aspnetForm select#ctl00_cphMain_ucDate_cboMonth').value = month;
          document.querySelector('#aspnetForm select#ctl00_cphMain_ucDate_cboDay').value = day;
        }
        document.querySelector('#aspnetForm select#ctl00_cphMain_cboSearch').value = '所有水庫';
      }, { spDate, ...dateVals });

      await page.waitForTimeout(500);
      await page.evaluate(() => document.getElementById('ctl00_cphMain_btnQuery').click());

      await page.waitForTimeout(1000);
      const html = await page.evaluate(() => document.documentElement.innerHTML);

      await browser.close();
      cb(null, html);
    },
    /*
     * 解析網頁資料，做成新的 json
     */
    function (html, cb){

      const outputData = [];

      const $ = cheerio.load(html);

      $('.list').find('tr').each(function (i){

        if (i > 30 || i < 2) return;

        const 水庫名稱 = $(this).find('td').eq(0).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 有效容量 = $(this).find('td').eq(1).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 統計時間 = $(this).find('td').eq(2).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 集水區降雨量 = $(this).find('td').eq(3).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 進水量 = $(this).find('td').eq(4).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 出水量 = $(this).find('td').eq(5).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 與昨日水位差 = $(this).find('td').eq(6).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 水情時間 = $(this).find('td').eq(7).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 水位 = $(this).find('td').eq(8).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 有效蓄水量 = $(this).find('td').eq(9).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');
        const 蓄水量百分比 = $(this).find('td').eq(10).text().trim().replace(/(\r\n|\n|\r|\s)/g,'');

        outputData.push({
          水庫名稱,
          有效容量,
          統計時間,
          集水區降雨量,
          進水量,
          出水量,
          與昨日水位差,
          水情時間,
          水位,
          有效蓄水量,
          蓄水量百分比
        });
      });

      cb(null, outputData);
    }
  ], function (err, outputData) {
    if (err) return callback(err);

    if (!outputData || outputData.length === 0) {
      return callback(new Error('outputData not found'));
    }

    callback(null, outputData);
  });
};

