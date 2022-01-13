const axios = require("axios").default;
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const WIKI_URL = "https://pokemon.fandom.com/es/wiki/Primera_generaci%C3%B3n";
const BASE_URL = "https://pokeapi.co/api/v2/pokemon";

async function getNames() {
  const { data } = await axios.get(WIKI_URL);

  const $ = cheerio.load(data);
  const aEl = $(".tabpokemon td:nth-child(3) a");

  let names = aEl.map((_, el) => el.attribs.title).toArray();
  names = names.map((name) =>
    name
      .toLowerCase()
      .replace(" ", "-")
      .replace(/[^A-Za-z\-]/, "")
  );
  names = Array.from(new Set(names));

  return names;
}

async function getPokemons(names) {
  const promises = names.map((name) => axios.get(`${BASE_URL}/${name}`));

  let results = await Promise.allSettled(promises);
  results = results.filter((res) => res.status === "fulfilled");

  const pokemons = results.map(({ value: { data } }) => {
    const {
      id,
      name,
      stats,
      sprites: { front_default },
    } = data;

    const parsedStats = {
      health: null,
      attack: null,
      defense: null,
    };

    stats.forEach(({ base_stat, stat: { name } }) => {
      if (name === "hp") parsedStats.health = base_stat;
      else if (name === "attack") parsedStats.attack = base_stat;
      else if (name === "defense") parsedStats.defense = base_stat;
    });

    return {
      id,
      name,
      image: front_default,
      ...parsedStats,
    };
  });

  return pokemons;
}

function saveToJson(data) {
  const timestamp = new Date().getTime();
  const target = path.join(__dirname, "..", `pokemons-${timestamp}.json`);
  fs.writeFileSync(target, data);
}

async function main() {
  try {
    const names = await getNames();
    const pokemons = await getPokemons(names);
    saveToJson(JSON.stringify(pokemons));
    console.log(`DONE! ${pokemons.length} pokemons saved`);
  } catch (err) {
    console.log(err);
  }
}

main();
