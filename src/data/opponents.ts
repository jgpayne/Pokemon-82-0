export interface OpponentDef {
  id: string
  city: string
  name: string
  abbr: string
  coach: string
  color: string
  conference: Conference
  roster: string[]
}

export type Conference = 'Indigo' | 'Kanto'

export const CONFERENCES: Conference[] = ['Indigo', 'Kanto']

/** 29 Kanto-themed AI clubs. The player's team joins the Indigo Conference. */
export const OPPONENTS: OpponentDef[] = [
  { id: 'pewter', city: 'Pewter', name: 'Boulders', abbr: 'PEW', coach: 'Brock', color: '#B6A136', conference: 'Indigo',
    roster: ['Onix', 'Golem', 'Rhydon', 'Kabutops', 'Omastar', 'Graveler', 'Rhyhorn', 'Geodude'] },
  { id: 'cerulean', city: 'Cerulean', name: 'Tide', abbr: 'CER', coach: 'Misty', color: '#6390F0', conference: 'Indigo',
    roster: ['Starmie', 'Golduck', 'Seaking', 'Seadra', 'Staryu', 'Psyduck', 'Horsea', 'Goldeen'] },
  { id: 'vermilion', city: 'Vermilion', name: 'Voltage', abbr: 'VER', coach: 'Lt. Surge', color: '#F7D02C', conference: 'Indigo',
    roster: ['Raichu', 'Electabuzz', 'Jolteon', 'Magneton', 'Electrode', 'Pikachu', 'Voltorb', 'Magnemite'] },
  { id: 'celadon', city: 'Celadon', name: 'Blossoms', abbr: 'CEL', coach: 'Erika', color: '#7AC74C', conference: 'Indigo',
    roster: ['Victreebel', 'Vileplume', 'Exeggutor', 'Venusaur', 'Tangela', 'Weepinbell', 'Gloom', 'Bellsprout'] },
  { id: 'fuchsia', city: 'Fuchsia', name: 'Ninjas', abbr: 'FUC', coach: 'Koga', color: '#A33EA1', conference: 'Indigo',
    roster: ['Venomoth', 'Golbat', 'Arbok', 'Nidoking', 'Weezing', 'Muk', 'Koffing', 'Grimer'] },
  { id: 'saffron', city: 'Saffron', name: 'Mindbenders', abbr: 'SAF', coach: 'Sabrina', color: '#F95587', conference: 'Indigo',
    roster: ['Alakazam', 'Mr. Mime', 'Jynx', 'Hypno', 'Slowbro', 'Kadabra', 'Exeggutor', 'Venomoth'] },
  { id: 'cinnabar', city: 'Cinnabar', name: 'Blaze', abbr: 'CIN', coach: 'Blaine', color: '#EE8130', conference: 'Indigo',
    roster: ['Ninetales', 'Rapidash', 'Magmar', 'Arcanine', 'Charizard', 'Flareon', 'Ponyta', 'Growlithe'] },
  { id: 'viridian', city: 'Viridian', name: 'Bosses', abbr: 'VIR', coach: 'Giovanni', color: '#705746', conference: 'Indigo',
    roster: ['Persian', 'Dugtrio', 'Nidoqueen', 'Nidoking', 'Rhydon', 'Kangaskhan', 'Marowak', 'Sandslash'] },
  { id: 'lorelei', city: 'Seafoam', name: 'Glaciers', abbr: 'SEA', coach: 'Lorelei', color: '#96D9D6', conference: 'Indigo',
    roster: ['Jynx', 'Cloyster', 'Vaporeon', 'Dewgong', 'Lapras', 'Slowbro', 'Seel', 'Shellder'] },
  { id: 'bruno', city: 'Victory Road', name: 'Brawlers', abbr: 'VRB', coach: 'Bruno', color: '#C22E28', conference: 'Indigo',
    roster: ['Hitmonlee', 'Hitmonchan', 'Primeape', 'Poliwrath', 'Machamp', 'Onix', 'Golem', 'Machoke'] },
  { id: 'agatha', city: 'Lavender', name: 'Phantoms', abbr: 'LAV', coach: 'Agatha', color: '#735797', conference: 'Indigo',
    roster: ['Gengar', 'Haunter', 'Arbok', 'Golbat', 'Marowak', 'Hypno', 'Gastly', 'Cubone'] },
  { id: 'lance', city: 'Indigo', name: 'Dragons', abbr: 'DRG', coach: 'Lance', color: '#6F35FC', conference: 'Indigo',
    roster: ['Aerodactyl', 'Dragonair', 'Charizard', 'Dragonite', 'Gyarados', 'Lapras', 'Seadra', 'Dratini'] },
  { id: 'blue', city: 'Pallet', name: 'Champions', abbr: 'PAL', coach: 'Blue', color: '#2563EB', conference: 'Indigo',
    roster: ['Jolteon', 'Alakazam', 'Pidgeot', 'Rhydon', 'Blastoise', 'Exeggutor', 'Arcanine', 'Gyarados'] },
  { id: 'birds', city: 'Sky Pillar', name: 'Legends', abbr: 'SKY', coach: 'The Legendary Birds', color: '#F59E0B', conference: 'Indigo',
    roster: ['Zapdos', 'Fearow', 'Moltres', 'Aerodactyl', 'Articuno', 'Dodrio', 'Pidgeot', "Farfetch’d"] },

  { id: 'rocket', city: 'Rocket', name: 'Grunts', abbr: 'TRG', coach: 'Jessie & James', color: '#DC2626', conference: 'Kanto',
    roster: ['Persian', 'Raticate', 'Arbok', 'Victreebel', 'Weezing', 'Golbat', 'Lickitung', 'Meowth'] },
  { id: 'ash', city: 'Pallet', name: 'Dreamers', abbr: 'ASH', coach: 'Ash', color: '#FACC15', conference: 'Kanto',
    roster: ['Pikachu', 'Pidgeotto', 'Butterfree', 'Tauros', 'Charizard', 'Kingler', 'Squirtle', 'Bulbasaur'] },
  { id: 'oak', city: 'Pallet', name: 'Professors', abbr: 'OAK', coach: 'Prof. Oak', color: '#A8A77A', conference: 'Kanto',
    roster: ['Eevee', 'Porygon', 'Tauros', 'Kangaskhan', 'Snorlax', 'Mr. Mime', 'Chansey', 'Ditto'] },
  { id: 'silph', city: 'Saffron', name: 'Scientists', abbr: 'SIL', coach: 'Silph Co.', color: '#B7B7CE', conference: 'Kanto',
    roster: ['Porygon', 'Electrode', 'Weezing', 'Magneton', 'Muk', 'Lapras', 'Magnemite', 'Koffing'] },
  { id: 'safari', city: 'Fuchsia', name: 'Rangers', abbr: 'SFZ', coach: 'Safari Warden', color: '#16A34A', conference: 'Kanto',
    roster: ['Scyther', 'Tauros', 'Kangaskhan', 'Pinsir', 'Rhyhorn', 'Chansey', 'Exeggcute', 'Dratini'] },
  { id: 'bugs', city: 'Viridian Forest', name: 'Swarm', abbr: 'VFS', coach: 'Bug Catcher Rick', color: '#A6B91A', conference: 'Kanto',
    roster: ['Beedrill', 'Scyther', 'Butterfree', 'Pinsir', 'Venomoth', 'Parasect', 'Kakuna', 'Weedle'] },
  { id: 'bikers', city: 'Cycling Road', name: 'Riders', abbr: 'CYC', coach: 'Biker Gang', color: '#475569', conference: 'Kanto',
    roster: ['Dodrio', 'Fearow', 'Rapidash', 'Primeape', 'Tauros', 'Muk', 'Weezing', 'Raticate'] },
  { id: 'sailors', city: 'Vermilion', name: 'Anchors', abbr: 'SSA', coach: 'S.S. Anne Crew', color: '#0EA5E9', conference: 'Kanto',
    roster: ['Golduck', 'Tentacruel', 'Kingler', 'Machoke', 'Poliwrath', 'Seaking', 'Machop', 'Shellder'] },
  { id: 'swimmers', city: 'Seafoam', name: 'Surf', abbr: 'SRF', coach: 'Swimmer Luis', color: '#06B6D4', conference: 'Kanto',
    roster: ['Starmie', 'Vaporeon', 'Tentacruel', 'Seadra', 'Dewgong', 'Cloyster', 'Poliwhirl', 'Horsea'] },
  { id: 'hikers', city: 'Rock Tunnel', name: 'Climbers', abbr: 'RTH', coach: 'Hiker Lenny', color: '#92400E', conference: 'Kanto',
    roster: ['Sandslash', 'Dugtrio', 'Marowak', 'Machoke', 'Golem', 'Onix', 'Graveler', 'Geodude'] },
  { id: 'channelers', city: 'Pokémon Tower', name: 'Spirits', abbr: 'TWR', coach: 'Channeler Hope', color: '#4C1D95', conference: 'Kanto',
    roster: ['Gengar', 'Kadabra', 'Mr. Mime', 'Haunter', 'Hypno', 'Slowbro', 'Drowzee', 'Gastly'] },
  { id: 'gamecorner', city: 'Celadon', name: 'High Rollers', abbr: 'GMC', coach: 'Game Corner', color: '#DB2777', conference: 'Kanto',
    roster: ['Abra', 'Porygon', 'Scyther', 'Pinsir', 'Clefable', 'Wigglytuff', 'Dratini', 'Clefairy'] },
  { id: 'dojo', city: 'Saffron', name: 'Black Belts', abbr: 'DOJ', coach: 'Karate King', color: '#9A3412', conference: 'Kanto',
    roster: ['Hitmonlee', 'Primeape', 'Hitmonchan', 'Machamp', 'Poliwrath', 'Machoke', 'Mankey', 'Machop'] },
  { id: 'mtmoon', city: 'Mt. Moon', name: 'Fossils', abbr: 'MTM', coach: 'Super Nerd Miguel', color: '#78716C', conference: 'Kanto',
    roster: ['Aerodactyl', 'Kabutops', 'Clefable', 'Omastar', 'Golbat', 'Clefairy', 'Paras', 'Geodude'] },
  { id: 'fanclub', city: 'Vermilion', name: 'Fan Club', abbr: 'FAN', coach: 'Fan Club Chairman', color: '#F472B6', conference: 'Kanto',
    roster: ['Ninetales', 'Persian', 'Pikachu', 'Wigglytuff', 'Seel', 'Eevee', 'Clefairy', 'Jigglypuff'] },
]
