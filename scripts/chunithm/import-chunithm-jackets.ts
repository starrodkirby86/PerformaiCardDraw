import fs from 'fs';
import https from 'node:https';
import fetchImages from '../fetch-sega-images';

// https.globalAgent.options.ca = fs.readFileSync('node_modules/node_extra_ca_certs_mozilla_bundle/ca_bundle/ca_intermediate_root_bundle.pem');

const GAME_CODE = 'chunithm_paradise_lost';
const BASE_URL = 'https://web.archive.org/web/20211029111510im_/https://chunithm.sega.jp/storage/jacket/';

async function run() {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  const data = JSON.parse(fs.readFileSync(`src/songs/${GAME_CODE}.json`, 'utf-8'));
  await fetchImages(
    GAME_CODE,
    BASE_URL,
    data.songs
  )
}

if (require.main === module) run();