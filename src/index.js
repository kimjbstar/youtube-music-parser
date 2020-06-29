const chromium = require("chrome-aws-lambda");

module.exports.handler = async (event, context) => {
  let key = "";
  try {
    key = event.pathParameters.key;
  } catch (e) {
    console.log(e);
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "url not exists.",
      }),
    };
  }

  const url = "https://www.youtube.com/watch?v=" + key;
  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.goto(url);

  let bodyHTML = await page.evaluate(() => {
    const scripts = document.querySelectorAll("script");
    let scriptText = "";
    scripts.forEach(script => {
      scriptText += script.text;
    });
    return scriptText;
  });

  const matched = bodyHTML.match(
    new RegExp(/window\["ytInitialData"] = (.*}})/)
  );

  const ytInitialData = matched.length >= 2 ? matched[1] : "[]";
  const ytInitialDataParsed = JSON.parse(ytInitialData);

  try {
    const metadataRows =
      ytInitialDataParsed.contents.twoColumnWatchNextResults.results.results
        .contents[1].videoSecondaryInfoRenderer.metadataRowContainer
        .metadataRowContainerRenderer.rows;
    let index = -1;
    const musics = metadataRows.reduce((result, row) => {
      if (row.metadataRowRenderer === undefined) {
        return result;
      }
      const key = row.metadataRowRenderer.title.simpleText.toLowerCase();
      if (key == "song") {
        result.push({});
        index++;
      }
      const content = row.metadataRowRenderer.contents[0];
      let value = content.runs ? content.runs[0].text : content.simpleText;
      if (content.runs) {
        result[index][key + "Link"] =
          "https://www.youtube.com" +
          content.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata
            .url;
      }

      result[index][key] = value;
      return result;
    }, []);
    await browser.close();
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "OK",
        musics: musics,
      }),
    };
  } catch (e) {
    await browser.close();
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "parse failed.",
        error: e.toString(),
      }),
    };
  }
};
