const chromium = require("chrome-aws-lambda");
const { handler } = require(".");

module.exports.handler = async (event, context) => {
  let keyword = "";

  try {
    if (event === undefined) {
      throw Error();
    }
    keyword = event.pathParameters.keyword;
  } catch (e) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "keyword not exists.",
      }),
    };
  }

  //www.youtube.com/results?search_query=%EC%95%84%EC%9D%B4%EC%9C%A0+%EC%97%90%EC%9E%87

  const url = "https://www.youtube.com/results?search_query=" + keyword;

  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.goto(url);

  let link = await page.evaluate(() => {
    const thumbnailTag = document.querySelector("a#thumbnail");
    return thumbnailTag.href;
  });

  await browser.close();

  // https://www.youtube.com/watch?v=CPXmqfu-9vs
  if (link === undefined) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "link parse fail",
      }),
    };
  }
  const youtubeLinkRegex = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/;
  if (!link.match(youtubeLinkRegex)) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "key parse fail",
      }),
    };
  }
  const key = link.match(youtubeLinkRegex)[1];

  return await handler({
    pathParameters: { key: key },
  });
};
