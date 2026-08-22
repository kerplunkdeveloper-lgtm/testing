const https = require('https');
const fs = require('fs');

const url = "https://raw.githubusercontent.com/zanechua/magento2-pusher/master/pub/media/pusher/notification.mp3";
const dest = "c:\\Users\\Admin\\Desktop\\sudhagar\\projectmanagementtool\\frontend\\src\\assets\\notification.mp3";

const file = fs.createWriteStream(dest);
https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Download completed");
  });
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error("Error downloading file:", err.message);
});
