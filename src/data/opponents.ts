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

export type Conference = 'East' | 'West'

export const CONFERENCES: Conference[] = ['East', 'West']

/** The player's team plays in the East. */
export const USER_CONFERENCE: Conference = 'East'

export const CONFERENCE_REGIONS: Record<Conference, string> = {
  East: 'Kanto · Johto · Hoenn · Sinnoh',
  West: 'Unova · Kalos · Alola · Galar · Paldea',
}

/**
 * 29 AI clubs led by champions, Elite Four members, gym leaders and villains
 * from every region, with rosters drawn from all generations.
 */
export const OPPONENTS: OpponentDef[] = [
  // East: Kanto, Johto, Hoenn, Sinnoh
  { id: 'blue', city: 'Pallet', name: 'Champions', abbr: 'PAL', coach: 'Blue', color: '#2563EB', conference: 'East',
    roster: ['Pidgeot', 'Alakazam', 'Gyarados', 'Arcanine', 'Exeggutor', 'Blastoise', 'Sandslash', 'Ninetales'] },
  { id: 'lance', city: 'Indigo', name: 'Dragons', abbr: 'IND', coach: 'Lance', color: '#6F35FC', conference: 'East',
    roster: ['Dragonite', 'Kingdra', 'Aerodactyl', 'Charizard', 'Altaria', 'Seaking', 'Dragonair', 'Flygon'] },
  { id: 'giovanni', city: 'Viridian', name: 'Rockets', abbr: 'VIR', coach: 'Giovanni', color: '#DC2626', conference: 'East',
    roster: ['Mewtwo', 'Nidoking', 'Nidoqueen', 'Dugtrio', 'Persian', 'Marowak', 'Rhyhorn', 'Sandslash'] },
  { id: 'sabrina', city: 'Saffron', name: 'Mindbenders', abbr: 'SAF', coach: 'Sabrina', color: '#F95587', conference: 'East',
    roster: ['Alakazam', 'Mr. Mime', 'Jynx', 'Xatu', 'Girafarig', 'Grumpig', 'Chimecho', 'Wobbuffet'] },
  { id: 'red', city: 'Mt. Silver', name: 'Legends', abbr: 'SLV', coach: 'Red', color: '#B91C1C', conference: 'East',
    roster: ['Pikachu', 'Espeon', 'Snorlax', 'Venusaur', 'Charizard', 'Blastoise', 'Lapras', 'Lucario'] },
  { id: 'clair', city: 'Blackthorn', name: 'Wyverns', abbr: 'BLK', coach: 'Clair', color: '#4338CA', conference: 'East',
    roster: ['Kingdra', 'Dragonair', 'Gabite', 'Altaria', 'Druddigon', 'Vibrava', 'Shelgon', 'Zweilous'] },
  { id: 'morty', city: 'Ecruteak', name: 'Phantoms', abbr: 'ECR', coach: 'Morty', color: '#735797', conference: 'East',
    roster: ['Gengar', 'Misdreavus', 'Drifloon', 'Dusclops', 'Banette', 'Sableye', 'Shedinja', 'Frillish'] },
  { id: 'karen', city: 'Indigo', name: 'Shadows', abbr: 'SHD', coach: 'Karen', color: '#44403C', conference: 'East',
    roster: ['Umbreon', 'Houndoom', 'Murkrow', 'Sneasel', 'Mightyena', 'Absol', 'Sableye', 'Cacturne'] },
  { id: 'steven', city: 'Mossdeep', name: 'Steel', abbr: 'MOS', coach: 'Steven', color: '#64748B', conference: 'East',
    roster: ['Metagross', 'Aggron', 'Skarmory', 'Claydol', 'Cradily', 'Armaldo', 'Excadrill', 'Probopass'] },
  { id: 'wallace', city: 'Sootopolis', name: 'Cascade', abbr: 'SOO', coach: 'Wallace', color: '#0EA5E9', conference: 'East',
    roster: ['Milotic', 'Ludicolo', 'Whiscash', 'Wailord', 'Tentacruel', 'Starmie', 'Sealeo', 'Luvdisc'] },
  { id: 'maxie', city: 'Lilycove', name: 'Magma', abbr: 'MAG', coach: 'Maxie', color: '#EA580C', conference: 'East',
    roster: ['Groudon', 'Camerupt', 'Torkoal', 'Mightyena', 'Crobat', 'Weezing', 'Claydol', 'Houndoom'] },
  { id: 'cynthia', city: 'Celestic', name: 'Champions', abbr: 'CEL', coach: 'Cynthia', color: '#1E293B', conference: 'East',
    roster: ['Garchomp', 'Spiritomb', 'Lucario', 'Milotic', 'Roserade', 'Togekiss', 'Gastrodon', 'Glaceon'] },
  { id: 'volkner', city: 'Sunyshore', name: 'Sparks', abbr: 'SUN', coach: 'Volkner', color: '#F7D02C', conference: 'East',
    roster: ['Luxray', 'Raichu', 'Lanturn', 'Pachirisu', 'Jolteon', 'Electabuzz', 'Manectric', 'Plusle'] },
  { id: 'cyrus', city: 'Veilstone', name: 'Galactics', abbr: 'GAL', coach: 'Cyrus', color: '#0F766E', conference: 'East',
    roster: ['Dialga', 'Weavile', 'Honchkrow', 'Houndoom', 'Toxicroak', 'Bronzong', 'Skuntank', 'Purugly'] },

  // West: Unova, Kalos, Alola, Galar, Paldea
  { id: 'alder', city: 'Opelucid', name: 'Wanderers', abbr: 'OPL', coach: 'Alder', color: '#C2410C', conference: 'West',
    roster: ['Volcarona', 'Bouffalant', 'Accelgor', 'Vanilluxe', 'Braviary', 'Sawk', 'Throh', 'Swanna'] },
  { id: 'iris', city: 'Opelucid', name: 'Dragon Tamers', abbr: 'IRS', coach: 'Iris', color: '#7C3AED', conference: 'West',
    roster: ['Haxorus', 'Druddigon', 'Archeops', 'Lapras', 'Aggron', 'Bagon', 'Swablu', 'Deino'] },
  { id: 'n', city: 'Castelia', name: 'Plasma', abbr: 'PLS', coach: 'N', color: '#334155', conference: 'West',
    roster: ['Zekrom', 'Zoroark', 'Vanilluxe', 'Klinklang', 'Seismitoad', 'Sigilyph', 'Liepard', 'Unfezant'] },
  { id: 'elesa', city: 'Nimbasa', name: 'Voltage', abbr: 'NIM', coach: 'Elesa', color: '#FACC15', conference: 'West',
    roster: ['Zebstrika', 'Emolga', 'Galvantula', 'Eelektross', 'Flaaffy', 'Minun', 'Dedenne', 'Togedemaru'] },
  { id: 'diantha', city: 'Lumiose', name: 'Stars', abbr: 'LUM', coach: 'Diantha', color: '#DB2777', conference: 'West',
    roster: ['Gardevoir', 'Hawlucha', 'Tyrantrum', 'Aurorus', 'Gourgeist', 'Sylveon', 'Florges', 'Meowstic'] },
  { id: 'lysandre', city: 'Lumiose', name: 'Flares', abbr: 'FLR', coach: 'Lysandre', color: '#B91C1C', conference: 'West',
    roster: ['Yveltal', 'Pyroar', 'Mienshao', 'Malamar', 'Honchkrow', 'Liepard', 'Scraggy', 'Golbat'] },
  { id: 'malva', city: 'Kalos', name: 'Infernos', abbr: 'KAL', coach: 'Malva', color: '#EE8130', conference: 'West',
    roster: ['Pyroar', 'Delphox', 'Torkoal', 'Heatmor', 'Fletchinder', 'Houndour', 'Magmar', 'Simisear'] },
  { id: 'kukui', city: 'Melemele', name: 'Wavebreakers', abbr: 'MEL', coach: 'Prof. Kukui', color: '#0891B2', conference: 'West',
    roster: ['Lycanroc', 'Incineroar', 'Braviary', 'Magnezone', 'Ninetales', 'Ribombee', 'Crabominable', 'Oricorio'] },
  { id: 'lusamine', city: 'Aether', name: 'Foundation', abbr: 'AET', coach: 'Lusamine', color: '#E2E8F0', conference: 'West',
    roster: ['Nihilego', 'Clefable', 'Lilligant', 'Bewear', 'Mismagius', 'Salazzle', 'Comfey', 'Milcery'] },
  { id: 'gladion', city: 'Ula’ula', name: 'Skulls', abbr: 'ULA', coach: 'Gladion', color: '#57534E', conference: 'West',
    roster: ['Silvally', 'Lucario', 'Zoroark', 'Crobat', 'Toxapex', 'Mudsdale', 'Garbodor', 'Pyukumuku'] },
  { id: 'leon', city: 'Wyndon', name: 'Champions', abbr: 'WYN', coach: 'Leon', color: '#7E22CE', conference: 'West',
    roster: ['Charizard', 'Dragapult', 'Aegislash', 'Haxorus', 'Rhyperior', 'Seismitoad', 'Mr. Rime', 'Inteleon'] },
  { id: 'raihan', city: 'Hammerlocke', name: 'Storm', abbr: 'HAM', coach: 'Raihan', color: '#0D9488', conference: 'West',
    roster: ['Duraludon', 'Flygon', 'Sandaconda', 'Turtonator', 'Torkoal', 'Flapple', 'Gigalith', 'Arctozolt'] },
  { id: 'piers', city: 'Spikemuth', name: 'Punks', abbr: 'SPK', coach: 'Piers', color: '#BE185D', conference: 'West',
    roster: ['Obstagoon', 'Scrafty', 'Skuntank', 'Thievul', 'Morpeko', 'Liepard', 'Pangoro', 'Mightyena'] },
  { id: 'geeta', city: 'Mesagoza', name: 'Top Champions', abbr: 'MES', coach: 'Geeta', color: '#D97706', conference: 'West',
    roster: ['Kingambit', 'Glimmora', 'Garganacl', 'Espathra', 'Veluza', 'Avalugg', 'Gogoat', 'Bombirdier'] },
  { id: 'nemona', city: 'Mesagoza', name: 'Rivals', abbr: 'NEM', coach: 'Nemona', color: '#16A34A', conference: 'West',
    roster: ['Quaquaval', 'Pawmot', 'Lycanroc', 'Dudunsparce', 'Orthworm', 'Tinkatink', 'Smoliv', 'Lechonk'] },
]
