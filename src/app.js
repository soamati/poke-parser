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

  let pokemons = aEl.map((_, el) => el.attribs.title).toArray();

  pokemons = pokemons.map((name) =>
    name
      .toLowerCase()
      .replace(" ", "-")
      .replace(/[^A-Za-z\-]/, "")
  );

  pokemons = Array.from(new Set(pokemons));

  return pokemons;
}

async function main() {
  const names = await getNames();
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

  console.log(`Pokemons: ${pokemons.length}`);

  const pokemonsJson = JSON.stringify(pokemons);
  try {
    const timestamp = new Date().getTime();
    const target = path.join(__dirname, "..", `pokemons-${timestamp}.json`);
    fs.writeFileSync(target, pokemonsJson);
    console.log("OK!");
  } catch (err) {
    console.log(err);
  }
}

main();
