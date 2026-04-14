/**
 * POKESCRIBE v1.0 - Lógica de Conversión Showdown a Cobblemon
 */

// --- FUNCIÓN PRINCIPAL: Inicia la conversión del equipo ---
function convertTeam() {
    const rawInput = document.getElementById('input').value.trim();
    if (!rawInput) return;

    // Dividimos el texto en bloques (cada Pokémon está separado por una línea vacía)
    const blocks = rawInput.split(/\n\s*\n/);
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML = ''; 

    blocks.forEach((block, index) => {
        const pokeData = parsePokemon(block);
        if (pokeData.species) {
            renderPokemon(pokeData, index + 1, outputDiv);
        }
    });
}

// --- FUNCIÓN LIMPIAR: Borra el input y los resultados ---
function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('output').innerHTML = '';
}

// --- ANALIZADOR (PARSER): Extrae la información del texto de Showdown ---
function parsePokemon(block) {
    const lines = block.split('\n');
    let data = {
        species: '', item: '', ability: '', tera: '', nature: '',
        evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, 
        ivs: {hp:31, atk:31, def:31, spa:31, spd:31, spe:31}, 
        moves: [], gender: '', formParam: '', isShiny: false
    };

    // cleanID: Quita espacios y puntos para nombres de movimientos
    const cleanID = (str) => str.toLowerCase().trim().replace(/ /g, '').replace(/[^a-z0-9]/g, '');

    lines.forEach((line, i) => {
        line = line.trim();
        if (!line) return;

        // Línea 1: Formato "Nombre (Especie) (Género) @ Objeto"
        if (i === 0) {
            const parts = line.split(' @ ');
            data.item = parts[1] ? parts[1].trim() : '';
            let namePart = parts[0];

            // Detección de Género
            if (namePart.includes('(M)')) { data.gender = 'male'; namePart = namePart.replace('(M)', ''); }
            else if (namePart.includes('(F)')) { data.gender = 'female'; namePart = namePart.replace('(F)', ''); }

            // Detección de Especie
            const match = namePart.match(/\(([^)]+)\)/);
            data.species = match ? match[1].trim() : namePart.trim();

            // CASOS ESPECIALES
            // 1. Gastrodon
            if (data.species.toLowerCase().includes('gastrodon')) {
                data.formParam += data.species.toLowerCase().includes('east') ? ' sea=east' : ' sea=west';
                data.species = 'gastrodon';
            }
            // 2. Tauros Paldea
            if (data.species.toLowerCase().includes('tauros-paldea')) {
                if (data.species.toLowerCase().includes('aqua')) data.formParam += ' bull_breed=aqua';
                else if (data.species.toLowerCase().includes('blaze')) data.formParam += ' bull_breed=blaze';
                data.formParam += ' paldean=true';
                data.species = 'tauros';
            }

            // 3. Formas Regionales Genéricas (Alola, Galar, etc.)
            const regions = { 'Alola': 'alolan', 'Galar': 'galarian', 'Paldea': 'paldean', 'Hisui': 'hisuian' };
            for (let r in regions) {
                if (data.species.includes('-' + r)) {
                    if (!data.formParam.includes(regions[r])) data.formParam += ` ${regions[r]}=true`;
                    data.species = data.species.replace('-' + r, '');
                }
            }
        }
        // Otras líneas de datos
        else if (line.startsWith('Shiny:')) data.isShiny = line.toLowerCase().includes('yes');
        else if (line.startsWith('Ability:')) data.ability = line.split(': ')[1];
        else if (line.startsWith('Tera Type:')) data.tera = line.split(': ')[1];
        else if (line.startsWith('EVs:')) {
            line.split(': ')[1].split(' / ').forEach(p => {
                const s = p.trim().split(' ');
                data.evs[s[1].toLowerCase()] = parseInt(s[0]);
            });
        }
        else if (line.startsWith('IVs:')) {
            line.split(': ')[1].split(' / ').forEach(p => {
                const s = p.trim().split(' ');
                data.ivs[s[1].toLowerCase()] = s[0];
            });
        }
        else if (line.includes(' Nature')) data.nature = line.split(' ')[0];
        else if (line.startsWith('-')) data.moves.push(cleanID(line.replace('-', '')));
    });

    return data;
}

