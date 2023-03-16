const { readdirSync, writeFileSync, existsSync } = require("fs");
const { resolve, join } = require("path");
const { validate: validateJSONSchema } = require("jsonschema");

const dataFileNames = readdirSync(resolve(join(__dirname, "../src/songs")));
const jacketsDir = resolve(join(__dirname, "../src/assets/jackets"));
const songsSchema = require("../songs.schema.json");
const schemaLocation = "src/models/SongData.ts";

function validateContents(dataFile) {
  const errors = [];

  const allKeys = [
    ...dataFile.meta.difficulties.map((d) => d.key),
    ...dataFile.meta.flags,
  ];
  const difficulties = new Set(dataFile.meta.difficulties.map((d) => d.key));
  const flags = new Set(dataFile.meta.flags);

  if (dataFile.meta.lvlMax < 1) {
    errors.push("max level is below 1");
  }

  if (dataFile.defaults.difficulties.some((d) => !difficulties.has(d))) {
    errors.push("some default difficulties are missing from meta");
  }

  // removed to allow for hidden flags like "plus" charts in SMX
  // if (dataFile.defaults.flags.some((d) => !flags.has(d))) {
  //   errors.push("some default flags are missing from meta");
  // }

  if (dataFile.defaults.lowerLvlBound > dataFile.defaults.upperLvlBound) {
    errors.push("default level bounds are reversed");
  }

  if (
    dataFile.defaults.lowerLvlBound > dataFile.meta.lvlMax ||
    dataFile.defaults.upperLvlBound > dataFile.meta.lvlMax
  ) {
    errors.push("default level bounds are beyond max level");
  }

  if (dataFile.i18n.ja) {
    for (const key of allKeys) {
      if (!(dataFile.i18n.en[key] && dataFile.i18n.ja[key])) {
        errors.push("missing translation for " + key);
      }
      if (
        difficulties.has(key) &&
        !(dataFile.i18n.en["$abbr"][key] && dataFile.i18n.ja["$abbr"][key])
      ) {
        errors.push("missing abbreviated translation for " + key);
      }
    }
  }

  for (const song of dataFile.songs) {
    if (song.jacket) {
      const jacketPath = join(jacketsDir, song.jacket);
      /* Temp disable jacket check
      if (!existsSync(jacketPath)) {
        errors.push(`missing jacket image ${song.jacket}`);
      }
      */
    }

    for (const chart of song.charts) {
      if (!difficulties.has(chart.diffClass)) {
        errors.push(
          `unrecognized diffClass "${chart.diffClass}" used by ${song.name}`
        );
      }
      if (chart.lvl > dataFile.meta.lvlMax) {
        errors.push(`${song.name} has chart above level max`);
      }
    }
  }

  return errors;
}

let hasError = false;
for (const dataFile of dataFileNames) {
  const songData = require(`../src/songs/${dataFile}`);
  const result = validateJSONSchema(songData, songsSchema, {
    nestedErrors: true,
  });

  if (result.valid) {
    const consistencyErrors = validateContents(songData);
    if (consistencyErrors.length) {
      consistencyErrors.forEach((err) => console.error(" * " + err));
      console.log(`\n${dataFile} has inconsistent data!`);
      hasError = true;
    } else {
      console.log(`${dataFile} looks good!`);
    }
  } else {
    result.errors.forEach((error) => {
      console.error(error.toString());
    });
    console.log(`${dataFile} has issues!`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Building schema file`);
const { compile } = require("json-schema-to-typescript");
const bannerComment = `
/**
 * This file was automatically generated by json-schema-to-typescript. DO NOT MODIFY IT BY HAND.
 * Instead, modify \`songs.schema.json\` and run \`yarn validate\` to regenerate the SongData types
 * here as well as checking that the data files match.
 */`;

compile(songsSchema, "SongData", { bannerComment }).then((ts) => {
  writeFileSync(resolve(join(__dirname, "..", schemaLocation)), ts);
  console.log("Schema written to ", schemaLocation);
});