// --- RENDERIZADO: Crea la tarjeta visual y genera los comandos ---
function renderPokemon(data, slot, container) {
    const toSnake = (str) => str.toLowerCase().trim().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Prefijo de Objetos (Eviolite exception)
    const itemName = data.item.toLowerCase();
    let prefix = 'cobblemon:';
    if (itemName !== 'eviolite' && itemName !== '') {
        const megaKeywords = ['ite', 'crystal', 'orb', 'meteorite'];
        if (megaKeywords.some(k => itemName.includes(k))) prefix = 'mega_showdown:';
    }
    const finalItem = data.item ? ` held_item=${prefix}${toSnake(data.item)}` : '';

    // IVs: Si no son todos 31, los escribimos uno por uno
    let ivString = '';
    const hasNonPerfect = Object.values(data.ivs).some(v => parseInt(v) !== 31);
    if (hasNonPerfect) {
        const ivMap = { hp: 'hp_iv', atk: 'attack_iv', def: 'defence_iv', spa: 'special_attack_iv', spd: 'special_defence_iv', spe: 'speed_iv' };
        for (let key in data.ivs) { ivString += ` ${ivMap[key]}=${data.ivs[key]}`; }
    } else {
        ivString = ' min_perfect_ivs=6';
    }

    // EVs: Cálculo y validación de suma
    const evMap = { hp: 'hp_ev', atk: 'attack_ev', def: 'defence_ev', spa: 'special_attack_ev', spd: 'special_defence_ev', spe: 'speed_ev' };
    let evString = '';
    let totalEVs = 0;
    for (let key in data.evs) { 
        if (data.evs[key] > 0) {
            evString += ` ${evMap[key]}=${data.evs[key]}`; 
            totalEVs += data.evs[key];
        }
    }

    const evClass = totalEVs > 510 ? 'ev-error' : 'ev-ok';
    const evText = totalEVs > 510 ? `⚠️ ERROR: ${totalEVs}/510 EVs` : `EVs: ${totalEVs}/510`;

    // COMANDOS FINALES
    const giveCmd = `/pokegive ${toSnake(data.species)} lvl=100${finalItem}${data.gender ? ' gender='+data.gender : ''} ability=${toSnake(data.ability)}${data.tera ? ' tera_type='+toSnake(data.tera) : ''}${ivString}${evString} nature=${toSnake(data.nature)}${data.formParam}${data.isShiny ? ' shiny=true' : ''}`;
    const editCmd = `/pokeedit ${slot} moves=${data.moves.join(',')}`;

    // Dibujado de la tarjeta
    const card = document.createElement('div');
    card.className = 'poke-card';
    card.innerHTML = `
        <h3 style="color:var(--primary); margin:0">#${slot} - ${data.species.toUpperCase()}${data.isShiny ? ' ✨' : ''}</h3>
        <span class="ev-counter ${evClass}">${evText}</span>
        
        <div class="command-wrap" style="margin-top:15px">
            <span class="label">Comando Give (Aparecer)</span>
            <span class="cmd-text" id="give-${slot}">${giveCmd}</span>
            <button class="copy-btn" onclick="copyText('give-${slot}', this)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
        <div class="command-wrap">
            <span class="label">Comando Edit (Movimientos)</span>
            <span class="cmd-text" id="edit-${slot}">${editCmd}</span>
            <button class="copy-btn" onclick="copyText('edit-${slot}', this)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
    `;
    container.appendChild(card);
}

// --- FUNCIÓN COPIAR: Envía el texto al portapapeles con efecto visual ---
function copyText(id, btn) {
    const text = document.getElementById(id).innerText;
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = oldHtml; }, 1500);
    });
}